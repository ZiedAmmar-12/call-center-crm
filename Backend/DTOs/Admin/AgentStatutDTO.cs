namespace Backend.DTOs.Admin;

public class AgentStatutDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;
    public string? DureeAppel { get; set; }
    public int Appels { get; set; }
    public int Conversions { get; set; }
    public int Score { get; set; }
}