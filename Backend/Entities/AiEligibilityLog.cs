using System.ComponentModel.DataAnnotations;

namespace Backend.Entities;

/// <summary>Log des analyses d'éligibilité IA effectuées par les agents</summary>
public class AiEligibilityLog
{
    [Key]
    public long Id { get; set; }

    public long AgentId { get; set; }

    /// <summary>Données client sérialisées en JSON</summary>
    public string? ClientData { get; set; }

    /// <summary>Résultat du calcul sérialisé en JSON</summary>
    public string? Result { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
