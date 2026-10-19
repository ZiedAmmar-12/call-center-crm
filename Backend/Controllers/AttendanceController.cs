using System.Security.Claims;
using Backend.DTOs;
using Backend.Services.Attendance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Pointage et pauses des agents (clock-in / clock-out / breaks)</summary>
[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(IAttendanceService attendanceService)
        => _attendanceService = attendanceService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private long GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (long.TryParse(claim, out var id)) return id;
        throw new UnauthorizedAccessException("Impossible de déterminer l'identité de l'utilisateur.");
    }

    private bool IsAdminOrQualite()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        return role is "ADMIN" or "QUALITE" or "SuperAdmin" or "TECH";
    }

    // ── Agent endpoints ───────────────────────────────────────────────────────

    /// <summary>Pointer l'arrivée</summary>
    [HttpPost("clock-in")]
    public async Task<IActionResult> ClockIn()
    {
        try
        {
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            return Ok(await _attendanceService.ClockInAsync(GetUserId(), role));
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Pointer la sortie</summary>
    [HttpPost("clock-out")]
    public async Task<IActionResult> ClockOut()
    {
        try
        {
            var result = await _attendanceService.ClockOutAsync(GetUserId());
            return result.Success ? Ok(result) : BadRequest(new { error = result.Message });
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Démarrer une pause</summary>
    [HttpPost("break/start")]
    public async Task<IActionResult> StartBreak([FromBody] BreakRequestDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Type))
            return BadRequest(new { error = "Le type de pause est obligatoire." });

        try
        {
            var result = await _attendanceService.StartBreakAsync(GetUserId(), dto.Type);
            return result.Success ? Ok(result) : BadRequest(new { error = result.Message });
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Terminer la pause en cours</summary>
    [HttpPost("break/end")]
    public async Task<IActionResult> EndBreak()
    {
        try
        {
            var result = await _attendanceService.EndBreakAsync(GetUserId());
            return result.Success ? Ok(result) : BadRequest(new { error = result.Message });
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Plage horaire de travail (accessible à tous les agents)</summary>
    [HttpGet("schedule")]
    public IActionResult GetSchedule()
        => Ok(_attendanceService.GetWorkSchedule());

    /// <summary>Statut de pointage actuel de l'utilisateur connecté</summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        try { return Ok(await _attendanceService.GetStatusAsync(GetUserId())); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    // ── Admin / Qualite endpoints ──────────────────────────────────────────────

    /// <summary>Rapport complet (admin/qualite)</summary>
    [HttpGet("report")]
    public async Task<IActionResult> GetReport()
    {
        if (!IsAdminOrQualite()) return Forbid();
        try { return Ok(await _attendanceService.GetReportAsync()); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Statut en temps réel de l'équipe (admin/qualite)</summary>
    [HttpGet("team-status")]
    public async Task<IActionResult> GetTeamStatus()
    {
        if (!IsAdminOrQualite()) return Forbid();
        try { return Ok(await _attendanceService.GetTeamStatusAsync()); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Rapport de présence de l'équipe (admin/qualite)</summary>
    [HttpGet("team-report")]
    public async Task<IActionResult> GetTeamReport()
    {
        if (!IsAdminOrQualite()) return Forbid();
        try { return Ok(await _attendanceService.GetTeamReportAsync()); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Détail de présence par agent avec durée et pauses (admin/qualite)</summary>
    [HttpGet("team-detail")]
    public async Task<IActionResult> GetTeamDetail()
    {
        if (!IsAdminOrQualite()) return Forbid();
        try { return Ok(await _attendanceService.GetTeamAttendanceDetailAsync()); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Rapport journalier admin (format PointagePage) — GET /api/attendance/admin/daily?date=2026-07-16</summary>
    [HttpGet("admin/daily")]
    public async Task<IActionResult> GetAdminDailyReport([FromQuery] string? date)
    {
        if (!IsAdminOrQualite()) return Forbid();
        try
        {
            // Parse manually and force UTC to avoid Npgsql DateTimeKind issue
            var parsedDate = DateTime.TryParse(date, out var d)
                ? DateTime.SpecifyKind(d.Date, DateTimeKind.Utc)
                : DateTime.UtcNow.Date;
            return Ok(await _attendanceService.GetDailyReportAsync(parsedDate));
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Historique de pointage de l'agent connecté (30 derniers jours)</summary>
    [HttpGet("me/history")]
    public async Task<IActionResult> GetMyHistory([FromQuery] int days = 30)
    {
        try { return Ok(await _attendanceService.GetMyHistoryAsync(GetUserId(), days)); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }
    /// <summary>Historique pointage de TOUS les rôles — Admin / SuperAdmin uniquement</summary>
    [HttpGet("admin/all-history")]
    public async Task<IActionResult> GetAllRolesHistory([FromQuery] string? date, [FromQuery] string? role)
    {
        if (!IsAdminOrQualite()) return Forbid();
        try
        {
            DateTime? parsedDate = null;
            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var d))
                parsedDate = DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);

            return Ok(await _attendanceService.GetAllRolesHistoryAsync(parsedDate, role));
        }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

}