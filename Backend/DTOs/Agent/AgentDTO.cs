using System.ComponentModel.DataAnnotations;
using Backend.Entities;

namespace Backend.DTOs.Agent;

// ─── READ ───────────────────────────────────────────────────────────────────

public class AgentDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public TypeContrat TypeContrat { get; set; }
    public int ObjectifMensuel { get; set; }
    public double SalaireBase { get; set; }
    public double PrimeAssiduite { get; set; }
    public bool Actif { get; set; }
    public DateTime DerniereConnexion { get; set; }
    public DateTime DateCreation { get; set; }
    public string? IdentifiantMachine { get; set; }
}

// ─── CREATE ─────────────────────────────────────────────────────────────────

public class CreateAgentDTO
{
    [Required] public string Nom { get; set; } = string.Empty;
    [Required] public string Prenom { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)] public string MotDePasse { get; set; } = string.Empty;
    [Required] public TypeContrat TypeContrat { get; set; }
    public int ObjectifMensuel { get; set; }
    public double SalaireBase { get; set; }
}

// ─── UPDATE ─────────────────────────────────────────────────────────────────

public class UpdateAgentDTO
{
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string? Email { get; set; }
    public TypeContrat? TypeContrat { get; set; }
    public int? ObjectifMensuel { get; set; }
    public double? SalaireBase { get; set; }
    public bool? Actif { get; set; }
}

// ─── VERIFY PC ──────────────────────────────────────────────────────────────

public class VerifierPCDTO
{
    [Required] public string IdentifiantMachine { get; set; } = string.Empty;
}