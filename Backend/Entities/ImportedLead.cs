using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

/// <summary>Lead importé depuis un fichier CSV/Excel (distinct des Contacts du CRM)</summary>
public class ImportedLead
{
    [Key]
    public long Id { get; set; }

    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? PostalCode { get; set; }
    public string? CompanyName { get; set; }
    public string? CampaignName { get; set; }

    /// <summary>new | assigned | contacted | converted | invalid</summary>
    public string? Status { get; set; } = "new";

    public int? AgentId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
