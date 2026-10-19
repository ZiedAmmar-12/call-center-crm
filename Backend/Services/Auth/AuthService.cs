using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Backend.Data;
using Backend.DTOs.Agent;
using Backend.Services.Permission;
using Backend.Services.Email;
using Backend.Entities;
using AgentEntity = Backend.Entities.Agent;

namespace Backend.Services.Auth;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly IPermissionService _permissionService;
    private readonly IEmailService _emailService;

    public AuthService(
        ApplicationDbContext context,
        IConfiguration config,
        IPermissionService permissionService,
        IEmailService emailService)
    {
        _context = context;
        _config = config;
        _permissionService = permissionService;
        _emailService = emailService;
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────
    public async Task<LoginResponseDTO> LoginAsync(LoginDTO dto)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Actif);

        if (utilisateur == null)
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect.");

        if (utilisateur.Statut == "EN_ATTENTE")
            throw new UnauthorizedAccessException("COMPTE_EN_ATTENTE:Veuillez changer votre mot de passe.");

        bool motDePasseValide = BCrypt.Net.BCrypt.Verify(dto.MotDePasse, utilisateur.MotDePasse);
        if (!motDePasseValide)
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect.");

        // Machine fingerprint for agents
        if (utilisateur is AgentEntity agent && dto.IdentifiantMachine != null)
        {
            if (agent.IdentifiantMachine == null)
                agent.IdentifiantMachine = dto.IdentifiantMachine;
            else if (agent.IdentifiantMachine != dto.IdentifiantMachine)
                throw new UnauthorizedAccessException("Connexion refusée depuis ce poste. Contactez l'administration.");
        }

        // Check MustChangePassword (admin reset)
        if (utilisateur.MustChangePassword)
            throw new UnauthorizedAccessException("MUST_CHANGE_PASSWORD:Veuillez changer votre mot de passe.");

        utilisateur.DerniereConnexion = DateTime.UtcNow;

        // Generate refresh token
        var refreshToken = GenerateSecureToken();
        utilisateur.RefreshToken = refreshToken;
        utilisateur.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        var token = await GenererTokenAsync(utilisateur);

        return new LoginResponseDTO
        {
            Token = token,
            RefreshToken = refreshToken,
            Role = utilisateur.Role,
            TypeConfirmatrice = utilisateur is Confirmatrice c ? c.Type.ToString() : null,
            UserId = utilisateur.Id,
            Nom = utilisateur.Nom,
            Prenom = utilisateur.Prenom,
            Email = utilisateur.Email,
            Expiration = DateTime.UtcNow.AddHours(8)
        };
    }

    // ── FIRST LOGIN ────────────────────────────────────────────────────────
    public async Task<LoginResponseDTO> FirstLoginAsync(FirstLoginDTO dto)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Actif);

        if (utilisateur == null)
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect.");

        bool motDePasseValide = BCrypt.Net.BCrypt.Verify(dto.MotDePasseTemporaire, utilisateur.MotDePasse);
        if (!motDePasseValide)
            throw new UnauthorizedAccessException("Mot de passe temporaire incorrect.");

        if (utilisateur.Statut != "EN_ATTENTE")
            throw new InvalidOperationException("Ce compte n'est pas en attente d'activation.");

        utilisateur.MotDePasse = BCrypt.Net.BCrypt.HashPassword(dto.NouveauMotDePasse);
        utilisateur.Statut = "ACTIF";
        utilisateur.MustChangePassword = false;
        utilisateur.DerniereConnexion = DateTime.UtcNow;

        var refreshToken = GenerateSecureToken();
        utilisateur.RefreshToken = refreshToken;
        utilisateur.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();

        var token = GenererToken(utilisateur);

        return new LoginResponseDTO
        {
            Token = token,
            RefreshToken = refreshToken,
            Role = utilisateur.Role,
            TypeConfirmatrice = utilisateur is Confirmatrice conf ? conf.Type.ToString() : null,
            UserId = utilisateur.Id,
            Nom = utilisateur.Nom,
            Prenom = utilisateur.Prenom,
            Email = utilisateur.Email,
            Expiration = DateTime.UtcNow.AddHours(8)
        };
    }

    // ── FORGOT PASSWORD ────────────────────────────────────────────────────
    public async Task ForgotPasswordAsync(string email)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Email == email && u.Actif);

        // Don't reveal whether the email exists
        if (utilisateur == null) return;

        var token = GenerateSecureToken();
        utilisateur.PasswordResetToken = token;
        utilisateur.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync();

        await _emailService.SendPasswordResetEmailAsync(
            utilisateur.Email, utilisateur.Nom, utilisateur.Prenom, token);
    }

    // ── RESET PASSWORD (via token from email) ─────────────────────────────
    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u =>
                u.PasswordResetToken == token &&
                u.PasswordResetTokenExpiry > DateTime.UtcNow &&
                u.Actif);

        if (utilisateur == null)
            throw new InvalidOperationException("Lien de réinitialisation invalide ou expiré.");

        if (newPassword.Length < 8)
            throw new ArgumentException("Le mot de passe doit contenir au moins 8 caractères.");

        utilisateur.MotDePasse = BCrypt.Net.BCrypt.HashPassword(newPassword);
        utilisateur.PasswordResetToken = null;
        utilisateur.PasswordResetTokenExpiry = null;
        utilisateur.MustChangePassword = false;
        utilisateur.RefreshToken = null;
        utilisateur.RefreshTokenExpiryTime = null;

        await _context.SaveChangesAsync();
    }

    // ── ADMIN RESET PASSWORD ───────────────────────────────────────────────
    public async Task<string> AdminResetPasswordAsync(long userId)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Id == userId && u.Actif);

        if (utilisateur == null)
            throw new KeyNotFoundException("Utilisateur introuvable.");

        var tempPassword = GenerateRandomPassword();

        utilisateur.MotDePasse = BCrypt.Net.BCrypt.HashPassword(tempPassword);
        utilisateur.MustChangePassword = true;
        utilisateur.RefreshToken = null;
        utilisateur.RefreshTokenExpiryTime = null;

        await _context.SaveChangesAsync();

        await _emailService.SendAdminResetPasswordEmailAsync(
            utilisateur.Email, utilisateur.Nom, utilisateur.Prenom, tempPassword);

        return tempPassword;
    }

    // ── CHANGE PASSWORD (authenticated user) ──────────────────────────────
    public async Task ChangePasswordAsync(long userId, string oldPassword, string newPassword)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Id == userId && u.Actif);

        if (utilisateur == null)
            throw new KeyNotFoundException("Utilisateur introuvable.");

        if (!BCrypt.Net.BCrypt.Verify(oldPassword, utilisateur.MotDePasse))
            throw new UnauthorizedAccessException("Mot de passe actuel incorrect.");

        if (newPassword.Length < 8)
            throw new ArgumentException("Le nouveau mot de passe doit contenir au moins 8 caractères.");

        if (BCrypt.Net.BCrypt.Verify(newPassword, utilisateur.MotDePasse))
            throw new ArgumentException("Le nouveau mot de passe doit être différent de l'ancien.");

        utilisateur.MotDePasse = BCrypt.Net.BCrypt.HashPassword(newPassword);
        utilisateur.MustChangePassword = false;
        utilisateur.RefreshToken = null;
        utilisateur.RefreshTokenExpiryTime = null;

        await _context.SaveChangesAsync();
    }

    // ── REFRESH TOKEN ──────────────────────────────────────────────────────
    public async Task<LoginResponseDTO> RefreshTokenAsync(string refreshToken)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u =>
                u.RefreshToken == refreshToken &&
                u.RefreshTokenExpiryTime > DateTime.UtcNow &&
                u.Actif);

        if (utilisateur == null)
            throw new UnauthorizedAccessException("Refresh token invalide ou expiré.");

        // Rotate refresh token
        var newRefreshToken = GenerateSecureToken();
        utilisateur.RefreshToken = newRefreshToken;
        utilisateur.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        var token = await GenererTokenAsync(utilisateur);

        return new LoginResponseDTO
        {
            Token = token,
            RefreshToken = newRefreshToken,
            Role = utilisateur.Role,
            TypeConfirmatrice = utilisateur is Confirmatrice c ? c.Type.ToString() : null,
            UserId = utilisateur.Id,
            Nom = utilisateur.Nom,
            Prenom = utilisateur.Prenom,
            Email = utilisateur.Email,
            Expiration = DateTime.UtcNow.AddHours(8)
        };
    }

    // ── LOGOUT ─────────────────────────────────────────────────────────────
    public async Task LogoutAsync(long userId)
    {
        var utilisateur = await _context.Set<Utilisateur>()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (utilisateur != null)
        {
            utilisateur.RefreshToken = null;
            utilisateur.RefreshTokenExpiryTime = null;
            await _context.SaveChangesAsync();
        }
    }

    // ── TOKEN GENERATORS ───────────────────────────────────────────────────
    private async Task<string> GenererTokenAsync(Utilisateur utilisateur, string? customRole = null)
    {
        var jwtKey = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret manquant dans appsettings.json");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var role  = customRole ?? utilisateur.Role;

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub,   utilisateur.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, utilisateur.Email),
            new Claim(ClaimTypes.Role,               role),
            new Claim("nom",                         utilisateur.Nom),
            new Claim("prenom",                      utilisateur.Prenom),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        if (utilisateur is Confirmatrice confirmatrice)
            claims.Add(new Claim("typeConfirmatrice", confirmatrice.Type.ToString()));

        try
        {
            var permissions = await _permissionService.GetUserPermissionsAsync((int)utilisateur.Id);
            foreach (var permission in permissions)
                claims.Add(new Claim("permission", permission));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erreur lors de la récupération des permissions: {ex.Message}");
        }

        var token = new JwtSecurityToken(
            issuer:            _config["Jwt:Issuer"],
            audience:          _config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenererToken(Utilisateur utilisateur, string? customRole = null)
    {
        var jwtKey = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret manquant dans appsettings.json");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var role  = customRole ?? utilisateur.Role;

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub,   utilisateur.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, utilisateur.Email),
            new Claim(ClaimTypes.Role,               role),
            new Claim("nom",                         utilisateur.Nom),
            new Claim("prenom",                      utilisateur.Prenom),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        if (utilisateur is Confirmatrice confirmatrice)
            claims.Add(new Claim("typeConfirmatrice", confirmatrice.Type.ToString()));

        var token = new JwtSecurityToken(
            issuer:            _config["Jwt:Issuer"],
            audience:          _config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ── HELPERS ────────────────────────────────────────────────────────────
    private static string GenerateSecureToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string GenerateRandomPassword()
    {
        const string upper   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lower   = "abcdefghijklmnopqrstuvwxyz";
        const string digits  = "0123456789";
        const string symbols = "!@#$%^&*";
        const string all     = upper + lower + digits + symbols;

        var rng  = RandomNumberGenerator.Create();
        var chars = new List<char>
        {
            upper [RandomByte(rng) % upper.Length],
            lower [RandomByte(rng) % lower.Length],
            digits[RandomByte(rng) % digits.Length],
            symbols[RandomByte(rng) % symbols.Length]
        };

        for (int i = 0; i < 8; i++)
            chars.Add(all[RandomByte(rng) % all.Length]);

        // Fisher-Yates shuffle
        for (int i = chars.Count - 1; i > 0; i--)
        {
            int j = RandomByte(rng) % (i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars.ToArray());
    }

    private static int RandomByte(RandomNumberGenerator rng)
    {
        var buf = new byte[1];
        rng.GetBytes(buf);
        return buf[0];
    }
}
