using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("campaign_file_contacts")]
    public class CampaignFileContact
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("campaign_file_id")]
        public int CampaignFileId { get; set; }

        [Column("campaign_id")]
        public int CampaignId { get; set; }
        [ForeignKey("CampaignId")]
        public Campaign? Campaign { get; set; }

        [Column("confirmation_status")]
        [MaxLength(50)]
        public string? ConfirmationStatus { get; set; }

        [Column("confirmed_by_user_id")]
        public int? ConfirmedByUserId { get; set; }

        [ForeignKey("ConfirmedByUserId")]
        public User? ConfirmedBy { get; set; }

        [Column("confirmed_at")]
        public DateTime? ConfirmedAt { get; set; }

        [Column("qualified_by_user_id")]
        public int? QualifiedByUserId { get; set; }
        [ForeignKey("CampaignFileId")]
        public CampaignFile? CampaignFile { get; set; }

        [Column("source_file_contact_id")]
        public int SourceFileContactId { get; set; }

        [ForeignKey("SourceFileContactId")]
        public SourceFileContact? SourceFileContact { get; set; }

        [Column("assigned_agent_id")]
        public int? AssignedAgentId { get; set; }

        [ForeignKey("AssignedAgentId")]
        public User? AssignedAgent { get; set; }

        // Call status tracking
        [Column("call_status")]
        [MaxLength(50)]
        public string CallStatus { get; set; } = "pending";  // pending, called, qualified, not_qualified, appointment, refused

        [Column("qualification_status")]
        [MaxLength(50)]
        public string? QualificationStatus { get; set; }  // nrp, rdv_client1, rdv_client2, refus, pas_interesse, etc.

        [Column("attempt_count")]
        public int AttemptCount { get; set; } = 0;

        [Column("max_attempts")]
        public int MaxAttempts { get; set; } = 3;

        [Column("last_call_at")]
        public DateTime? LastCallAt { get; set; }

        [Column("next_call_at")]
        public DateTime? NextCallAt { get; set; }

        // Call results
        [Column("call_duration_seconds")]
        public int CallDurationSeconds { get; set; }

        [Column("recording_url")]
        [MaxLength(500)]
        public string? RecordingUrl { get; set; }

        // Appointment tracking (for rdv_client1, rdv_client2)
        [Column("appointment_type")]
        [MaxLength(50)]
        public string? AppointmentType { get; set; }  // client1, client2

        [Column("appointment_date")]
        public DateTime? AppointmentDate { get; set; }

        // Comments
        [Column("agent_comment")]
        public string? AgentComment { get; set; }

        [Column("confirmation_comment")]
        public string? ConfirmationComment { get; set; }

        [Column("commercial_comment")]
        public string? CommercialComment { get; set; }


        // Tracking
        [Column("assigned_at")]
        public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;

        [Column("qualified_at")]
        public DateTime? QualifiedAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        [Column("projet")]
        public string? Projet { get; set; }
        //fiche de clients
        [Column("proprietaire_depuis")]
        public int? ProprietaireDepuis { get; set; }

        [Column("mode_chauffage")]
        [MaxLength(50)]
        public string? ModeChauffage { get; set; }

        [Column("consommation_chauffage")]
        [MaxLength(50)]
        public string? ConsommationChauffage { get; set; }

        [Column("age_chaudiere")]
        public int? AgeChaudiere { get; set; }

        [Column("equipe_pv")]
        public bool? EquipePV { get; set; }

        [Column("equipe_pac")]
        public bool? EquipePAC { get; set; }

        [Column("etat_toiture")]
        [MaxLength(50)]
        public string? EtatToiture { get; set; }

        [Column("etat_isolation")]
        [MaxLength(50)]
        public string? EtatIsolation { get; set; }

        [Column("nbre_personnes")]
        public int? NbrePersonnes { get; set; }

        [Column("profession_mr")]
        [MaxLength(100)]
        public string? ProfessionMr { get; set; }

        [Column("profession_mme")]
        [MaxLength(100)]
        public string? ProfessionMme { get; set; }

        [Column("revenus")]
        [MaxLength(50)]
        public string? Revenus { get; set; }

        [Column("credits")]
        public bool? Credits { get; set; }

        [Column("fichage")]
        public bool? Fichage { get; set; }
        [Column("is_assignable")]
        public bool IsAssignable { get; set; } = false;
        [Column("activated_at")]
        public DateTime? ActivatedAt { get; set; }
        [Column("random_order")]
        public double RandomOrder { get; set; }

        [Column("assignment_priority")]
        public int AssignmentPriority { get; set; } = 0;

        [Column("next_action")]
        [MaxLength(50)]
        public string? NextAction { get; set; }

    }
}
