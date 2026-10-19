using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("lead_types")]
    public class LeadType
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("code")]
        [Required]
        [MaxLength(10)]
        public string Code { get; set; } = string.Empty;

        [Column("name")]
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("country_id")]
        public int CountryId { get; set; }

        // Navigation properties
        [ForeignKey("CountryId")]
        public Country Country { get; set; } = null!;
        public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
    }
}