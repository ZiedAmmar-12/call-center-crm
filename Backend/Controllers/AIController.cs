using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

/// <summary>
/// Contrôleur IA — orchestre les appels vers le microservice Python ML
/// et expose les résultats au front-end React.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class AIController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory   _http;
    private readonly IConfiguration       _config;
    private readonly ILogger<AIController> _logger;

    private string AiServiceUrl => _config["AI:ServiceUrl"] ?? "http://localhost:8000";

    public AIController(ApplicationDbContext ctx, IHttpClientFactory http,
                        IConfiguration config, ILogger<AIController> logger)
    {
        _context = ctx;
        _http    = http;
        _config  = config;
        _logger  = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LEAD SCORING — Calculer / récupérer les scores IA des contacts
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Déclenche le calcul du score IA pour tous les contacts non encore scorés
    /// (ou tous si force=true). Appelle le microservice Python en batch.
    /// </summary>
    [HttpPost("score-contacts")]
    [Authorize(Roles = "ADMIN,TECH")]
    public async Task<IActionResult> ScoreContacts([FromQuery] bool force = false)
    {
        var query = _context.Contacts.AsQueryable();
        if (!force)
            query = query.Where(c => c.ScoreIA == null);

        var contacts = await query
            .Select(c => new
            {
                c.Id,
                c.ModeChauffage,
                c.AgeChaudiere,
                c.EquipePV,
                c.EquipePAC,
                c.Surface,
                c.NombrePersonnes,
                c.Revenus,
                c.Credits,
                c.CodePostal,
                c.Fichage,
                c.NombreNRP,
                c.StatutAgent,
            })
            .Take(5000)
            .ToListAsync();

        if (contacts.Count == 0)
            return Ok(new { message = "Aucun contact à scorer.", scored = 0 });

        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            var response = await client.PostAsJsonAsync($"{AiServiceUrl}/score-batch",
                new { contacts });

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI service error: {err}", err);
                return StatusCode(502, new { message = "Microservice IA indisponible.", detail = err });
            }

            var result = await response.Content.ReadFromJsonAsync<ScoreBatchResult>();
            if (result?.scores == null)
                return StatusCode(502, new { message = "Réponse invalide du microservice IA." });

            // Mise à jour en BDD
            foreach (var s in result.scores)
            {
                var c = await _context.Contacts.FindAsync(s.id);
                if (c == null) continue;
                c.ScoreIA           = Math.Round(s.score, 1);
                c.CreneauOptimalIA  = s.best_time;
                c.DateScoreIA       = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();

            return Ok(new { message = "Scoring terminé.", scored = result.scores.Count });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Cannot reach AI service at {url}", AiServiceUrl);
            return StatusCode(503, new { message = "Microservice IA inaccessible. Assurez-vous qu'il tourne sur " + AiServiceUrl });
        }
    }

    /// <summary>Récupérer les contacts avec leur score IA (triés par score décroissant)</summary>
    [HttpGet("contacts-scored")]
    public async Task<IActionResult> GetScoredContacts([FromQuery] int page = 1, [FromQuery] int size = 50)
    {
        var total = await _context.Contacts.CountAsync(c => c.ScoreIA != null);
        var items = await _context.Contacts
            .Where(c => c.ScoreIA != null)
            .OrderByDescending(c => c.ScoreIA)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(c => new
            {
                c.Id, c.Nom, c.Prenom, c.Telephone,
                c.CodePostal, c.Ville, c.StatutAgent,
                c.ScoreIA, c.CreneauOptimalIA, c.DateScoreIA, c.NombreNRP,
                AgentNom = c.Agent != null ? c.Agent.Nom + " " + c.Agent.Prenom : null,
            })
            .ToListAsync();

        return Ok(new { total, page, size, items });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. PRÉVISION DE PRODUCTION
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Prévision de production pour les 7 prochains jours</summary>
    [HttpGet("forecast")]
    public async Task<IActionResult> GetForecast()
    {
        // Données historiques : RDV bruts des 90 derniers jours
        var since = DateTime.UtcNow.AddDays(-90);
        var history = await _context.RendezVous
            .Where(r => r.DateRendezVous >= since)
            .GroupBy(r => r.DateRendezVous.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            var response = await client.PostAsJsonAsync($"{AiServiceUrl}/forecast",
                new { history, horizon = 7 });

            if (response.IsSuccessStatusCode)
                return Ok(await response.Content.ReadFromJsonAsync<object>());

            // Fallback : moyenne mobile simple
            return Ok(FallbackForecast(history.Select(h => h.count).ToList()));
        }
        catch
        {
            return Ok(FallbackForecast(history.Select(h => h.count).ToList()));
        }
    }

    private object FallbackForecast(List<int> counts)
    {
        var avg = counts.Count > 0 ? counts.TakeLast(14).Average() : 5;
        var forecast = Enumerable.Range(1, 7).Select(i => new
        {
            date  = DateTime.UtcNow.AddDays(i).ToString("yyyy-MM-dd"),
            count = (int)Math.Round(avg * (0.9 + new Random().NextDouble() * 0.2)),
            lower = (int)Math.Round(avg * 0.7),
            upper = (int)Math.Round(avg * 1.3),
        }).ToList();
        return new { source = "fallback_ma", forecast };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. DÉTECTION D'ANOMALIES AGENTS
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Détecter les agents avec des ratios NRP/HC anormaux (alerte qualité)</summary>
    [HttpGet("anomalies")]
    [Authorize(Roles = "ADMIN,QUALITE,TECH")]
    public async Task<IActionResult> DetectAnomalies()
    {
        var since = DateTime.UtcNow.AddDays(-30);

        var agentStats = await _context.Contacts
            .Where(c => c.AgentId != null && c.DateDernierAppel >= since)
            .GroupBy(c => new { c.AgentId, c.Agent!.Nom, c.Agent.Prenom })
            .Select(g => new
            {
                agentId   = g.Key.AgentId,
                agentNom  = g.Key.Nom + " " + g.Key.Prenom,
                total     = g.Count(),
                nrp       = g.Count(c => c.StatutAgent == "NRP"),
                hc        = g.Count(c => c.StatutAgent != null && c.StatutAgent.StartsWith("HC")),
                rdv       = g.Count(c => c.StatutAgent != null && c.StatutAgent.StartsWith("RDV")),
            })
            .Where(x => x.total >= 10)
            .ToListAsync();

        if (!agentStats.Any())
            return Ok(new { anomalies = new List<object>(), message = "Pas assez de données (< 10 contacts par agent)." });

        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            var response = await client.PostAsJsonAsync($"{AiServiceUrl}/anomalies",
                new { agents = agentStats });

            if (response.IsSuccessStatusCode)
                return Ok(await response.Content.ReadFromJsonAsync<object>());
        }
        catch { /* fallback */ }

        // Fallback : Z-score simple sur le ratio NRP
        var nrpRatios = agentStats.Select(a => a.total > 0 ? (double)a.nrp / a.total : 0).ToList();
        var mean      = nrpRatios.Average();
        var std       = Math.Sqrt(nrpRatios.Average(x => Math.Pow(x - mean, 2)));

        var anomalies = agentStats
            .Select((a, i) => new
            {
                a.agentId, a.agentNom, a.total, a.nrp, a.hc, a.rdv,
                ratioNrp     = Math.Round(nrpRatios[i], 3),
                zScore       = std > 0 ? Math.Round((nrpRatios[i] - mean) / std, 2) : 0.0,
                isAnomalie   = std > 0 && Math.Abs((nrpRatios[i] - mean) / std) > 2.0,
                niveau       = std > 0 && (nrpRatios[i] - mean) / std > 2.5 ? "CRITIQUE"
                             : std > 0 && (nrpRatios[i] - mean) / std > 2.0 ? "ATTENTION" : "NORMAL",
            })
            .OrderByDescending(a => a.zScore)
            .ToList();

        return Ok(new { source = "fallback_zscore", anomalies, mean = Math.Round(mean, 3), std = Math.Round(std, 3) });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CONTACT INDIVIDUEL — Score + meilleur créneau
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Calculer le score IA pour un contact spécifique</summary>
    [HttpPost("score/{contactId:long}")]
    public async Task<IActionResult> ScoreContact(long contactId)
    {
        var c = await _context.Contacts.FindAsync(contactId);
        if (c == null) return NotFound();

        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            var response = await client.PostAsJsonAsync($"{AiServiceUrl}/score-single", new
            {
                id            = c.Id,
                mode_chauffage = c.ModeChauffage,
                age_chaudiere  = c.AgeChaudiere,
                equipe_pv      = c.EquipePV,
                equipe_pac     = c.EquipePAC,
                surface        = c.Surface,
                nb_personnes   = c.NombrePersonnes,
                revenus        = c.Revenus,
                credits        = c.Credits,
                code_postal    = c.CodePostal,
                fichage        = c.Fichage,
                nombre_nrp     = c.NombreNRP,
                statut         = c.StatutAgent,
            });

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<SingleScoreResult>();
                if (result != null)
                {
                    c.ScoreIA          = Math.Round(result.score, 1);
                    c.CreneauOptimalIA = result.best_time;
                    c.DateScoreIA      = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return Ok(new { c.ScoreIA, c.CreneauOptimalIA });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("AI single score failed: {msg}", ex.Message);
        }

        // Fallback heuristique si microservice indisponible
        var score = ComputeHeuristicScore(c.ModeChauffage, c.AgeChaudiere, c.EquipePV,
                                           c.EquipePAC, c.NombrePersonnes, c.Fichage, c.NombreNRP);
        c.ScoreIA          = score;
        c.CreneauOptimalIA = score > 60 ? "09:00-11:00" : score > 40 ? "14:00-16:00" : "11:00-13:00";
        c.DateScoreIA      = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { c.ScoreIA, c.CreneauOptimalIA, source = "heuristic" });
    }

    private static double ComputeHeuristicScore(string? chauffage, int? ageChaud,
        bool? pv, bool? pac, int? nbPersonnes, bool? fichage, int nrp)
    {
        double score = 50;
        if (chauffage?.ToLower().Contains("gaz") == true || chauffage?.ToLower().Contains("fioul") == true)
            score += 15;
        if (ageChaud.HasValue && ageChaud > 10) score += 10;
        if (pv == false) score += 5;
        if (pac == false) score += 5;
        if (nbPersonnes.HasValue && nbPersonnes >= 3) score += 5;
        if (fichage == true) score -= 20;
        score -= Math.Min(nrp * 3, 20);
        return Math.Max(0, Math.Min(100, Math.Round(score, 1)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. DASHBOARD IA — Vue synthèse
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Données synthèse pour le dashboard IA</summary>
    [HttpGet("dashboard")]
    [Authorize(Roles = "ADMIN,TECH,QUALITE")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalContacts  = await _context.Contacts.CountAsync();
        var scoredContacts = await _context.Contacts.CountAsync(c => c.ScoreIA != null);
        var highScore      = await _context.Contacts.CountAsync(c => c.ScoreIA >= 70);
        var medScore       = await _context.Contacts.CountAsync(c => c.ScoreIA >= 40 && c.ScoreIA < 70);
        var lowScore       = await _context.Contacts.CountAsync(c => c.ScoreIA < 40 && c.ScoreIA != null);
        var avgScore       = await _context.Contacts
                                .Where(c => c.ScoreIA != null)
                                .AverageAsync(c => (double?)c.ScoreIA) ?? 0;

        return Ok(new
        {
            totalContacts,
            scoredContacts,
            coveragePct = totalContacts > 0 ? Math.Round((double)scoredContacts / totalContacts * 100, 1) : 0,
            avgScore    = Math.Round(avgScore, 1),
            distribution = new { high = highScore, medium = medScore, low = lowScore },
        });
    }

    // ─── DTOs internes ────────────────────────────────────────────────────────
    private record ScoreBatchResult(List<ContactScoreItem> scores);
    private record ContactScoreItem(long id, double score, string best_time);
    private record SingleScoreResult(double score, string best_time);
}
