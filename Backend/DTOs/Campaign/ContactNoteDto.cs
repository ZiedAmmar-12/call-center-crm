using System.ComponentModel.DataAnnotations;
using Backend.Constants;
namespace Backend.DTOs.Campaign
{
    public class CreateContactNoteDto
    {
        [MaxLength(50)]
        public string NoteType { get; set; } = ContactNoteTypes.General;

        [Required]
        [MaxLength(4000)]
        public string Body { get; set; } = string.Empty;
    }

    public class UpdateContactNoteDto
    {
        [MaxLength(50)]
        public string? NoteType { get; set; }

        [Required]
        [MaxLength(4000)]
        public string Body { get; set; } = string.Empty;
    }

    public class ContactNoteDto
    {
        public int Id { get; set; }
        public int CampaignId { get; set; }
        public int CampaignFileContactId { get; set; }
        public int? SourceFileContactId { get; set; }
        public int AuthorUserId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorRole { get; set; }
        public string NoteType { get; set; } = ContactNoteTypes.General;
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int? UpdatedByUserId { get; set; }
        public string? UpdatedByName { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public int? DeletedByUserId { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
