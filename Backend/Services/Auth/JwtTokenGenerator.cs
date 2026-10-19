using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Entities;
using System.Threading.Tasks;
using Backend.Data;
using Microsoft.EntityFrameworkCore;
namespace Backend.Services.Auth;

public class JwtTokenGenerator
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _db;

    public JwtTokenGenerator(IConfiguration configuration, ApplicationDbContext db)
    {
        _configuration = configuration;
                _db = db;
    }

    public async Task<string> GenerateAccessToken(User user)
    {
        var rolePermissions = await _db.RolePermissions
             .Where(rp => rp.RoleId == user.RoleId)
             .Select(rp => rp.Permission.Name)
             .ToListAsync();

        var userPermissions = await _db.UserPermissions
             .Where(up => up.UserId == user.Id && up.ScopeType == null && up.ScopeUserId == null)
             .Select(up => up.Permission.Name)
             .ToListAsync();

        var permissions = rolePermissions
             .Concat(userPermissions)
             .Distinct()
             .ToList();
        // ✅ CORRECT - Use ClaimTypes constants
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "User"),
            new Claim("UserId", user.Id.ToString())  // Useful for quick access
        };
        //to fetch all permissions at once and add them as claims
        claims.AddRange(permissions.Select(p => new Claim("permission", p)));

        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret not configured");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

 

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
}
