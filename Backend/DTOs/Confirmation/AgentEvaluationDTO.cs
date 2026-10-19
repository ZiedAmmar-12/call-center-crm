namespace Backend.DTOs.Confirmation;

public class AgentEvaluationDTO
{
    public long AgentId { get; set; }
    public string AgentNom { get; set; } = string.Empty;
    public int TotalAppels { get; set; }     // AJOUTER
    public int RdvConfirmes { get; set; }    // AJOUTER
    public int RdvAnnules { get; set; }      // AJOUTER
    public int RdvSignes { get; set; }       // AJOUTER
    public int Brut { get; set; }
    public int Confirme { get; set; }
    public int Annule { get; set; }
    public int Porte { get; set; }
    public int PasSigne { get; set; }
    public int Signe { get; set; }
    public int R2 { get; set; }
    public int PasInteresse { get; set; }
    public int ScoreGlobal { get; set; }
}