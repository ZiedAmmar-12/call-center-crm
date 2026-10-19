using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Backend.Data;
using Backend.Entities;

namespace Backend.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly ApplicationDbContext _context;

    public ChatHub(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>Envoyer un message dans un canal</summary>
    public async Task SendMessage(string channel, string content)
    {
        var userId   = long.Parse(Context.User!.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? Context.User!.FindFirst("sub")?.Value ?? "0");
        // Le JWT ne contient pas de claim "name" — AuthService.cs y met "nom" et
        // "prenom" séparément (voir Claims du token) : on les recombine ici.
        var prenom   = Context.User!.FindFirst("prenom")?.Value;
        var nom      = Context.User!.FindFirst("nom")?.Value;
        var name     = string.IsNullOrWhiteSpace($"{prenom} {nom}".Trim())
                        ? (Context.User!.FindFirst("name")?.Value
                           ?? Context.User!.FindFirst(ClaimTypes.Name)?.Value
                           ?? "Inconnu")
                        : $"{prenom} {nom}".Trim();
        var role     = Context.User!.FindFirst(ClaimTypes.Role)?.Value
                        ?? Context.User!.FindFirst("role")?.Value ?? "";

        var msg = new ChatMessage
        {
            SenderId   = userId,
            SenderName = name,
            SenderRole = role,
            Content    = content.Trim(),
            Channel    = channel.ToUpper(),
            SentAt     = DateTime.UtcNow,
        };

        _context.ChatMessages.Add(msg);
        await _context.SaveChangesAsync();

        await Clients.Group(channel.ToUpper()).SendAsync("ReceiveMessage", new
        {
            msg.Id,
            msg.SenderId,
            msg.SenderName,
            msg.SenderRole,
            msg.Content,
            msg.Channel,
            SentAt = msg.SentAt.ToString("o"),
        });
    }

    /// <summary>Rejoindre un canal de discussion</summary>
    public async Task JoinChannel(string channel)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, channel.ToUpper());
        await Clients.Caller.SendAsync("JoinedChannel", channel.ToUpper());
    }

    /// <summary>Quitter un canal</summary>
    public async Task LeaveChannel(string channel)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channel.ToUpper());
    }
}
