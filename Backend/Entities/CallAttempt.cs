using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("call_attempts")]
    public class CallAttempt
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("campaign_id")]
        public int CampaignId { get; set; }

        [ForeignKey("CampaignId")]
        public Campaign? Campaign { get; set; }

        [Column("campaign_file_id")]
        public int CampaignFileId { get; set; }

        [ForeignKey("CampaignFileId")]
        public CampaignFile? CampaignFile { get; set; }

        [Column("campaign_file_contact_id")]
        public int CampaignFileContactId { get; set; }

        [ForeignKey("CampaignFileContactId")]
        public CampaignFileContact? CampaignFileContact { get; set; }

        [Column("source_file_contact_id")]
        public int SourceFileContactId { get; set; }

        [ForeignKey("SourceFileContactId")]
        public SourceFileContact? SourceFileContact { get; set; }

        [Column("agent_id")]
        public int AgentId { get; set; }

        [ForeignKey("AgentId")]
        public User? Agent { get; set; }

        [Column("attempt_number")]
        public int AttemptNumber { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "Assigned";

        [Column("qualification_status")]
        [MaxLength(50)]
        public string? QualificationStatus { get; set; }

        [Column("provider")]
        [MaxLength(50)]
        public string? Provider { get; set; }

        [Column("provider_call_id")]
        [MaxLength(100)]
        public string? ProviderCallId { get; set; }

        [Column("started_at")]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        [Column("answered_at")]
        public DateTime? AnsweredAt { get; set; }

        [Column("ended_at")]
        public DateTime? EndedAt { get; set; }

        [Column("duration_seconds")]
        public int? DurationSeconds { get; set; }

        [Column("recording_url")]
        [MaxLength(500)]
        public string? RecordingUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
