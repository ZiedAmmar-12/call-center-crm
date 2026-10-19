namespace Backend.Entities;

public abstract class Utilisateur
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MotDePasse { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool Actif { get; set; } = true;
    public string Statut { get; set; } = "ACTIF"; // ACTIF | EN_ATTENTE | INACTIF
    public DateTime? DerniereConnexion { get; set; }
    public DateTime DateCreation { get; set; } = DateTime.UtcNow;
    public string? IdentifiantMachine { get; set; }

    // ── Champ commun Qualité/Technique ─────────────────────────
    public string? Service { get; set; }

    // ── Auth features ──────────────────────────────────────────
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }
    public bool MustChangePassword { get; set; } = false;
}
