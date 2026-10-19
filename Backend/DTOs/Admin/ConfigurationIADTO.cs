namespace Backend.DTOs.Admin;

public class ConfigurationIADTO
{
    public PonderationScoreDTO Ponderation { get; set; } = new();
    public SeuilsAlerteDTO Seuils { get; set; } = new();
    public AnalyseSentimentDTO AnalyseSentiment { get; set; } = new();
}

public class PonderationScoreDTO
{
    public int EcouteActive { get; set; } = 20;
    public int Persuasion { get; set; } = 20;
    public int Empathie { get; set; } = 15;
    public int Argumentation { get; set; } = 15;
    public int GestionObjections { get; set; } = 15;
    public int Closing { get; set; } = 15;
}

public class SeuilsAlerteDTO
{
    public int ScoreMinimumAcceptable { get; set; } = 70;
    public int DureeInactiviteMax { get; set; } = 15;
    public int TauxConversionMinimum { get; set; } = 40;
}

public class AnalyseSentimentDTO
{
    public bool ActiverTempsReel { get; set; } = true;
    public bool AlertesSentimentNegatif { get; set; } = true;
    public bool SuggestionsAutomatiques { get; set; } = false;
}