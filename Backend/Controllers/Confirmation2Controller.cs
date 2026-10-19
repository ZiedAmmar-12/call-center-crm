using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Confirmation;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/confirmation2")]
[Authorize(Roles = "CONFIRMATRICE")]
public class Confirmation2Controller : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public Confirmation2Controller(ApplicationDbContext context)
    {
        _context = context;
    }

    // =========================
    // DASHBOARD (NOUVEAU)
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
    // AGENDA (existant)
    // =========================

    [HttpGet("agenda")]
    public async Task<IActionResult> GetAgenda()
    {
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.CONFIRME || r.Statut == StatutRendezVous.BRUT)
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        return Ok(rdvs.Select(r => new RdvConfirmationDTO
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
        }));
    }

    // =========================
    // AGENDA EBI (NOUVEAU)
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

        return Ok(rdvs.Select(r => new RdvConfirmationDTO
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
        }));
    }

    // =========================
    // AGENDA CLIENT 1 (NOUVEAU)
    // =========================

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

        return Ok(rdvs.Select(r => new RdvConfirmationDTO
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
        }));
    }

    // =========================
    // ÉVALUATION DES AGENTS (NOUVEAU)
    // =========================

    [HttpGet("evaluation")]
    public async Task<IActionResult> GetEvaluation()
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

    // =========================
    // STATISTIQUES GLOBALES (NOUVEAU)
    // =========================

    [HttpGet("statistiques")]
    public async Task<IActionResult> GetStatistiques([FromQuery] string periode = "mois")
    {
        var aujourd = DateTime.UtcNow;
        DateTime dateDebut;
        
        switch (periode.ToLower())
        {
            case "semaine":
                dateDebut = aujourd.AddDays(-7);
                break;
            case "mois":
                dateDebut = DateTime.SpecifyKind(new DateTime(aujourd.Year, aujourd.Month, 1), DateTimeKind.Utc);
                break;
            case "trimestre":
                dateDebut = aujourd.AddMonths(-3);
                break;
            default:
                dateDebut = DateTime.SpecifyKind(new DateTime(aujourd.Year, aujourd.Month, 1), DateTimeKind.Utc);
                break;
        }

        var rdvs = await _context.RendezVous
            .Where(r => r.DateCreation >= dateDebut)
            .ToListAsync();

        var statsParJour = new List<StatistiqueParJourDTO>();
        for (int i = -6; i <= 0; i++)
        {
            var date = aujourd.Date.AddDays(i);
            var rdvsJour = rdvs.Where(r => r.DateCreation.Date == date).ToList();
            statsParJour.Add(new StatistiqueParJourDTO
            {
                Date = date,
                Confirmes = rdvsJour.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                Annules = rdvsJour.Count(r => r.Statut == StatutRendezVous.ANNULE),
                Reportes = rdvsJour.Count(r => r.Statut == StatutRendezVous.REPORTER)
            });
        }

        return Ok(new StatistiquesGlobalesDTO
        {
            TotalRdv = rdvs.Count,
            RdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
            RdvAnnules = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            RdvNonSignes = rdvs.Count(r => r.Statut == StatutRendezVous.NON_SIGNE),
            RdvSignes = rdvs.Count(r => r.Statut == StatutRendezVous.SIGNE),
            R2 = 0,
            OkFinancement = 0,
            RdvAReporter = rdvs.Count(r => r.Statut == StatutRendezVous.REPORTER),
            Pose = 0,
            StatistiquesParJour = statsParJour
        });
    }

    // =========================
    // COMMERCIAUX (existant)
    // =========================

    [HttpGet("commerciaux")]
    public async Task<IActionResult> GetCommerciaux()
    {
        var commerciaux = await _context.Commerciaux
            .Select(c => new { c.Id, Nom = $"{c.Prenom} {c.Nom}" })
            .ToListAsync();
        return Ok(commerciaux);
    }

    // =========================
    // ASSIGNER COMMERCIAL (existant)
    // =========================

    [HttpPost("rdv/{id}/assigner")]
    public async Task<IActionResult> AssignerCommercial(long id, [FromBody] AssignerCommercialDTO dto)
    {
        var rdv = await _context.RendezVous.FindAsync(id);
        if (rdv == null)
            return NotFound(new { message = "Rendez-vous non trouvé" });

        rdv.CommercialId = dto.CommercialId;
        rdv.Statut = StatutRendezVous.CONFIRME;
        
        await _context.SaveChangesAsync();
        return Ok(new { message = "Rendez-vous assigné au commercial" });
    }

    // =========================
    // COMMENTAIRE BANQUE (existant)
    // =========================

    [HttpPut("rdv/{id}/banque")]
    public async Task<IActionResult> UpdateCommentaireBanque(long id, [FromBody] UpdateBanqueDTO dto)
    {
        var rdv = await _context.RendezVous.FindAsync(id);
        if (rdv == null)
            return NotFound();

        rdv.CommentaireBanque = dto.CommentaireBanque;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Commentaire banque mis à jour" });
    }

    // =========================
    // MISE À JOUR STATUT (NOUVEAU)
    // =========================

    [HttpPut("rdv/{id}/statut")]
    public async Task<IActionResult> UpdateRdvStatut(long id, [FromBody] UpdateRdvStatutDTO dto)
    {
        var rdv = await _context.RendezVous.FindAsync(id);
        if (rdv == null)
            return NotFound(new { message = "Rendez-vous non trouvé" });

        rdv.Statut = Enum.Parse<StatutRendezVous>(dto.Statut);
        rdv.CommentaireConfirmation = dto.Commentaire;
        if (!string.IsNullOrEmpty(dto.TypeRendezVous))
            rdv.TypeRendezVous = dto.TypeRendezVous;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Statut mis à jour", typeRendezVous = rdv.TypeRendezVous });
    }
}



