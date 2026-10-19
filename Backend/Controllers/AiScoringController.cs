using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Backend.Data;
using Backend.DTOs.Ai;
using Backend.Entities;
using Backend.Helpers;

namespace Backend.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiScoringController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public AiScoringController(ApplicationDbContext context) => _context = context;

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    // ── Score rapide (sans log) ───────────────────────────────────────────────
    [HttpPost("score")]
    public IActionResult Score([FromBody] EligibilityRequestDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        return Ok(EligibilityCalculator.Calculate(
            dto.Revenus, dto.Chauffage, dto.Toiture, dto.Isolation,
            dto.Consommation, dto.CreditScore, dto.SituationBancaire, dto.ProjectType));
    }

    // ── Analyser l'éligibilité avec log ──────────────────────────────────────
    [HttpPost("analyze-eligibility")]
    public async Task<IActionResult> AnalyzeEligibility([FromBody] EligibilityRequestDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        var result = EligibilityCalculator.Calculate(
            dto.Revenus, dto.Chauffage, dto.Toiture, dto.Isolation,
            dto.Consommation, dto.CreditScore, dto.SituationBancaire, dto.ProjectType);

        _context.AiEligibilityLogs.Add(new AiEligibilityLog
        {
            AgentId = GetUserId(),
            ClientData = JsonSerializer.Serialize(dto),
            Result = JsonSerializer.Serialize(result)
        });
        await _context.SaveChangesAsync();
        return Ok(result);
    }

    // ── Détecter les faux RDV ─────────────────────────────────────────────────
    [HttpPost("detect-fake-rdv")]
    [Authorize(Roles = "ADMIN,QUALITE")]
    public IActionResult DetectFakeRdv([FromBody] FakeRdvRequestDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        int risk = 0;
        var flags = new List<string>();
        if (dto.QualityScore.HasValue && dto.QualityScore.Value < 30) { risk += 30; flags.Add("Score qualité trop bas"); }
        if (dto.Revenus.HasValue && dto.Revenus.Value > 80000) { risk += 20; flags.Add("Revenus très élevés — à vérifier"); }
        if (!string.IsNullOrEmpty(dto.ClientPhone) && dto.ClientPhone.Length < 6) { risk += 25; flags.Add("Numéro de téléphone suspect"); }
        if (!string.IsNullOrEmpty(dto.AppointmentTime) && (dto.AppointmentTime.Contains("23:") || dto.AppointmentTime.Contains("00:"))) { risk += 15; flags.Add("Heure de RDV inhabituelle"); }
        var verdict = risk switch { >= 60 => "HIGH_RISK", >= 30 => "SUSPICIOUS", _ => "CLEAN" };
        return Ok(new FakeRdvResultDto { RiskScore = risk, Verdict = verdict, Flags = flags, AppointmentId = dto.Id, AgentId = dto.AgentId });
    }

    // ── Insights IA d'un agent ────────────────────────────────────────────────
    [HttpGet("insights/{agentId}")]
    public async Task<IActionResult> GetInsights(long agentId)
    {
        var agent = await _context.Utilisateurs.AsNoTracking().FirstOrDefaultAsync(u => u.Id == agentId);
        if (agent == null) return NotFound(new { error = "Agent introuvable" });

        var rdvs = await _context.RendezVous.AsNoTracking().Where(r => r.AgentId == agentId).ToListAsync();
        var appels = await _context.Appels.AsNoTracking().Where(a => a.AgentId == (long)agentId).ToListAsync();
        var evals = await _context.ManualEvaluations.AsNoTracking().Where(e => e.AgentId == agentId).ToListAsync();
        var logs = await _context.AiEligibilityLogs.AsNoTracking().Where(l => l.AgentId == agentId).ToListAsync();

        double avgScore = evals.Count > 0 ? evals.Average(e => e.GlobalScore) : 0;
        string tip = avgScore < 50 ? "Améliorer le score qualité des appels" : "Bonne performance, continuez !";

        return Ok(new
        {
            agentId,
            agentName = $"{agent.Prenom} {agent.Nom}",
            rdvStats = new { total = rdvs.Count, confirme = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME) },
            appelsStats = new { total = appels.Count },
            avgQualityScore = Math.Round(avgScore, 1),
            eligibilityLogs = logs.Count,
            tip
        });
    }

    // ── Historique des analyses ───────────────────────────────────────────────
    [HttpGet("logs")]
    [Authorize(Roles = "ADMIN,QUALITE")]
    public async Task<IActionResult> GetLogs([FromQuery] int limit = 50)
    {
        var logs = await _context.AiEligibilityLogs.AsNoTracking()
            .OrderByDescending(l => l.CreatedAt).Take(limit).ToListAsync();
        return Ok(logs.Select(l => new { l.Id, l.AgentId, l.CreatedAt, result = l.Result }));
    }
}
