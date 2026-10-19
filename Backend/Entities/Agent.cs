using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public class Agent : Utilisateur
{
    public TypeContrat? TypeContrat { get; set; }
    public int ObjectifMensuel { get; set; }
    public double SalaireBase { get; set; }
    public double PrimeAssiduite { get; set; } = 100.0;

    // ── Champs cahier des charges ──────────────────────────────────────────
    public DateTime? DateEmbauche { get; set; }
    /// <summary>Agent élite (super télépro) — accès agenda EBI collègues</summary>
    public bool IsElite { get; set; } = false;

    // Navigation properties
    public virtual ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    public virtual ICollection<Appel> Appels { get; set; } = new List<Appel>();
    public virtual ICollection<RendezVous> RendezVous { get; set; } = new List<RendezVous>();
    public virtual ICollection<Performance> Performances { get; set; } = new List<Performance>();
    public virtual ICollection<Pointage> Pointages { get; set; } = new List<Pointage>();
    public virtual Agenda? Agenda { get; set; }
}

public enum TypeContrat
{
    MI_TEMPS,
    PLEIN_TEMPS
}