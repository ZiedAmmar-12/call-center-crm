namespace Backend.DTOs.Confirmation;

public class FichierContactDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public DateTime DateInjection { get; set; }
    public int NombreContacts { get; set; }
    public string Statut { get; set; } = string.Empty;
}