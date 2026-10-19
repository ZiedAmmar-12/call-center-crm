using System.Collections.Generic;

namespace Backend.DTOs.Admin;

public class CarteGeographiqueDTO
{
    public List<RegionStatsDTO> Regions { get; set; } = new();
    public StatistiquesGlobalesDTO Globales { get; set; } = new();
}

public class RegionStatsDTO
{
    public string Nom { get; set; } = string.Empty;
    public double TauxConversion { get; set; }
    public int Conversions { get; set; }
    public int Appels { get; set; }
}

public class StatistiquesGlobalesDTO
{
    public int TotalAppels { get; set; }
    public int Conversions { get; set; }
    public double TauxMoyen { get; set; }
}