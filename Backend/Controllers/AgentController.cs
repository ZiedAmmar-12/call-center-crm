using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.DTOs.Agent;
using Backend.Services.Agent;
using Backend.Data;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AgentController : ControllerBase
{
    private readonly IAgentService _service;
    private readonly ApplicationDbContext _context;

    public AgentController(IAgentService service, ApplicationDbContext context)
    {
        _service  = service;
        _context  = context;
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    /// <summary>Récupère tous les agents</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AgentDTO>), 200)]
    public async Task<IActionResult> GetAll()
    {
        var agents = await _service.GetAllAgentsAsync();
        return Ok(agents);
    }

    /// <summary>Récupère un agent par son ID</summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(AgentDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(long id)
    {
        var agent = await _service.GetAgentByIdAsync(id);
        return agent == null ? NotFound(new { message = $"Agent {id} introuvable." }) : Ok(agent);
    }

    /// <summary>Crée un nouvel agent</summary>
    [HttpPost]
    [ProducesResponseType(typeof(AgentDTO), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Create([FromBody] CreateAgentDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var created = await _service.CreateAgentAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>Met à jour un agent</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(AgentDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAgentDTO dto)
    {
        var updated = await _service.UpdateAgentAsync(id, dto);
        return updated == null
            ? NotFound(new { message = $"Agent {id} introuvable." })
            : Ok(updated);
    }

    /// <summary>Supprime un agent</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(long id)
    {
        var success = await _service.DeleteAgentAsync(id);
        return success ? NoContent() : NotFound(new { message = $"Agent {id} introuvable." });
    }

    
    // ─── APPELS ──────────────────────────────────────────────────────────────

    /// <summary>Récupère l'historique des appels d'un agent</summary>
    [HttpGet("{id:long}/appels")]
    [ProducesResponseType(typeof(IEnumerable<AppelDTO>), 200)]
    public async Task<IActionResult> GetAppels(long id)
    {
        var appels = await _service.GetAppelsParAgentAsync(id);
        return Ok(appels);
    }

    /// <summary>Enregistre un appel avec qualification</summary>
    [HttpPost("appels")]
    [ProducesResponseType(typeof(AppelDTO), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> EnregistrerAppel([FromBody] CreateAppelDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var appel = await _service.EnregistrerAppelAsync(dto);
            return Ok(appel);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── PERFORMANCE ─────────────────────────────────────────────────────────

    /// <summary>Récupère les performances d'un agent pour un mois donné</summary>
    /// <param name="id">ID de l'agent</param>
    /// <param name="annee">Exemple : 2026</param>
    /// <param name="mois">Exemple : 4 (avril)</param>
    [HttpGet("{id:long}/performance")]
    [ProducesResponseType(typeof(PerformanceDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetPerformance(
        long id,
        [FromQuery] int annee,
        [FromQuery] int mois)
    {
        if (annee < 2020 || mois < 1 || mois > 12)
            return BadRequest(new { message = "Année ou mois invalide." });

        try
        {
            var perf = await _service.GetPerformanceAsync(id, annee, mois);
            return Ok(perf);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Erreur: {ex.Message}" });
        }
    }

    // ─── RÉMUNÉRATION ────────────────────────────────────────────────────────

    /// <summary>Calcule la rémunération estimée d'un agent pour un mois donné</summary>
    [HttpGet("{id:long}/remuneration")]
    [ProducesResponseType(typeof(RemunerationDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRemuneration(
        long id,
        [FromQuery] int annee,
        [FromQuery] int mois)
    {
        if (annee < 2020 || mois < 1 || mois > 12)
            return BadRequest(new { message = "Année ou mois invalide." });

        try
        {
            var rem = await _service.CalculerRemunerationAsync(id, annee, mois);
            return Ok(rem);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── POINTAGE ────────────────────────────────────────────────────────────

    /// <summary>Récupère les pointages d'un agent</summary>
    [HttpGet("{id:long}/pointages")]
    [ProducesResponseType(typeof(IEnumerable<PointageDTO>), 200)]
    public async Task<IActionResult> GetPointages(
        long id,
        [FromQuery] DateTime? dateDebut,
        [FromQuery] DateTime? dateFin)
    {
        var pointages = await _service.GetPointagesAsync(id, dateDebut, dateFin);
        return Ok(pointages);
    }

    // ─── SÉCURITÉ PC ─────────────────────────────────────────────────────────

    /// <summary>Vérifie ou enregistre l'empreinte PC d'un agent</summary>
    [HttpPost("{id:long}/verifier-pc")]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> VerifierPC(long id, [FromBody] VerifierPCDTO dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var agent = await _service.GetAgentByIdAsync(id);
        if (agent == null)
            return NotFound(new { message = $"Agent {id} introuvable." });

        var autorise = await _service.VerifierEmpreintePCAsync(id, dto.IdentifiantMachine);

        if (!autorise)
            return StatusCode(403, new
            {
                message = "Connexion refusée : ce PC n'est pas le poste principal de l'agent. L'administration a été notifiée."
            });

        return Ok(new { autorise = true, message = "Connexion autorisée." });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT ELITE — Contacts refus/NRP des collègues (IsElite = true)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Contacts de l'agenda EBI des collègues auxquels l'agent élite a accès.
    /// Filtre sur statuts : NRP, PORTE, PAS_INTERESSE, non signés.
    /// </summary>
    [HttpGet("elite/contacts-equipe")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> GetEliteContacts()
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        var agent = await _context.Agents.FindAsync(userId);
        if (agent == null || !agent.IsElite)
            return Forbid(); // Seul l'agent élite a cet accès

        var statuts = new[] { "NRP", "PORTE", "REFUS_PAS_INTERESSE" };
        var contacts = await _context.Contacts
            .Include(c => c.Agent)
            .Where(c => c.AgentId != userId
                     && (c.StatutAgent == null
                         || statuts.Any(s => c.StatutAgent!.StartsWith(s))))
            .OrderByDescending(c => c.ScoreIA ?? 0)
            .Take(200)
            .Select(c => new {
                c.Id, c.Nom, c.Prenom, c.Telephone, c.NumGSM,
                c.CodePostal, c.Ville, c.StatutAgent, c.NombreNRP,
                c.ScoreIA, c.CreneauOptimalIA, c.Projet,
                AgentNom = c.Agent != null ? c.Agent.Prenom + " " + c.Agent.Nom : null,
            })
            .AsNoTracking()
            .ToListAsync();

        return Ok(contacts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HISTORIQUE POINTAGE (propre à l'agent connecté)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Historique de pointage de l'agent connecté</summary>
    [HttpGet("me/pointage")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> GetMyPointage([FromQuery] int mois = 0, [FromQuery] int annee = 0)
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        if (mois == 0) mois = DateTime.UtcNow.Month;
        if (annee == 0) annee = DateTime.UtcNow.Year;

        var pointages = await _context.Pointages
            .Where(p => p.AgentId == userId
                     && p.Date.Month == mois
                     && p.Date.Year  == annee)
            .OrderBy(p => p.Date)
            .Select(p => new {
                p.Id,
                DatePointage  = p.Date,
                PremierAppel  = p.PremierAppel,
                DernierAppel  = p.DernierAppel,
                TotalHeures   = p.TotalSecondesTravaillees.HasValue
                                ? Math.Round(p.TotalSecondesTravaillees.Value / 3600.0, 2)
                                : (double?)null,
            })
            .AsNoTracking()
            .ToListAsync();

        return Ok(new { mois, annee, pointages });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HISTORIQUE ÉVALUATION (propre à l'agent connecté)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Historique d'évaluation de l'agent connecté</summary>
    [HttpGet("me/evaluations")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> GetMyEvaluations()
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        var evals = await _context.Evaluations
            .Where(e => e.AgentId == userId)
            .OrderByDescending(e => e.DateEvaluation)
            .Select(e => new {
                e.Id, e.DateEvaluation, e.NoteGlobale,
                e.NotePitchCommercial, e.NoteTraitementObjections,
                e.NoteQualiteAppel, e.NoteRespectScript, e.NoteEcoute,
                e.Commentaire, e.NbRdvBrut, e.NbRdvConfirme, e.NbRdvSigne,
            })
            .AsNoTracking()
            .ToListAsync();

        return Ok(evals);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-DIALER
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the ordered contact queue for the auto-dialer.
    /// Priority: A_APPELER first, then RAPPEL, sorted by ScoreIA desc.
    /// Includes progress stats (total, called today).
    /// </summary>
    [HttpGet("me/dialer/contacts")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> GetDialerContacts()
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        var today = DateTime.UtcNow.Date;

        var contacts = await _context.Contacts
            .Where(c => c.AgentId == userId && c.Statut != "TRAITE")
            .OrderBy(c => c.Statut == "A_APPELER" ? 0 : c.Statut == "RAPPEL" ? 1 : 2)
            .ThenByDescending(c => c.ScoreIA ?? 0)
            .ThenBy(c => c.DateDernierAppel)
            .Select(c => new {
                c.Id,
                c.Nom,
                c.Prenom,
                c.Telephone,
                c.NumGSM,
                c.Email,
                c.Adresse,
                c.CodePostal,
                c.Ville,
                c.Source,
                c.Statut,
                c.StatutAgent,
                c.NombreNRP,
                c.ScoreIA,
                c.TypeRendezVous,
                c.ModeChauffage,
                c.AgeChaudiere,
                c.Surface,
                c.Projet,
                c.DateRappelPlanifie,
                c.DateDernierAppel,
            })
            .AsNoTracking()
            .ToListAsync();

        var calledToday = await _context.Appels
            .Where(a => a.AgentId == userId && a.DateHeure.Date == today)
            .Select(a => a.ContactId)
            .Distinct()
            .CountAsync();

        return Ok(new {
            contacts,
            total = contacts.Count,
            calledToday,
        });
    }

    /// <summary>Log an ad-hoc call to an external number (not in contact list)</summary>
    [HttpPost("me/appels/externe")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> LogAppelExterne([FromBody] LogAppelExterneDto dto)
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        // Create a phantom contact for the external number
        var contact = new Backend.Entities.Contact
        {
            Nom       = dto.Nom ?? "Externe",
            Prenom    = "",
            Telephone = dto.Numero,
            Source    = "EXTERNE",
            Statut    = "TRAITE",
            AgentId   = userId,
        };
        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync();

        var appel = new Backend.Entities.Appel
        {
            AgentId       = userId,
            ContactId     = contact.Id,
            DateHeure     = DateTime.UtcNow,
            DureeSecondes = dto.DureeSecondes,
            Qualification = Backend.Entities.TypeQualification.NRP,
        };
        _context.Appels.Add(appel);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Appel externe enregistré", id = appel.Id });
    }

    /// <summary>Log a dialer pause with type and duration (appended to today's pointage)</summary>
    [HttpPost("me/dialer/pause")]
    [Authorize(Roles = "AGENT")]
    public async Task<IActionResult> LogDialerPause([FromBody] LogPauseDto dto)
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value ?? "0");

        var today = DateTime.UtcNow.Date;
        var pointage = await _context.Pointages
            .FirstOrDefaultAsync(p => p.AgentId == userId && p.Date.Date == today);

        if (pointage == null)
        {
            pointage = new Backend.Entities.Pointage
            {
                AgentId = userId,
                Date    = DateTime.UtcNow,
            };
            _context.Pointages.Add(pointage);
        }

        pointage.Pauses.Add(new Backend.Entities.Pause
        {
            Debut          = dto.Debut,
            Fin            = dto.Fin,
            DureeSecondes  = dto.DureeSecondes,
            AlerteEnvoyee  = false,
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Pause enregistrée" });
    }
}

public record LogPauseDto(DateTime Debut, DateTime Fin, int DureeSecondes, string Type);
public record LogAppelExterneDto(string Numero, string? Nom, int DureeSecondes, string? Notes);