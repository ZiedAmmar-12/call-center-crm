using Backend.DTOs;

namespace Backend.Services.Attendance;

public interface IAttendanceService
{
    Task<ClockResultDto> ClockInAsync(long userId, string? userRole = null);
    Task<ClockResultDto> ClockOutAsync(long userId);
    Task<ClockResultDto> StartBreakAsync(long userId, string breakType);
    Task<ClockResultDto> EndBreakAsync(long userId);
    Task<AttendanceStatusDto> GetStatusAsync(long userId);
    Task<List<AttendanceReportDto>> GetReportAsync();
    Task<TeamStatusDto> GetTeamStatusAsync();
    Task<TeamReportDto> GetTeamReportAsync();
    Task<List<TeamAttendanceDetailDto>> GetTeamAttendanceDetailAsync();
    Task<PointageDailyDto> GetDailyReportAsync(DateTime date);
    Task<List<AgentAttendanceDayDto>> GetMyHistoryAsync(long userId, int days = 30);
    WorkScheduleDto GetWorkSchedule();
    Task<AllRolesHistoryResultDto> GetAllRolesHistoryAsync(DateTime? date = null, string? role = null);
}
