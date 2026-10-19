using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Backend.Entities
{
    [Table("countries")]
    public class Country
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("name")]
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column("code")]
        [MaxLength(5)]
        public string Code { get; set; } = string.Empty;

        [Column("phone_prefix")]
        [MaxLength(5)]
        public string PhonePrefix { get; set; } = string.Empty;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
        public ICollection<LeadType> LeadTypes { get; set; } = new List<LeadType>();
    }
}