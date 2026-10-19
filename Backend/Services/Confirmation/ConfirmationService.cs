using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Confirmation;
using Backend.Entities;

namespace Backend.Services.Confirmation;

public class ConfirmationService : IConfirmationService
{
    private readonly ApplicationDbContext _context;

    public ConfirmationService(ApplicationDbContext context)
    {
        _context = context;
    }

    // ─── Pour Confirmatrice 1 ─────────────────────────────────────────────

    public async Task<ConfirmationDashboardDTO> GetDashboardAsync()
    {
        var aujourd = DateTime.UtcNow.Date;
        
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.DateRendezVous >= aujourd)
            .OrderBy(r => r.DateRendezVous)
            .Take(50)
            .ToListAsync();

        return new ConfirmationDashboardDTO
        {
            TotalRdv = rdvs.Count,
            RdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
            RdvAnnules = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE),
            RdvReportes = rdvs.Count(r => r.Statut == StatutRendezVous.REPORTER),
            NRP = 0,
            RdvRecents = rdvs.Select(r => MapToRdvConfirmationDTO(r)).ToList()
        };
    }

    public async Task<List<AgentEvaluationDTO>> GetAgentsEvaluationAsync()
    {
        var agents = await _context.Agents
            .Select(a => new AgentEvaluationDTO
            {
                AgentId = a.Id,
                AgentNom = $"{a.Prenom} {a.Nom}",
                Brut = _context.RendezVous.Count(r => r.AgentId == a.Id),
                Confirme = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.CONFIRME),
                Annule = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.ANNULE),
                Porte = 0,
                PasSigne = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.NON_SIGNE),
                Signe = _context.RendezVous.Count(r => r.AgentId == a.Id && r.Statut == StatutRendezVous.SIGNE),
                R2 = 0,
                PasInteresse = 0
            })
            .ToListAsync();

        return agents;
    }

    public async Task<List<FichierContactDTO>> GetFichiersContactsAsync()
    {
        var fichiers = await _context.FichiersImport
            .Select(f => new FichierContactDTO
            {
                Id = f.Id,
                Nom = f.NomFichier,
                DateInjection = f.DateImport,
                NombreContacts = f.NombreTotalLignes
            })
            .ToListAsync();

        return fichiers;
    }

    public async Task<StatistiquesGlobalesDTO> GetStatistiquesGlobalesAsync(string periode = "mois")
    {
        var aujourd = DateTime.UtcNow;  // ← "aujourd" pas "aujourdhui"
        DateTime dateDebut;
        
        switch (periode.ToLower())
        {
            case "semaine":
                dateDebut = aujourd.AddDays(-7);
                break;
            case "mois":
                dateDebut = new DateTime(aujourd.Year, aujourd.Month, 1);  // ← "aujourd"
                break;
            case "trimestre":
                dateDebut = aujourd.AddMonths(-3);
                break;
            default:
                dateDebut = new DateTime(aujourd.Year, aujourd.Month, 1);  // ← "aujourd"
                break;
        }

        var rdvs = await _context.RendezVous
            .Where(r => r.DateCreation >= dateDebut)
            .ToListAsync();

        // Statistiques par jour pour le graphique
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

        return new StatistiquesGlobalesDTO
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
        };
    }

    public async Task<RdvConfirmationDTO> UpdateRdvStatutAsync(long rdvId, string statut, string? commentaire)
    {
        var rdv = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .FirstOrDefaultAsync(r => r.Id == rdvId);

        if (rdv == null)
            throw new Exception("Rendez-vous non trouvé");

        rdv.Statut = Enum.Parse<StatutRendezVous>(statut);
        rdv.Commentaire = commentaire;
        await _context.SaveChangesAsync();

        return MapToRdvConfirmationDTO(rdv);
    }

    // ─── Pour Confirmatrice 2 ─────────────────────────────────────────────

    public async Task<List<RdvConfirmationDTO>> GetAgendaClientAsync()
    {
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .Where(r => r.Statut == StatutRendezVous.CONFIRME || r.Statut == StatutRendezVous.BRUT)
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        return rdvs.Select(MapToRdvConfirmationDTO).ToList();
    }

    public async Task<List<CommercialDTO>> GetCommerciauxAsync()
    {
        var commerciaux = await _context.Commerciaux
            .Select(c => new CommercialDTO
            {
                Id = c.Id,
                Nom = c.Nom,
                Prenom = c.Prenom,
                Email = c.Email
            })
            .ToListAsync();

        return commerciaux;
    }

    public async Task<RdvConfirmationDTO> AssignerCommercialAsync(long rdvId, long commercialId)
    {
        var rdv = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .FirstOrDefaultAsync(r => r.Id == rdvId);

        if (rdv == null)
            throw new Exception("Rendez-vous non trouvé");

        rdv.CommercialId = commercialId;
        rdv.Statut = StatutRendezVous.CONFIRME;
        await _context.SaveChangesAsync();

        return MapToRdvConfirmationDTO(rdv);
    }

    public async Task<RdvConfirmationDTO> UpdateCommentaireBanqueAsync(long rdvId, string? commentaire)
    {
        var rdv = await _context.RendezVous
            .Include(r => r.Contact)
            .Include(r => r.Agent)
            .FirstOrDefaultAsync(r => r.Id == rdvId);

        if (rdv == null)
            throw new Exception("Rendez-vous non trouvé");

        rdv.Commentaire = commentaire;
        await _context.SaveChangesAsync();

        return MapToRdvConfirmationDTO(rdv);
    }

    private RdvConfirmationDTO MapToRdvConfirmationDTO(RendezVous rdv)
    {
        return new RdvConfirmationDTO
        {
            Id = rdv.Id,
            ContactId = rdv.Contact?.Id ?? 0,
            ContactNom = rdv.Contact?.Nom ?? "",
            ContactPrenom = rdv.Contact?.Prenom ?? "",
            Telephone = rdv.Contact?.Telephone ?? "",
            NumGSM = rdv.Contact?.NumGSM,
            Source = rdv.Contact?.Source ?? "",
            AgentId = rdv.AgentId,
            AgentNom = rdv.Agent != null ? $"{rdv.Agent.Prenom} {rdv.Agent.Nom}" : "",
            DateCreation = rdv.DateCreation,
            DateRendezVous = rdv.DateRendezVous,
            Statut = rdv.Statut.ToString(),
            CommentaireAgent = rdv.Commentaire,
            CommentaireConfirmation = rdv.CommentaireConfirmation,
        };
    }
}