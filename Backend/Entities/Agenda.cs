using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

public class Agenda
{
    [Key]
    public long Id { get; set; }
    
    public long AgentId { get; set; }
    public virtual Agent Agent { get; set; } = null!;
    
    public string Nom { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}