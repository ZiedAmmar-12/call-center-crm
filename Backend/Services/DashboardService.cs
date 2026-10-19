using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Agent;
using Backend.Entities;

namespace Backend.Services;

public interface IDashboardService
{
    Task<DashboardAgentDTO> GetDashboardAgentAsync(long agentId);
    Task<HistoriqueStatsDTO> GetHistoriqueAsync(long agentId, string? filtre = null, string? recherche = null);
    Task<AgendaAgentDTO> GetAgendaAsync(long agentId);
}

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;

    public DashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    // ─── Tableau de bord ──────────────────────────────────────────────────────

    public async Task<DashboardAgentDTO> GetDashboardAgentAsync(long agentId)
    {
        var aujourd = DateTime.UtcNow.Date;
        var hier = aujourd.AddDays(-1);

        // Appels du jour
        var appelsAujourd = await _context.Appels
            .Include(a => a.Contact)
            .Where(a => a.AgentId == agentId && a.DateHeure.Date == aujourd)
            .ToListAsync();

        // Appels d'hier pour comparaison
        var appelsHier = await _context.Appels
            .Where(a => a.AgentId == agentId && a.DateHeure.Date == hier)
            .CountAsync();

        int totalAujourd = appelsAujourd.Count;
        int conversions = appelsAujourd.Count(a => a.Qualification == TypeQualification.RENDEZ_VOUS);
        double tauxConversion = totalAujourd > 0
            ? Math.Round((double)conversions / totalAujourd * 100, 1)
            : 0;

        double evolutionAppels = appelsHier > 0
            ? Math.Round((double)(totalAujourd - appelsHier) / appelsHier * 100, 1)
            : 0;

        // Pointage du jour → temps productif
        var pointage = await _context.Pointages
            .FirstOrDefaultAsync(p => p.AgentId == agentId && p.Date == aujourd);

        string tempsProductif = "0h 0m";
        if (pointage?.TotalSecondesTravaillees.HasValue == true)
        {
            var ts = TimeSpan.FromSeconds(pointage.TotalSecondesTravaillees.Value);
            tempsProductif = $"{(int)ts.TotalHours}h {ts.Minutes}m";
        }

        // Score qualité = % appels > 2 min (enregistrés)
        int scoreQualite = totalAujourd > 0
            ? (int)((double)appelsAujourd.Count(a => a.Enregistre) / totalAujourd * 100)
            : 0;

        // Statistiques par heure (08:00 → 18:00)
        var statParHeure = new List<HoraireStatDTO>();
        for (int h = 8; h <= 18; h++)
        {
            var appelsHeure = appelsAujourd.Where(a => a.DateHeure.Hour == h).ToList();
            statParHeure.Add(new HoraireStatDTO
            {
                Heure = $"{h:D2}:00",
                Appels = appelsHeure.Count,
                Conversions = appelsHeure.Count(a => a.Qualification == TypeQualification.RENDEZ_VOUS)
            });
        }

        // Appels récents (5 derniers)
        var appelsRecents = appelsAujourd
            .OrderByDescending(a => a.DateHeure)
            .Take(5)
            .Select(a => new AppelRecentDTO
            {
                Id = a.Id,
                Contact = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
                Societe = a.Contact?.Source ?? "",
                Duree = FormatDuree(a.DureeSecondes),
                Resultat = MapQualificationResultat(a.Qualification),
                Score = CalculerScore(a),
                DateHeure = a.DateHeure
            })
            .ToList();

        return new DashboardAgentDTO
        {
            AppelsDuJour = totalAujourd,
            ConversionsDuJour = conversions,
            TauxConversion = tauxConversion,
            TempsProductif = tempsProductif,
            ScoreQualite = scoreQualite,
            EvolutionAppels = evolutionAppels,
            StatistiquesParHeure = statParHeure,
            AppelsRecents = appelsRecents
        };
    }

    // ─── Historique ───────────────────────────────────────────────────────────

    public async Task<HistoriqueStatsDTO> GetHistoriqueAsync(
        long agentId, string? filtre = null, string? recherche = null)
    {
        var query = _context.Appels
            .Include(a => a.Contact)
            .Where(a => a.AgentId == agentId)
            .AsQueryable();

        // Filtre par qualification
        if (!string.IsNullOrEmpty(filtre) && filtre != "Tous les résultats")
        {
            var qualif = MapResultatQualification(filtre);
            if (qualif.HasValue)
                query = query.Where(a => a.Qualification == qualif.Value);
        }

        // Recherche par contact ou société
        if (!string.IsNullOrEmpty(recherche))
        {
            query = query.Where(a =>
                (a.Contact != null && (
                    a.Contact.Nom!.Contains(recherche) ||
                    a.Contact.Prenom!.Contains(recherche) ||
                    a.Contact.Source.Contains(recherche)
                )));
        }

        var appels = await query
            .OrderByDescending(a => a.DateHeure)
            .ToListAsync();

        int totalAppels = appels.Count;
        double dureeMoyenneSecondes = totalAppels > 0
            ? appels.Average(a => a.DureeSecondes)
            : 0;
        double scoreMoyen = totalAppels > 0
            ? appels.Average(a => CalculerScore(a))
            : 0;

        var items = appels.Select(a => new HistoriqueAppelDTO
        {
            Id = a.Id,
            DateHeure = a.DateHeure,
            Societe = a.Contact?.Source ?? "",
            Contact = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
            Duree = FormatDuree(a.DureeSecondes),
            Resultat = MapQualificationResultat(a.Qualification),
            Score = CalculerScore(a),
            Qualification = a.Qualification.ToString()
        }).ToList();

        return new HistoriqueStatsDTO
        {
            TotalAppels = totalAppels,
            DureeMoyenne = FormatDuree((int)dureeMoyenneSecondes),
            ScoreMoyen = Math.Round(scoreMoyen, 1),
            Appels = items
        };
    }

    // ─── Agenda ───────────────────────────────────────────────────────────────

    public async Task<AgendaAgentDTO> GetAgendaAsync(long agentId)
    {
        // Rendez-vous de l'agent
        var rdvs = await _context.RendezVous
            .Include(r => r.Contact)
            .Where(r => r.AgentId == agentId)
            .OrderBy(r => r.DateRendezVous)
            .ToListAsync();

        // Refus : appels qualifiés REFUS*
        var refus = await _context.Appels
            .Include(a => a.Contact)
            .Where(a => a.AgentId == agentId && (
                a.Qualification == TypeQualification.REFUS_ABSENCE_COUPLE ||
                a.Qualification == TypeQualification.REFUS_HORS_CIBLE_CONSO ||
                a.Qualification == TypeQualification.REFUS_PAS_INTERESSE ||
                a.Qualification == TypeQualification.REFUS_PAS_DE_PROJET
            ))
            .OrderByDescending(a => a.DateHeure)
            .ToListAsync();

        var rdvDto = rdvs.Select(r => new EvenementAgendaDTO
        {
            Id = r.Id,
            DateHeure = r.DateRendezVous,
            Contact = r.Contact != null ? $"{r.Contact.Prenom} {r.Contact.Nom}" : "",
            Societe = r.Contact?.Source ?? "",
            Statut = r.Statut.ToString(),
            Commentaire = r.Commentaire,
            Type = "RDV"
        }).ToList();

        var refusDto = refus.Select(a => new EvenementAgendaDTO
        {
            Id = a.Id,
            DateHeure = a.DateHeure,
            Contact = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
            Societe = a.Contact?.Source ?? "",
            Statut = MapQualificationResultat(a.Qualification),
            Type = "REFUS"
        }).ToList();

        return new AgendaAgentDTO
        {
            TotalRdv = rdvDto.Count,
            RdvConfirmes = rdvs.Count(r =>
                r.Statut == StatutRendezVous.CONFIRME ||
                r.Statut == StatutRendezVous.CONFIRME_CONF_CALL ||
                r.Statut == StatutRendezVous.CONFIRME_TOTAL),
            TotalRefus = refusDto.Count,
            ARecontacter = refus.Count(a => a.Qualification == TypeQualification.RAPPEL),
            RendezVous = rdvDto,
            Refus = refusDto
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static string FormatDuree(int secondes)
    {
        var ts = TimeSpan.FromSeconds(secondes);
        return $"{(int)ts.TotalMinutes}:{ts.Seconds:D2}";
    }

    private static int CalculerScore(Appel appel)
    {
        // Score basé sur durée et qualification
        int score = 50;
        if (appel.DureeSecondes > 300) score += 30;       // > 5 min
        else if (appel.DureeSecondes > 120) score += 15;   // > 2 min
        if (appel.Qualification == TypeQualification.RENDEZ_VOUS) score += 20;
        if (appel.Enregistre) score += 10;
        return Math.Min(score, 100);
    }

    private static string MapQualificationResultat(TypeQualification q) => q switch
    {
        TypeQualification.RENDEZ_VOUS => "Converti",
        TypeQualification.RAPPEL => "Rappel",
        TypeQualification.REFUS_ABSENCE_COUPLE or
        TypeQualification.REFUS_HORS_CIBLE_CONSO or
        TypeQualification.REFUS_PAS_INTERESSE or
        TypeQualification.REFUS_PAS_DE_PROJET => "Refusé",
        TypeQualification.NRP => "NRP",
        TypeQualification.REPONDEUR => "Répondeur",
        _ => q.ToString()
    };

    private static TypeQualification? MapResultatQualification(string resultat) => resultat switch
    {
        "Converti" => TypeQualification.RENDEZ_VOUS,
        "Rappel" => TypeQualification.RAPPEL,
        "Refusé" => TypeQualification.REFUS_PAS_INTERESSE,
        _ => null
    };
}