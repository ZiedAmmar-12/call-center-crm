using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Entities;
namespace Backend.Entities
{
    public enum CampaignStatus
    {
        Draft = 0,  // created, not yet activated
        Active = 1,  // agents calling
        Inactive = 2   // paused/stopped, resumable
    }

    [Table("campaigns")]
    public class Campaign
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;
        [Column("description")]
        [MaxLength(255)]
        public string? Description { get; set; }

        [Column("status")]
        public CampaignStatus Status { get; set; } = CampaignStatus.Active;

        [Column("start_date")]
        public DateTime? StartDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("created_by_user_id")]
        public int CreatedByUserId { get; set; }

        [ForeignKey("CreatedByUserId")]
        public User? CreatedByUser { get; set; }

        // Soft delete
        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by_user_id")]
        public int? DeletedByUserId { get; set; }
        [Column("auto_pool_sizing")]
        public bool AutoPoolSizing { get; set; } = true;
        [Column("active_pool_target")]
        public int ActivePoolTarget { get; set; } = 75000;
        [Column("low_contacts_threshold")]
        public int LowContactsThreshold { get; set; } = 20000;
        [Column("contacts_per_agent_per_hour")]
        public int ContactsPerAgentPerHour { get; set; } = 25;
        [Column("pool_buffer_hours")]
        public int PoolBufferHours { get; set; } = 7;
        [Column("max_pool_target")]
        public int MaxPoolTarget { get; set; } = 75000;
        [Column("min_pool_target")]
        public int MinPoolTarget { get; set; } = 5000;
        [Column("low_pool_ratio")]
        public decimal LowPoolRatio { get; set; } = 0.30m;



        // Navigation properties
        public List<CampaignFile> CampaignFiles { get; set; } = new();
        public List<CampaignAgents> CampaignAgents { get; set; } = new();
    }
}
