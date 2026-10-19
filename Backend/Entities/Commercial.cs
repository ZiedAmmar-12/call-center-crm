using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

public class Commercial : Utilisateur
{
    public string? Matricule { get; set; }
    public double TauxCommission { get; set; }
    
    public virtual ICollection<RendezVous> RendezVous { get; set; } = new List<RendezVous>();
    public virtual ICollection<Conge> Conges { get; set; } = new List<Conge>();
}

public class Conge
{
    [Key]
    public long Id { get; set; }
    
    public long CommercialId { get; set; }
    public virtual Commercial Commercial { get; set; } = null!;
    
    public DateTime DateDebut { get; set; }
    public DateTime DateFin { get; set; }
    public string Statut { get; set; } = "EN_ATTENTE";
}