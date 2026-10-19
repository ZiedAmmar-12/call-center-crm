using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Backend.Data;
using Backend.DTOs.Quality;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/quality")]
[Authorize(Roles = "ADMIN,QUALITE,SuperAdmin")]
public class QualityController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public QualityController(ApplicationDbContext context) => _context = context;

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    // ── Créer une évaluation ──────────────────────────────────────────────────
    [HttpPost("evaluate")]
    public async Task<IActionResult> Evaluate([FromBody] CreateEvaluationDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        var evaluation = new ManualEvaluation
        {
            AgentId = dto.AgentId,
            EvaluatorId = GetUserId(),
            CallRef = dto.CallRef,
            GlobalScore = dto.GlobalScore ?? 0,
            Decision = dto.Decision,
            Commentaires = dto.Commentaires,
            ScoresJson = dto.Scores != null ? JsonSerializer.Serialize(dto.Scores) : null
        };
        _context.ManualEvaluations.Add(evaluation);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Évaluation enregistrée", id = evaluation.Id });
    }

    // ── Évaluations d'un agent ────────────────────────────────────────────────
    [HttpGet("evaluations/{agentId}")]
    public async Task<IActionResult> GetAgentEvaluations(long agentId)
    {
        var evals = await _context.ManualEvaluations
            .AsNoTracking()
            .Include(e => e.Agent)
            .Include(e => e.Evaluator)
            .Where(e => e.AgentId == agentId)
            .OrderByDescending(e => e.EvaluationDate)
            .Select(e => new EvaluationDto
            {
                Id = e.Id,
                AgentId = e.AgentId,
                AgentName = e.Agent != null ? $"{e.Agent.Prenom} {e.Agent.Nom}" : null,
                EvaluatorId = e.EvaluatorId,
                EvaluatorName = e.Evaluator != null ? $"{e.Evaluator.Prenom} {e.Evaluator.Nom}" : null,
                EvaluationDate = e.EvaluationDate,
                CallRef = e.CallRef,
                GlobalScore = e.GlobalScore,
                Decision = e.Decision,
                Commentaires = e.Commentaires,
                ScoresJson = e.ScoresJson
            })
            .ToListAsync();
        return Ok(evals);
    }

    // ── Toutes les évaluations ────────────────────────────────────────────────
    [HttpGet("evaluations")]
    public async Task<IActionResult> GetAllEvaluations()
    {
        var evals = await _context.ManualEvaluations
            .AsNoTracking()
            .Include(e => e.Agent)
            .Include(e => e.Evaluator)
            .OrderByDescending(e => e.EvaluationDate)
            .Select(e => new EvaluationDto
            {
                Id = e.Id,
                AgentId = e.AgentId,
                AgentName = e.Agent != null ? $"{e.Agent.Prenom} {e.Agent.Nom}" : null,
                EvaluatorId = e.EvaluatorId,
                EvaluatorName = e.Evaluator != null ? $"{e.Evaluator.Prenom} {e.Evaluator.Nom}" : null,
                EvaluationDate = e.EvaluationDate,
                CallRef = e.CallRef,
                GlobalScore = e.GlobalScore,
                Decision = e.Decision,
                Commentaires = e.Commentaires,
                ScoresJson = e.ScoresJson
            })
            .ToListAsync();
        return Ok(evals);
    }

    // ── Statistiques qualité ──────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var evals = await _context.ManualEvaluations.AsNoTracking().ToListAsync();
        return Ok(new QualityStatsDto
        {
            Total = evals.Count,
            AvgScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 2) : 0,
            ByDecision = evals.GroupBy(e => e.Decision ?? "N/A").ToDictionary(g => g.Key, g => g.Count())
        });
    }

    // ── Supprimer une évaluation ──────────────────────────────────────────────
    [HttpDelete("evaluations/{evalId}")]
    public async Task<IActionResult> DeleteEvaluation(long evalId)
    {
        var e = await _context.ManualEvaluations.FindAsync(evalId);
        if (e == null) return NotFound(new { error = "Évaluation introuvable" });
        _context.ManualEvaluations.Remove(e);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── Dashboard : état de l'équipe ──────────────────────────────────────────
    [HttpGet("dashboard/global-stats")]
    public async Task<IActionResult> GetGlobalStats()
    {
        var totalAgents = await _context.Utilisateurs.CountAsync(u => u.Role == "AGENT");
        var evals = await _context.ManualEvaluations.AsNoTracking().ToListAsync();
        var rdvs = await _context.RendezVous.AsNoTracking().ToListAsync();
        var appels = await _context.Appels.AsNoTracking().ToListAsync();
        var today = DateTime.UtcNow.Date;

        return Ok(new
        {
            totalAgents = totalAgents,
            totalEvaluations = evals.Count,
            avgScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 1) : 0,
            totalRdv = rdvs.Count,
            rdvToday = rdvs.Count(r => r.DateRendezVous.Date == today),
            rdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
            totalAppels = appels.Count,
            appelsToday = appels.Count(a => a.DateHeure.Date == today),
            byDecision = evals.GroupBy(e => e.Decision ?? "N/A")
                              .Select(g => new { decision = g.Key, count = g.Count() })
        });
    }

    // ── Dashboard : évaluations récentes ─────────────────────────────────────
    [HttpGet("dashboard/evaluation-history")]
    public async Task<IActionResult> GetEvaluationHistory([FromQuery] int limit = 20, [FromQuery] int offset = 0)
    {
        var evals = await _context.ManualEvaluations
            .AsNoTracking()
            .Include(e => e.Agent)
            .Include(e => e.Evaluator)
            .OrderByDescending(e => e.EvaluationDate)
            .Skip(offset).Take(limit)
            .Select(e => new EvaluationDto
            {
                Id = e.Id,
                AgentId = e.AgentId,
                AgentName = e.Agent != null ? $"{e.Agent.Prenom} {e.Agent.Nom}" : null,
                EvaluatorId = e.EvaluatorId,
                EvaluatorName = e.Evaluator != null ? $"{e.Evaluator.Prenom} {e.Evaluator.Nom}" : null,
                EvaluationDate = e.EvaluationDate,
                GlobalScore = e.GlobalScore,
                Decision = e.Decision,
                CallRef = e.CallRef
            })
            .ToListAsync();
        return Ok(evals);
    }

    // ── Dashboard : détail d'un agent ─────────────────────────────────────────
    [HttpGet("dashboard/agent-detail/{agentId}")]
    public async Task<IActionResult> GetAgentDetail(long agentId)
    {
        var agent = await _context.Utilisateurs.AsNoTracking().FirstOrDefaultAsync(u => u.Id == agentId);
        if (agent == null) return NotFound(new { error = "Agent introuvable" });

        var evals = await _context.ManualEvaluations.AsNoTracking()
            .Where(e => e.AgentId == agentId)
            .OrderByDescending(e => e.EvaluationDate)
            .Take(20).ToListAsync();

        var rdvs = await _context.RendezVous.AsNoTracking()
            .Where(r => r.AgentId == agentId)
            .OrderByDescending(r => r.DateCreation)
            .Take(20).ToListAsync();

        var salaires = await _context.SalairesAgents.AsNoTracking()
            .Where(s => s.AgentId == agentId)
            .OrderByDescending(s => s.Month)
            .Take(6).ToListAsync();

        return Ok(new
        {
            agent = new { id = agent.Id, nom = agent.Nom, prenom = agent.Prenom, email = agent.Email, role = agent.Role },
            evaluations = evals.Select(e => new { e.Id, e.GlobalScore, e.Decision, e.EvaluationDate, e.CallRef }),
            rdvStats = new
            {
                total = rdvs.Count,
                confirme = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME),
                annule = rdvs.Count(r => r.Statut == StatutRendezVous.ANNULE)
            },
            salaryHistory = salaires.Select(s => new { s.Month, s.TotalSalary, s.QualityRate }),
            avgScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 1) : 0
        });
    }

    // ── Comparaison des agents ────────────────────────────────────────────────
    [HttpGet("dashboard/comparison")]
    public async Task<IActionResult> GetComparison()
    {
        var agents = (await _context.Utilisateurs
            .Where(u => u.Role == "AGENT")
            .Select(u => new { u.Id, u.Nom, u.Prenom, u.Email })
            .AsNoTracking()
            .Take(20)
            .ToListAsync())
            .DistinctBy(u => u.Email)
            .ToList();
        var result = new List<object>();
        foreach (var a in agents)
        {
            var evals = await _context.ManualEvaluations.AsNoTracking().Where(e => e.AgentId == a.Id).ToListAsync();
            var rdvs = await _context.RendezVous.AsNoTracking().Where(r => r.AgentId == a.Id).ToListAsync();
            result.Add(new
            {
                agentId = a.Id,
                nom = $"{a.Prenom} {a.Nom}",
                avgScore = evals.Count > 0 ? Math.Round(evals.Average(e => e.GlobalScore), 1) : 0,
                totalEvals = evals.Count,
                totalRdv = rdvs.Count,
                rdvConfirmes = rdvs.Count(r => r.Statut == StatutRendezVous.CONFIRME)
            });
        }
        return Ok(result);
    }
}
