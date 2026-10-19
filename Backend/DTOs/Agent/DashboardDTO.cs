namespace Backend.DTOs.Agent;

// ─── Tableau de bord agent (page d'accueil) ──────────────────────────────────

public class DashboardAgentDTO
{
    // KPIs du jour
    public int AppelsDuJour { get; set; }
    public int ConversionsDuJour { get; set; }         // qualification = RENDEZ_VOUS
    public double TauxConversion { get; set; }          // %
    public string TempsProductif { get; set; } = string.Empty; // "6h 24m"
    public int ScoreQualite { get; set; }              // /100

    // Évolution vs hier
    public double EvolutionAppels { get; set; }        // +12%
    public double EvolutionConversions { get; set; }

    // Graphique : appels + conversions par heure (08:00 → 18:00)
    public List<HoraireStatDTO> StatistiquesParHeure { get; set; } = new();

    // Appels récents (5 derniers)
    public List<AppelRecentDTO> AppelsRecents { get; set; } = new();
}

public class HoraireStatDTO
{
    public string Heure { get; set; } = string.Empty; // "08:00"
    public int Appels { get; set; }
    public int Conversions { get; set; }
}

public class AppelRecentDTO
{
    public long Id { get; set; }
    public string Contact { get; set; } = string.Empty;
    public string Societe { get; set; } = string.Empty;
    public string Duree { get; set; } = string.Empty;   // "5:32"
    public string Resultat { get; set; } = string.Empty; // "Converti", "Rappel", "Refusé"
    public int Score { get; set; }
    public DateTime DateHeure { get; set; }
}

// ─── Historique appels (page Historique) ─────────────────────────────────────

public class HistoriqueAppelDTO
{
    public long Id { get; set; }
    public DateTime DateHeure { get; set; }
    public string Societe { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Duree { get; set; } = string.Empty;   // "5:32"
    public string Resultat { get; set; } = string.Empty;
    public int Score { get; set; }
    public string Qualification { get; set; } = string.Empty;
    // Stats globales en tête de page
    public int TotalAppels { get; set; }
    public string DureeMoyenne { get; set; } = string.Empty;
    public double ScoreMoyen { get; set; }
}

public class HistoriqueStatsDTO
{
    public int TotalAppels { get; set; }
    public string DureeMoyenne { get; set; } = string.Empty;
    public double ScoreMoyen { get; set; }
    public List<HistoriqueAppelDTO> Appels { get; set; } = new();
}

// ─── Agenda (page Agenda) ─────────────────────────────────────────────────────

public class AgendaAgentDTO
{
    public int TotalRdv { get; set; }
    public int RdvConfirmes { get; set; }
    public int TotalRefus { get; set; }
    public int ARecontacter { get; set; }
    public List<EvenementAgendaDTO> RendezVous { get; set; } = new();
    public List<EvenementAgendaDTO> Refus { get; set; } = new();
}

public class EvenementAgendaDTO
{
    public long Id { get; set; }
    public DateTime DateHeure { get; set; }
    public string Contact { get; set; } = string.Empty;
    public string Societe { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;  // "Confirmé", "Refusé", "Rappel"
    public string? Commentaire { get; set; }
    public string Type { get; set; } = string.Empty;    // "RDV" ou "REFUS"
}