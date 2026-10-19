using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Salary;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/salaries")]
[Authorize(Roles = "ADMIN,QUALITE,SuperAdmin")]
public class SalaryController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public SalaryController(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static int CountWorkingDays(int year, int month)
    {
        var start = new DateTime(year, month, 1);
        var end = start.AddMonths(1);
        int count = 0;
        for (var d = start; d < end; d = d.AddDays(1))
            if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
                count++;
        return count;
    }

    private float GetRule(List<SalaryRule> rules, string name, float defaultVal)
        => rules.FirstOrDefault(r => r.RuleName == name && r.IsActive)?.Amount ?? defaultVal;

    // ── GET /api/salaries ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetSalaries([FromQuery] string? month)
    {
        var query = _context.SalairesAgents.AsNoTracking().Include(s => s.Agent).AsQueryable();
        if (!string.IsNullOrEmpty(month)) query = query.Where(s => s.Month == month);

        var items = await query.ToListAsync();
        var result = items.Select(s =>
        {
            var agent = s.Agent as Agent;
            return new SalaryDto
            {
                Id = s.Id,
                AgentId = s.AgentId,
                AgentName = s.Agent != null ? $"{s.Agent.Prenom} {s.Agent.Nom}" : "",
                Role = s.Agent?.Role,
                TypeContrat = agent?.TypeContrat?.ToString(),
                Month = s.Month,
                BaseSalary = s.BaseSalary,
                RdvCount = s.RdvCount,
                PoseCount = s.PoseCount,
                RefusCount = s.RefusCount,
                QualityRate = s.QualityRate,
                RdvBonus = s.RdvBonus,
                PoseBonus = s.PoseBonus,
                QualityBonus = s.QualityBonus,
                InstallationBonus = s.InstallationBonus,
                Penalties = s.Penalties,
                // Semantic mappings
                Installations = s.PoseCount,
                AbsenceCount = s.RefusCount,
                PrimeAssiduite = s.RdvBonus,
                PrimeInstallation = s.InstallationBonus,
                TotalSalary = s.TotalSalary,
                PaymentStatus = s.PaymentStatus
            };
        }).ToList();

        return Ok(result);
    }

    // ── GET /api/salaries/monthly-summary ─────────────────────────────────────
    [HttpGet("monthly-summary")]
    public async Task<IActionResult> GetMonthlySummary([FromQuery] string? month)
    {
        month ??= DateTime.UtcNow.ToString("yyyy-MM");
        var salaries = await _context.SalairesAgents.AsNoTracking().Where(s => s.Month == month).ToListAsync();
        var best = salaries.OrderByDescending(s => s.TotalSalary).FirstOrDefault();
        string? bestName = null;
        if (best != null)
        {
            var agent = await _context.Utilisateurs.AsNoTracking().FirstOrDefaultAsync(u => u.Id == best.AgentId);
            bestName = agent != null ? $"{agent.Prenom} {agent.Nom}" : null;
        }
        return Ok(new MonthlySummaryDto
        {
            Month = month,
            TotalAgents = await _context.Agents.CountAsync(),
            CalculatedAgents = salaries.Count,
            TotalMass = salaries.Sum(s => s.TotalSalary),
            AvgSalary = salaries.Count > 0 ? salaries.Average(s => s.TotalSalary) : 0,
            MaxSalary = salaries.Count > 0 ? salaries.Max(s => s.TotalSalary) : 0,
            BestAgent = bestName,
            TotalPrimes = salaries.Sum(s => s.RdvBonus + s.InstallationBonus),
            TotalPenalties = 0,
            PaymentStatus = salaries.GroupBy(s => s.PaymentStatus).ToDictionary(g => g.Key, g => g.Count())
        });
    }

    // ── GET /api/salaries/calculate ───────────────────────────────────────────
    [HttpGet("calculate")]
    public async Task<IActionResult> Calculate([FromQuery] string? month)
    {
        month ??= DateTime.UtcNow.ToString("yyyy-MM");
        var parts = month.Split('-');
        var year = int.Parse(parts[0]);
        var monthNumber = int.Parse(parts[1]);

        // Load only Agent entities (excludes other Utilisateur roles)
        var agents = (await _context.Agents.AsNoTracking().ToListAsync())
            .DistinctBy(u => u.Email)
            .ToList();

        // Load all salary config rules
        var rules = await _context.SalaryRules.AsNoTracking().ToListAsync();

        // ── PT config ─────────────────────────────────────────────────────────
        float pt_base      = GetRule(rules, "PT_base_salary",    900f);
        float pt_assiduite = GetRule(rules, "PT_assiduite",      100f);
        int   pt_seuilRdv  = (int)GetRule(rules, "PT_rdv_threshold", 21f);
        float pt_inst1     = GetRule(rules, "PT_install_first",  300f);
        float pt_instExtra = GetRule(rules, "PT_install_extra",  100f);

        // ── MT config ─────────────────────────────────────────────────────────
        float mt_base      = GetRule(rules, "MT_base_salary",    600f);
        float mt_assiduite = GetRule(rules, "MT_assiduite",      100f);
        int   mt_seuilRdv  = (int)GetRule(rules, "MT_rdv_threshold", 12f);
        float mt_inst1     = GetRule(rules, "MT_install_first",  300f);
        float mt_instExtra = GetRule(rules, "MT_install_extra",  150f);

        var monthStart = DateTime.SpecifyKind(new DateTime(year, monthNumber, 1), DateTimeKind.Utc);
        var monthEnd   = monthStart.AddMonths(1);
        int workingDays = CountWorkingDays(year, monthNumber);

        var result = new List<SalaryCalculationDto>();

        foreach (var agent in agents)
        {
            bool isPT = agent.TypeContrat == TypeContrat.PLEIN_TEMPS;

            float baseSalary        = isPT ? pt_base      : mt_base;
            float primeAssiduiteMax = isPT ? pt_assiduite : mt_assiduite;
            int   seuilRdv          = isPT ? pt_seuilRdv  : mt_seuilRdv;
            float install1          = isPT ? pt_inst1     : mt_inst1;
            float installExtra      = isPT ? pt_instExtra : mt_instExtra;

            // RDVs du mois pour cet agent
            var rdvs = await _context.RendezVous.AsNoTracking()
                .Where(r => r.AgentId == agent.Id
                    && r.DateRendezVous >= monthStart
                    && r.DateRendezVous < monthEnd)
                .ToListAsync();

            int rdvCount      = rdvs.Count;
            int installations = rdvs.Count(r =>
                r.Statut == StatutRendezVous.SIGNE ||
                r.Statut == StatutRendezVous.INSTALLE);

            // Absences = jours ouvrés - jours avec pointage
            var attendances = await _context.AdvancedAttendances.AsNoTracking()
                .Where(a => a.UserId == agent.Id && a.Date >= monthStart && a.Date < monthEnd)
                .ToListAsync();
            int daysPresent  = attendances.Select(a => a.Date.Date).Distinct().Count();
            int absenceCount = Math.Max(0, workingDays - daysPresent);

            // Prime d'assiduité : 0 absences ET (≥ seuil RDV OU ≥ 1 installation)
            bool assiduiteOk     = absenceCount == 0 && (rdvCount >= seuilRdv || installations >= 1);
            float primeAssiduite = assiduiteOk ? primeAssiduiteMax : 0f;

            // Prime installation : 300 DT pour la 1ère + extra par installation suppl.
            float primeInstallation = installations == 0
                ? 0f
                : install1 + (installations - 1) * installExtra;

            float totalSalary = baseSalary + primeAssiduite + primeInstallation;

            // Upsert SalaireAgent
            // Fields reused: PoseCount=installations, RefusCount=absences,
            //                RdvBonus=primeAssiduite, InstallationBonus=primeInstallation
            var existing = await _context.SalairesAgents
                .FirstOrDefaultAsync(s => s.AgentId == agent.Id && s.Month == month);

            if (existing != null)
            {
                existing.BaseSalary        = baseSalary;
                existing.RdvCount          = rdvCount;
                existing.PoseCount         = installations;
                existing.RefusCount        = absenceCount;
                existing.QualityRate       = 0;
                existing.RdvBonus          = primeAssiduite;
                existing.PoseBonus         = 0;
                existing.QualityBonus      = 0;
                existing.InstallationBonus = primeInstallation;
                existing.Penalties         = 0;
                existing.TotalSalary       = totalSalary;
            }
            else
            {
                _context.SalairesAgents.Add(new SalaireAgent
                {
                    AgentId           = agent.Id,
                    Month             = month,
                    BaseSalary        = baseSalary,
                    RdvCount          = rdvCount,
                    PoseCount         = installations,
                    RefusCount        = absenceCount,
                    QualityRate       = 0,
                    RdvBonus          = primeAssiduite,
                    PoseBonus         = 0,
                    QualityBonus      = 0,
                    InstallationBonus = primeInstallation,
                    Penalties         = 0,
                    TotalSalary       = totalSalary
                });
            }

            result.Add(new SalaryCalculationDto
            {
                AgentId           = agent.Id,
                AgentName         = $"{agent.Prenom} {agent.Nom}",
                Role              = agent.Role,
                TypeContrat       = isPT ? "PLEIN_TEMPS" : "MI_TEMPS",
                Month             = month,
                BaseSalary        = baseSalary,
                RdvCount          = rdvCount,
                Installations     = installations,
                AbsenceCount      = absenceCount,
                AssiduiteOk       = assiduiteOk,
                PrimeAssiduite    = primeAssiduite,
                PrimeInstallation = primeInstallation,
                TotalSalary       = totalSalary,
                // Legacy
                PoseCount         = installations,
                RefusCount        = absenceCount,
                RdvBonus          = primeAssiduite,
                InstallationBonus = primeInstallation
            });
        }

        await _context.SaveChangesAsync();
        return Ok(result);
    }

    // ── GET /api/salaries/config ──────────────────────────────────────────────
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var rules = await _context.SalaryRules.AsNoTracking().ToListAsync();
        float Get(string name, float def) => rules.FirstOrDefault(r => r.RuleName == name)?.Amount ?? def;

        return Ok(new SalaryConfigDto
        {
            PT_BaseSalary     = Get("PT_base_salary",    900f),
            PT_PrimeAssiduite = Get("PT_assiduite",      100f),
            PT_SeuilRdv       = (int)Get("PT_rdv_threshold", 21f),
            PT_Install1       = Get("PT_install_first",  300f),
            PT_InstallExtra   = Get("PT_install_extra",  100f),
            MT_BaseSalary     = Get("MT_base_salary",    600f),
            MT_PrimeAssiduite = Get("MT_assiduite",      100f),
            MT_SeuilRdv       = (int)Get("MT_rdv_threshold", 12f),
            MT_Install1       = Get("MT_install_first",  300f),
            MT_InstallExtra   = Get("MT_install_extra",  150f),
        });
    }

    // ── PUT /api/salaries/config — SuperAdmin seulement ──────────────────────
    [HttpPut("config")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateConfig([FromBody] SalaryConfigDto dto)
    {
        var updates = new Dictionary<string, float>
        {
            ["PT_base_salary"]   = dto.PT_BaseSalary,
            ["PT_assiduite"]     = dto.PT_PrimeAssiduite,
            ["PT_rdv_threshold"] = dto.PT_SeuilRdv,
            ["PT_install_first"] = dto.PT_Install1,
            ["PT_install_extra"] = dto.PT_InstallExtra,
            ["MT_base_salary"]   = dto.MT_BaseSalary,
            ["MT_assiduite"]     = dto.MT_PrimeAssiduite,
            ["MT_rdv_threshold"] = dto.MT_SeuilRdv,
            ["MT_install_first"] = dto.MT_Install1,
            ["MT_install_extra"] = dto.MT_InstallExtra,
        };

        var existing = await _context.SalaryRules.ToListAsync();
        foreach (var (name, value) in updates)
        {
            var rule = existing.FirstOrDefault(r => r.RuleName == name);
            if (rule != null)
            {
                rule.Amount    = value;
                rule.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.SalaryRules.Add(new SalaryRule
                {
                    RuleName  = name,
                    RuleType  = name,
                    Amount    = value,
                    Role      = "agent",
                    IsActive  = true
                });
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── GET /api/salaries/rules ───────────────────────────────────────────────
    [HttpGet("rules")]
    public async Task<IActionResult> GetRules([FromQuery] string? role)
    {
        var query = _context.SalaryRules.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(role)) query = query.Where(r => r.Role == role);
        var result = await query.Select(r => new SalaryRuleDto
        {
            Id = r.Id, RuleName = r.RuleName, RuleType = r.RuleType,
            Amount = r.Amount, Role = r.Role, IsActive = r.IsActive
        }).ToListAsync();
        return Ok(result);
    }

    // ── POST/PUT/DELETE rules — SuperAdmin seulement ──────────────────────────
    [HttpPost("rules")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateRule([FromBody] CreateSalaryRuleDto dto)
    {
        if (dto == null) return BadRequest(new { error = "Body requis" });
        var rule = new SalaryRule
        {
            RuleName = dto.RuleName, RuleType = dto.RuleType,
            Amount = dto.Amount, Role = dto.Role ?? "agent", IsActive = dto.IsActive ?? true
        };
        _context.SalaryRules.Add(rule);
        await _context.SaveChangesAsync();
        return Ok(new SalaryRuleDto
        {
            Id = rule.Id, RuleName = rule.RuleName, RuleType = rule.RuleType,
            Amount = rule.Amount, Role = rule.Role, IsActive = rule.IsActive
        });
    }

    [HttpPut("rules/{ruleId}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateRule(long ruleId, [FromBody] UpdateSalaryRuleDto dto)
    {
        var rule = await _context.SalaryRules.FindAsync(ruleId);
        if (rule == null) return NotFound(new { error = "Règle introuvable" });
        if (dto.RuleName  != null) rule.RuleName  = dto.RuleName;
        if (dto.RuleType  != null) rule.RuleType  = dto.RuleType;
        if (dto.Amount    != null) rule.Amount    = dto.Amount.Value;
        if (dto.Role      != null) rule.Role      = dto.Role;
        if (dto.IsActive  != null) rule.IsActive  = dto.IsActive.Value;
        rule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("rules/{ruleId}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteRule(long ruleId)
    {
        var rule = await _context.SalaryRules.FindAsync(ruleId);
        if (rule == null) return NotFound(new { error = "Règle introuvable" });
        _context.SalaryRules.Remove(rule);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── GET /api/salaries/{agentId} ───────────────────────────────────────────
    [HttpGet("{agentId}")]
    public async Task<IActionResult> GetAgentSalary(long agentId, [FromQuery] string? month)
    {
        var agent = await _context.Utilisateurs.AsNoTracking().FirstOrDefaultAsync(u => u.Id == agentId);
        if (agent == null) return NotFound(new { error = "Agent introuvable" });
        month ??= DateTime.UtcNow.ToString("yyyy-MM");
        var current = await _context.SalairesAgents.AsNoTracking()
            .FirstOrDefaultAsync(s => s.AgentId == agentId && s.Month == month);
        var history = await _context.SalairesAgents.AsNoTracking()
            .Where(s => s.AgentId == agentId).OrderByDescending(s => s.Month).Take(12).ToListAsync();
        return Ok(new
        {
            agent = new { id = agent.Id, name = $"{agent.Prenom} {agent.Nom}", role = agent.Role },
            currentSalary = current,
            salaryHistory = history
        });
    }

    // ── PUT /api/salaries/{salaryId}/payment ──────────────────────────────────
    [HttpPut("{salaryId}/payment")]
    public async Task<IActionResult> UpdatePayment(long salaryId, [FromBody] PaymentStatusDto dto)
    {
        var salary = await _context.SalairesAgents.FindAsync(salaryId);
        if (salary == null) return NotFound(new { error = "Salaire introuvable" });
        salary.PaymentStatus = dto.Status;
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
