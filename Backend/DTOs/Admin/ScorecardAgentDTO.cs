using System.Collections.Generic;

namespace Backend.DTOs.Admin;

public class ScorecardAgentDTO
{
    public int Rang { get; set; }
    public long AgentId { get; set; }
    public string AgentNom { get; set; } = string.Empty;
    public int ScoreGlobal { get; set; }
    public int Appels { get; set; }
    public int Conversions { get; set; }
    public double Qualite { get; set; }
    public int ARevoir { get; set; }
    public string Tendance { get; set; } = "stable";
}

public class AgentSuiviDTO
{
    public long AgentId { get; set; }
    public string AgentNom { get; set; } = string.Empty;
    public int Score { get; set; }
    public int AppelsAVerifier { get; set; }
    public string Tendance { get; set; } = string.Empty;
}