namespace Backend.DTOs.Salary;

public class SalaryDto
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? TypeContrat { get; set; }
    public string Month { get; set; } = string.Empty;
    public float BaseSalary { get; set; }
    public int RdvCount { get; set; }
    // Legacy fields (kept for DB compatibility)
    public int PoseCount { get; set; }
    public int RefusCount { get; set; }
    public float QualityRate { get; set; }
    public float RdvBonus { get; set; }
    public float PoseBonus { get; set; }
    public float QualityBonus { get; set; }
    public float InstallationBonus { get; set; }
    public float Penalties { get; set; }
    // New semantic fields
    public int Installations { get; set; }
    public int AbsenceCount { get; set; }
    public bool AssiduiteOk { get; set; }
    public float PrimeAssiduite { get; set; }
    public float PrimeInstallation { get; set; }
    public float TotalSalary { get; set; }
    public string PaymentStatus { get; set; } = "pending";
}

public class SalaryCalculationDto
{
    public long AgentId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? TypeContrat { get; set; }
    public string Month { get; set; } = string.Empty;
    public float BaseSalary { get; set; }
    public int RdvCount { get; set; }
    public int Installations { get; set; }
    public int AbsenceCount { get; set; }
    public bool AssiduiteOk { get; set; }
    public float PrimeAssiduite { get; set; }
    public float PrimeInstallation { get; set; }
    public float TotalSalary { get; set; }
    // Legacy
    public int PoseCount { get; set; }
    public int RefusCount { get; set; }
    public float QualityRate { get; set; }
    public float RdvBonus { get; set; }
    public float PoseBonus { get; set; }
    public float QualityBonus { get; set; }
    public float InstallationBonus { get; set; }
    public float Penalties { get; set; }
    public int RetardCount { get; set; }
    public float RetardPenalty { get; set; }
}

public class MonthlySummaryDto
{
    public string Month { get; set; } = string.Empty;
    public int TotalAgents { get; set; }
    public int CalculatedAgents { get; set; }
    public float TotalMass { get; set; }
    public float AvgSalary { get; set; }
    public float MaxSalary { get; set; }
    public string? BestAgent { get; set; }
    public float TotalPrimes { get; set; }
    public float TotalPenalties { get; set; }
    public Dictionary<string, int> PaymentStatus { get; set; } = new();
}

public class SalaryRuleDto
{
    public long Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public float Amount { get; set; }
    public string Role { get; set; } = "agent";
    public bool IsActive { get; set; } = true;
}

public class CreateSalaryRuleDto
{
    public string RuleName { get; set; } = string.Empty;
    public string RuleType { get; set; } = string.Empty;
    public float Amount { get; set; }
    public string? Role { get; set; } = "agent";
    public bool? IsActive { get; set; } = true;
}

public class UpdateSalaryRuleDto
{
    public string? RuleName { get; set; }
    public string? RuleType { get; set; }
    public float? Amount { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

public class PaymentStatusDto
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>Paramètres salaires PT/MT — modifiable SuperAdmin uniquement</summary>
public class SalaryConfigDto
{
    // Plein Temps
    public float PT_BaseSalary { get; set; } = 900f;
    public float PT_PrimeAssiduite { get; set; } = 100f;
    public int   PT_SeuilRdv { get; set; } = 21;
    public float PT_Install1 { get; set; } = 300f;
    public float PT_InstallExtra { get; set; } = 100f;

    // Mi-Temps
    public float MT_BaseSalary { get; set; } = 600f;
    public float MT_PrimeAssiduite { get; set; } = 100f;
    public int   MT_SeuilRdv { get; set; } = 12;
    public float MT_Install1 { get; set; } = 300f;
    public float MT_InstallExtra { get; set; } = 150f;
}
