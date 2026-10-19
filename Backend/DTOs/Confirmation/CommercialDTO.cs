namespace Backend.DTOs.Confirmation;

public class CommercialDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int TotalRdv { get; set; }
    public int RdvSignes { get; set; }
    public double TauxSignature { get; set; }
    public decimal ChiffreAffaire { get; set; }
}