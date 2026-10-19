using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Entities;

namespace Backend.Controllers;

/// <summary>Analytics avancé (module Khaled) — performance, supervision, géo, live agents</summary>
[ApiController]
[Route("api/analytics")]
[Authorize(Roles = "ADMIN,QUALITE,SuperAdmin")]
public class AnalyticsKhaledController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public AnalyticsKhaledController(ApplicationDbContext context) => _context = context;

    // ── Vue d'ensemble globale ────────────────────────────────────────────────
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var rdvs = await _context.RendezVous.AsNoTracking().ToListAsync();
            var appels = await _context.Appels.AsNoTracking().ToListAsync();
            var agentsCount = await _context.Agents.AsNoTracking().CountAsync();
            var evals = await _context.ManualEvaluations.AsNoTracking().ToListAsync();

            return Ok(new
            {
                totalAgents = agentsCount,
                totalRdv = rdvs.Count,
                rdvToday = rdvs.Count(r => r.DateRendezVous.Date == today),
                rdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                rdvAnnules = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
                rdvSignes = rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE),
                totalAppels = appels.Count,
                appelsToday = appels.Count(a => a.DateHeure.Date == today),
                avgQualityScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 1) : 0,
                conversionRate = rdvs.Count > 0 ? Math.Round((double)rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME) / rdvs.Count * 100, 1) : 0
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message, source = "overview" });
        }
    }

    // ── Performance des agents ────────────────────────────────────────────────
    [HttpGet("agents-performance")]
    public async Task<IActionResult> GetAgentsPerformance()
    {
        try
        {
            var agents = (await _context.Utilisateurs
                .Where(u => u.Role == "AGENT")
                .Select(u => new { u.Id, u.Nom, u.Prenom, u.Email })
                .AsNoTracking()
                .Take(50)
                .ToListAsync())
                .DistinctBy(u => u.Email)
                .ToList();
            var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
            var result = new List<object>();
            foreach (var a in agents)
            {
                var rdvs = await _context.RendezVous.AsNoTracking().Where(r => r.AgentId == a.Id).ToListAsync();
                var appels = await _context.Appels.AsNoTracking().Where(ap => ap.AgentId == a.Id).ToListAsync();
                var evals = await _context.ManualEvaluations.AsNoTracking().Where(e => e.AgentId == a.Id).ToListAsync();
                var salary = await _context.SalairesAgents.AsNoTracking()
                    .Where(s => s.AgentId == a.Id && s.Month == currentMonth)
                    .FirstOrDefaultAsync();

                result.Add(new
                {
                    agentId = a.Id,
                    nom = $"{a.Prenom} {a.Nom}",
                    email = a.Email,
                    totalRdv = rdvs.Count,
                    rdvConfirme = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                    rdvAnnule = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
                    rdvSigne = rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE),
                    totalAppels = appels.Count,
                    avgScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 1) : 0,
                    salaireMois = salary?.TotalSalary ?? 0,
                    conversionRate = rdvs.Count > 0 ? Math.Round((double)rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME) / rdvs.Count * 100, 1) : 0
                });
            }
            return Ok(result.OrderByDescending(x => ((dynamic)x).totalRdv));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message, source = "agents-performance" });
        }
    }

    // ── Supervision temps réel ────────────────────────────────────────────────
    [HttpGet("supervision")]
    public async Task<IActionResult> GetSupervision()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var agents = (await _context.Utilisateurs
                .Where(u => u.Role == "AGENT")
                .Select(u => new { u.Id, u.Nom, u.Prenom, u.Email })
                .AsNoTracking()
                .Take(30)
                .ToListAsync())
                .DistinctBy(u => u.Email)
                .ToList();
            var rdvsToday = await _context.RendezVous.AsNoTracking().Where(r => r.DateRendezVous.Date == today).ToListAsync();
            var appelsToday = await _context.Appels.AsNoTracking().Where(a => a.DateHeure.Date == today).ToListAsync();

            var supervision = agents.Select(a => new
            {
                agentId = a.Id,
                nom = $"{a.Prenom} {a.Nom}",
                rdvAujourdhui = rdvsToday.Count(r => r.AgentId == a.Id),
                appelsAujourdhui = appelsToday.Count(ap => ap.AgentId == a.Id),
                rdvConfirmesToday = rdvsToday.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.CONFIRME),
                status = appelsToday.Any(ap => ap.AgentId == a.Id) ? "actif" : "inactif"
            });

            return Ok(new
            {
                totalAgents = agents.Count,
                agentsActifs = appelsToday.Select(a => a.AgentId).Distinct().Count(),
                rdvJour = rdvsToday.Count,
                appelsJour = appelsToday.Count,
                agents = supervision
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message, source = "supervision" });
        }
    }

    // ── Distribution géographique ─────────────────────────────────────────────
    [HttpGet("geo")]
    public async Task<IActionResult> GetGeo()
    {
        try
        {
            var contacts = await _context.Contacts.AsNoTracking()
                .Where(c => !string.IsNullOrEmpty(c.Ville))
                .GroupBy(c => c.Ville)
                .Select(g => new { ville = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(20)
                .ToListAsync();

            var codePostaux = await _context.Contacts.AsNoTracking()
                .Where(c => !string.IsNullOrEmpty(c.CodePostal) && c.CodePostal!.Length >= 2)
                .GroupBy(c => c.CodePostal!.Substring(0, 2))
                .Select(g => new { departement = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(15)
                .ToListAsync();

            return Ok(new { byVille = contacts, byDepartement = codePostaux });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message, source = "geo" });
        }
    }

    // ── Suivi des rappels ─────────────────────────────────────────────────────
    [HttpGet("followups")]
    public async Task<IActionResult> GetFollowups()
    {
        var rappels = await _context.Appels.AsNoTracking()
            .Include(a => a.Contact)
            .Where(a => a.Qualification == TypeQualification.RAPPEL)
            .OrderByDescending(a => a.DateHeure)
            .Take(50)
            .ToListAsync();

        return Ok(rappels.Select(a => new
        {
            appelId = a.Id,
            contactNom = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
            telephone = a.Contact?.Telephone,
            dateAppel = a.DateHeure,
            agentId = a.AgentId
        }));
    }

    // ── Journal des appels ────────────────────────────────────────────────────
    [HttpGet("calls-log")]
    public async Task<IActionResult> GetCallsLog([FromQuery] int limit = 100)
    {
        var appels = await _context.Appels.AsNoTracking()
            .Include(a => a.Contact)
            .Include(a => a.Agent)
            .OrderByDescending(a => a.DateHeure)
            .Take(limit)
            .ToListAsync();

        return Ok(appels.Select(a => new
        {
            id = a.Id,
            dateAppel = a.DateHeure,
            dureeSecondes = a.DureeSecondes,
            qualification = a.Qualification.ToString(),
            agentNom = a.Agent != null ? $"{a.Agent.Prenom} {a.Agent.Nom}" : "",
            contactNom = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
            telephone = a.Contact?.Telephone
        }));
    }

    // ── Pointage récapitulatif ────────────────────────────────────────────────
    [HttpGet("pointage")]
    public async Task<IActionResult> GetPointage()
    {
        var today = DateTime.UtcNow.Date;
        var pointages = await _context.Pointages.AsNoTracking()
            .Include(p => p.Agent)
            .Where(p => p.Date.Date == today)
            .ToListAsync();

        return Ok(pointages.Select(p => new
        {
            agentId = p.AgentId,
            agentNom = p.Agent != null ? $"{p.Agent.Prenom} {p.Agent.Nom}" : "",
            premierAppel = p.PremierAppel,
            dernierAppel = p.DernierAppel,
            totalSecondes = p.TotalSecondesTravaillees ?? 0,
            dureeMinutes = p.TotalSecondesTravaillees.HasValue ? p.TotalSecondesTravaillees.Value / 60 : 0
        }));
    }

    // ── Agents actifs maintenant ──────────────────────────────────────────────
    [HttpGet("live-agents")]
    public async Task<IActionResult> GetLiveAgents()
    {
        var since = DateTime.UtcNow.AddHours(-1);
        var recentAppels = await _context.Appels.AsNoTracking()
            .Where(a => a.DateHeure >= since)
            .Select(a => a.AgentId)
            .Distinct()
            .ToListAsync();

        var agents = await _context.Utilisateurs
            .Where(u => u.Role == "AGENT" && recentAppels.Contains(u.Id))
            .Select(u => new { u.Id, u.Prenom, u.Nom, u.Email })
            .AsNoTracking()
            .ToListAsync();

        return Ok(new
        {
            count = agents.Count,
            agents = agents.Select(a => new { a.Id, nom = $"{a.Prenom} {a.Nom}", email = a.Email })
        });
    }

    // ── Comparaison périodique ────────────────────────────────────────────────
    [HttpGet("comparison")]
    public async Task<IActionResult> GetComparison()
    {
        var now = DateTime.UtcNow;
        var currentMonth = new DateTime(now.Year, now.Month, 1);
        var prevMonth = currentMonth.AddMonths(-1);

        var rdvCurrent = await _context.RendezVous.AsNoTracking().Where(r => r.DateCreation >= currentMonth).CountAsync();
        var rdvPrev = await _context.RendezVous.AsNoTracking().Where(r => r.DateCreation >= prevMonth && r.DateCreation < currentMonth).CountAsync();
        var appelsCurrent = await _context.Appels.AsNoTracking().Where(a => a.DateHeure >= currentMonth).CountAsync();
        var appelsPrev = await _context.Appels.AsNoTracking().Where(a => a.DateHeure >= prevMonth && a.DateHeure < currentMonth).CountAsync();

        double rdvGrowth = rdvPrev > 0 ? Math.Round((rdvCurrent - rdvPrev) / (double)rdvPrev * 100, 1) : 0;
        double appelsGrowth = appelsPrev > 0 ? Math.Round((appelsCurrent - appelsPrev) / (double)appelsPrev * 100, 1) : 0;

        return Ok(new
        {
            current = new { month = currentMonth.ToString("yyyy-MM"), rdv = rdvCurrent, appels = appelsCurrent },
            previous = new { month = prevMonth.ToString("yyyy-MM"), rdv = rdvPrev, appels = appelsPrev },
            growth = new { rdv = rdvGrowth, appels = appelsGrowth }
        });
    }
}
