using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Entities;

namespace Backend.Entities
{
    [Table("agent_profiles")]
    public class AgentProfile
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        // ==================== CONTRACT & BASIC INFO ====================
        [Column("hire_date")]
        public DateTime? HireDate { get; set; }

        [Column("type_contrat")]
        public string TypeContrat { get; set; } = "PLEIN_TEMPS"; // "PLEIN_TEMPS", "MI_TEMPS"

        [Column("objectif_mensuel")]
        public int ObjectifMensuel { get; set; } = 0;

        [Column("salaire_base")]
        public decimal SalaireBase { get; set; } = 0;

        [Column("prime_assiduite")]
        public decimal PrimeAssiduite { get; set; } = 100;

        // ==================== PERFORMANCE METRICS ====================
        [Column("total_rdv")]
        public int TotalRdv { get; set; } = 0;

        [Column("total_rdv_confirme")]
        public int TotalRdvConfirme { get; set; } = 0;

        [Column("total_rdv_signe")]
        public int TotalRdvSigne { get; set; } = 0;

        [Column("total_rdv_annule")]
        public int TotalRdvAnnule { get; set; } = 0;

        [Column("total_pose")]
        public int TotalPose { get; set; } = 0;

        [Column("note_evaluation_moyenne")]
        public decimal NoteEvaluationMoyenne { get; set; } = 0;

        // ==================== ACTIVITY ====================
        [Column("derniere_activite")]
        public DateTime? DerniereActivite { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}