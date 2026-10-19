using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.Data;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "COMMERCIAL,ADMIN")]
[Produces("application/json")]
public class CommercialController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CommercialController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ── AGENDA COMMERCIAL ─────────────────────────────────────────────────

    /// <summary>Agenda du commercial connecté (RDV CONFIRME et BRUT)</summary>
    [HttpGet("agenda")]
    public async Task<IActionResult> GetAgenda([FromQuery] DateTime? debut, [FromQuery] DateTime? fin)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var query = _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.CommercialId == userId);

        if (debut.HasValue) query = query.Where(r => r.DateRendezVous >= debut.Value);
        if (fin.HasValue) query = query.Where(r => r.DateRendezVous <= fin.Value);

        var rdvs = await query
            .OrderBy(r => r.DateRendezVous)
            .Select(r => new
            {
                r.Id,
                r.DateRendezVous,
                r.Statut,
                r.TypeRendezVous,
                r.TypeProjet,
                r.Commentaire,
                r.CommentaireConfirmation,
                r.CommentaireCommercial,
                r.CommentaireBanque,
                r.MotifRefus,
                r.ARecontacter,
                r.DateReport,
                Contact = new
                {
                    r.Contact.Id, r.Contact.Nom, r.Contact.Prenom,
                    r.Contact.Telephone, r.Contact.NumGSM, r.Contact.Adresse,
                    r.Contact.CodePostal, r.Contact.Ville,
                    r.Contact.Projet, r.Contact.ModeChauffage,
                    r.Contact.Surface, r.Contact.NombrePersonnes,
                    r.Contact.ProfessionMr, r.Contact.ProfessionMme,
                    r.Contact.Credits, r.Contact.Revenus, r.Contact.Fichage,
                    r.Contact.EtudePV, r.Contact.EquipePV, r.Contact.EquipePAC,
                    r.Contact.EtatToiture, r.Contact.EtatIsolation,
                    r.Contact.ProprietaireDepuis, r.Contact.AgeChaudiere,
                    r.Contact.ConsommationChauffage
                },
                Agent = new { r.Agent.Id, r.Agent.Nom, r.Agent.Prenom }
            })
            .ToListAsync();

        return Ok(rdvs);
    }

    /// <summary>Détail d'un RDV</summary>
    [HttpGet("agenda/{id:long}")]
    public async Task<IActionResult> GetRdv(long id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var rdv = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .FirstOrDefaultAsync(r => r.Id == id && r.CommercialId == userId);

        if (rdv == null) return NotFound();
        return Ok(rdv);
    }

    // ── MISE À JOUR STATUT RDV ────────────────────────────────────────────

    /// <summary>Mettre à jour le statut d'un RDV après visite</summary>
    [HttpPut("rdv/{id:long}/statut")]
    public async Task<IActionResult> UpdateStatutRdv(long id, [FromBody] UpdateStatutRdvDTO dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var rdv = await _context.RendezVous
            .FirstOrDefaultAsync(r => r.Id == id && r.CommercialId == userId);

        if (rdv == null) return NotFound();

        rdv.Statut = dto.Statut;
        if (!string.IsNullOrEmpty(dto.CommentaireCommercial))
            rdv.CommentaireCommercial = dto.CommentaireCommercial;
        if (dto.MotifRefus != null)
            rdv.MotifRefus = dto.MotifRefus;
        if (dto.ARecontacter.HasValue)
            rdv.ARecontacter = dto.ARecontacter.Value;
        if (dto.DateReport.HasValue)
            rdv.DateReport = dto.DateReport.Value;

        await _context.SaveChangesAsync();
        return Ok(rdv);
    }

    /// <summary>Ajouter / modifier le commentaire commercial sur un contact</summary>
    [HttpPut("contacts/{contactId:long}/commentaire")]
    public async Task<IActionResult> UpdateCommentaireContact(long contactId, [FromBody] UpdateCommentaireDTO dto)
    {
        var contact = await _context.Contacts.FindAsync(contactId);
        if (contact == null) return NotFound();

        contact.CommentaireCommercial = dto.Commentaire;
        await _context.SaveChangesAsync();
        return Ok(new { contact.Id, contact.CommentaireCommercial });
    }

    // ── STATS COMMERCIAL ──────────────────────────────────────────────────

    /// <summary>Statistiques du commercial connecté</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int? mois, [FromQuery] int? annee)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var now = DateTime.UtcNow;
        mois ??= now.Month;
        annee ??= now.Year;

        var rdvs = await _context.RendezVous
            .Where(r => r.CommercialId == userId
                     && r.DateRendezVous.Month == mois
                     && r.DateRendezVous.Year == annee)
            .ToListAsync();

        return Ok(new
        {
            Mois = mois, Annee = annee,
            TotalRdv = rdvs.Count,
            Signes = rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE),
            NonSignes = rdvs.Count(r => r.Statut == StatutRendezVous.NON_SIGNE),
            Installes = rdvs.Count(r => r.Statut == StatutRendezVous.INSTALLE),
            R2 = rdvs.Count(r => r.Statut == StatutRendezVous.R2),
            NRP = rdvs.Count(r => r.Statut == StatutRendezVous.NRP),
            Portes = rdvs.Count(r => r.Statut == StatutRendezVous.PORTE),
            Annules = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            Reportes = rdvs.Count(r => r.Statut == StatutRendezVous.REPORTER),
            TauxSignature = rdvs.Count > 0
                ? Math.Round((double)rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE) / rdvs.Count * 100, 1)
                : 0.0
        });
    }

    /// <summary>Historique stats mois par mois</summary>
    [HttpGet("stats/historique")]
    public async Task<IActionResult> GetStatsHistorique([FromQuery] int? annee)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        annee ??= DateTime.UtcNow.Year;

        var rdvs = await _context.RendezVous
            .Where(r => r.CommercialId == userId && r.DateRendezVous.Year == annee)
            .ToListAsync();

        var historique = rdvs
            .GroupBy(r => r.DateRendezVous.Month)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                Mois = g.Key,
                Total = g.Count(),
                Signes = g.Count(r => r.Statut == StatutRendezVous.SIGNE),
                NonSignes = g.Count(r => r.Statut == StatutRendezVous.NON_SIGNE),
                Installes = g.Count(r => r.Statut == StatutRendezVous.INSTALLE),
                R2 = g.Count(r => r.Statut == StatutRendezVous.R2),
            });

        return Ok(historique);
    }

    // ── ÉVALUATIONS COMMERCIALES ──────────────────────────────────────────

    /// <summary>Ses propres évaluations</summary>
    [HttpGet("evaluations")]
    public async Task<IActionResult> GetEvaluations()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!long.TryParse(userIdStr, out var userId))
            return Unauthorized();

        // Evaluations are per agent — commercial may have Agent evaluations if also télépro
        var evals = await _context.Evaluations
            .Where(e => e.AgentId == userId)
            .OrderByDescending(e => e.DateEvaluation)
            .ToListAsync();

        return Ok(evals);
    }
}

public class UpdateStatutRdvDTO
{
    public StatutRendezVous Statut { get; set; }
    public string? CommentaireCommercial { get; set; }
    public string? MotifRefus { get; set; }
    public bool? ARecontacter { get; set; }
    public DateTime? DateReport { get; set; }
}

public class UpdateCommentaireDTO
{
    public string? Commentaire { get; set; }
}
