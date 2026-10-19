using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

/// <summary>Pointage avancé avec suivi des pauses (module Khaled)</summary>
public class AdvancedAttendance
{
    [Key]
    public long Id { get; set; }

    public long UserId { get; set; }

    public DateTime Date { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }

    /// <summary>active | paused | completed</summary>
    [MaxLength(20)]
    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(UserId))]
    public virtual Utilisateur? User { get; set; }

    public virtual ICollection<AttendanceBreak> Breaks { get; set; } = new List<AttendanceBreak>();
}

/// <summary>Pause dans une session de pointage</summary>
public class AttendanceBreak
{
    [Key]
    public long Id { get; set; }

    public long AttendanceId { get; set; }

    /// <summary>inter_appel | cafe | dejeuner | priere | technique | personnelle</summary>
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    /// <summary>Durée calculée en minutes à la fermeture de la pause</summary>
    public int DurationMinutes { get; set; }

    // Navigation
    [ForeignKey(nameof(AttendanceId))]
    public virtual AdvancedAttendance? Attendance { get; set; }
}
