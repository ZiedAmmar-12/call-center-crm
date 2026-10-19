namespace Backend.DTOs.Agent;

public class CreateContactDTO
{
    // ── Identité ───────────────────────────────────────────────────────
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public required string Telephone { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string Source { get; set; } = string.Empty;

    /// <summary>Agent responsable du contact</summary>
    public long? AgentId { get; set; }

    // ── Logement ───────────────────────────────────────────────────────
    /// <summary>Année depuis laquelle le prospect est propriétaire (ex: 2010)</summary>
    public int? ProprietaireDepuis { get; set; }
    public string? ModeChauffage { get; set; }
    public string? ConsommationChauffage { get; set; }
    public int? AgeChaudiere { get; set; }
    public string? EtatToiture { get; set; }
    public string? EtatIsolation { get; set; }
    public double? Surface { get; set; }

    // ── Énergie ────────────────────────────────────────────────────────
    public bool? EtudePV { get; set; }
    public bool? EquipePV { get; set; }
    public bool? EquipePAC { get; set; }

    // ── Foyer ──────────────────────────────────────────────────────────
    public int? NbPersonnes { get; set; }
    public string? ProfessionMr { get; set; }
    public string? ProfessionMme { get; set; }
    public string? Credits { get; set; }
    public string? Revenus { get; set; }
    /// <summary>"oui" | "non" | "" — converti en bool? dans le contrôleur</summary>
    public string? Fichage { get; set; }
}

public class UpdateContactDTO
{
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string? Telephone { get; set; }
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string? Source { get; set; }
    public string? Statut { get; set; }
    public long? AgentId { get; set; }
}

public class ContactDTO
{
    public long Id { get; set; }
    public string? Nom { get; set; }
    public string? Prenom { get; set; }
    public string Telephone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Adresse { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;
    public long? AgentId { get; set; }
    public string? AgentNom { get; set; }  // ← AJOUTER CETTE LIGNE
    public DateTime? DateRappelPlanifie { get; set; }
}