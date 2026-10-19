using Backend.Data;
using Backend.DTOs;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Backend.Services.Attendance;

public class AttendanceService : IAttendanceService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public AttendanceService(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // ── Work schedule helpers ─────────────────────────────────────────────────

    private int WorkStartHour       => _config.GetValue<int>("WorkSchedule:StartHour", 8);
    private int WorkStartMinute     => _config.GetValue<int>("WorkSchedule:StartMinute", 0);
    private int WorkEndHour         => _config.GetValue<int>("WorkSchedule:EndHour", 20);
    private int WorkEndMinute       => _config.GetValue<int>("WorkSchedule:EndMinute", 0);
    private int LateToleranceMin    => _config.GetValue<int>("WorkSchedule:LateToleranceMinutes", 10);
    private float LatePenaltyAmount => _config.GetValue<float>("WorkSchedule:LatePenaltyPerRetard", 30f);
    private int OtherRolesEndHour   => _config.GetValue<int>("WorkSchedule:OtherRolesEndHour", 16);
    private int OtherRolesEndMinute => _config.GetValue<int>("WorkSchedule:OtherRolesEndMinute", 0);

    // Agent roles that get the extended schedule (until 20h) and full break support
    private static readonly HashSet<string> AgentRoles = new(StringComparer.OrdinalIgnoreCase)
        { "AGENT", "TECH", "agent", "technique", "ServiceTech" };

    /// <summary>Retourne la configuration des horaires de travail.</summary>
    public WorkScheduleDto GetWorkSchedule() => new WorkScheduleDto
    {
        StartHour = WorkStartHour,
        StartMinute = WorkStartMinute,
        EndHour = WorkEndHour,
        EndMinute = WorkEndMinute,
        LateToleranceMinutes = LateToleranceMin,
        LatePenaltyPerRetard = LatePenaltyAmount
    };

    /// <summary>Calcule les minutes de retard (0 si dans la tolérance ou hors plage horaire).</summary>
    private (int retardMinutes, bool estEnRetard, float penalite) ComputeRetard(DateTime clockInUtc)
    {
        var local = clockInUtc.ToLocalTime();
        var workStart = local.Date.AddHours(WorkStartHour).AddMinutes(WorkStartMinute);
        var workEnd   = local.Date.AddHours(WorkEndHour).AddMinutes(WorkEndMinute);

        // Hors plage horaire (avant le début ou après la fin) → pas de retard
        if (local >= workEnd || local < local.Date)
            return (0, false, 0f);

        // Arrivé avant l'heure de début → pas de retard
        if (local <= workStart)
            return (0, false, 0f);

        // Retard = minutes après workStart, moins la tolérance
        var lateMin = Math.Max(0, (int)(local - workStart).TotalMinutes - LateToleranceMin);
        return (lateMin, lateMin > 0, lateMin > 0 ? LatePenaltyAmount : 0f);
    }

    // ── Clock-In ─────────────────────────────────────────────────────────────

    public async Task<ClockResultDto> ClockInAsync(long userId, string? userRole = null)
    {
        // ── Vérification plage horaire (agents uniquement) ──────────────────
        bool isAgentRole = userRole == null || AgentRoles.Contains(userRole);

        if (isAgentRole)
        {
            var localNow = DateTime.Now;
            var dayStart = localNow.Date.AddHours(WorkStartHour).AddMinutes(WorkStartMinute);
            var dayEnd   = localNow.Date.AddHours(WorkEndHour).AddMinutes(WorkEndMinute);
            if (localNow < dayStart || localNow > dayEnd)
            {
                return new ClockResultDto
                {
                    Success = false,
                    Message = $"Pointage non autorisé hors horaires ({WorkStartHour:D2}h{WorkStartMinute:D2}–{WorkEndHour:D2}h{WorkEndMinute:D2})."
                };
            }
        }

        var today = DateTime.UtcNow.Date;

        // Auto-close stale sessions from previous days
        var staleSessions = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Date < today && (a.Status == "active" || a.Status == "break"))
            .ToListAsync();

        foreach (var stale in staleSessions)
        {
            var openBreaks = await _context.AttendanceBreaks
                .Where(b => b.AttendanceId == stale.Id && b.EndTime == null)
                .ToListAsync();

            foreach (var b in openBreaks)
            {
                b.EndTime = DateTime.UtcNow;
                b.DurationMinutes = (int)(DateTime.UtcNow - b.StartTime).TotalMinutes;
            }

            stale.Status = "completed";
            stale.ClockOut ??= DateTime.UtcNow;
        }

        // Check if already clocked in today
        var existing = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Date == today && (a.Status == "active" || a.Status == "break"))
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            if (existing.Status == "break")
                return new ClockResultDto { Success = false, Message = "Une pause est en cours. Terminez-la d'abord." };
            return new ClockResultDto { Success = false, Message = "Vous êtes déjà pointé(e) — statut : actif." };
        }

        var attendance = new AdvancedAttendance
        {
            UserId = userId,
            Date = today,
            ClockIn = DateTime.UtcNow,
            Status = "active"
        };
        _context.AdvancedAttendances.Add(attendance);
        await _context.SaveChangesAsync();

        return new ClockResultDto { Success = true, AttendanceId = attendance.Id, Message = "Pointage d'entrée enregistré" };
    }

    // ── Clock-Out ────────────────────────────────────────────────────────────

    public async Task<ClockResultDto> ClockOutAsync(long userId)
    {
        var attendance = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && (a.Status == "active" || a.Status == "break"))
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (attendance == null)
            return new ClockResultDto { Success = false, Message = "Aucun pointage actif. Pointez d'abord votre entrée." };

        // Auto-close open break
        var openBreak = await _context.AttendanceBreaks
            .Where(b => b.AttendanceId == attendance.Id && b.EndTime == null)
            .OrderByDescending(b => b.Id)
            .FirstOrDefaultAsync();

        if (openBreak != null)
        {
            openBreak.EndTime = DateTime.UtcNow;
            openBreak.DurationMinutes = (int)(openBreak.EndTime.Value - openBreak.StartTime).TotalMinutes;
        }

        attendance.ClockOut = DateTime.UtcNow;
        attendance.Status = "completed";
        await _context.SaveChangesAsync();

        return new ClockResultDto { Success = true, Message = "Pointage de sortie enregistré" };
    }

    // ── Start Break ──────────────────────────────────────────────────────────

    public async Task<ClockResultDto> StartBreakAsync(long userId, string breakType)
    {
        var attendance = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Status == "active")
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (attendance == null)
        {
            var any = await _context.AdvancedAttendances
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.Id)
                .FirstOrDefaultAsync();

            if (any == null)
                return new ClockResultDto { Success = false, Message = "Pointez d'abord votre entrée." };
            if (any.Status == "break")
                return new ClockResultDto { Success = false, Message = "Une pause est déjà en cours." };
            if (any.Status == "completed")
                return new ClockResultDto { Success = false, Message = "Votre journée est terminée." };

            return new ClockResultDto { Success = false, Message = $"Impossible de démarrer une pause (statut : {any.Status})." };
        }

        // Confirm no open break
        var currentBreak = await _context.AttendanceBreaks
            .Where(b => b.AttendanceId == attendance.Id && b.EndTime == null)
            .FirstOrDefaultAsync();

        if (currentBreak != null)
            return new ClockResultDto { Success = false, Message = "Une pause est déjà en cours." };

        attendance.Status = "break";

        var brk = new AttendanceBreak
        {
            AttendanceId = attendance.Id,
            Type = breakType,
            StartTime = DateTime.UtcNow
        };
        _context.AttendanceBreaks.Add(brk);
        await _context.SaveChangesAsync();

        return new ClockResultDto { Success = true, AttendanceId = attendance.Id, Message = "Pause démarrée" };
    }

    // ── End Break ────────────────────────────────────────────────────────────

    public async Task<ClockResultDto> EndBreakAsync(long userId)
    {
        var attendance = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Status == "break")
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (attendance == null)
        {
            var any = await _context.AdvancedAttendances
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.Id)
                .FirstOrDefaultAsync();

            if (any == null)
                return new ClockResultDto { Success = false, Message = "Aucun pointage trouvé." };
            if (any.Status == "active")
                return new ClockResultDto { Success = false, Message = "Aucune pause en cours — vous êtes actif." };
            if (any.Status == "completed")
                return new ClockResultDto { Success = false, Message = "Votre journée est terminée." };

            return new ClockResultDto { Success = false, Message = $"Aucune pause en cours (statut : {any.Status})." };
        }

        var openBreak = await _context.AttendanceBreaks
            .Where(b => b.AttendanceId == attendance.Id && b.EndTime == null)
            .OrderByDescending(b => b.Id)
            .FirstOrDefaultAsync();

        if (openBreak == null)
        {
            // Inconsistent state — fix it
            attendance.Status = "active";
            await _context.SaveChangesAsync();
            return new ClockResultDto { Success = true, Message = "Statut corrigé en actif (pas de pause ouverte)." };
        }

        openBreak.EndTime = DateTime.UtcNow;
        openBreak.DurationMinutes = (int)(DateTime.UtcNow - openBreak.StartTime).TotalMinutes;
        attendance.Status = "active";
        await _context.SaveChangesAsync();

        return new ClockResultDto { Success = true, Message = "Pause terminée" };
    }

    // ── Status ───────────────────────────────────────────────────────────────

    public async Task<AttendanceStatusDto> GetStatusAsync(long userId)
    {
        var today = DateTime.UtcNow.Date;
        var attendance = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Date == today && (a.Status == "active" || a.Status == "break"))
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (attendance == null)
            return new AttendanceStatusDto { Status = "offline" };

        if (attendance.Status == "break")
        {
            var brk = await _context.AttendanceBreaks
                .Where(b => b.AttendanceId == attendance.Id && b.EndTime == null)
                .OrderByDescending(b => b.Id)
                .FirstOrDefaultAsync();

            return new AttendanceStatusDto
            {
                Status = "break",
                ClockIn = attendance.ClockIn,
                BreakType = brk?.Type,
                StartTime = brk?.StartTime
            };
        }

        return new AttendanceStatusDto { Status = "active", ClockIn = attendance.ClockIn };
    }

    // ── Report (admin/qualite) ────────────────────────────────────────────────

    public async Task<List<AttendanceReportDto>> GetReportAsync()
    {
        var records = await _context.AdvancedAttendances
            .AsNoTracking()
            .Include(a => a.User)
            .Include(a => a.Breaks)
            .OrderByDescending(a => a.Date)
            .Take(500)
            .ToListAsync();

        return records.Select(r => new AttendanceReportDto
        {
            Id = r.Id,
            UserId = r.UserId,
            UserName = r.User != null ? $"{r.User.Prenom} {r.User.Nom}" : r.UserId.ToString(),
            Date = r.Date,
            ClockIn = r.ClockIn,
            ClockOut = r.ClockOut,
            Status = r.Status,
            Breaks = r.Breaks.Select(b => new BreakDto
            {
                Id = b.Id,
                Type = b.Type,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                DurationMinutes = b.DurationMinutes
            }).ToList()
        }).ToList();
    }

    // ── Team Status ──────────────────────────────────────────────────────────

    public async Task<TeamStatusDto> GetTeamStatusAsync()
    {
        var today = DateTime.UtcNow.Date;

        var totalAgents = await _context.Utilisateurs
            .CountAsync(u => u.Role == "AGENT" || u.Role == "TECH");

        var todayAttendances = await _context.AdvancedAttendances
            .Where(a => a.Date == today && (a.Status == "active" || a.Status == "break"))
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.Id).First())
            .ToListAsync();

        var online = todayAttendances.Count(a => a.Status == "active");
        var onBreak = todayAttendances.Count(a => a.Status == "break");

        return new TeamStatusDto
        {
            OnlineAgents = online,
            OnBreakAgents = onBreak,
            OfflineAgents = totalAgents - online - onBreak,
            PresentToday = online + onBreak,
            TotalAgents = totalAgents
        };
    }

    // ── Team Report ──────────────────────────────────────────────────────────

    public async Task<TeamReportDto> GetTeamReportAsync()
    {
        var today = DateTime.UtcNow.Date;

        var totalAgents = await _context.Utilisateurs
            .CountAsync(u => u.Role == "AGENT" || u.Role == "TECH");

        var presentToday = await _context.AdvancedAttendances
            .Where(a => a.Date == today && (a.Status == "active" || a.Status == "break"))
            .GroupBy(a => a.UserId)
            .CountAsync();

        return new TeamReportDto
        {
            TotalAgents = totalAgents,
            PresentToday = presentToday,
            AbsentToday = totalAgents - presentToday
        };
    }

    // ── Team Detail ──────────────────────────────────────────────────────────

    public async Task<List<TeamAttendanceDetailDto>> GetTeamAttendanceDetailAsync()
    {
        var today = DateTime.UtcNow.Date;

        var agents = await _context.Utilisateurs
            .Where(u => u.Role == "AGENT" || u.Role == "QUALITE" || u.Role == "ADMIN" || u.Role == "TECH")
            .AsNoTracking()
            .ToListAsync();

        var todayAttendances = await _context.AdvancedAttendances
            .Where(a => a.Date == today && (a.Status == "active" || a.Status == "break"))
            .Include(a => a.Breaks)
            .AsNoTracking()
            .ToListAsync();

        var latestByUser = todayAttendances
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.Id).First())
            .ToDictionary(a => a.UserId);

        var result = new List<TeamAttendanceDetailDto>();

        foreach (var agent in agents)
        {
            var dto = new TeamAttendanceDetailDto
            {
                UserId = agent.Id,
                UserName = $"{agent.Prenom} {agent.Nom}",
                UserRole = agent.Role?.ToLowerInvariant() ?? "agent",
                Status = "offline"
            };

            if (latestByUser.TryGetValue(agent.Id, out var att))
            {
                dto.Status = att.Status;
                dto.ClockIn = att.ClockIn;

                if (att.ClockIn != default)
                {
                    var end = att.ClockOut ?? DateTime.UtcNow;
                    var totalMinutes = (end - att.ClockIn).TotalMinutes;
                    var breakMinutes = att.Breaks.Sum(b =>
                        b.DurationMinutes > 0
                            ? b.DurationMinutes
                            : b.EndTime.HasValue
                                ? (b.EndTime.Value - b.StartTime).TotalMinutes
                                : (DateTime.UtcNow - b.StartTime).TotalMinutes);

                    dto.WorkDurationMinutes = Math.Max(0, totalMinutes - breakMinutes);
                    dto.TotalBreakMinutes = (int)breakMinutes;
                }

                if (att.Status == "break")
                {
                    var openBreak = att.Breaks
                        .Where(b => b.EndTime == null)
                        .OrderByDescending(b => b.Id)
                        .FirstOrDefault();

                    if (openBreak != null)
                    {
                        dto.CurrentBreakType = openBreak.Type;
                        dto.CurrentBreakStart = openBreak.StartTime;
                    }
                }
            }

            result.Add(dto);
        }

        return result;
    }

    // ── Admin daily report (PointagePage format) ──────────────────────────────

    public async Task<PointageDailyDto> GetDailyReportAsync(DateTime date)
    {
        // Force UTC to avoid Npgsql DateTimeKind mismatch
        var targetDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

        var allAgents = await _context.Utilisateurs
            .Where(u => u.Role == "AGENT" || u.Role == "TECH")
            .AsNoTracking()
            .ToListAsync();

        var dayAttendances = await _context.AdvancedAttendances
            .Where(a => a.Date == targetDate)
            .Include(a => a.Breaks)
            .AsNoTracking()
            .ToListAsync();

        // Latest session per user
        var latestByUser = dayAttendances
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.Id).First())
            .ToDictionary(a => a.UserId);

        var details = new List<PointageDetailDto>();
        int totalWorkMinutes = 0;
        int totalBreakMinutes = 0;
        int presentCount = 0;

        foreach (var agent in allAgents)
        {
            if (!latestByUser.TryGetValue(agent.Id, out var att)) continue;

            presentCount++;

            // Work duration
            var end = att.ClockOut ?? DateTime.UtcNow;
            var rawMinutes = (end - att.ClockIn).TotalMinutes;
            var breakMins = att.Breaks.Sum(b =>
                b.DurationMinutes > 0 ? b.DurationMinutes :
                b.EndTime.HasValue ? (int)(b.EndTime.Value - b.StartTime).TotalMinutes :
                (int)(DateTime.UtcNow - b.StartTime).TotalMinutes);
            var workMins = Math.Max(0, rawMinutes - breakMins);

            totalWorkMinutes += (int)workMins;
            totalBreakMinutes += breakMins;

            // Build pauses string
            var pauseLabels = new Dictionary<string, string>
            {
                ["cafe"] = "☕ Café", ["dejeuner"] = "🍽️ Déj",
                ["priere"] = "🕌 Prière", ["technique"] = "🔧 Tech", ["personnelle"] = "💭 Perso"
            };
            var pauseStr = att.Breaks.Count == 0 ? "--" :
                string.Join(", ", att.Breaks.Select(b =>
                {
                    var label = pauseLabels.GetValueOrDefault(b.Type, b.Type);
                    var dur = b.DurationMinutes > 0 ? b.DurationMinutes :
                              b.EndTime.HasValue ? (int)(b.EndTime.Value - b.StartTime).TotalMinutes :
                              (int)(DateTime.UtcNow - b.StartTime).TotalMinutes;
                    return $"{label} ({dur}min)";
                }));

            var (retardMin, estEnRetard, penalite) = ComputeRetard(att.ClockIn);

            details.Add(new PointageDetailDto
            {
                AgentNom = $"{agent.Prenom} {agent.Nom}",
                Arrivee = att.ClockIn.ToLocalTime().ToString("HH:mm"),
                PremierAppel = "--",
                DernierAppel = "--",
                Depart = att.ClockOut.HasValue ? att.ClockOut.Value.ToLocalTime().ToString("HH:mm") : "En cours",
                Pauses = pauseStr,
                TempsProductif = $"{(int)workMins / 60}h {(int)workMins % 60}m",
                Statut = att.Status == "active" ? "En activité" :
                         att.Status == "break" ? "En pause" : "Terminé",
                RetardMinutes = retardMin,
                EstEnRetard = estEnRetard,
                PenaliteSalaire = penalite
            });
        }

        var avgWork = presentCount > 0 ? totalWorkMinutes / presentCount : 0;
        var avgBreak = presentCount > 0 ? totalBreakMinutes / presentCount : 0;
        int retardCount = details.Count(d => d.EstEnRetard);

        return new PointageDailyDto
        {
            Presents = presentCount,
            TotalAgents = allAgents.Count,
            Retards = retardCount,
            TempsMoyen = $"{avgWork / 60}h {avgWork % 60}m",
            PausesMoyennes = $"{avgBreak}min",
            HeureDebutTravail = $"{WorkStartHour:D2}:{WorkStartMinute:D2}",
            HeureFinTravail = $"{WorkEndHour:D2}:{WorkEndMinute:D2}",
            ToleranceMinutes = LateToleranceMin,
            Details = details
        };
    }

    // ── Agent personal history ────────────────────────────────────────────────

    public async Task<List<AgentAttendanceDayDto>> GetMyHistoryAsync(long userId, int days = 30)
    {
        var since = DateTime.UtcNow.Date.AddDays(-days);

        var records = await _context.AdvancedAttendances
            .Where(a => a.UserId == userId && a.Date >= since)
            .Include(a => a.Breaks)
            .OrderByDescending(a => a.Date)
            .AsNoTracking()
            .ToListAsync();

        return records.Select(a =>
        {
            var end = a.ClockOut ?? DateTime.UtcNow;
            var rawMins = (end - a.ClockIn).TotalMinutes;
            var breakMins = a.Breaks.Sum(b =>
                b.DurationMinutes > 0 ? b.DurationMinutes :
                b.EndTime.HasValue ? (int)(b.EndTime.Value - b.StartTime).TotalMinutes :
                (int)(DateTime.UtcNow - b.StartTime).TotalMinutes);
            var workMins = Math.Max(0, rawMins - breakMins);
            var (retardMin, estEnRetard, penalite) = ComputeRetard(a.ClockIn);

            return new AgentAttendanceDayDto
            {
                Id = a.Id,
                Date = a.Date,
                ClockIn = a.ClockIn.ToLocalTime().ToString("HH:mm"),
                ClockOut = a.ClockOut.HasValue ? a.ClockOut.Value.ToLocalTime().ToString("HH:mm") : "--",
                Status = a.Status,
                TempsProductif = $"{(int)workMins / 60}h {(int)workMins % 60}m",
                TotalBreakMinutes = (int)breakMins,
                RetardMinutes = retardMin,
                EstEnRetard = estEnRetard,
                PenaliteSalaire = penalite,
                Breaks = a.Breaks.Select(b => new BreakDto
                {
                    Id = b.Id,
                    Type = b.Type,
                    StartTime = b.StartTime,
                    EndTime = b.EndTime,
                    DurationMinutes = b.DurationMinutes > 0 ? b.DurationMinutes :
                                      b.EndTime.HasValue ? (int)(b.EndTime.Value - b.StartTime).TotalMinutes :
                                      (int)(DateTime.UtcNow - b.StartTime).TotalMinutes
                }).ToList()
            };
        }).ToList();
    }
    // ── All-roles history (Admin / SuperAdmin) ────────────────────────────────

    public async Task<AllRolesHistoryResultDto> GetAllRolesHistoryAsync(DateTime? date = null, string? role = null)
    {
        var targetDate = date.HasValue
            ? DateTime.SpecifyKind(date.Value.Date, DateTimeKind.Utc)
            : DateTime.UtcNow.Date;

        var query = _context.AdvancedAttendances
            .Include(a => a.User)
            .Where(a => a.Date == targetDate);

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(a => a.User != null && a.User.Role == role);

        var sessions = await query
            .OrderByDescending(a => a.ClockIn)
            .ToListAsync();

        var result = new List<AllRolesSessionDto>();
        foreach (var s in sessions)
        {
            var userName = s.User != null ? $"{s.User.Prenom} {s.User.Nom}" : $"User#{s.UserId}";
            var userRole = s.User?.Role ?? "INCONNU";

            var (lateMin, isLate, _) = ComputeRetard(s.ClockIn);

            int? durationMin = null;
            if (s.ClockOut.HasValue)
                durationMin = (int)(s.ClockOut.Value - s.ClockIn).TotalMinutes;

            result.Add(new AllRolesSessionDto
            {
                Id            = s.Id,
                UserId        = s.UserId,
                UserName      = userName,
                UserRole      = userRole,
                Date          = s.Date,
                ClockIn       = s.ClockIn.ToLocalTime().ToString("HH:mm"),
                ClockOut      = s.ClockOut.HasValue ? s.ClockOut.Value.ToLocalTime().ToString("HH:mm") : null,
                Status        = s.Status,
                DurationMinutes = durationMin,
                IsLate        = isLate,
                LateMinutes   = lateMin,
            });
        }

        var countByRole = result
            .GroupBy(s => s.UserRole)
            .ToDictionary(g => g.Key, g => g.Count());

        return new AllRolesHistoryResultDto
        {
            Sessions      = result,
            TotalPresent  = result.Count,
            TotalActive   = result.Count(s => s.Status == "active" || s.Status == "break"),
            CountByRole   = countByRole,
        };
    }

}