using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Backend.Data;

namespace Backend.Controllers;

[ApiController]
[Route("api/confirmatrice")]
[Authorize(Roles = "CONFIRMATRICE")]
public class ConfirmatriceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ConfirmatriceController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Retourne la liste des agendas accessibles pour la confirmatrice connectée
    /// </summary>
    [HttpGet("my-agendas")]
    public async Task<IActionResult> GetMyAgendas()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;

        if (!long.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Token invalide." });

        var confirmatrice = await _context.Confirmatrices.FindAsync(userId);
        if (confirmatrice == null)
            return Ok(new List<string>());

        var agendas = string.IsNullOrEmpty(confirmatrice.AgendasAccess)
            ? new List<string>()
            : confirmatrice.AgendasAccess
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(a => a.Trim())
                .ToList();

        return Ok(agendas);
    }
}
