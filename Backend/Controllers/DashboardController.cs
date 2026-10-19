using Microsoft.AspNetCore.Mvc;
using Backend.DTOs.Agent;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/agent")]
[Produces("application/json")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>Tableau de bord de l'agent — KPIs du jour + graphiques</summary>
    [HttpGet("{agentId:long}/dashboard")]
    [ProducesResponseType(typeof(DashboardAgentDTO), 200)]
    public async Task<IActionResult> GetDashboard(long agentId)
    {
        var data = await _dashboardService.GetDashboardAgentAsync(agentId);
        return Ok(data);
    }

    /// <summary>Historique des appels de l'agent avec filtres</summary>
    /// <param name="agentId">ID de l'agent</param>
    /// <param name="filtre">Tous les résultats | Converti | Rappel | Refusé | NRP</param>
    /// <param name="recherche">Recherche par contact ou société</param>
    [HttpGet("{agentId:long}/historique")]
    [ProducesResponseType(typeof(HistoriqueStatsDTO), 200)]
    public async Task<IActionResult> GetHistorique(
        long agentId,
        [FromQuery] string? filtre = null,
        [FromQuery] string? recherche = null)
    {
        var data = await _dashboardService.GetHistoriqueAsync(agentId, filtre, recherche);
        return Ok(data);
    }

    /// <summary>Agenda de l'agent — RDV pris et Refus</summary>
    [HttpGet("{agentId:long}/agenda")]
    [ProducesResponseType(typeof(AgendaAgentDTO), 200)]
    public async Task<IActionResult> GetAgenda(long agentId)
    {
        var data = await _dashboardService.GetAgendaAsync(agentId);
        return Ok(data);
    }
}