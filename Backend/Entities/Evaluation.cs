using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

/// <summary>Grille d'évaluation d'un agent par le service qualité ou une confirmatrice</summary>
public class Evaluation
{
    [Key]
    public long Id { get; set; }

    public long AgentId { get; set; }
    public virtual Agent Agent { get; set; } = null!;

    /// <summary>Utilisateur qui a fait l'évaluation (confirmatrice, qualité, admin)</summary>
    public long EvaluateurId { get; set; }

    public DateTime DateEvaluation { get; set; } = DateTime.UtcNow;

    // ── Critères de la grille ──────────────────────────────────────────────
    public int NotePitchCommercial { get; set; }       // /10
    public int NoteTraitementObjections { get; set; }  // /10
    public int NoteQualiteAppel { get; set; }          // /10
    public int NoteRespectScript { get; set; }         // /10
    public int NoteEcoute { get; set; }                // /10

    /// <summary>Note globale calculée (moyenne des critères)</summary>
    public double NoteGlobale { get; set; }

    public string? Commentaire { get; set; }

    // ── Contexte de l'appel évalué ─────────────────────────────────────────
    public long? AppelId { get; set; }
    public virtual Appel? Appel { get; set; }

    // ── Stats de production au moment de l'évaluation ─────────────────────
    /// <summary>NB RDV bruts du mois en cours</summary>
    public int NbRdvBrut { get; set; }
    public int NbRdvConfirme { get; set; }
    public int NbRdvAnnule { get; set; }
    public int NbRdvSigne { get; set; }
    public int NbPose { get; set; }
}
