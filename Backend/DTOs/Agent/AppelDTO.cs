using System.ComponentModel.DataAnnotations;
using Backend.Entities;

namespace Backend.DTOs.Agent;

public class AppelDTO
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public string NomAgent { get; set; } = string.Empty;
    public long ContactId { get; set; }
    public string NomContact { get; set; } = string.Empty;
    public DateTime DateHeure { get; set; }
    public int DureeSecondes { get; set; }
    public TypeQualification Qualification { get; set; }
    public string? CheminEnregistrement { get; set; }
    public bool Enregistre { get; set; }
}

public class CreateAppelDTO
{
    [Required] public long AgentId { get; set; }
    [Required] public long ContactId { get; set; }
    [Required] public int DureeSecondes { get; set; }
    [Required] public TypeQualification Qualification { get; set; }
    public DateTime? DateRappelPlanifie { get; set; } // obligatoire si Qualification == RAPPEL
    public string? CheminEnregistrement { get; set; }
}