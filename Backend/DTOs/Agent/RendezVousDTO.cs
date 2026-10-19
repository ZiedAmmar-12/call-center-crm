using System.ComponentModel.DataAnnotations;
using Backend.Entities;

namespace Backend.DTOs.Agent;

public class RendezVousDTO
{
    public long Id { get; set; }
    public long ContactId { get; set; }
    public string NomContact { get; set; } = string.Empty;
    public string TelephoneContact { get; set; } = string.Empty;
    public long AgentId { get; set; }
    public string NomAgent { get; set; } = string.Empty;
    public long? CommercialId { get; set; }
    public string? NomCommercial { get; set; }
    public DateTime DateCreation { get; set; }
    public DateTime DateRendezVous { get; set; }
    public StatutRendezVous Statut { get; set; }
    public string? TypeProjet { get; set; }
    public string? Commentaire { get; set; }
    public DateTime? DateReport { get; set; }
}

public class CreateRendezVousDTO
{
    [Required] public long ContactId { get; set; }
    [Required] public long AgentId { get; set; }
    [Required] public DateTime DateRendezVous { get; set; }
    public string? TypeProjet { get; set; }
    public string? Commentaire { get; set; }
}

public class UpdateRendezVousDTO
{
    public StatutRendezVous? Statut { get; set; }
    public DateTime? DateRendezVous { get; set; }
    public DateTime? DateReport { get; set; }
    public string? TypeProjet { get; set; }
    public string? Commentaire { get; set; }
    public long? CommercialId { get; set; }
}