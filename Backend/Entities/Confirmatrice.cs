using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public enum TypeConfirmatrice
{
    CONF1,
    CONF2,
    CONFCLIENT  
}

public class Confirmatrice : Utilisateur
{
    public TypeConfirmatrice Type { get; set; }
    public string? Specialite { get; set; }
    
    // Nouvelle propriété : types d'agendas auxquels elle a accès
    // Format: "CLIENT1,CLIENT2,REFUS,EBI"
    public string? AgendasAccess { get; set; }
    
    public Confirmatrice()
    {
        Role = "CONFIRMATRICE";
        // Par défaut, donner accès à tous les agendas selon son type
        AgendasAccess = "CLIENT1,CLIENT2,REFUS,EBI";
    }
}