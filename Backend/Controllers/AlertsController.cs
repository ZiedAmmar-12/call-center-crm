using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Alert;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/alerts")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public AlertsController(ApplicationDbContext context) => _context = context;

    [HttpGet("rules")]
    public async Task<IActionResult> GetRules()
    {
        var rules = await _context.AlertRules.AsNoTracking()
            .Select(r => new AlertRuleDto { Id = r.Id, RuleType = r.RuleType, ThresholdValue = r.ThresholdValue, NotificationEmail = r.NotificationEmail, IsActive = r.IsActive })
            .ToListAsync();
        return Ok(new { rules });
    }

    [HttpGet("rules/{ruleType}")]
    public async Task<IActionResult> GetRuleByType(string ruleType)
    {
        var rule = await _context.AlertRules.AsNoTracking().FirstOrDefaultAsync(r => r.RuleType == ruleType && r.IsActive);
        if (rule == null) return NotFound(new { error = "Règle introuvable" });
        return Ok(new AlertRuleDto { Id = rule.Id, RuleType = rule.RuleType, ThresholdValue = rule.ThresholdValue, NotificationEmail = rule.NotificationEmail, IsActive = rule.IsActive });
    }

    [HttpPost("rules")]
    [Authorize(Roles = "ADMIN,SuperAdmin")]
    public async Task<IActionResult> CreateRule([FromBody] CreateAlertRuleDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        _context.AlertRules.Add(new AlertRule { RuleType = dto.RuleType, ThresholdValue = dto.ThresholdValue, NotificationEmail = dto.NotificationEmail, IsActive = true });
        await _context.SaveChangesAsync();
        return Ok(new { status = "success", message = "Règle créée" });
    }

    [HttpPut("rules/{ruleId}")]
    [Authorize(Roles = "ADMIN,SuperAdmin")]
    public async Task<IActionResult> UpdateRule(long ruleId, [FromBody] UpdateAlertRuleDto dto)
    {
        var rule = await _context.AlertRules.FindAsync(ruleId);
        if (rule == null) return NotFound(new { error = "Règle introuvable" });
        if (dto.ThresholdValue.HasValue) rule.ThresholdValue = dto.ThresholdValue.Value;
        if (dto.IsActive.HasValue) rule.IsActive = dto.IsActive.Value;
        rule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { status = "success" });
    }

    [HttpDelete("rules/{ruleId}")]
    [Authorize(Roles = "ADMIN,SuperAdmin")]
    public async Task<IActionResult> DeleteRule(long ruleId)
    {
        var rule = await _context.AlertRules.FindAsync(ruleId);
        if (rule == null) return NotFound(new { error = "Règle introuvable" });
        _context.AlertRules.Remove(rule);
        await _context.SaveChangesAsync();
        return Ok(new { status = "success" });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] string? agentName, [FromQuery] int limit = 50)
    {
        var query = _context.AlertHistories.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(agentName)) query = query.Where(h => h.AgentName == agentName);
        var history = await query.OrderByDescending(h => h.CreatedAt).Take(limit)
            .Select(h => new AlertHistoryDto { Id = h.Id, AgentName = h.AgentName, AlertType = h.AlertType, Severity = h.Severity, Message = h.Message, ThresholdValue = h.ThresholdValue, ActualValue = h.ActualValue, CreatedAt = h.CreatedAt })
            .ToListAsync();
        return Ok(new { history });
    }

    [HttpGet("check/{agentName}")]
    public async Task<IActionResult> CheckAlerts(string agentName, [FromQuery] float? score, [FromQuery] float? inactiveMinutes, [FromQuery] float? conversionRate)
    {
        var alerts = new List<AlertItemDto>();
        var rules = await _context.AlertRules.AsNoTracking().Where(r => r.IsActive).ToListAsync();

        if (score.HasValue) { var r = rules.FirstOrDefault(x => x.RuleType == "low_score"); if (r != null && score.Value < r.ThresholdValue) alerts.Add(new AlertItemDto { AlertType = "low_score", Severity = "warning", Message = $"Score {score.Value} sous le seuil {r.ThresholdValue}", ThresholdValue = r.ThresholdValue, ActualValue = score.Value }); }
        if (inactiveMinutes.HasValue) { var r = rules.FirstOrDefault(x => x.RuleType == "inactivity"); if (r != null && inactiveMinutes.Value > r.ThresholdValue) alerts.Add(new AlertItemDto { AlertType = "inactivity", Severity = "error", Message = $"Inactivité {inactiveMinutes.Value}min dépasse {r.ThresholdValue}min", ThresholdValue = r.ThresholdValue, ActualValue = inactiveMinutes.Value }); }
        if (conversionRate.HasValue) { var r = rules.FirstOrDefault(x => x.RuleType == "conversion"); if (r != null && conversionRate.Value < r.ThresholdValue) alerts.Add(new AlertItemDto { AlertType = "conversion", Severity = "warning", Message = $"Taux {conversionRate.Value}% sous {r.ThresholdValue}%", ThresholdValue = r.ThresholdValue, ActualValue = conversionRate.Value }); }

        foreach (var a in alerts) _context.AlertHistories.Add(new AlertHistory { AgentName = agentName, AlertType = a.AlertType, Severity = a.Severity, Message = a.Message, ThresholdValue = a.ThresholdValue, ActualValue = a.ActualValue });
        if (alerts.Any()) await _context.SaveChangesAsync();

        return Ok(new AlertCheckResultDto { Alerts = alerts, Count = alerts.Count });
    }
}
