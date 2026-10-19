namespace Backend.Entities;

public class Contact
{
    public long Id { get; set; }

    // ── Identité ──────────────────────────────────────────────────────────
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string Telephone { get; set; } = string.Empty;  // numéro fixe principal
    public string? NumGSM { get; set; }                    // numéro GSM alternatif
    public string? Email { get; set; }

    // ── Adresse ───────────────────────────────────────────────────────────
    public string? Adresse { get; set; }
    public string? CodePostal { get; set; }
    public string? Ville { get; set; }

    // ── Source ────────────────────────────────────────────────────────────
    public string Source { get; set; } = string.Empty;
    public DateTime DateImport { get; set; }

    // ── Qualification ─────────────────────────────────────────────────────
    public string Statut { get; set; } = "A_APPELER";

    /// <summary>
    /// Statut détaillé agent :
    /// NRP | HC_LOGEMENT | REFUS_HC_CONSO | RDV_CLIENT1 | RDV_CLIENT2 |
    /// HC_LANGUE | REFUS_PRESENCE_COUPLE | REFUS_HC_FINANCEMENT | REFUS_PAS_INTERESSE
    /// </summary>
    public string? StatutAgent { get; set; }

    // Gardé pour compatibilité ascendante
    public string? QualificationDetaillee { get; set; }

    public string? Commentaire { get; set; }               // commentaire agent
    public string? CommentaireConfirmation { get; set; }   // commentaire confirmatrice
    public string? CommentaireCommercial { get; set; }     // commentaire commercial
    public string? CommentaireBanque { get; set; }         // commentaire banque (conf client)
    public string? Projet { get; set; }                    // type de projet : PV, PAC, chaudière…

    // ── Type d'agenda (routing) ───────────────────────────────────────────
    /// <summary>CLIENT1 | CLIENT2 | EBI | REFUS | null</summary>
    public string? TypeRendezVous { get; set; }

    // ── Info propriété ────────────────────────────────────────────────────
    public DateTime? ProprietaireDepuis { get; set; }
    public string? ModeChauffage { get; set; }
    public string? ConsommationChauffage { get; set; }
    public int? AgeChaudiere { get; set; }

    // ── Énergie / travaux ─────────────────────────────────────────────────
    public bool? EtudePV { get; set; }
    public bool? EquipePV { get; set; }
    public bool? EquipePAC { get; set; }
    public string? EtatToiture { get; set; }
    public string? EtatIsolation { get; set; }
    public double? Surface { get; set; }                   // en m²

    // ── Situation personnelle ─────────────────────────────────────────────
    public int? NombrePersonnes { get; set; }
    public string? ProfessionMr { get; set; }
    public string? ProfessionMme { get; set; }
    public string? Credits { get; set; }
    public string? Revenus { get; set; }
    public bool? Fichage { get; set; }

    // ── Timing appels ─────────────────────────────────────────────────────
    public DateTime? DateDernierAppel { get; set; }
    public int? DureeDernierAppel { get; set; }            // en secondes
    public DateTime? DateRappelPlanifie { get; set; }

    // ── IA / Scoring ──────────────────────────────────────────────────────
    /// <summary>Compteur NRP cumulé (chaque appel sans réponse incrémente)</summary>
    public int NombreNRP { get; set; } = 0;
    /// <summary>Score de qualification IA (0-100) calculé par le microservice ML</summary>
    public double? ScoreIA { get; set; }
    /// <summary>Heure optimale de rappel recommandée par l'IA (ex: "09:00-11:00")</summary>
    public string? CreneauOptimalIA { get; set; }
    /// <summary>Date du dernier calcul du score IA</summary>
    public DateTime? DateScoreIA { get; set; }

    // ── Relations ─────────────────────────────────────────────────────────
    public long? AgentId { get; set; }
    public virtual Agent? Agent { get; set; }

    public long? FichierImportId { get; set; }
    public virtual FichierImport? FichierSource { get; set; }

    public virtual ICollection<Appel> HistoriqueAppels { get; set; } = new List<Appel>();
    public virtual RendezVous? RendezVous { get; set; }
}
