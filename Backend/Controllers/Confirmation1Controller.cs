using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Confirmation;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/confirmation1")]
[Authorize(Roles = "CONFIRMATRICE")]
public class Confirmation1Controller : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public Confirmation1Controller(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    private static RdvConfirmationDTO MapRdv(RendezVous r) => new()
    {
        Id                    = r.Id,
        ContactId             = r.Contact?.Id ?? 0,
        ContactNom            = r.Contact?.Nom ?? "",
        ContactPrenom         = r.Contact?.Prenom ?? "",
        Telephone             = r.Contact?.Telephone ?? "",
        NumGSM                = r.Contact?.NumGSM,
        Email                 = r.Contact?.Email,
        Adresse               = r.Contact?.Adresse,
        CodePostal            = r.Contact?.CodePostal,
        Ville                 = r.Contact?.Ville,
        Source                = r.Contact?.Source ?? "",
        AgentId               = r.AgentId,
        AgentNom              = r.Agent != null ? $"{r.Agent.Prenom} {r.Agent.Nom}" : "",
        DateCreation          = r.DateCreation,
        DateRendezVous        = r.DateRendezVous,
        Statut                = r.Statut.ToString(),
        TypeRendezVous        = r.TypeRendezVous,
        CommentaireAgent      = r.Commentaire,
        CommentaireConfirmation = r.CommentaireConfirmation,
        CommentaireBanque     = r.CommentaireBanque,
        Projet                = r.Contact?.Projet,
        ProprietaireDepuis    = r.Contact?.ProprietaireDepuis,
        ModeChauffage         = r.Contact?.ModeChauffage,
        ConsommationChauffage = r.Contact?.ConsommationChauffage,
        AgeChaudiere          = r.Contact?.AgeChaudiere,
        EtudePV               = r.Contact?.EtudePV,
        EquipePV              = r.Contact?.EquipePV,
        EquipePAC             = r.Contact?.EquipePAC,
        EtatToiture           = r.Contact?.EtatToiture,
        EtatIsolation         = r.Contact?.EtatIsolation,
        Surface               = r.Contact?.Surface,
        NombrePersonnes       = r.Contact?.NombrePersonnes,
        ProfessionMr          = r.Contact?.ProfessionMr,
        ProfessionMme         = r.Contact?.ProfessionMme,
        Credits               = r.Contact?.Credits,
        Revenus               = r.Contact?.Revenus,
        Fichage               = r.Contact?.Fichage,
    };

    public class UploadContactsDto
    {
        public IFormFile File { get; set; } = null!;
        public string? Campagne { get; set; }
    }

    // =========================
    // DASHBOARD
    // =========================

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var aujourd = DateTime.UtcNow.Date;
        
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.DateRendezVous >= aujourd)
            .OrderBy(r => r.DateRendezVous)
            .Take(50)
            .ToListAsync();

        var statsParJour = new List<StatutParJourDTO>();
        for (int i = -7; i <= 0; i++)
        {
            var date = aujourd.AddDays(i);
            var rdvsJour = await _context.RendezVous
                .Where(r => r.DateRendezVous.Date == date)
                .ToListAsync();
            
            statsParJour.Add(new StatutParJourDTO
            {
                Date = date,
                Confirme = rdvsJour.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                Annule = rdvsJour.Count(r => r.Statut == StatutRendezVous.ANNULE),
                NRP = 0
            });
        }

        var result = new ConfirmationDashboardDTO
        {
            TotalRdv = rdvs.Count,
            RdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
            RdvAnnules = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            RdvReportes = rdvs.Count(r => r.Statut == StatutRendezVous.REPORTER),
            StatsParJour = statsParJour,
            RdvRecents = rdvs.Select(r => new RdvConfirmationDTO
            {
                Id = r.Id,
                ContactNom = r.Contact?.Nom ?? "",
                ContactPrenom = r.Contact?.Prenom ?? "",
                Telephone = r.Contact?.Telephone ?? "",
                Source = r.Contact?.Source ?? "",
                AgentNom = r.Agent != null ? $"{r.Agent.Prenom} {r.Agent.Nom}" : "",
                DateCreation = r.DateCreation,
                DateRendezVous = r.DateRendezVous,
                Statut = r.Statut.ToString()
            }).ToList()
        };

        return Ok(result);
    }

    // =========================
    // AGENDAS
    // =========================

    [HttpGet("agenda-ebi")]
    public async Task<IActionResult> GetAgendaEBI()
    {
        // Agenda EBI : RDVs confirmés par l'agent, en attente de traitement par la conf call
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.CONFIRME)
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        return Ok(rdvs.Select(MapRdv));
    }

    [HttpGet("agenda-client1")]
    public async Task<IActionResult> GetAgendaClient1()
    {
        // RDVs envoyés par la conf call vers Agenda Client 1
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.CONFIRME_CONF_CALL && r.TypeRendezVous == "CLIENT1")
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        return Ok(rdvs.Select(MapRdv));
    }

    [HttpGet("agenda-client2")]
    public async Task<IActionResult> GetAgendaClient2()
    {
        // RDVs envoyés par la conf call vers Agenda Client 2
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.CONFIRME_CONF_CALL && r.TypeRendezVous == "CLIENT2")
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        return Ok(rdvs.Select(MapRdv));
    }

    [HttpGet("agenda-refus")]
    public async Task<IActionResult> GetAgendaRefus()
    {
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.ANNULE)
            .OrderByDescending(r => r.DateCreation)
            .ToListAsync();

        return Ok(rdvs.Select(MapRdv));
    }

    // =========================
    // ÉVALUATION
    // =========================

    [HttpGet("agents/evaluation")]
    public async Task<IActionResult> GetAgentsEvaluation()
    {
        var agents = await _context.Agents.ToListAsync();
        var result = agents.Select(a =>
        {
            var brut        = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.BRUT);
            var confirme    = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.CONFIRME);
            var annule      = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.ANNULE);
            var porte       = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.PORTE);
            var pasSigne    = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.NON_SIGNE);
            var signe       = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.SIGNE);
            var r2          = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.R2);
            var pasInteresse= _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.HORS_CIBLE);
            var total       = brut + confirme + annule + porte + pasSigne + signe + r2 + pasInteresse;
            var scoreGlobal = total > 0 ? (double)(confirme + signe) / total * 100 : 0;

            return new
            {
                agentId = a.Id,
                agentNom = $"{a.Prenom} {a.Nom}",
                brut, confirme, annule, porte, pasSigne, signe, r2, pasInteresse,
                scoreGlobal = Math.Round(scoreGlobal, 1)
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("statistiques")]
    public async Task<IActionResult> GetStatistiques([FromQuery] string periode = "mois")
    {
        var now = DateTime.UtcNow;
        DateTime debut = periode switch
        {
            "semaine"   => now.AddDays(-7),
            "trimestre" => now.AddMonths(-3),
            _           => now.AddMonths(-1),
        };

        var rdvs = await _context.RendezVous
            .Where(r => r.DateRendezVous >= debut)
            .ToListAsync();

        // Stats par jour (7 derniers jours)
        var statsParJour = Enumerable.Range(-6, 7).Select(i =>
        {
            var date = now.Date.AddDays(i);
            var dayRdvs = rdvs.Where(r => r.DateRendezVous.Date == date).ToList();
            return new
            {
                date = date.ToString("yyyy-MM-dd"),
                confirmes = dayRdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                annules   = dayRdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            };
        }).ToList();

        return Ok(new
        {
            totalRdv       = rdvs.Count,
            rdvConfirmes   = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
            rdvAnnules     = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            rdvNonSignes   = rdvs.Count(r => r.Statut == StatutRendezVous.NON_SIGNE),
            rdvSignes      = rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE),
            r2             = rdvs.Count(r => r.Statut == StatutRendezVous.R2),
            okFinancement  = rdvs.Count(r => r.Statut == StatutRendezVous.INSTALLE),
            rdvAReporter   = rdvs.Count(r => r.Statut == StatutRendezVous.REPORTER),
            pose           = rdvs.Count(r => r.Statut == StatutRendezVous.PORTE),
            statistiquesParJour = statsParJour
        });
    }

    // =========================
    // STATUTS
    // =========================

    [HttpPut("rdv/{id}/statut")]
    public async Task<IActionResult> UpdateRdvStatut(long id, [FromBody] UpdateRdvStatutDTO dto)
    {
        var rdv = await _context.RendezVous.FindAsync(id);
        if (rdv == null)
            return NotFound(new { message = "Rendez-vous non trouvé" });

        rdv.Statut = Enum.Parse<StatutRendezVous>(dto.Statut);
        rdv.CommentaireConfirmation = dto.Commentaire;

        // Workflow : envoyer vers Client 1 ou Client 2
        if (!string.IsNullOrEmpty(dto.TypeRendezVous))
            rdv.TypeRendezVous = dto.TypeRendezVous;

        // Sauvegarder Projet sur le contact si fourni
        if (!string.IsNullOrEmpty(dto.Projet) && rdv.ContactId != 0)
        {
            var contact = await _context.Contacts.FindAsync(rdv.ContactId);
            if (contact != null) { contact.Projet = dto.Projet; }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Statut mis à jour", typeRendezVous = rdv.TypeRendezVous });
    }

    // =========================
    // FICHIERS CONTACTS
    // =========================

    [HttpGet("fichiers-contacts")]
    public async Task<IActionResult> GetFichiersContacts()
    {
        var fichiers = await _context.FichiersImport
            .OrderByDescending(f => f.DateImport)
            .Select(f => new FichierContactDTO
            {
                Id = (int)f.Id,
                Nom = f.NomFichier,
                DateInjection = f.DateImport,
                NombreContacts = f.NombreTotalLignes,
                Statut = f.Statut.ToString()
            })
            .ToListAsync();

        return Ok(fichiers);
    }

    [HttpPost("upload-contacts")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadContacts([FromForm] UploadContactsDto dto)
    {
        if (dto.File == null || dto.File.Length == 0)
            return BadRequest(new { message = "Aucun fichier sélectionné" });

        try
        {
            var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadPath))
                Directory.CreateDirectory(uploadPath);

            var fileName = $"{DateTime.Now:yyyyMMdd_HHmmss}_{dto.File.FileName}";
            var filePath = Path.Combine(uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.File.CopyToAsync(stream);
            }

            var lineCount = 0;
            using (var reader = new StreamReader(filePath))
            {
                while (await reader.ReadLineAsync() != null)
                    lineCount++;
            }
            var contactCount = Math.Max(0, lineCount - 1);

            var fichierImport = new FichierImport
            {
                NomFichier = dto.Campagne ?? dto.File.FileName,
                DateImport = DateTime.UtcNow,
                Importateur = User.Identity?.Name ?? "System",
                NombreTotalLignes = contactCount,
                NombreContactsImportes = contactCount,
                NombreErreurs = 0,
                Actif = true,
                Source = "Upload",
                Statut = StatutImport.TERMINE
            };

            _context.FichiersImport.Add(fichierImport);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Fichier importé avec succès", contactsCount = contactCount });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Erreur: {ex.Message}" });
        }
    }

    [HttpDelete("fichiers-contacts/{id}")]
    public async Task<IActionResult> DeleteFichierContact(long id)
    {
        var fichier = await _context.FichiersImport.FindAsync(id);
        if (fichier == null)
            return NotFound(new { message = "Fichier non trouvé" });

        _context.FichiersImport.Remove(fichier);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Fichier supprimé avec succès" });
    }

    // =========================
    // CRÉATION DE RENDEZ-VOUS (TEST)
    // =========================

    [HttpPost("rdv")]
    public async Task<IActionResult> CreateRdv([FromBody] CreateRdvDTO dto)
    {
        // Vérifier si le contact existe
        var contact = await _context.Contacts.FindAsync(dto.ContactId);
        if (contact == null)
            return NotFound(new { message = $"Contact {dto.ContactId} non trouvé" });

        // Vérifier si l'agent existe
        var agent = await _context.Agents.FindAsync(dto.AgentId);
        if (agent == null)
            return NotFound(new { message = $"Agent {dto.AgentId} non trouvé" });

        var rdv = new RendezVous
        {
            ContactId = dto.ContactId,
            AgentId = dto.AgentId,
            CommercialId = dto.CommercialId,
            DateCreation = DateTime.UtcNow,
            DateRendezVous = dto.DateRendezVous,
            Statut = Enum.Parse<StatutRendezVous>(dto.Statut),
            TypeProjet = dto.TypeProjet,
            Commentaire = dto.Commentaire
        };

        _context.RendezVous.Add(rdv);
        await _context.SaveChangesAsync();

        return Ok(new 
        { 
            message = "Rendez-vous créé avec succès",
            rendezVous = new
            {
                rdv.Id,
                rdv.ContactId,
                rdv.AgentId,
                rdv.DateRendezVous,
                rdv.Statut,
                contactNom = contact.Nom,
                contactPrenom = contact.Prenom,
                agentNom = $"{agent.Prenom} {agent.Nom}"
            }
        });
    }
}

// =========================
// DTOs (à placer en dehors de la classe)
// =========================

public class UpdateRdvStatutDTO
{
    public string Statut { get; set; } = string.Empty;
    public string? Commentaire { get; set; }
    public string? Projet { get; set; }
    /// <summary>CLIENT1 | CLIENT2 — fourni lors du passage vers l'agenda client</summary>
    public string? TypeRendezVous { get; set; }
}

public class CreateRdvDTO
{
    public long ContactId { get; set; }
    public long AgentId { get; set; }
    public long? CommercialId { get; set; }
    public DateTime DateRendezVous { get; set; }
    public string Statut { get; set; } = "BRUT";
    public string? TypeProjet { get; set; }
    public string? Commentaire { get; set; }
}