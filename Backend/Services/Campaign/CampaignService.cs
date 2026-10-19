using Backend.DTOs.Campaign;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Services.Campaigns;
using Microsoft.AspNetCore.Http;
using Backend.Entities;
using System.Security.Claims;
using Backend.Constants;

namespace Backend.Services.Campaigns
{
    public class CampaignService : ICampaignService
    {
        private readonly ApplicationDbContext _db;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CampaignService(ApplicationDbContext db, IHttpContextAccessor httpContextAccessor)
        {
            _db = db;
            _httpContextAccessor = httpContextAccessor;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User
                .FindFirst(ClaimTypes.NameIdentifier);  // ← Use the constant directly

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
            throw new Exception("User ID claim not found or invalid.");
        }

        private static void ApplyHopperSettings(
            Campaign campaign,
            bool? autoPoolSizing,
            int? activePoolTarget,
            int? lowContactsThreshold,
            int? contactsPerAgentPerHour,
            int? poolBufferHours,
            int? maxPoolTarget,
            int? minPoolTarget,
            decimal? lowPoolRatio)
        {
            if (autoPoolSizing.HasValue)
                campaign.AutoPoolSizing = autoPoolSizing.Value;

            if (activePoolTarget.HasValue)
                campaign.ActivePoolTarget = Math.Max(1, activePoolTarget.Value);

            if (lowContactsThreshold.HasValue)
                campaign.LowContactsThreshold = Math.Max(1, lowContactsThreshold.Value);

            if (contactsPerAgentPerHour.HasValue)
                campaign.ContactsPerAgentPerHour = Math.Clamp(contactsPerAgentPerHour.Value, 1, 500);

            if (poolBufferHours.HasValue)
                campaign.PoolBufferHours = Math.Clamp(poolBufferHours.Value, 1, 24);

            if (maxPoolTarget.HasValue)
                campaign.MaxPoolTarget = Math.Max(1, maxPoolTarget.Value);

            if (minPoolTarget.HasValue)
                campaign.MinPoolTarget = Math.Max(1, minPoolTarget.Value);

            if (campaign.MinPoolTarget > campaign.MaxPoolTarget)
                campaign.MinPoolTarget = campaign.MaxPoolTarget;

            if (campaign.ActivePoolTarget > campaign.MaxPoolTarget)
                campaign.ActivePoolTarget = campaign.MaxPoolTarget;

            if (lowPoolRatio.HasValue)
                campaign.LowPoolRatio = Math.Clamp(lowPoolRatio.Value, 0.05m, 0.95m);
        }

        // ==================== CREATE ====================
        public async Task<CampaignResponseDto> CreateAsync(CreateCampaignDto dto)
        {
            var userId = GetCurrentUserId();

            // ✅ Start a transaction - everything succeeds or nothing saves
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                // Check if campaign with same name already exists
                var existingCampaign = await _db.Campaigns
                    .FirstOrDefaultAsync(c => c.Name == dto.Name && !c.IsDeleted);

                if (existingCampaign != null)
                    throw new ArgumentException($"Campaign with name '{dto.Name}' already exists");

                // 1. Create the campaign
                var campaign = new Campaign
                {
                    Name = dto.Name,
                    Status = CampaignStatus.Draft,
                    StartDate = dto.StartDate ?? DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = userId,
                    Description = dto.Description,
                };
                ApplyHopperSettings(
                    campaign,
                    dto.AutoPoolSizing,
                    dto.ActivePoolTarget,
                    dto.LowContactsThreshold,
                    dto.ContactsPerAgentPerHour,
                    dto.PoolBufferHours,
                    dto.MaxPoolTarget,
                    dto.MinPoolTarget,
                    dto.LowPoolRatio);

                _db.Campaigns.Add(campaign);
                await _db.SaveChangesAsync();

                // 2. LINK files to campaign (NOT injection - just linking)
                //    ContactsTotal = 0 because no injection yet
                if (dto.SourceFileIds != null && dto.SourceFileIds.Any())
                {
                    var sourceFiles = await _db.SourceFiles
                        .Where(sf => dto.SourceFileIds.Contains(sf.Id))
                        .ToListAsync();

                    var foundIds = sourceFiles.Select(sf => sf.Id).ToHashSet();
                    var missingIds = dto.SourceFileIds.Where(id => !foundIds.Contains(id)).ToList();

                    if (missingIds.Any())
                    {
                        throw new ArgumentException($"Source files not found: {string.Join(", ", missingIds)}");
                    }

                    // ✅ Just LINK the file - NO contacts copied, IsInjected = false
                    foreach (var sourceFile in sourceFiles)
                    {
                        _db.CampaignFiles.Add(new CampaignFile
                        {
                            CampaignId = campaign.Id,
                            SourceFileId = sourceFile.Id,
                            ContactsTotal = 0,           // 0 until injection
                            ContactsRemaining = 0,       // 0 until injection
                            ContactsCalled = 0,
                            InjectedAt = null,           //Not injected yet
                            InjectedByUserId = null,     // Not injected yet
                            IsActive = true,
                            IsInjected = false           //IMPORTANT: not injected
                        });
                    }
                    await _db.SaveChangesAsync();
                }

                // 3. Assign agents to campaign
                if (dto.AgentsIds != null && dto.AgentsIds.Any())
                {
                    var validAgents = await _db.Users
                        .Where(u => dto.AgentsIds.Contains(u.Id) && u.Role.Name == "Agent")
                        .Select(u => u.Id)
                        .ToListAsync();

                    var invalidIds = dto.AgentsIds.Where(id => !validAgents.Contains(id)).ToList();

                    if (invalidIds.Any())
                    {
                        throw new ArgumentException($"Invalid agent IDs (not Agents): {string.Join(", ", invalidIds)}");
                    }

                    foreach (var agentId in validAgents)
                    {
                        _db.CampaignAgents.Add(new CampaignAgents
                        {
                            CampaignId = campaign.Id,
                            UserId =  agentId ,
                            AssignedAt = DateTime.UtcNow,
                            AssignedByUserId = userId,
                            IsActive = true
                        });
                    }
                    await _db.SaveChangesAsync();
                }

                //All operations succeeded - commit the transaction
                await transaction.CommitAsync();
                var fullCampaign = await _db.Campaigns
                    .Where(c => c.Id == campaign.Id)
                    .Include(c => c.CampaignFiles).ThenInclude(cf => cf.SourceFile)
                    .Include(c => c.CampaignAgents).ThenInclude(ca => ca.User)
                    .Include(c => c.CreatedByUser)
                    .FirstOrDefaultAsync();


                return MapToResponseDto(fullCampaign);
            }
            catch
            {
                //Something failed - rollback everything
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ==================== READ (ALL) ====================
        public async Task<List<CampaignResponseDto>> GetAllAsync()
        {
            // Avoid .ThenInclude(ca => ca.User) and .Include(c => c.CreatedByUser):
            // User.Role FK points to a roles table that may not exist → EF 500.
            var campaigns = await _db.Campaigns
              .Where(c => !c.IsDeleted)
              .Include(c => c.CampaignFiles)
                  .ThenInclude(cf => cf.SourceFile)
              .Include(c => c.CampaignAgents)
              .OrderByDescending(c => c.CreatedAt)
              .AsNoTracking()
              .ToListAsync();

            return campaigns.Select(c => MapToResponseDto(c)).ToList();
        }

        // ==================== READ (BY ID) ====================
        public async Task<CampaignResponseDto> GetByIdAsync(int id)
        {
            var campaign = await _db.Campaigns
                .Where(c => c.Id == id && !c.IsDeleted)
                .Include(c => c.CampaignFiles)
                    .ThenInclude(cf => cf.SourceFile)
                .Include(c => c.CampaignAgents)
                    .ThenInclude(ca => ca.User)
                .Include(c => c.CreatedByUser) // ← add this
                .FirstOrDefaultAsync();

            if (campaign == null)
                return null;

            return MapToResponseDto(campaign);
        }

        public async Task<CampaignHopperDto?> GetCampaignHopperAsync(int campaignId)
        {
            var campaign = await _db.Campaigns
                .AsNoTracking()
                .Where(c => c.Id == campaignId && !c.IsDeleted)
                .Select(c => new
                {
                    c.Id,
                    c.AutoPoolSizing,
                    c.ActivePoolTarget,
                    c.LowContactsThreshold,
                    c.ContactsPerAgentPerHour,
                    c.PoolBufferHours,
                    c.MinPoolTarget,
                    c.MaxPoolTarget,
                    c.LowPoolRatio
                })
                .FirstOrDefaultAsync();

            if (campaign == null)
                return null;

            var now = DateTime.UtcNow;
            const int lookbackHours = 2;
            const double minRate = 8;
            const double maxRate = 60;
            const int safetyHours = 2;

            var activeAgents = await _db.CampaignAgents
                .CountAsync(ca => ca.CampaignId == campaignId && ca.IsActive);

            var completedSince = now.AddHours(-lookbackHours);
            var completedRecently = await _db.CampaignFileContacts
                .CountAsync(c => c.CampaignId == campaignId
                    && c.CallStatus == CallStatus.Completed
                    && c.CompletedAt != null
                    && c.CompletedAt >= completedSince);

            var measuredRate = completedRecently / Math.Max(1.0, activeAgents * lookbackHours);
            var fallbackRate = Math.Clamp(
                campaign.ContactsPerAgentPerHour > 0 ? campaign.ContactsPerAgentPerHour : 25,
                minRate,
                maxRate);
            var contactsPerAgentPerHour = measuredRate > 0
                ? Math.Clamp(measuredRate, minRate, maxRate)
                : fallbackRate;

            var duePendingQuery = _db.CampaignFileContacts
                .Where(c => c.CampaignId == campaignId
                    && c.CallStatus == CallStatus.Pending
                    && c.AssignedAgentId == null
                    && c.AttemptCount < c.MaxAttempts
                    && (c.NextCallAt == null || c.NextCallAt <= now)
                    && c.CampaignFile != null
                    && c.CampaignFile.IsActive
                    && c.CampaignFile.IsInjected
                    && !c.CampaignFile.IsRemoved
                    && !c.CampaignFile.IsRecycled);

            var totalPending = await duePendingQuery.CountAsync();
            var activePending = await duePendingQuery.CountAsync(c => c.IsAssignable);

            var target = campaign.AutoPoolSizing
                ? (int)Math.Ceiling(activeAgents * contactsPerAgentPerHour * campaign.PoolBufferHours)
                : campaign.ActivePoolTarget;
            target = Math.Clamp(target, campaign.MinPoolTarget, campaign.MaxPoolTarget);
            target = Math.Min(target, totalPending);

            var lowThreshold = campaign.AutoPoolSizing
                ? Math.Max(
                    (int)Math.Ceiling(activeAgents * contactsPerAgentPerHour * safetyHours),
                    (int)Math.Ceiling(target * (double)campaign.LowPoolRatio))
                : campaign.LowContactsThreshold;
            lowThreshold = target > 0 ? Math.Min(lowThreshold, target) : 0;

            var status = totalPending == 0 || activePending == 0
                ? "empty"
                : activePending < lowThreshold
                    ? "low"
                    : "healthy";

            return new CampaignHopperDto
            {
                CampaignId = campaign.Id,
                AutoPoolSizing = campaign.AutoPoolSizing,
                ActivePoolTarget = campaign.ActivePoolTarget,
                LowContactsThreshold = campaign.LowContactsThreshold,
                ContactsPerAgentPerHour = campaign.ContactsPerAgentPerHour,
                PoolBufferHours = campaign.PoolBufferHours,
                MinPoolTarget = campaign.MinPoolTarget,
                MaxPoolTarget = campaign.MaxPoolTarget,
                LowPoolRatio = campaign.LowPoolRatio,
                ActiveAgents = activeAgents,
                ActiveAssignableContacts = activePending,
                PendingBacklogContacts = Math.Max(0, totalPending - activePending),
                TotalPendingContacts = totalPending,
                TargetContacts = target,
                LowThresholdContacts = lowThreshold,
                EstimatedContactsPerAgentPerHour = Math.Round(contactsPerAgentPerHour, 2),
                CompletedLastTwoHours = completedRecently,
                Status = status
            };
        }

        // ==================== UPDATE ====================
        public async Task<CampaignResponseDto?> UpdateAsync(int id, UpdateCampaignDto dto)
        {
            var campaign = await _db.Campaigns
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (campaign == null)
                return null;

            campaign.Name = dto.Name;


            campaign.Description = dto.Description;

            if (dto.StartDate.HasValue)
                campaign.StartDate = dto.StartDate.Value;

            ApplyHopperSettings(
                campaign,
                dto.AutoPoolSizing,
                dto.ActivePoolTarget,
                dto.LowContactsThreshold,
                dto.ContactsPerAgentPerHour,
                dto.PoolBufferHours,
                dto.MaxPoolTarget,
                dto.MinPoolTarget,
                dto.LowPoolRatio);

            campaign.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            var fullCampaign = await _db.Campaigns
                .Where(c => c.Id == id)
                .Include(c => c.CampaignFiles).ThenInclude(cf => cf.SourceFile)
                .Include(c => c.CampaignAgents).ThenInclude(ca => ca.User)
                .Include(c => c.CreatedByUser)
                .FirstOrDefaultAsync();
            return MapToResponseDto(fullCampaign);
        }

        // ==================== Update status ====================
        public async Task<CampaignResponseDto?> PatchStatusAsync(int id , bool isActive)
        {
            var campaign = await _db.Campaigns
                .Where(c => c.Id == id && !c.IsDeleted)
                .Include(c => c.CampaignFiles)
                .Include(c => c.CampaignAgents)
                .FirstOrDefaultAsync();
            if (campaign == null) return null;
            //validate file and agents when activating
            if (isActive)
            {
                var hasActiveFiles = await _db.CampaignFiles
                    .AnyAsync(cf => cf.CampaignId == id
                                 && cf.IsActive
                                 && !cf.IsRemoved
                                 && !cf.IsRecycled);

                if (!hasActiveFiles)
                    throw new InvalidOperationException("Cannot activate: No active files assigned to this campaign");

                var hasActiveAgents = await _db.CampaignAgents
                    .AnyAsync(ca => ca.CampaignId == id && ca.IsActive);

                if (!hasActiveAgents)
                    throw new InvalidOperationException("Cannot activate: No active agents assigned to this campaign");

                var hasInjection = await _db.CampaignFiles
                    .AnyAsync(cf => cf.CampaignId == id
                                 && cf.IsActive
                                 && cf.IsInjected
                                 && !cf.IsRemoved
                                 && !cf.IsRecycled);

                if (!hasInjection)
                    throw new InvalidOperationException("Cannot activate: No files have been injected into this campaign");
            }
            //When DEACTIVATING - just flip, no validation
            campaign.Status = isActive ? CampaignStatus.Active : CampaignStatus.Inactive;
            campaign.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            var fullCampaign = await _db.Campaigns
            .Where(c => c.Id == id)
            .Include(c => c.CampaignFiles).ThenInclude(cf => cf.SourceFile)
            .Include(c => c.CampaignAgents).ThenInclude(ca => ca.User)
            .Include(c => c.CreatedByUser)
            .FirstOrDefaultAsync();
            return MapToResponseDto(fullCampaign);
        }
        //get campaign files
        public async Task<List<CampaignFileDto>> GetCampaignFilesAsync(int campaignId)
        {
            var campaignsFiles = await _db.CampaignFiles
                 .Where(cf => cf.CampaignId == campaignId && !cf.IsRemoved) // exclude removed files
                .Include(cf => cf.SourceFile)  // Include the source file to get its name
                .OrderByDescending(cf => cf.InjectedAt)  // Order by injection date
                .ToListAsync();

            return campaignsFiles.Select(cf => new CampaignFileDto
            {
                Id = cf.Id,
                CampaignId = cf.CampaignId,
                SourceFileId = cf.SourceFileId,
                SourceFileName = cf.SourceFile?.Name ?? "",
                IsActive = cf.IsActive,
                IsRecycled = cf.IsRecycled,
                IsInjected = cf.IsInjected,
                Priority = cf.Priority,
                ContactsTotal = cf.ContactsTotal,
                ContactsCalled = cf.ContactsCalled,
                ContactsRemaining = cf.ContactsRemaining,
                InjectedAt = cf.InjectedAt,
                RecycledAt = cf.RecycledAt
            }).ToList();
        }


        public async Task<List<AvailableAgentDto>> GetAvailableAgentsAsync(int campaignId)
        {
            var assignedAgentIds = _db.CampaignAgents
                .Where(ca => ca.CampaignId == campaignId && ca.IsActive)
                .Select(ca => ca.UserId);

            return await _db.Users
                .Include(u => u.Role)
                .Where(u => u.Role.Name == "Agent"
                    && u.IsActive
                    && !u.IsDeleted
                    && !assignedAgentIds.Contains(u.Id))
                .OrderBy(u => u.FirstName)   // First by FirstName
                .ThenBy(u => u.LastName)      // Then by LastName
                .Select(u => new AvailableAgentDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    Phone = u.Phone,
                    IsActive = u.IsActive,
                    IsOnline = u.IsOnline,
                })
                .ToListAsync();
        }
        public async Task<CampaignResponseDto?> PatchCampaignStatusAsync(int id, bool isActive)
        {
            var campaign = await _db.Campaigns
                .Where(c => c.Id == id && !c.IsDeleted)
                .Include(c => c.CampaignFiles)
                .Include(c => c.CampaignAgents)
                .FirstOrDefaultAsync();

            if (campaign == null)
                return null;

            // Validate when ACTIVATING
            if (isActive)
            {
                var hasActiveFiles = await _db.CampaignFiles
                    .AnyAsync(cf => cf.CampaignId == id && cf.IsActive && !cf.IsRecycled);

                if (!hasActiveFiles)
                    throw new InvalidOperationException("Cannot activate: No active files assigned to this campaign");

                var hasActiveAgents = await _db.CampaignAgents
                    .AnyAsync(ca => ca.CampaignId == id && ca.IsActive);

                if (!hasActiveAgents)
                    throw new InvalidOperationException("Cannot activate: No active agents assigned to this campaign");

                var hasInjection = await _db.CampaignFiles
                    .AnyAsync(cf => cf.CampaignId == id && cf.IsInjected);

                if (!hasInjection)
                    throw new InvalidOperationException("Cannot activate: No files have been injected into this campaign");
            }

            // When DEACTIVATING - just flip, no validation
            campaign.Status = isActive ? CampaignStatus.Active : CampaignStatus.Inactive;
            campaign.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return MapToResponseDto(campaign);
        }
        // ==================== Remove a file from campaign ====================
        public async Task<bool> RemoveFileFromCampaignAsync( int campaignId, int campaignFileId)
            {
            //Find the campaign file by its ID
            var campaignFile = await _db.CampaignFiles
                .FirstOrDefaultAsync(cf => cf.Id == campaignFileId && cf.CampaignId == campaignId && !cf.IsRemoved);

            if (campaignFile == null)
                return false;
            var hasTouchedContacts = await _db.CampaignFileContacts
                .AnyAsync(cfc => cfc.CampaignFileId == campaignFileId
                              && (cfc.AttemptCount > 0 || cfc.CallStatus == CallStatus.Assigned || cfc.CallStatus == CallStatus.Completed));

            if (hasTouchedContacts)
            {
                throw new InvalidOperationException(
                    "Cannot remove file: some contacts have already been distributed to agents. " +
                    "Please wait until all contacts are processed or reassign them first."
                );
            }
            campaignFile.IsRemoved = true;
            campaignFile.RemovedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }
        // ==================== Activate/disactivate file in campaign ====================
        public async Task<CampaignFileDto?> UpdateFileInCampaignAsync(int campaignId, int CampaignFileId , UpdateCampaignFileStatusDto dto)
        {
            var campaignFile = await _db.CampaignFiles
                    .Include(cf => cf.SourceFile)
                    .FirstOrDefaultAsync(cf => cf.Id == CampaignFileId && cf.CampaignId == campaignId);
            
            if (campaignFile == null) return null;
            if (dto.IsActive.HasValue)
                campaignFile.IsActive = dto.IsActive.Value;

            if (dto.Priority.HasValue && campaignFile.Priority != dto.Priority.Value)
            {
                campaignFile.Priority = dto.Priority.Value;

                await _db.CampaignFileContacts
                    .Where(c => c.CampaignId == campaignId
                        && c.CampaignFileId == CampaignFileId
                        && c.CallStatus == CallStatus.Pending
                        && c.AssignedAgentId == null)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.AssignmentPriority, dto.Priority.Value));
            }

            await _db.SaveChangesAsync();

            // Return updated file info
            return new CampaignFileDto
            {
                Id = campaignFile.Id,
                CampaignId = campaignFile.CampaignId,
                SourceFileId = campaignFile.SourceFileId,
                SourceFileName = campaignFile.SourceFile?.Name ?? "",
                IsActive = campaignFile.IsActive,  // ← Updated value
                IsInjected = campaignFile.IsInjected,
                IsRecycled = campaignFile.IsRecycled,
                Priority = campaignFile.Priority,
                ContactsTotal = campaignFile.ContactsTotal,
                ContactsCalled = campaignFile.ContactsCalled,
                ContactsRemaining = campaignFile.ContactsRemaining,
                InjectedAt = campaignFile.InjectedAt,
                RecycledAt = campaignFile.RecycledAt
            };
        }

        public async Task<RecycleOptionsResponseDto> GetRecycleOptionsAsync(int campaignId, int campaignFileId)
        {
            var campaignFileExists = await _db.CampaignFiles
                .AnyAsync(cf => cf.Id == campaignFileId && cf.CampaignId == campaignId && !cf.IsRemoved);

            if (!campaignFileExists)
                throw new ArgumentException("Campaign file not found");

            var counts = await _db.CampaignFileContacts
                .Where(c => c.CampaignId == campaignId
                            && c.CampaignFileId == campaignFileId
                            && c.QualificationStatus != null
                            && c.QualificationStatus != "")
                .GroupBy(c => c.QualificationStatus!)
                .Select(g => new RecycleQualificationCountDto
                {
                    QualificationStatus = g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            return new RecycleOptionsResponseDto
            {
                CampaignId = campaignId,
                CampaignFileId = campaignFileId,
                TotalQualifiedContacts = counts.Sum(x => x.Count),
                QualificationCounts = counts
            };
        }

        public async Task<RecycleCampaignFileResponseDto> RecycleCampaignFileAsync(
            int campaignId,
            int campaignFileId,
            RecycleCampaignFileRequestDto dto)
        {
            var selectedStatuses = dto.QualificationStatuses
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (selectedStatuses.Count == 0)
                throw new ArgumentException("At least one qualification must be selected");

            var campaignFile = await _db.CampaignFiles
                .Include(cf => cf.Campaign)
                .Include(cf => cf.SourceFile)
                .ThenInclude(sf => sf!.Supplier)
                .FirstOrDefaultAsync(cf => cf.Id == campaignFileId && cf.CampaignId == campaignId && !cf.IsRemoved);

            if (campaignFile == null)
                throw new ArgumentException("Campaign file not found");

            if (campaignFile.SourceFile == null)
                throw new InvalidOperationException("Source file not found for this campaign file");

            var contactsToRecycle = await _db.CampaignFileContacts
                .Include(c => c.SourceFileContact)
                .Where(c => c.CampaignId == campaignId
                            && c.CampaignFileId == campaignFileId
                            && c.QualificationStatus != null
                            && selectedStatuses.Contains(c.QualificationStatus))
                .ToListAsync();

            if (contactsToRecycle.Count == 0)
                throw new InvalidOperationException("No contacts found for the selected qualifications");

            var sourceContacts = contactsToRecycle
                .Select(c => c.SourceFileContact)
                .Where(c => c != null)
                .Cast<SourceFileContact>()
                .ToList();

            if (sourceContacts.Count == 0)
                throw new InvalidOperationException("Selected contacts are missing their source data");

            var userId = GetCurrentUserId();
            var supplierId = campaignFile.SourceFile.SupplierId;
            var recycledAt = DateTime.UtcNow;
            var nextListNumber = await GetNextSourceListNumberAsync(supplierId);
            var fileName = $"{SanitizeFileName(campaignFile.SourceFile.Name)}_recycle_{recycledAt:yyyyMMdd_HHmmss}.csv";
            var folder = Path.Combine(Directory.GetCurrentDirectory(), "private-uploads", $"supplier_{supplierId}", "recycled");
            Directory.CreateDirectory(folder);
            var filePath = Path.Combine(folder, fileName);

            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                await WriteRecycleCsvAsync(filePath, sourceContacts);
                var fileInfo = new FileInfo(filePath);

                var sourceFile = new SourceFile
                {
                    SupplierId = supplierId,
                    Name = $"{campaignFile.SourceFile.Name} - recycle {nextListNumber}",
                    OriginalName = fileName,
                    FilePath = filePath,
                    FileSizeBytes = fileInfo.Length,
                    FileSizeLabel = FormatFileSize(fileInfo.Length),
                    Format = "csv",
                    Type = SourceFileType.Recycled,
                    Statut = "recycle",
                    IsActive = false,
                    TotalLines = sourceContacts.Count,
                    ValidContacts = sourceContacts.Count,
                    ContactCount = sourceContacts.Count,
                    EmptyRows = 0,
                    InvalidPhones = 0,
                    Duplicates = 0,
                    ListNumber = nextListNumber,
                    UploadedAt = recycledAt,
                    UploadedByUserId = userId,
                    ParentSourceFileId = campaignFile.SourceFileId,
                    RecycledFromCampaignListId = campaignFile.Id,
                    FileHash = $"recycle_{campaignFile.Id}_{recycledAt.Ticks}"
                };

                _db.SourceFiles.Add(sourceFile);
                await _db.SaveChangesAsync();

                var recycledContacts = sourceContacts.Select(contact => new SourceFileContact
                {
                    SourceFileId = sourceFile.Id,
                    PhoneNumber = contact.PhoneNumber,
                    OriginalPhoneNumber = contact.OriginalPhoneNumber,
                    IsValid = contact.IsValid,
                    ErrorMessage = contact.ErrorMessage,
                    LastName = contact.LastName,
                    FirstName = contact.FirstName,
                    Address = contact.Address,
                    PostalCode = contact.PostalCode,
                    City = contact.City,
                    Email = contact.Email,
                    CreatedAt = recycledAt
                }).ToList();

                _db.SourceFileContacts.AddRange(recycledContacts);

                campaignFile.IsRecycled = true;
                campaignFile.RecycledAt = recycledAt;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RecycleCampaignFileResponseDto
                {
                    CampaignId = campaignId,
                    CampaignName = campaignFile.Campaign?.Name ?? "",
                    CampaignFileId = campaignFile.Id,
                    SourceFileId = sourceFile.Id,
                    SourceFileName = sourceFile.Name,
                    ContactsRecycled = recycledContacts.Count,
                    QualificationStatuses = selectedStatuses,
                    RecycledAt = recycledAt
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                if (File.Exists(filePath))
                    File.Delete(filePath);
                throw;
            }
        }

        private async Task<int> GetNextSourceListNumberAsync(int supplierId)
        {
            var maxNumber = await _db.SourceFiles
                .Where(f => f.SupplierId == supplierId)
                .MaxAsync(f => (int?)f.ListNumber) ?? 0;

            return maxNumber + 1;
        }

        private static async Task WriteRecycleCsvAsync(string filePath, List<SourceFileContact> contacts)
        {
            using var writer = new StreamWriter(filePath);
            await writer.WriteLineAsync("LastName,FirstName,Address,PostalCode,City,PhoneNumber,Email");

            foreach (var contact in contacts)
            {
                await writer.WriteLineAsync(
                    $"{EscapeCsvField(contact.LastName)}," +
                    $"{EscapeCsvField(contact.FirstName)}," +
                    $"{EscapeCsvField(contact.Address)}," +
                    $"{EscapeCsvField(contact.PostalCode)}," +
                    $"{EscapeCsvField(contact.City)}," +
                    $"{EscapeCsvField(contact.PhoneNumber)}," +
                    $"{EscapeCsvField(contact.Email ?? "")}");
            }
        }

        private static string EscapeCsvField(string value)
        {
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
                return $"\"{value.Replace("\"", "\"\"")}\"";

            return value;
        }

        private static string SanitizeFileName(string value)
        {
            var invalidChars = Path.GetInvalidFileNameChars();
            var sanitized = new string(value.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray());
            return string.IsNullOrWhiteSpace(sanitized) ? "source" : sanitized;
        }

        private static string FormatFileSize(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:0} KB";
            return $"{bytes / 1024.0 / 1024.0:0.0} MB";
        }

        public async Task<List<CampaignAgentDto>> GetAgentsInCampaignAsync(int campaignId)
        {
            var campaignAgents = await _db.CampaignAgents
               .Where(ca => ca.CampaignId == campaignId && ca.IsActive)   //Filter by campaign
               .Include(ca => ca.User)  //Include the User (agent)
               .OrderByDescending(ca => ca.AssignedAt)  //Order by assigned date
               .ToListAsync();
            return campaignAgents.Select(ca => new CampaignAgentDto
            {
                Id = ca.Id,
                CampaignId = ca.CampaignId,
                AgentId = ca.UserId,
                AgentName = ca.User != null ? $"{ca.User.FirstName} {ca.User.LastName}" : "",
                IsActive = ca.IsActive,
                AssignedAt = ca.AssignedAt,
                AssignedByUserId = ca.AssignedByUserId,
                Quota = ca.Quota,
                ContactsAssigned = 0,
                ContactsCalled = 0,
                RdvCount = 0
            }).ToList();
        }


        public async Task<CampaignAgentDto?> GetAgentInCampaignByIdAsync(int campaignId , int agentId)
        {
            var campaignAgent = await _db.CampaignAgents
               .Where(ca => ca.CampaignId == campaignId && ca.UserId == agentId)
               .Include(ca => ca.User)
               .FirstOrDefaultAsync();

            if (campaignAgent == null)
                return null;

            return new CampaignAgentDto
            {
                Id = campaignAgent.Id,
                CampaignId = campaignAgent.CampaignId,
                AgentId = campaignAgent.UserId,
                AgentName = campaignAgent.User != null
                    ? $"{campaignAgent.User.FirstName} {campaignAgent.User.LastName}"
                    : "",
                IsActive = campaignAgent.IsActive,
                AssignedAt = campaignAgent.AssignedAt,
                AssignedByUserId = campaignAgent.AssignedByUserId,
                Quota = campaignAgent.Quota,
                ContactsAssigned = 0,  // You can calculate these later
                ContactsCalled = 0,
                RdvCount = 0
            };
        }
        // ==================== Assign Agent to campaign ====================

        public async Task<CampaignAgentDto> AssignAgentAsync(int campaignId, AssignAgentToCampaignDto dto, int assignedByUserId)
        {
            // 1. Vérifier si la campagne existe
            var campaign = await _db.Campaigns
                .FirstOrDefaultAsync(c => c.Id == campaignId && !c.IsDeleted);
            if (campaign == null)
                throw new ArgumentException($"Campaign {campaignId} not found");

            // 2. Vérifier si l'utilisateur existe et est un Agent
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == dto.AgentId);
            if (user == null)
                throw new ArgumentException($"User {dto.AgentId} not found");
            if (user.Role?.Name != "Agent")
                throw new InvalidOperationException($"User {user.FirstName} {user.LastName} does not have Agent role");

            // 3. Vérifier s'il est déjà ACTIF dans cette campagne
            var alreadyAssigned = await _db.CampaignAgents
                .AnyAsync(ca => ca.CampaignId == campaignId && ca.UserId == dto.AgentId && ca.IsActive);
            if (alreadyAssigned)
                throw new InvalidOperationException("Agent is already assigned to this campaign");

            // 4. Chercher s'il existe mais INACTIF
            var existingInactive = await _db.CampaignAgents
                .FirstOrDefaultAsync(ca => ca.CampaignId == campaignId
                    && ca.UserId == dto.AgentId
                    && !ca.IsActive);

            CampaignAgents campaignAgent;

            // 5. Soit on réactive, soit on crée
            if (existingInactive != null)
            {
                // ✅ RÉACTIVER l'ancien (pas de doublon)
                existingInactive.IsActive = true;
                existingInactive.AssignedAt = DateTime.UtcNow;
                existingInactive.AssignedByUserId = assignedByUserId;
                existingInactive.Quota = dto.Quota;
                await _db.SaveChangesAsync();
                campaignAgent = existingInactive;
            }
            else
            {
                // ✅ CRÉER un nouvel agent
                campaignAgent = new CampaignAgents
                {
                    CampaignId = campaignId,
                    UserId = dto.AgentId,
                    Quota = dto.Quota,
                    AssignedAt = DateTime.UtcNow,
                    AssignedByUserId = assignedByUserId,
                    IsActive = true
                };
                _db.CampaignAgents.Add(campaignAgent);
                await _db.SaveChangesAsync();
            }

            // 6. Retourner le DTO
            return new CampaignAgentDto
            {
                Id = campaignAgent.Id,
                CampaignId = campaignAgent.CampaignId,
                AgentId = campaignAgent.UserId,
                AgentName = $"{user.FirstName} {user.LastName}",
                IsActive = campaignAgent.IsActive,
                Quota = campaignAgent.Quota,
                AssignedAt = campaignAgent.AssignedAt,
                AssignedByUserId = campaignAgent.AssignedByUserId
            };
        }

        // ==================== Remove Agent from campaign ====================

        public async Task<CampaignAgentDto> RemoveAgentAsync(int campaignId, int agentId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                //checks if campaign exists and not deleted
                var campaign = await _db.Campaigns
                    .FirstOrDefaultAsync(c => c.Id == campaignId && !c.IsDeleted);

                if (campaign == null)
                    throw new ArgumentException($"Campaign {campaignId} not found");

                var campaignAgent = await _db.CampaignAgents
                    .Include(ca => ca.User)
                    .FirstOrDefaultAsync(ca => ca.UserId == agentId && ca.CampaignId == campaignId);

                if (campaignAgent == null)
                    throw new ArgumentException($"Agent {agentId} is not assigned to campaign {campaignId}");

                campaignAgent.IsActive = false;

                await _db.CampaignFileContacts
                    .Where(cfc => cfc.CampaignId == campaignId
                               && cfc.AssignedAgentId == agentId
                               && cfc.CallStatus == CallStatus.Assigned)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(cfc => cfc.CallStatus, CallStatus.Pending)
                        .SetProperty(cfc => cfc.AssignedAgentId, (int?)null)
                        .SetProperty(cfc => cfc.AssignedAt, (DateTime?)null));

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return new CampaignAgentDto
                {
                    Id = campaignAgent.Id,
                    CampaignId = campaignAgent.CampaignId,
                    AgentId = campaignAgent.UserId,
                    AgentName = campaignAgent.User != null
                        ? $"{campaignAgent.User.FirstName} {campaignAgent.User.LastName}"
                        : "",
                    IsActive = campaignAgent.IsActive,
                    AssignedAt = campaignAgent.AssignedAt,
                    AssignedByUserId = campaignAgent.AssignedByUserId
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }


        // ==================== DELETE ====================
        public async Task<bool> DeleteAsync(int id)
        {
            var campaign = await _db.Campaigns
                    .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (campaign == null)
                return false;

            // Soft delete
            campaign.IsDeleted = true;
            campaign.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return true;
        }

        // ==================== MAP TO RESPONSE DTO ====================
        private CampaignResponseDto MapToResponseDto(Campaign campaign)
        {
            var allCampaignFiles = campaign.CampaignFiles?.Where(cf => !cf.IsRemoved).ToList()
                ?? new List<CampaignFile>();
            var campaignFiles = allCampaignFiles.Where(cf => !cf.IsRecycled).ToList();

            var totalContacts = campaignFiles.Sum(cf => cf.ContactsTotal);
            var qualifiedContacts = campaignFiles.Sum(cf => cf.ContactsCalled);
            var remainingContacts = campaignFiles.Sum(cf => cf.ContactsRemaining);

            return new CampaignResponseDto
            {
                Id = campaign.Id,
                Name = campaign.Name,
                Description = campaign.Description,
                Status = campaign.Status,
                StartDate = campaign.StartDate,
                CreatedAt = campaign.CreatedAt,
                UpdatedAt = campaign.UpdatedAt,
                CreatedByUserId = campaign.CreatedByUserId,
                CreatedByUserName = campaign.CreatedByUser != null
                    ? $"{campaign.CreatedByUser.FirstName} {campaign.CreatedByUser.LastName}"
                    : "",
                TotalContacts = totalContacts,
                QualifiedContacts = qualifiedContacts,
                RemainingContacts = remainingContacts,
                RecycleCount = allCampaignFiles.Count(cf => cf.IsRecycled),
                AutoPoolSizing = campaign.AutoPoolSizing,
                ActivePoolTarget = campaign.ActivePoolTarget,
                LowContactsThreshold = campaign.LowContactsThreshold,
                ContactsPerAgentPerHour = campaign.ContactsPerAgentPerHour,
                PoolBufferHours = campaign.PoolBufferHours,
                MinPoolTarget = campaign.MinPoolTarget,
                MaxPoolTarget = campaign.MaxPoolTarget,
                LowPoolRatio = campaign.LowPoolRatio,

                CampaignFiles = campaignFiles.Select(cf => new CampaignFileDto
                {
                    Id = cf.Id,
                    CampaignId = cf.CampaignId,
                    SourceFileId = cf.SourceFileId,
                    SourceFileName = cf.SourceFile?.Name ?? "",
                    IsActive = cf.IsActive,
                    IsInjected = cf.IsInjected,
                    IsRecycled = cf.IsRecycled,
                    Priority = cf.Priority,
                    ContactsTotal = cf.ContactsTotal,
                    ContactsCalled = cf.ContactsCalled,
                    ContactsRemaining = cf.ContactsRemaining,
                    InjectedAt = cf.InjectedAt,
                    RecycledAt = cf.RecycledAt
                }).ToList(),

                CampaignAgents = campaign.CampaignAgents?
                    .Where(ca => ca.IsActive)
                    .Select(ca => new CampaignAgentDto
                    {
                        Id = ca.Id,
                        CampaignId = ca.CampaignId,
                        AgentId = ca.UserId,
                        AgentName = ca.User != null
                            ? $"{ca.User.FirstName} {ca.User.LastName}"
                            : "",
                        IsActive = ca.IsActive,
                        AssignedAt = ca.AssignedAt,
                        Quota = ca.Quota
                    }).ToList() ?? new List<CampaignAgentDto>()
            };
        }
    }
}
