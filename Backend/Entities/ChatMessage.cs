using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

/// <summary>Message de chat inter-services (SignalR + persistance BDD)</summary>
public class ChatMessage
{
    [Key]
    public long Id { get; set; }

    public long SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderRole { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    /// <summary>GENERAL | AGENTS | CONFIRMATRICES | QUALITE | TECHNIQUE | ADMIN</summary>
    public string Channel { get; set; } = "GENERAL";

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
