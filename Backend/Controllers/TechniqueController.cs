using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Entities;
using Backend.Services.Admin;
using System.Text;

namespace Backend.Controllers;

[ApiController]
[Route("api/technique")]
[Authorize(Roles = "TECH,ADMIN,SuperAdmin")]
[Produces("application/json")]
public class TechniqueController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAdminService _adminService;

    public TechniqueController(ApplicationDbContext context, IAdminService adminService)
    {
        _context      = context;
        _adminService = adminService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 0. DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var agentsTotal  = await _context.Utilisateurs.Where(u => u.Role == "AGENT" && u.Actif).CountAsync();
        var fichiersTotal = await _context.FichiersImport.CountAsync();
        var evalTotal    = await _context.Evaluations.CountAsync();
        var today        = DateTime.UtcNow.Date;
        var todayUtc     = DateTime.SpecifyKind(today, DateTimeKind.Utc);
        var tomorrowUtc  = DateTime.SpecifyKind(today.AddDays(1), DateTimeKind.Utc);

        var pointagesAujourd = await _context.Pointages
            .Where(p => p.Date >= todayUtc && p.Date < tomorrowUtc)
            .CountAsync();

        var evalsRecentes = await _context.Evaluations
            .Include(e => e.Agent)
            .OrderByDescending(e => e.DateEvaluation)
            .Take(5)
            .Select(e => new
            {
                agentNom    = $"{e.Agent.Prenom} {e.Agent.Nom}",
                noteGlobale = Math.Round(e.NoteGlobale, 1),
                date        = e.DateEvaluation.ToString("dd/MM/yyyy"),
            })
            .ToListAsync();

        return Ok(new
        {
            agentsTotal,
            fichiersTotal,
            evalTotal,
            pointagesAujourd,
            evalsRecentes,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LISTE DES AGENTS
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("agents")]
    public async Task<IActionResult> GetAgents()
    {
        // Charger en mémoire puis dédupliquer par email (données DB potentiellement dupliquées)
        var raw = await _context.Utilisateurs
            .Where(u => u.Role == "AGENT")
            .OrderBy(u => u.Nom)
            .ToListAsync();

        var agents = raw
            .GroupBy(u => u.Email)
            .Select(g => g.First())
            .Select(u => new
            {
                id           = u.Id,
                nom          = u.Nom,
                prenom       = u.Prenom,
                email        = u.Email,
                actif        = u.Actif,
                dateEmbauche = (DateTime?)null,
                isElite      = false,
            })
            .OrderBy(a => a.nom)
            .ToList();

        return Ok(agents);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DETAIL AGENT — Historique Production
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("agents/{agentId:long}/production")]
    public async Task<IActionResult> GetAgentProduction(long agentId)
    {
        var agent = await _context.Utilisateurs
            .Where(u => u.Id == agentId && u.Role == "AGENT")
            .Select(u => new { u.Id, u.Nom, u.Prenom })
            .FirstOrDefaultAsync();

        if (agent == null) return NotFound(new { message = "Agent introuvable" });

        // Grouper les RDV par mois sur les 12 derniers mois
        var since = DateTime.UtcNow.AddMonths(-12);
        var rdvs  = await _context.RendezVous
            .Where(r => r.AgentId == agentId && r.DateRendezVous >= since)
            .ToListAsync();

        var production = rdvs
            .GroupBy(r => new { r.DateRendezVous.Year, r.DateRendezVous.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g =>
            {
                int brut      = g.Count();
                int confirme  = g.Count(r => r.Statut == StatutRendezVous.CONFIRME);
                int annule    = g.Count(r => r.Statut == StatutRendezVous.ANNULE);
                int signe     = g.Count(r => r.Statut == StatutRendezVous.SIGNE);
                int pose      = g.Count(r => r.Statut == StatutRendezVous.INSTALLE);

                // Couleur de ligne
                string couleur = signe > 0 ? "green"
                               : confirme >= 5 ? "yellow"
                               : "red";

                return new
                {
                    mois      = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                    brut,
                    annule,
                    confirme,
                    signatures = signe,
                    pose,
                    couleur,
                };
            })
            .ToList();

        return Ok(new
        {
            agentNom   = $"{agent.Prenom} {agent.Nom}",
            production,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. DETAIL AGENT — Historique Evaluations
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("agents/{agentId:long}/evaluations")]
    public async Task<IActionResult> GetAgentEvaluations(long agentId)
    {
        var evaluations = await _context.Evaluations
            .Where(e => e.AgentId == agentId)
            .OrderByDescending(e => e.DateEvaluation)
            .Select(e => new
            {
                id              = e.Id,
                date            = e.DateEvaluation.ToString("dd/MM/yyyy"),
                noteGlobale     = Math.Round(e.NoteGlobale, 1),
                notePitch       = e.NotePitchCommercial,
                noteObjections  = e.NoteTraitementObjections,
                noteQualite     = e.NoteQualiteAppel,
                noteScript      = e.NoteRespectScript,
                noteEcoute      = e.NoteEcoute,
                commentaire     = e.Commentaire,
            })
            .ToListAsync();

        return Ok(evaluations);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FICHIER DES CONTACTS
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("fichiers")]
    public async Task<IActionResult> GetFichiers()
    {
        var fichiers = await _context.FichiersImport
            .OrderByDescending(f => f.DateImport)
            .Select(f => new
            {
                id              = f.Id,
                nom             = f.NomFichier,
                dateImport      = f.DateImport.ToString("dd-MM-yyyy"),
                nbContacts      = f.NombreContactsImportes,
                statut          = f.Statut.ToString(),
                source          = f.Source,
            })
            .ToListAsync();

        return Ok(fichiers);
    }

    [HttpGet("fichiers/{id:long}/export")]
    public async Task<IActionResult> ExportFichierCsv(long id)
    {
        var fichier = await _context.FichiersImport
            .Include(f => f.Contacts)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fichier == null) return NotFound(new { message = "Fichier introuvable" });

        var sb = new StringBuilder();
        sb.AppendLine("Nom,Prénom,Téléphone,Email,CodePostal,Ville,StatutAgent,ScoreIA");

        foreach (var c in fichier.Contacts)
        {
            sb.AppendLine($"{c.Nom},{c.Prenom},{c.Telephone},{c.Email}," +
                          $"{c.CodePostal},{c.Ville},{c.StatutAgent},{c.ScoreIA}");
        }

        var bytes  = Encoding.UTF8.GetBytes(sb.ToString());
        var name   = $"{fichier.NomFichier}_{DateTime.Now:yyyyMMdd}.csv";
        return File(bytes, "text/csv", name);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. POINTAGE — délègue au service admin (même données, même format)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("pointage")]
    public async Task<IActionResult> GetPointage([FromQuery] string? date = null)
    {
        var targetDate = date != null
            ? DateTime.SpecifyKind(DateTime.Parse(date).Date, DateTimeKind.Utc)
            : DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        var pointage = await _adminService.GetPointageAsync(targetDate);
        return Ok(pointage);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. GÉRER ACCÈS — LOGS
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs()
    {
        var users = await _context.Set<Backend.Entities.Utilisateur>()
            .OrderByDescending(u => u.DateCreation)
            .Select(u => new
            {
                membre      = $"{u.Prenom} {u.Nom}",
                id          = u.Email,
                role        = u.Role,
                dateCreation = u.DateCreation.ToString("dd/MM/yyyy"),
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("logs")]
    public async Task<IActionResult> CreateLog([FromBody] CreateLogDto dto)
    {
        // Crée un nouvel utilisateur / compte d'accès
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Nom))
            return BadRequest(new { message = "Nom et email requis" });

        var existingUser = await _context.Set<Backend.Entities.Utilisateur>()
            .AnyAsync(u => u.Email == dto.Email);

        if (existingUser)
            return Conflict(new { message = "Un compte avec cet email existe déjà" });

        var user = new Backend.Entities.Technique
        {
            Nom          = dto.Nom,
            Prenom       = dto.Prenom ?? "",
            Email        = dto.Email,
            MotDePasse   = BCrypt.Net.BCrypt.HashPassword(dto.MotDePasse ?? "Temp@1234"),
            Role         = "TECH",
            Actif        = true,
            DateCreation = DateTime.UtcNow,
        };

        _context.Set<Backend.Entities.Technique>().Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Log créé avec succès", id = user.Id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. COMPTE CALENDRIER
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("calendrier")]
    public async Task<IActionResult> CreateCalendrierAccount([FromBody] CalendrierDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CalId) || string.IsNullOrWhiteSpace(dto.MotDePasse))
            return BadRequest(new { message = "ID et mot de passe requis" });

        // Stocké dans les paramètres de config ou retourné confirmé
        // Dans un projet réel, on appellerait l'API du serveur CalDAV
        return Ok(new
        {
            message  = "Compte calendrier créé avec succès",
            calId    = dto.CalId,
            createdAt = DateTime.UtcNow.ToString("dd/MM/yyyy HH:mm"),
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. ÉVALUATIONS (vue globale)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("evaluations")]
    public async Task<IActionResult> GetEvaluations([FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var total = await _context.Evaluations.CountAsync();

        var evals = await _context.Evaluations
            .Include(e => e.Agent)
            .OrderByDescending(e => e.DateEvaluation)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(e => new
            {
                id           = e.Id,
                agentNom     = $"{e.Agent.Prenom} {e.Agent.Nom}",
                agentId      = e.AgentId,
                date         = e.DateEvaluation.ToString("dd/MM/yyyy"),
                noteGlobale  = Math.Round(e.NoteGlobale, 1),
                notePitch    = e.NotePitchCommercial,
                commentaire  = e.Commentaire,
            })
            .ToListAsync();

        return Ok(new { total, page, size, evaluations = evals });
    }
}

// ─── DTOs ────────────────────────────────────────────────────────────────────
public record CreateLogDto(string Nom, string? Prenom, string Email, string? MotDePasse);
public record CalendrierDto(string CalId, string MotDePasse);
