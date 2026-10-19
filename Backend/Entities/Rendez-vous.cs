namespace Backend.Entities;

public class RendezVous
{
    public long Id { get; set; }
    public long ContactId { get; set; }
    public virtual Contact Contact { get; set; } = null!;

    public long AgentId { get; set; }
    public virtual Agent Agent { get; set; } = null!;

    public long? CommercialId { get; set; }
    public virtual Commercial? Commercial { get; set; }

    public DateTime DateCreation { get; set; }
    public DateTime DateRendezVous { get; set; }
    public StatutRendezVous Statut { get; set; }
    public string? TypeProjet { get; set; }

    /// <summary>CLIENT1 | CLIENT2 | EBI | REFUS</summary>
    public string? TypeRendezVous { get; set; }

    // ── Commentaires par rôle ──────────────────────────────────────────────
    public string? Commentaire { get; set; }               // agent
    public string? CommentaireConfirmation { get; set; }   // confirmatrice EBI/client1
    public string? CommentaireCommercial { get; set; }     // commercial
    public string? CommentaireBanque { get; set; }         // confirmatrice client (banque)

    public string? MotifRefus { get; set; }
    public bool ARecontacter { get; set; }
    public DateTime? DateReport { get; set; }
}

public enum StatutRendezVous
{
    BRUT            = 0,
    CONFIRME        = 1,
    ANNULE          = 2,
    REPORTER        = 3,
    HORS_CIBLE      = 4,
    SIGNE           = 5,
    NON_SIGNE       = 6,
    INSTALLE        = 7,
    R2              = 8,
    NRP             = 9,
    PORTE           = 10,
    /// <summary>Confirmé par la Conf Call → en attente de la Conf Client</summary>
    CONFIRME_CONF_CALL = 11,
    /// <summary>Confirmé totalement par la Conf Client → retour chez l'agent</summary>
    CONFIRME_TOTAL     = 12,
}
