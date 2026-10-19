namespace Backend.Entities;

public class FichierImport
{
    public long Id { get; set; }
    public string NomFichier { get; set; } = string.Empty;
    public DateTime DateImport { get; set; }
    public string Importateur { get; set; } = string.Empty;
    public int NombreTotalLignes { get; set; }
    public int NombreContactsImportes { get; set; }
    public int NombreErreurs { get; set; }
    public bool Actif { get; set; } = true;
    public string Source { get; set; } = string.Empty;
    public StatutImport Statut { get; set; }
    public List<string> Erreurs { get; set; } = new List<string>();
    
    public virtual ICollection<Contact> Contacts { get; set; } = new List<Contact>();
}

public enum StatutImport
{
    EN_COURS,
    TERMINE,
    ERREUR
}