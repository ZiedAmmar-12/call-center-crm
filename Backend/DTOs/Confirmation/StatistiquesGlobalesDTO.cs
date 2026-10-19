namespace Backend.DTOs.Confirmation;

public class StatistiqueParJourDTO
{
    public DateTime Date { get; set; }
    public int Confirmes { get; set; }
    public int Annules { get; set; }
    public int Reportes { get; set; }
}

public class StatistiquesGlobalesDTO
{
    public int TotalRdv { get; set; }
    public int RdvConfirmes { get; set; }
    public int RdvAnnules { get; set; }
    public int RdvNonSignes { get; set; }
    public int RdvSignes { get; set; }
    public int R2 { get; set; }
    public int OkFinancement { get; set; }
    public int RdvAReporter { get; set; }
    public int Pose { get; set; }
    public List<StatistiqueParJourDTO> StatistiquesParJour { get; set; } = new();
}