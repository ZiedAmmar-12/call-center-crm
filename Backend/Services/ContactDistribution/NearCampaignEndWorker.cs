using Backend.Constants;
using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.ContactDistribution
{
    // Runs every 30 minutes. When a campaign's active pending contacts drop below 5%,
    // it resets NearCampaignEnd contacts back to Pending so they get another shot.
    public class NearCampaignEndWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<NearCampaignEndWorker> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

        public NearCampaignEndWorker(IServiceScopeFactory scopeFactory, ILogger<NearCampaignEndWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "NearCampaignEndWorker failed");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var activeCampaignIds = await db.Campaigns
                .Where(c => c.Status == CampaignStatus.Active && !c.IsDeleted)
                .Select(c => c.Id)
                .ToListAsync(ct);

            foreach (var campaignId in activeCampaignIds)
            {
                var totalPending = await db.CampaignFileContacts
                    .CountAsync(c => c.CampaignId == campaignId
                                  && c.CallStatus == CallStatus.Pending
                                  && c.AssignedAgentId == null
                                  && c.CampaignFile != null
                                  && c.CampaignFile.IsActive
                                  && c.CampaignFile.IsInjected
                                  && !c.CampaignFile.IsRemoved
                                  && !c.CampaignFile.IsRecycled, ct);

                var nearCampaignEndCount = await db.CampaignFileContacts
                    .CountAsync(c => c.CampaignId == campaignId
                                  && c.NextAction == NextActions.NearCampaignEnd, ct);

                if (nearCampaignEndCount == 0)
                    continue;

                // If active pending contacts are less than 5% of NearCampaignEnd contacts,
                // the campaign is almost done — recycle the NRP contacts for a final round
                var threshold = (int)Math.Ceiling(nearCampaignEndCount * 0.05);
                if (totalPending > threshold)
                    continue;

                var recycled = await db.CampaignFileContacts
                    .Where(c => c.CampaignId == campaignId
                             && c.NextAction == NextActions.NearCampaignEnd
                             && c.AttemptCount < c.MaxAttempts)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.CallStatus, CallStatus.Pending)
                        .SetProperty(c => c.NextAction, NextActions.None)
                        .SetProperty(c => c.IsAssignable, false)
                        .SetProperty(c => c.NextCallAt, (DateTime?)null), ct);

                _logger.LogInformation(
                    "Campaign {CampaignId}: recycled {Count} NearCampaignEnd contacts back to Pending",
                    campaignId, recycled);
            }
        }
    }
}
