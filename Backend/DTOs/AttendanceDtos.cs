namespace Backend.DTOs;

/// <summary>Plage horaire de travail renvoyée au client</summary>
public class WorkScheduleDto
{
    public int StartHour { get; set; }
    public int StartMinute { get; set; }
    public int EndHour { get; set; }
    public int EndMinute { get; set; }
    public int LateToleranceMinutes { get; set; }
    public float LatePenaltyPerRetard { get; set; }
}

public class AttendanceStatusDto
{
    public string Status { get; set; } = "offline"; // offline | active | break
    public DateTime? ClockIn { get; set; }
    public string? BreakType { get; set; }
    public DateTime? StartTime { get; set; }  // break start time
}

public class ClockResultDto
{
    public bool Success { get; set; }
    public long? AttendanceId { get; set; }
    public string? Message { get; set; }
}

public class BreakRequestDto
{
    public string Type { get; set; } = string.Empty;
}

public class BreakDto
{
    public long Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int DurationMinutes { get; set; }
}

public class AttendanceReportDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<BreakDto> Breaks { get; set; } = new();
}

public class TeamStatusDto
{
    public int OnlineAgents { get; set; }
    public int OnBreakAgents { get; set; }
    public int OfflineAgents { get; set; }
    public int PresentToday { get; set; }
    public int TotalAgents { get; set; }
}

public class TeamReportDto
{
    public int TotalAgents { get; set; }
    public int PresentToday { get; set; }
    public int AbsentToday { get; set; }
}

public class TeamAttendanceDetailDto
{
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = "agent";
    public string Status { get; set; } = "offline";
    public DateTime? ClockIn { get; set; }
    public double? WorkDurationMinutes { get; set; }
    public string? CurrentBreakType { get; set; }
    public DateTime? CurrentBreakStart { get; set; }
    public int TotalBreakMinutes { get; set; }
}

// ── Admin daily report (format compatible PointagePage) ───────────────────────

public class PointageDetailDto
{
    public string AgentNom { get; set; } = string.Empty;
    public string Arrivee { get; set; } = "--";
    public string PremierAppel { get; set; } = "--";
    public string DernierAppel { get; set; } = "--";
    public string Depart { get; set; } = "En cours";
    public string Pauses { get; set; } = "--";
    public string TempsProductif { get; set; } = "--";
    public string Statut { get; set; } = "À l'heure";
    /// <summary>Minutes de retard (0 si à l'heure ou dans la tolérance)</summary>
    public int RetardMinutes { get; set; }
    public bool EstEnRetard { get; set; }
    /// <summary>Pénalité salariale appliquée (en TND)</summary>
    public float PenaliteSalaire { get; set; }
}

public class PointageDailyDto
{
    public int Presents { get; set; }
    public int TotalAgents { get; set; }
    public int Retards { get; set; }
    public string TempsMoyen { get; set; } = "0h 0m";
    public string PausesMoyennes { get; set; } = "0min";
    /// <summary>Heure de début de journée (ex: "08:00")</summary>
    public string HeureDebutTravail { get; set; } = "08:00";
    /// <summary>Heure de fin de journée (ex: "20:00")</summary>
    public string HeureFinTravail { get; set; } = "20:00";
    /// <summary>Tolérance en minutes avant de compter un retard</summary>
    public int ToleranceMinutes { get; set; } = 10;
    public List<PointageDetailDto> Details { get; set; } = new();
}

// ── Agent personal history ───────────────────────────────────────────────────

public class AgentAttendanceDayDto
{
    public long Id { get; set; }
    public DateTime Date { get; set; }
    public string ClockIn { get; set; } = "--";
    public string ClockOut { get; set; } = "--";
    public string Status { get; set; } = "completed";
    public string TempsProductif { get; set; } = "--";
    public int TotalBreakMinutes { get; set; }
    public int RetardMinutes { get; set; }
    public bool EstEnRetard { get; set; }
    public float PenaliteSalaire { get; set; }
    public List<BreakDto> Breaks { get; set; } = new();
}

// ── All-roles history (Admin / SuperAdmin view) ───────────────────────────────

public class AllRolesSessionDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string ClockIn { get; set; } = "--";
    public string? ClockOut { get; set; }
    public string Status { get; set; } = "active";
    /// <summary>Duration in minutes, null if session still active</summary>
    public int? DurationMinutes { get; set; }
    public bool IsLate { get; set; }
    public int LateMinutes { get; set; }
}

public class AllRolesHistoryResultDto
{
    public List<AllRolesSessionDto> Sessions { get; set; } = new();
    public int TotalPresent { get; set; }
    public int TotalActive { get; set; }
    public Dictionary<string, int> CountByRole { get; set; } = new();
}
