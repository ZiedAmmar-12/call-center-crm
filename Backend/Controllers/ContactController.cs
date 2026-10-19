using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Agent;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ContactController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ContactController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>Récupère tous les contacts</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ContactDTO>), 200)]
    public async Task<IActionResult> GetAll()
    {
        var contacts = await _context.Contacts
            .Include(c => c.Agent)
            .OrderByDescending(c => c.DateImport)
            .AsNoTracking()
            .ToListAsync();

        var result = contacts.Select(c => new ContactDTO
        {
            Id = c.Id,
            Nom = c.Nom,
            Prenom = c.Prenom,
            Telephone = c.Telephone,
            Email = c.Email,
            Adresse = c.Adresse,
            Source = c.Source,
            Statut = c.Statut,
            AgentId = c.AgentId,
            AgentNom = c.Agent != null ? $"{c.Agent.Prenom} {c.Agent.Nom}" : null,  
            DateRappelPlanifie = c.DateRappelPlanifie
        });

        return Ok(result);
    }

    /// <summary>Récupère un contact par son ID</summary>
    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ContactDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(long id)
    {
        var contact = await _context.Contacts
            .Include(c => c.Agent)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (contact == null)
            return NotFound(new { message = $"Contact {id} introuvable." });

        var result = new ContactDTO
        {
            Id = contact.Id,
            Nom = contact.Nom,
            Prenom = contact.Prenom,
            Telephone = contact.Telephone,
            Email = contact.Email,
            Adresse = contact.Adresse,
            Source = contact.Source,
            Statut = contact.Statut,
            AgentId = contact.AgentId,
            AgentNom = contact.Agent != null ? $"{contact.Agent.Prenom} {contact.Agent.Nom}" : null,
            DateRappelPlanifie = contact.DateRappelPlanifie
        };

        return Ok(result);
    }

    /// <summary>Crée un nouveau contact</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ContactDTO), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Create([FromBody] CreateContactDTO dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Conversion fichage : "oui" → true, "non" → false, autrement null
        bool? fichageBool = dto.Fichage?.ToLowerInvariant() switch
        {
            "oui" => true,
            "non" => false,
            _ => null
        };

        // Conversion propriétaire depuis : année (int) → DateTime UTC
        DateTime? proprietaireDepuis = dto.ProprietaireDepuis is > 1900
            ? new DateTime(dto.ProprietaireDepuis.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            : null;

        var contact = new Contact
        {
            Nom = dto.Nom,
            Prenom = dto.Prenom,
            Telephone = dto.Telephone,
            Email = dto.Email,
            Adresse = dto.Adresse,
            Source = dto.Source,
            AgentId = dto.AgentId,
            Statut = "A_APPELER",
            DateImport = DateTime.UtcNow,
            // Logement
            ProprietaireDepuis = proprietaireDepuis,
            ModeChauffage = dto.ModeChauffage,
            ConsommationChauffage = dto.ConsommationChauffage,
            AgeChaudiere = dto.AgeChaudiere,
            EtatToiture = dto.EtatToiture,
            EtatIsolation = dto.EtatIsolation,
            Surface = dto.Surface,
            // Énergie
            EtudePV = dto.EtudePV,
            EquipePV = dto.EquipePV,
            EquipePAC = dto.EquipePAC,
            // Foyer
            NombrePersonnes = dto.NbPersonnes,
            ProfessionMr = dto.ProfessionMr,
            ProfessionMme = dto.ProfessionMme,
            Credits = dto.Credits,
            Revenus = dto.Revenus,
            Fichage = fichageBool,
        };

        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync();

        var result = new ContactDTO
        {
            Id = contact.Id,
            Nom = contact.Nom,
            Prenom = contact.Prenom,
            Telephone = contact.Telephone,
            Email = contact.Email,
            Adresse = contact.Adresse,
            Source = contact.Source,
            Statut = contact.Statut,
            AgentId = contact.AgentId
        };

        return CreatedAtAction(nameof(GetById), new { id = contact.Id }, result);
    }

    /// <summary>Met à jour un contact</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(ContactDTO), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(long id, [FromBody] CreateContactDTO dto)
    {
        var contact = await _context.Contacts.FindAsync(id);
        if (contact == null)
            return NotFound(new { message = $"Contact {id} introuvable." });

        contact.Nom = dto.Nom ?? contact.Nom;
        contact.Prenom = dto.Prenom ?? contact.Prenom;
        contact.Telephone = dto.Telephone;
        contact.Email = dto.Email ?? contact.Email;
        contact.Adresse = dto.Adresse ?? contact.Adresse;
        contact.Source = dto.Source;

        await _context.SaveChangesAsync();

        var result = new ContactDTO
        {
            Id = contact.Id,
            Nom = contact.Nom,
            Prenom = contact.Prenom,
            Telephone = contact.Telephone,
            Email = contact.Email,
            Adresse = contact.Adresse,
            Source = contact.Source,
            Statut = contact.Statut,
            AgentId = contact.AgentId
        };

        return Ok(result);
    }

    /// <summary>Supprime un contact</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(long id)
    {
        var contact = await _context.Contacts.FindAsync(id);
        if (contact == null)
            return NotFound(new { message = $"Contact {id} introuvable." });

        _context.Contacts.Remove(contact);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTACTS D'UN AGENT (pour la liste de l'agent connecté)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Retourne les contacts à appeler pour un agent donné</summary>
    [HttpGet("agent/{agentId:long}/a-appeler")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetContactsAgentAAppeler(long agentId)
    {
        var contacts = await _context.Contacts
            .Where(c => c.AgentId == agentId && c.Statut != "TRAITE")
            .OrderByDescending(c => c.ScoreIA ?? 0)
            .ThenByDescending(c => c.DateDernierAppel)
            .Select(c => new
            {
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
                c.CreneauOptimalIA,
                c.TypeRendezVous,
                c.ModeChauffage,
                c.AgeChaudiere,
                c.Surface,
                c.Projet,
                c.DateRappelPlanifie,
                c.DateDernierAppel,
                c.AgentId,
            })
            .AsNoTracking()
            .ToListAsync();

        return Ok(contacts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NRP COUNTER
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Incrémenter le compteur NRP d'un contact</summary>
    [HttpPost("{id:long}/nrp")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> IncrementNRP(long id)
    {
        var contact = await _context.Contacts.FindAsync(id);
        if (contact == null) return NotFound();
        contact.NombreNRP++;
        contact.DateDernierAppel = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { contact.NombreNRP });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXPORT CSV
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Exporter tous les contacts en CSV</summary>
    [HttpGet("export/csv")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "ADMIN,TECH")]
    public async Task<IActionResult> ExportCsv([FromQuery] long? fichierId)
    {
        var query = _context.Contacts.Include(c => c.Agent).AsQueryable();
        if (fichierId.HasValue)
            query = query.Where(c => c.FichierImportId == fichierId);

        var contacts = await query.OrderBy(c => c.Id).AsNoTracking().ToListAsync();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Id,Nom,Prenom,Telephone,NumGSM,Email,Adresse,CodePostal,Ville,Source," +
                      "StatutAgent,Commentaire,Projet,ModeChauffage,AgeChaudiere,EquipePV,EquipePAC," +
                      "Surface,NombrePersonnes,Revenus,Credits,Fichage,NombreNRP,ScoreIA,Agent");

        foreach (var c in contacts)
        {
            var Esc = (string? s) => s == null ? "" : $"\"{s.Replace("\"", "\"\"")}\"";
            sb.AppendLine(string.Join(",",
                c.Id, Esc(c.Nom), Esc(c.Prenom), Esc(c.Telephone), Esc(c.NumGSM), Esc(c.Email),
                Esc(c.Adresse), Esc(c.CodePostal), Esc(c.Ville), Esc(c.Source),
                Esc(c.StatutAgent), Esc(c.Commentaire), Esc(c.Projet), Esc(c.ModeChauffage),
                c.AgeChaudiere, c.EquipePV, c.EquipePAC,
                c.Surface, c.NombrePersonnes, Esc(c.Revenus), Esc(c.Credits), c.Fichage,
                c.NombreNRP, c.ScoreIA,
                Esc(c.Agent != null ? $"{c.Agent.Prenom} {c.Agent.Nom}" : "")
            ));
        }

        var bytes = System.Text.Encoding.UTF8.GetPreamble()
            .Concat(System.Text.Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", $"contacts_{DateTime.Now:yyyyMMdd_HHmm}.csv");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTACTS AVEC SCORE IA (pour la liste agent avec badges)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Liste des contacts avec score IA, filtrés par agent</summary>
    [HttpGet("agent/{agentId:long}/scored")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetScoredByAgent(long agentId)
    {
        var contacts = await _context.Contacts
            .Where(c => c.AgentId == agentId)
            .OrderByDescending(c => c.ScoreIA ?? 0)
            .Select(c => new {
                c.Id, c.Nom, c.Prenom, c.Telephone, c.NumGSM,
                c.CodePostal, c.Ville, c.StatutAgent, c.NombreNRP,
                c.ScoreIA, c.CreneauOptimalIA, c.DateRappelPlanifie,
                c.Commentaire, c.Projet,
            })
            .AsNoTracking()
            .ToListAsync();
        return Ok(contacts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CARTE GÉOGRAPHIQUE — statistiques par ville (données réelles)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>Statistiques géographiques : appels et conversions par ville</summary>
    [HttpGet("geo-stats")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetGeoStats()
    {
        var stats = await _context.Contacts
            .Where(c => c.Ville != null && c.Ville != "")
            .GroupBy(c => c.Ville!)
            .Select(g => new {
                region   = g.Key,
                appels   = g.Count(),
                conversions = g.Count(c =>
                    c.StatutAgent == "RDV" ||
                    c.StatutAgent == "VENDU" ||
                    c.StatutAgent == "CONFIRME"),
            })
            .OrderByDescending(x => x.appels)
            .Take(20)
            .ToListAsync();

        // Calcul du taux de conversion pour chaque ville
        var result = stats.Select(s => new {
            s.region,
            s.appels,
            s.conversions,
            taux = s.appels > 0
                ? Math.Round((double)s.conversions / s.appels * 100, 1)
                : 0.0,
        });

        return Ok(result);
    }
}
