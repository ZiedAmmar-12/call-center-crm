using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Entities;


namespace Backend.Entities
{
    [Table("campaign_agents")]
    public class CampaignAgents
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("campaign_id")]
        public int CampaignId { get; set; }

        [ForeignKey("CampaignId")]
        public Campaign? Campaign { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Column("assigned_at")]
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        [Column("assigned_by_user_id")]
        public int AssignedByUserId { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // Optional: Track quota per agent in this campaign
        [Column("quota")]
        public int? Quota { get; set; }

        // Optional: Track weight for distribution
        [Column("weight")]
        public int? Weight { get; set; }
    }
}