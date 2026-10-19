using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Constants;

namespace Backend.Entities
{
    [Table("contact_notes")]
    public class ContactNote
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("campaign_id")]
        public int CampaignId { get; set; }

        [ForeignKey("CampaignId")]
        public Campaign? Campaign { get; set; }

        [Column("campaign_file_contact_id")]
        public int CampaignFileContactId { get; set; }

        [ForeignKey("CampaignFileContactId")]
        public CampaignFileContact? CampaignFileContact { get; set; }

        [Column("source_file_contact_id")]
        public int? SourceFileContactId { get; set; }

        [ForeignKey("SourceFileContactId")]
        public SourceFileContact? SourceFileContact { get; set; }

        [Column("author_user_id")]
        public int AuthorUserId { get; set; }

        [ForeignKey("AuthorUserId")]
        public User? Author { get; set; }

        [Column("note_type")]
        [MaxLength(50)]
        public string NoteType { get; set; } = ContactNoteTypes.General;

        [Column("body")]
        [MaxLength(4000)]
        public string Body { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_by_user_id")]
        public int? UpdatedByUserId { get; set; }

        [ForeignKey("UpdatedByUserId")]
        public User? UpdatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("deleted_by_user_id")]
        public int? DeletedByUserId { get; set; }

        [ForeignKey("DeletedByUserId")]
        public User? DeletedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }
    }
}
