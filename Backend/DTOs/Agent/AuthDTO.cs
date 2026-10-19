using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Agent;

public class LoginDTO
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string MotDePasse { get; set; } = string.Empty;

    // Optionnel : empreinte PC envoyée depuis le navigateur
    public string? IdentifiantMachine { get; set; }
}

public class LoginResponseDTO
{
    public string Token { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? TypeConfirmatrice { get; set; }
    public long UserId { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime Expiration { get; set; }
}

// ── New auth DTOs ──────────────────────────────────────────────
public class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string OldPassword { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class AdminResetPasswordRequest
{
    [Required]
    public long UserId { get; set; }
}

// Première connexion - changement de mot de passe obligatoire
public class FirstLoginDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string MotDePasseTemporaire { get; set; } = string.Empty;
    
    [Required]
    [MinLength(6)]
    public string NouveauMotDePasse { get; set; } = string.Empty;
}