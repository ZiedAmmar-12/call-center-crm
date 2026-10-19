using Backend.Constants;
using Backend.Data;
using Backend.DTOs.Campaign;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Services.ContactDistribution
{
    public class ContactDistributionService : IContactDistributionService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<ContactDistributionService> _logger;

        public ContactDistributionService(ApplicationDbContext db, ILogger<ContactDistributionService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<InjectFileResponseDto> InjectFileAsync(int campaignId, int campaignFileId, int injectedByUserId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var result = await InjectCampaignFileCoreAsync(campaignId, campaignFileId, injectedByUserId);
                await transaction.CommitAsync();
                return result;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<InjectFileResponseDto> InjectSourceFileAsync(int campaignId, int sourceFileId, int injectedByUserId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            try
            {
                var campaignExists = await _db.Campaigns
                    .AnyAsync(c => c.Id == campaignId && !c.IsDeleted);

                if (!campaignExists)
                    throw new ArgumentException($"Campaign {campaignId} not found");

                var sourceFile = await _db.SourceFiles
                    .FirstOrDefaultAsync(sf => sf.Id == sourceFileId && !sf.IsDeleted);

                if (sourceFile == null)
                    throw new ArgumentException($"Source file {sourceFileId} not found");

                if (sourceFile.IsSplitParent)
                {
                    var childFiles = await _db.SourceFiles
                        .Where(sf => sf.ParentSourceFileId == sourceFile.Id && !sf.IsDeleted)
                        .OrderBy(sf => sf.SplitPartNumber ?? int.MaxValue)
                        .ThenBy(sf => sf.Id)
                        .ToListAsync();

                    if (!childFiles.Any())
                        throw new InvalidOperationException("No split batches found for this source file.");

                    var results = new List<InjectFileResponseDto>();

                    foreach (var childFile in childFiles)
                    {
                        var childCampaignFile = await GetOrCreateCampaignFileAsync(campaignId, childFile.Id);
                        var childResult = await InjectCampaignFileCoreAsync(campaignId, childCampaignFile.Id, injectedByUserId);
                        results.Add(childResult);
                    }

                    await transaction.CommitAsync();

                    return new InjectFileResponseDto
                    {
                        CampaignId = campaignId,
                        CampaignFileId = results.First().CampaignFileId,
                        SourceFileName = sourceFile.Name,
                        ContactsTotal = results.Sum(r => r.ContactsTotal),
                        ContactsDistributed = results.Sum(r => r.ContactsDistributed),
                        AgentsCount = results.FirstOrDefault()?.AgentsCount ?? 0,
                        DistributionMode = "Dynamic",
                        InjectedAt = results.Max(r => r.InjectedAt),
                        Message = $"Split file injected successfully ({results.Count} batches)."
                    };
                }

                var campaignFile = await GetOrCreateCampaignFileAsync(campaignId, sourceFileId);
                var result = await InjectCampaignFileCoreAsync(campaignId, campaignFile.Id, injectedByUserId);
                await transaction.CommitAsync();
                return result;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<CampaignFile> GetOrCreateCampaignFileAsync(int campaignId, int sourceFileId)
        {
            var campaignFile = await _db.CampaignFiles
                .FirstOrDefaultAsync(cf => cf.CampaignId == campaignId
                                        && cf.SourceFileId == sourceFileId
                                        && !cf.IsRemoved);

            if (campaignFile != null)
                return campaignFile;

            campaignFile = new CampaignFile
            {
                CampaignId = campaignId,
                SourceFileId = sourceFileId,
                IsActive = true,
                IsInjected = false,
                ContactsTotal = 0,
                ContactsRemaining = 0,
                ContactsCalled = 0
            };

            _db.CampaignFiles.Add(campaignFile);
            await _db.SaveChangesAsync();

            return campaignFile;
        }

        private async Task<InjectFileResponseDto> InjectCampaignFileCoreAsync(int campaignId, int campaignFileId, int injectedByUserId)
        {
            var campaignExists = await _db.Campaigns
                .AnyAsync(c => c.Id == campaignId && !c.IsDeleted);

            if (!campaignExists)
                throw new ArgumentException($"Campaign {campaignId} not found");

            var now = DateTime.UtcNow;
            var claimed = await _db.CampaignFiles
                .Where(cf => cf.Id == campaignFileId
                          && cf.CampaignId == campaignId
                          && !cf.IsRemoved
                          && !cf.IsInjected)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(cf => cf.IsInjected, true)
                    .SetProperty(cf => cf.InjectedAt, now)
                    .SetProperty(cf => cf.InjectedByUserId, injectedByUserId));

            if (claimed == 0)
                throw new InvalidOperationException("This file has already been injected or is not linked to this campaign.");

            var campaignFile = await _db.CampaignFiles
                .Include(cf => cf.SourceFile)
                .FirstOrDefaultAsync(cf => cf.Id == campaignFileId
                                        && cf.CampaignId == campaignId
                                        && !cf.IsRemoved);

            if (campaignFile == null)
                throw new ArgumentException($"Campaign file {campaignFileId} not found");

            var alreadyHasContacts = await _db.CampaignFileContacts
                .AnyAsync(c => c.CampaignFileId == campaignFileId);

            if (alreadyHasContacts)
                throw new InvalidOperationException("This campaign file already has injected contacts.");

            var validContactCount = await _db.SourceFileContacts
                .CountAsync(s => s.SourceFileId == campaignFile.SourceFileId && s.IsValid);

            if (validContactCount == 0)
                throw new InvalidOperationException("No valid contacts found in source file.");

            const int batchSize = 2000;
            var lastSourceContactId = 0;
            var insertedContacts = 0;

            while (true)
            {
                var sourceBatch = await _db.SourceFileContacts
                    .AsNoTracking()
                    .Where(s => s.SourceFileId == campaignFile.SourceFileId
                             && s.IsValid
                             && s.Id > lastSourceContactId)
                    .OrderBy(s => s.Id)
                    .Select(s => new { s.Id })
                    .Take(batchSize)
                    .ToListAsync();

                if (sourceBatch.Count == 0)
                    break;

                var batch = sourceBatch.Select(source => new CampaignFileContact
                {
                    CampaignId = campaignId,
                    CampaignFileId = campaignFileId,
                    SourceFileContactId = source.Id,
                    AssignedAgentId = null,
                    CallStatus = CallStatus.Pending,
                    QualificationStatus = null,
                    AttemptCount = 0,
                    MaxAttempts = 3,
                    AssignedAt = null,
                    IsAssignable = false,
                    ActivatedAt = null,
                    RandomOrder = Random.Shared.NextDouble(),
                    AssignmentPriority = campaignFile.Priority
                }).ToList();

                await _db.CampaignFileContacts.AddRangeAsync(batch);
                await _db.SaveChangesAsync();

                insertedContacts += batch.Count;
                lastSourceContactId = sourceBatch[^1].Id;
                _db.ChangeTracker.Clear();
            }

            await _db.CampaignFiles
                .Where(cf => cf.Id == campaignFileId && cf.CampaignId == campaignId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(cf => cf.ContactsTotal, insertedContacts)
                    .SetProperty(cf => cf.ContactsRemaining, insertedContacts)
                    .SetProperty(cf => cf.ContactsCalled, 0));

            var activeAgentsCount = await _db.CampaignAgents
                .CountAsync(ca => ca.CampaignId == campaignId && ca.IsActive);

            _logger.LogInformation("Successfully injected {Count} contacts into CampaignFile {FileId}",
                insertedContacts, campaignFileId);

            return new InjectFileResponseDto
            {
                CampaignId = campaignId,
                CampaignFileId = campaignFileId,
                SourceFileName = campaignFile.SourceFile?.Name ?? "",
                ContactsTotal = insertedContacts,
                ContactsDistributed = insertedContacts,
                AgentsCount = activeAgentsCount,
                DistributionMode = "Dynamic",
                InjectedAt = campaignFile.InjectedAt ?? now,
                Message = "File injected successfully in Dynamic mode."
            };
        }

        public async Task<GetNextContactResponseDto?> GetNextContactAsync(int campaignId, int agentId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var agentEligibility = await _db.CampaignAgents
                    .Where(ca => ca.CampaignId == campaignId && ca.UserId == agentId)
                    .Select(ca => new
                    {
                        CampaignStatus = ca.Campaign!.Status,
                        AgentIsActive = ca.IsActive,
                        UserIsActive = ca.User != null && ca.User.IsActive,
                        UserIsOnline = ca.User != null && ca.User.IsOnline
                    })
                    .FirstOrDefaultAsync();

                if (agentEligibility == null || !agentEligibility.AgentIsActive)
                    throw new InvalidOperationException("Agent is not active in this campaign.");

                if (agentEligibility.CampaignStatus != CampaignStatus.Active)
                    throw new InvalidOperationException("Campaign must be active to distribute contacts.");

                if (!agentEligibility.UserIsActive || !agentEligibility.UserIsOnline)
                    throw new InvalidOperationException("Agent must be active and online to take contacts.");

                await ReleaseTimedOutContacts(campaignId);

                var currentContact = await _db.CampaignFileContacts
                    .Include(c => c.SourceFileContact)
                    .FirstOrDefaultAsync(c => c.CampaignId == campaignId
                                           && c.AssignedAgentId == agentId
                                           && c.CallStatus == CallStatus.Assigned);

                if (currentContact != null)
                {
                    await transaction.CommitAsync();
                    return MapToNextContactDto(currentContact);
                }
                await RefillAssignablePoolIfNeededAsync(campaignId);
                var forcedRefill = false;
                for (var attempt = 0; attempt < 3; attempt++)
                {
                    var now = DateTime.UtcNow;
                    var nextContactId = await _db.CampaignFileContacts
                        .Where(c => c.CampaignId == campaignId
                                 && c.IsAssignable
                                 && c.CallStatus == CallStatus.Pending
                                 && c.AssignedAgentId == null
                                 && c.AttemptCount < c.MaxAttempts
                                 && (c.NextCallAt == null || c.NextCallAt <= now)
                                 && c.CampaignFile != null
                                 && c.CampaignFile.IsActive
                                 && c.CampaignFile.IsInjected
                                 && !c.CampaignFile.IsRemoved
                                 && !c.CampaignFile.IsRecycled)
                        .OrderBy(c => c.NextCallAt.HasValue && c.NextCallAt <= now ? 0 : 1)
                        .ThenBy(c => c.NextCallAt ?? DateTime.MaxValue)
                        .ThenByDescending(c => c.AssignmentPriority)
                        .ThenBy(c => c.RandomOrder)
                        .ThenBy(c => c.Id)
                        .Select(c => c.Id)
                        .FirstOrDefaultAsync();

                    if (nextContactId == 0)
                    {
                        if (!forcedRefill)
                        {
                            forcedRefill = true;
                            await RefillAssignablePoolIfNeededAsync(campaignId, force: true);
                            continue;
                        }

                        await transaction.CommitAsync();
                        return null;
                    }

                    var claimed = await _db.CampaignFileContacts
                        .Where(c => c.Id == nextContactId
                                 && c.CampaignId == campaignId
                                 && c.IsAssignable
                                 && c.CallStatus == CallStatus.Pending
                                 && c.AssignedAgentId == null
                                 && c.AttemptCount < c.MaxAttempts
                                 && (c.NextCallAt == null || c.NextCallAt <= now))
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(c => c.AssignedAgentId, agentId)
                            .SetProperty(c => c.AssignedAt, now)
                            .SetProperty(c => c.CallStatus, CallStatus.Assigned)
                            .SetProperty(c => c.AttemptCount, c => c.AttemptCount + 1));

                    if (claimed == 0)
                        continue;

                    var nextContact = await _db.CampaignFileContacts
                        .Include(c => c.SourceFileContact)
                        .FirstAsync(c => c.Id == nextContactId);

                    _db.CallAttempts.Add(new CallAttempt
                    {
                        CampaignId = campaignId,
                        CampaignFileId = nextContact.CampaignFileId,
                        CampaignFileContactId = nextContact.Id,
                        SourceFileContactId = nextContact.SourceFileContactId,
                        AgentId = agentId,
                        AttemptNumber = nextContact.AttemptCount,
                        Status = CallStatus.Assigned,
                        StartedAt = now,
                        CreatedAt = now
                    });
                    await _db.SaveChangesAsync();

                    await transaction.CommitAsync();
                    return MapToNextContactDto(nextContact);
                }

                await transaction.CommitAsync();
                return null;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task ReleaseTimedOutContacts(int campaignId)
        {
            var now = DateTime.UtcNow;
            var timeoutThreshold = now.AddMinutes(-10);

            var timedOutContactIds = await _db.CampaignFileContacts
                .Where(c => c.CampaignId == campaignId
                         && c.CallStatus == CallStatus.Assigned
                         && c.AssignedAt < timeoutThreshold)
                .Select(c => c.Id)
                .ToListAsync();

            foreach (var chunk in timedOutContactIds.Chunk(5000))
            {
                await _db.CallAttempts
                    .Where(a => chunk.Contains(a.CampaignFileContactId)
                             && a.Status == CallStatus.Assigned
                             && a.EndedAt == null)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(a => a.Status, CallStatus.TimedOut)
                        .SetProperty(a => a.EndedAt, now)
                        .SetProperty(a => a.UpdatedAt, now));
            }

            await _db.CampaignFileContacts
                .Where(c => c.CampaignId == campaignId
                         && c.CallStatus == CallStatus.Assigned
                         && c.AssignedAt < timeoutThreshold)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.CallStatus, CallStatus.Pending)
                    .SetProperty(c => c.AssignedAgentId, (int?)null)
                    .SetProperty(c => c.AssignedAt, (DateTime?)null));
        }

        //checks if we need to need more contacts in the active pool 
        private async Task RefillAssignablePoolIfNeededAsync(int campaignId, bool force = false)
        {
            var now = DateTime.UtcNow;
            const int lookbackHours = 2;
            const double minRate = 8;
            const double maxRate = 60;
            const int safetyHours = 2;
            //get campaign settings and current active agents count
            var campaign = await _db.Campaigns
                .AsNoTracking()
                .Where(c => c.Id == campaignId && !c.IsDeleted)
                .Select(c => new
                {
                    c.AutoPoolSizing,
                    c.ActivePoolTarget,
                    c.LowContactsThreshold,
                    c.ContactsPerAgentPerHour,
                    c.PoolBufferHours,
                    c.MinPoolTarget,
                    c.MaxPoolTarget,
                    c.LowPoolRatio,
                    c.Status
                })
                .FirstAsync();

            if (campaign.Status != CampaignStatus.Active)
                return;
            //count active agents 
            var activeAgents = await _db.CampaignAgents.CountAsync(ca => ca.CampaignId == campaignId && ca.IsActive);
            if (activeAgents == 0)
            {
                return;
            }
            var completedSince = now.AddHours(-lookbackHours);
            var completedRecently = await _db.CampaignFileContacts
                .CountAsync(c => c.CampaignId == campaignId
                                 && c.CallStatus == CallStatus.Completed
                                 && c.CompletedAt != null
                                 && c.CompletedAt >= completedSince);
            var measuredRate = completedRecently / Math.Max(1.0,
                activeAgents * lookbackHours);
            //calculate how many contacts we should have in the assignable pool based on the current distribution rate and campaign settings
            var fallbackContactsPerAgentPerHour = Math.Clamp(
                campaign.ContactsPerAgentPerHour > 0 ? campaign.ContactsPerAgentPerHour : 25,
                minRate,
                maxRate);
            var contactsPerAgentPerHour = measuredRate > 0
                ? Math.Clamp(measuredRate, minRate, maxRate)
                : fallbackContactsPerAgentPerHour;
            var totalPending = await _db.CampaignFileContacts
             .CountAsync(c => c.CampaignId == campaignId
                 && c.CallStatus == CallStatus.Pending
                 && c.AssignedAgentId == null
                 && c.AttemptCount < c.MaxAttempts
                 && (c.NextCallAt == null || c.NextCallAt <= now)
                 && c.CampaignFile != null
                 && c.CampaignFile.IsActive
                 && c.CampaignFile.IsInjected
                 && !c.CampaignFile.IsRemoved
                 && !c.CampaignFile.IsRecycled);
            if (totalPending == 0)
                return;

            // Calculate target pool
            var target = campaign.AutoPoolSizing
                ? (int)Math.Ceiling(activeAgents * contactsPerAgentPerHour * campaign.PoolBufferHours)
                : campaign.ActivePoolTarget;
            target = Math.Clamp(target, campaign.MinPoolTarget, campaign.MaxPoolTarget);
            target = Math.Min(target, totalPending);

            // Calculate low threshold
            var lowThreshold = campaign.AutoPoolSizing
                ? Math.Max(
                    (int)Math.Ceiling(activeAgents * contactsPerAgentPerHour * safetyHours),
                    (int)Math.Ceiling(target * (double)campaign.LowPoolRatio))
                : campaign.LowContactsThreshold;
            lowThreshold = Math.Min(lowThreshold, target);

            var activePending = await CountActivePendingAsync(campaignId, now);
            if (!force && activePending >= lowThreshold)
                return;

            // Concurrency lock
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock(42, {campaignId})");

            activePending = await CountActivePendingAsync(campaignId, now);
            if (!force && activePending >= lowThreshold)
                return;

            var toActivate = target - activePending;
            if (toActivate <= 0)
                return;

            // Get contacts to activate (respect priority)
            var ids = await _db.CampaignFileContacts
                .Where(c => c.CampaignId == campaignId
                    && !c.IsAssignable
                    && c.CallStatus == CallStatus.Pending
                    && c.AssignedAgentId == null
                    && c.AttemptCount < c.MaxAttempts
                    && (c.NextCallAt == null || c.NextCallAt <= now)
                    && c.CampaignFile != null
                    && c.CampaignFile.IsActive
                    && c.CampaignFile.IsInjected
                    && !c.CampaignFile.IsRemoved
                    && !c.CampaignFile.IsRecycled)
                .OrderBy(c => c.NextCallAt.HasValue && c.NextCallAt <= now ? 0 : 1)
                .ThenBy(c => c.NextCallAt ?? DateTime.MaxValue)
                .ThenByDescending(c => c.AssignmentPriority)
                .ThenBy(c => c.RandomOrder)
                .ThenBy(c => c.Id)
                .Select(c => c.Id)
                .Take(toActivate)
                .ToListAsync();

            // Bulk activate in chunks
            foreach (var chunk in ids.Chunk(5000))
            {
                await _db.CampaignFileContacts
                    .Where(c => chunk.Contains(c.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.IsAssignable, true)
                        .SetProperty(c => c.ActivatedAt, now));
            }
        }

        private Task<int> CountActivePendingAsync(int campaignId, DateTime now)
        {
            return _db.CampaignFileContacts
                .CountAsync(c => c.CampaignId == campaignId
                    && c.IsAssignable
                    && c.CallStatus == CallStatus.Pending
                    && c.AssignedAgentId == null
                    && c.AttemptCount < c.MaxAttempts
                    && (c.NextCallAt == null || c.NextCallAt <= now)
                    && c.CampaignFile != null
                    && c.CampaignFile.IsActive
                    && c.CampaignFile.IsInjected
                    && !c.CampaignFile.IsRemoved
                    && !c.CampaignFile.IsRecycled);
        }



        public async Task QualifyContactAsync(int campaignId, int campaignFileContactId, QualifyContactDto dto, int agentId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var contact = await _db.CampaignFileContacts
                    .Include(c => c.CampaignFile)
                    .FirstOrDefaultAsync(c => c.Id == campaignFileContactId
                                           && c.CampaignId == campaignId
                                           && c.AssignedAgentId == agentId
                                           && c.CallStatus == CallStatus.Assigned);

                if (contact == null)
                    throw new ArgumentException("Contact not found or not assigned to you.");

                var isActiveAgent = await _db.CampaignAgents
                    .AnyAsync(ca => ca.CampaignId == campaignId
                                 && ca.UserId == agentId
                                 && ca.IsActive);

                if (!isActiveAgent)
                    throw new InvalidOperationException("Agent is not active in this campaign.");

                if (dto.QualificationStatus != QualificationStatuses.NRP)
                {
                    bool hasExtraField = !string.IsNullOrEmpty(dto.AgentComment) ||
                                         dto.ModeChauffage != null ||
                                         dto.AppointmentDate.HasValue ||
                                         dto.ProprietaireDepuis.HasValue;

                    if (!hasExtraField)
                        throw new InvalidOperationException("For non-NRP status, you must fill at least one additional field.");
                }

                var now = DateTime.UtcNow;

                contact.QualificationStatus = dto.QualificationStatus;
                contact.AgentComment = dto.AgentComment;
                contact.Projet = dto.Projet;
                contact.ProprietaireDepuis = dto.ProprietaireDepuis;
                contact.ModeChauffage = dto.ModeChauffage;
                contact.ConsommationChauffage = dto.ConsommationChauffage;
                contact.AgeChaudiere = dto.AgeChaudiere;
                contact.EquipePV = dto.EquipePV;
                contact.EquipePAC = dto.EquipePAC;
                contact.EtatToiture = dto.EtatToiture;
                contact.EtatIsolation = dto.EtatIsolation;
                contact.NbrePersonnes = dto.NbrePersonnes;
                contact.ProfessionMr = dto.ProfessionMr;
                contact.ProfessionMme = dto.ProfessionMme;
                contact.Revenus = dto.Revenus;
                contact.Credits = dto.Credits;
                contact.Fichage = dto.Fichage;
                contact.AppointmentDate = dto.AppointmentDate;
                contact.AppointmentType = dto.AppointmentType;
                contact.NextCallAt = null;
                contact.QualifiedAt = now;
                contact.QualifiedByUserId = agentId;
                contact.LastCallAt = now;

                if (dto.QualificationStatus == QualificationStatuses.ARappeler)
                {
                    contact.CallStatus = CallStatus.Pending;
                    contact.AssignedAgentId = null;
                    contact.AssignedAt = null;
                    contact.NextCallAt = dto.NextCallAt;
                }
                else
                {
                    contact.CallStatus = CallStatus.Completed;
                    contact.AssignedAgentId = null;
                    contact.AssignedAt = null;
                    contact.CompletedAt = now;

                    if (contact.CampaignFile != null)
                    {
                        contact.CampaignFile.ContactsCalled++;
                        if (contact.CampaignFile.ContactsRemaining > 0)
                            contact.CampaignFile.ContactsRemaining--;
                    }
                }

                var latestAttempt = await _db.CallAttempts
                    .Where(a => a.CampaignFileContactId == contact.Id
                             && a.AgentId == agentId
                             && a.EndedAt == null)
                    .OrderByDescending(a => a.AttemptNumber)
                    .ThenByDescending(a => a.StartedAt)
                    .FirstOrDefaultAsync();

                if (latestAttempt != null)
                {
                    latestAttempt.Status = CallStatus.Completed;
                    latestAttempt.QualificationStatus = dto.QualificationStatus;
                    latestAttempt.EndedAt = now;
                    latestAttempt.DurationSeconds = contact.CallDurationSeconds;
                    latestAttempt.RecordingUrl = contact.RecordingUrl;
                    latestAttempt.UpdatedAt = now;
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Contact {Id} qualified as {Status} by agent {AgentId}",
                    contact.Id, dto.QualificationStatus, agentId);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private GetNextContactResponseDto MapToNextContactDto(CampaignFileContact contact)
        {
            var source = contact.SourceFileContact;
            return new GetNextContactResponseDto
            {
                ContactId = source?.Id ?? 0,
                CampaignFileContactId = contact.Id,
                LastName = source?.LastName,
                FirstName = source?.FirstName,
                Phone = source?.PhoneNumber ?? "",
                Address = source?.Address,
                PostalCode = source?.PostalCode,
                City = source?.City,
                AttemptCount = contact.AttemptCount
            };
        }
    }
}
