using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ChatController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>Récupérer l'historique d'un canal (50 derniers messages)</summary>
    [HttpGet("{channel}")]
    public async Task<IActionResult> GetHistory(string channel, [FromQuery] int limit = 50)
    {
        var messages = await _context.ChatMessages
            .Where(m => m.Channel == channel.ToUpper())
            .OrderByDescending(m => m.SentAt)
            .Take(Math.Min(limit, 200))
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                m.SenderName,
                m.SenderRole,
                m.Content,
                m.Channel,
                SentAt = m.SentAt.ToString("o"),
            })
            .ToListAsync();

        return Ok(messages);
    }

    /// <summary>Liste des canaux disponibles</summary>
    [HttpGet]
    public IActionResult GetChannels()
    {
        return Ok(new[]
        {
            new { id = "GENERAL",         label = "Général",           icon = "💬" },
            new { id = "AGENTS",          label = "Agents",             icon = "📞" },
            new { id = "CONFIRMATRICES",  label = "Confirmatrices",     icon = "✅" },
            new { id = "QUALITE",         label = "Service Qualité",    icon = "⭐" },
            new { id = "TECHNIQUE",       label = "Service Technique",  icon = "🔧" },
            new { id = "ADMIN",           label = "Administration",     icon = "👑" },
        });
    }
}
