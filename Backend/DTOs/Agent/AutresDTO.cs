using System.ComponentModel.DataAnnotations;
using Backend.Entities;

namespace Backend.DTOs.Agent;

// ─── POINTAGE ────────────────────────────────────────────────────────────────

public class PointageDTO
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public string NomAgent { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? PremierAppel { get; set; }
    public DateTime? DernierAppel { get; set; }
    public int? TotalSecondesTravaillees { get; set; }
    public string TempsTravailleFormate { get; set; } = string.Empty;
    public List<PauseDTO> Pauses { get; set; } = new();
}

public class PauseDTO
{
    public DateTime Debut { get; set; }
    public DateTime Fin { get; set; }
    public int DureeSecondes { get; set; }
    public bool AlerteEnvoyee { get; set; }
}

// ─── FICHIER IMPORT ───────────────────────────────────────────────────────────

public class FichierImportDTO
{
    public long Id { get; set; }
    public string NomFichier { get; set; } = string.Empty;
    public DateTime DateImport { get; set; }
    public string Importateur { get; set; } = string.Empty;
    public int NombreTotalLignes { get; set; }
    public int NombreContactsImportes { get; set; }
    public int NombreErreurs { get; set; }
    public bool Actif { get; set; }
    public string Source { get; set; } = string.Empty;
    public StatutImport Statut { get; set; }
    public List<string> Erreurs { get; set; } = new();
}

public class CreateFichierImportDTO
{
    [Required] public string NomFichier { get; set; } = string.Empty;
    [Required] public string Importateur { get; set; } = string.Empty;
    [Required] public string Source { get; set; } = string.Empty;
}