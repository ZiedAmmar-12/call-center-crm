using System.Collections.Generic;

namespace Backend.DTOs.Admin;

public class PointageAdminDTO
{
    public int Presents { get; set; }
    public int TotalAgents { get; set; }
    public int Retards { get; set; }
    public string TempsMoyen { get; set; } = string.Empty;
    public string PausesMoyennes { get; set; } = string.Empty;
    public List<PointageDetailDTO> Details { get; set; } = new();
}

public class PointageDetailDTO
{
    public string AgentNom { get; set; } = string.Empty;
    public string Arrivee { get; set; } = string.Empty;
    public string PremierAppel { get; set; } = string.Empty;
    public string DernierAppel { get; set; } = string.Empty;
    public string Depart { get; set; } = string.Empty;
    public string Pauses { get; set; } = string.Empty;
    public string TempsProductif { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;
}