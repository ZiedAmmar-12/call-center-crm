using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Entities;

namespace Backend.Entities  // or Backend.Entities - wherever this belongs
{
    [Table("contacts")]
    public class DistributedContact
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        // where it came from
        [Column("source_file_contact_id")]
        public int SourceFileContactId { get; set; }

        [Column("agent_id")]
        public int? AgentId { get; set; }  // assigned agent

        // contact info (copied from source_file_contact on inject)
        [Column("last_name")]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Column("first_name")]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Column("phone")]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [Column("email")]
        [MaxLength(150)]
        public string? Email { get; set; }

        [Column("address")]
        [MaxLength(255)]
        public string Address { get; set; } = string.Empty;

        [Column("postal_code")]
        [MaxLength(20)]
        public string PostalCode { get; set; } = string.Empty;

        [Column("city")]
        [MaxLength(100)]
        public string City { get; set; } = string.Empty;

        // CRM fields (qualification)
        [Column("status")]
        [MaxLength(50)]
        public string? Status { get; set; }

        [Column("comment")]
        [MaxLength(1000)]
        public string? Comment { get; set; }

        [Column("gsm")]
        [MaxLength(50)]
        public string? Gsm { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // navigation
        [ForeignKey(nameof(SourceFileContactId))]
        public virtual SourceFileContact? SourceFileContact { get; set; }

        [ForeignKey(nameof(AgentId))]
        public virtual User? Agent { get; set; }
    }
}