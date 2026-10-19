using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

/// <summary>Règle d'alerte (seuil de qualité, inactivité, taux de conversion...)</summary>
public class AlertRule
{
    [Key]
    public long Id { get; set; }

    [Required, MaxLength(50)]
    public string RuleType { get; set; } = string.Empty;

    public int ThresholdValue { get; set; }
    public bool IsActive { get; set; } = true;
    public string? NotificationEmail { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Historique des alertes déclenchées</summary>
public class AlertHistory
{
    [Key]
    public long Id { get; set; }

    [Required]
    public string AgentName { get; set; } = string.Empty;

    [Required]
    public string AlertType { get; set; } = string.Empty;

    public float ActualValue { get; set; }
    public int ThresholdValue { get; set; }

    [MaxLength(20)]
    public string Severity { get; set; } = "warning";

    public string? Message { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
