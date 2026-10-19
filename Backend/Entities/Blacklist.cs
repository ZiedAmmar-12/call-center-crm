using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("blacklist")]
    public class Blacklist
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("phone_number")]
        [MaxLength(50)]
        public string PhoneNumber { get; set; } = "";

        [Column("added_by_user_id")]
        public int AddedByUserId { get; set; }

        [ForeignKey("AddedByUserId")]
        public User? AddedByUser { get; set; }

        [Column("added_at")]
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        [Column("reason")]
        [MaxLength(255)]
        public string? Reason { get; set; }

        [Column("campaign_id")]
        public int? CampaignId { get; set; }

        [ForeignKey("CampaignId")]
        public Campaign? Campaign { get; set; }
    }
}
