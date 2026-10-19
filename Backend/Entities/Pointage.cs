using Microsoft.EntityFrameworkCore;  // Ajoutez cette ligne
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public class Pointage
{
    [Key]
    public long Id { get; set; }
    
    public long AgentId { get; set; }
    public virtual Agent? Agent { get; set; }
    
    public DateTime Date { get; set; }
    public DateTime? PremierAppel { get; set; }
    public DateTime? DernierAppel { get; set; }
    public int? TotalSecondesTravaillees { get; set; }
    
    public List<Pause> Pauses { get; set; } = new List<Pause>();
}

[Owned]  // Maintenant reconnu
public class Pause
{
    public DateTime Debut { get; set; }
    public DateTime Fin { get; set; }
    public int DureeSecondes { get; set; }
    public bool AlerteEnvoyee { get; set; }
}