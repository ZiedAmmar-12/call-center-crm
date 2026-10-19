using Backend.Constants;
using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Agents
{
    public class AgentPresenceCleanupWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AgentPresenceCleanupWorker> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(1);
        private readonly TimeSpan _heartbeatTimeout = TimeSpan.FromSeconds(90);
        private readonly TimeSpan _assignedContactTimeout = TimeSpan.FromMinutes(30);

        public AgentPresenceCleanupWorker(
            IServiceProvider serviceProvider,
            ILogger<AgentPresenceCleanupWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupStaleAgentsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error cleaning stale agent presence");
                }

                await Task.Delay(_interval, stoppingToken);
            }
        }
        //cleans up contacts that stayed assigned for 30 minutes
        private async Task CleanupStaleAgentsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTime.UtcNow;
            var staleBefore = now.Subtract(_heartbeatTimeout);

            var staleAgentIds = await db.Users
                .Where(u => !u.IsDeleted
                         && u.IsOnline
                         && (u.LastHeartbeatAt == null || u.LastHeartbeatAt < staleBefore))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            if (staleAgentIds.Count > 0)
            {
                await db.Users
                    .Where(u => staleAgentIds.Contains(u.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(u => u.IsOnline, false)
                        .SetProperty(u => u.PresenceStatus, AgentPresenceStatus.Offline)
                        .SetProperty(u => u.PresenceChangedAt, now)
                        .SetProperty(u => u.UpdatedAt, now),
                        cancellationToken);

                await db.CallAttempts
                    .Where(a => staleAgentIds.Contains(a.AgentId)
                             && a.Status == CallStatus.Assigned
                             && a.EndedAt == null)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(a => a.Status, CallStatus.TimedOut)
                        .SetProperty(a => a.EndedAt, now)
                        .SetProperty(a => a.UpdatedAt, now),
                        cancellationToken);

                await db.CampaignFileContacts
                    .Where(c => c.AssignedAgentId.HasValue
                             && staleAgentIds.Contains(c.AssignedAgentId.Value)
                             && c.CallStatus == CallStatus.Assigned)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.CallStatus, CallStatus.Pending)
                        .SetProperty(c => c.AssignedAgentId, (int?)null)
                        .SetProperty(c => c.AssignedAt, (DateTime?)null),
                        cancellationToken);

                _logger.LogInformation("Marked {Count} stale agents offline", staleAgentIds.Count);
            }

            var untouchedBefore = now.Subtract(_assignedContactTimeout);
            var untouchedAssignments = db.CampaignFileContacts
                .Where(c => c.CallStatus == CallStatus.Assigned
                         && c.AssignedAt != null
                         && c.AssignedAt < untouchedBefore);

            var affectedOnlineAgentIds = await untouchedAssignments
                .Where(c => c.AssignedAgentId.HasValue)
                .Select(c => c.AssignedAgentId!.Value)
                .Distinct()
                .ToListAsync(cancellationToken);

            var untouchedContactIds = untouchedAssignments.Select(c => c.Id);

            await db.CallAttempts
                .Where(a => untouchedContactIds.Contains(a.CampaignFileContactId)
                         && a.Status == CallStatus.Assigned
                         && a.EndedAt == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.Status, CallStatus.TimedOut)
                    .SetProperty(a => a.EndedAt, now)
                    .SetProperty(a => a.UpdatedAt, now),
                    cancellationToken);

            var releasedContacts = await untouchedAssignments
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.CallStatus, CallStatus.Pending)
                    .SetProperty(c => c.AssignedAgentId, (int?)null)
                    .SetProperty(c => c.AssignedAt, (DateTime?)null),
                    cancellationToken);

            if (affectedOnlineAgentIds.Count > 0)
            {
                await db.Users
                    .Where(u => affectedOnlineAgentIds.Contains(u.Id)
                             && u.IsOnline
                             && u.PresenceStatus == AgentPresenceStatus.OnCall)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(u => u.PresenceStatus, AgentPresenceStatus.WrapUp)
                        .SetProperty(u => u.PresenceChangedAt, now)
                        .SetProperty(u => u.UpdatedAt, now),
                        cancellationToken);
            }

            if (releasedContacts > 0)
                _logger.LogInformation("Released {Count} untouched assigned contacts", releasedContacts);
        }
    }
}
