namespace Backend.DTOs.Confirmation;

public class ConfirmationDashboardDTO
{
    public int TotalRdv { get; set; }
    public int RdvConfirmes { get; set; }
    public int RdvAnnules { get; set; }
    public int RdvReportes { get; set; }
    public int NRP { get; set; }
    public List<RdvConfirmationDTO> RdvRecents { get; set; } = new();
    public List<StatutParJourDTO> StatsParJour { get; set; } = new();
}

public class RdvConfirmationDTO
{
    public long Id { get; set; }
    public long ContactId { get; set; }
    public string ContactNom { get; set; } = string.Empty;
    public string ContactPrenom { get; set; } = string.Empty;
    public string Telephone { get; set; } = string.Empty;
    public string? NumGSM { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string? CodePostal { get; set; }
    public string? Ville { get; set; }
    public string Source { get; set; } = string.Empty;
    public long? AgentId { get; set; }
    public string AgentNom { get; set; } = string.Empty;
    public DateTime DateCreation { get; set; }
    public DateTime DateRendezVous { get; set; }
    public string Statut { get; set; } = string.Empty;
    /// <summary>CLIENT1 | CLIENT2 | EBI | REFUS — utilisé pour le routage workflow</summary>
    public string? TypeRendezVous { get; set; }
    // Commentaires
    public string? CommentaireAgent { get; set; }       // commentaire de l'agent sur le RDV
    public string? CommentaireConfirmation { get; set; } // commentaire confirmatrice sur le RDV
    public string? CommentaireBanque { get; set; }
    public string? Projet { get; set; }
    // Qualification contact
    public DateTime? ProprietaireDepuis { get; set; }
    public string? ModeChauffage { get; set; }
    public string? ConsommationChauffage { get; set; }
    public int? AgeChaudiere { get; set; }
    public bool? EtudePV { get; set; }
    public bool? EquipePV { get; set; }
    public bool? EquipePAC { get; set; }
    public string? EtatToiture { get; set; }
    public string? EtatIsolation { get; set; }
    public double? Surface { get; set; }
    public int? NombrePersonnes { get; set; }
    public string? ProfessionMr { get; set; }
    public string? ProfessionMme { get; set; }
    public string? Credits { get; set; }
    public string? Revenus { get; set; }
    public bool? Fichage { get; set; }
}

public class StatutParJourDTO
{
    public DateTime Date { get; set; }
    public int Confirme { get; set; }
    public int Annule { get; set; }
    public int NRP { get; set; }
}