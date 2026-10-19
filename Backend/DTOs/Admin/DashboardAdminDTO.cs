using System.Collections.Generic;

namespace Backend.DTOs.Admin;

public class DashboardAdminDTO
{
    public int AgentsEnLigne { get; set; }
    public int TotalAgents { get; set; }
    public int EnAppel { get; set; }
    public int AppelsDuJour { get; set; }
    public double TauxConversion { get; set; }
    public List<AlerteDTO> Alertes { get; set; } = new();
    public List<PerformanceHoraireDTO> PerformanceHoraire { get; set; } = new();
}

public class AlerteDTO
{
    public string AgentNom { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class PerformanceHoraireDTO
{
    public string Heure { get; set; } = string.Empty;
    public int Appels { get; set; }
    public int Conversions { get; set; }
}