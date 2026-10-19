using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

/// <summary>Règle de calcul du salaire (prime RDV, prime pose, pénalité, etc.)</summary>
public class SalaryRule
{
    [Key]
    public long Id { get; set; }

    [Required, MaxLength(100)]
    public string RuleName { get; set; } = string.Empty;

    /// <summary>Type : base_salary | rdv_bonus | pose_bonus | quality_bonus | installation_bonus | refus_penalty | absence_penalty</summary>
    [Required, MaxLength(50)]
    public string RuleType { get; set; } = string.Empty;

    public float Amount { get; set; }

    [MaxLength(50)]
    public string Role { get; set; } = "agent";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Salaire calculé d'un agent pour un mois donné</summary>
public class SalaireAgent
{
    [Key]
    public long Id { get; set; }

    public long AgentId { get; set; }

    /// <summary>Format "yyyy-MM" ex: 2024-07</summary>
    [Required, MaxLength(7)]
    public string Month { get; set; } = string.Empty;

    public float BaseSalary { get; set; }
    public int RdvCount { get; set; }
    public int PoseCount { get; set; }
    public int RefusCount { get; set; }
    public float QualityRate { get; set; }
    public float RdvBonus { get; set; }
    public float PoseBonus { get; set; }
    public float QualityBonus { get; set; }
    public float InstallationBonus { get; set; }
    public float Penalties { get; set; }
    public float TotalSalary { get; set; }

    [MaxLength(20)]
    public string PaymentStatus { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(AgentId))]
    public virtual Utilisateur? Agent { get; set; }
}
