using Backend.Constants;
using Backend.Data;
using Backend.DTOs.Agents;
using Backend.Entities;
using Backend.Services.Auth;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Agents
{
    public class AgentService : IAgentService
    {
        private readonly ApplicationDbContext _db;
        private readonly PasswordHasher _passwordHasher;

        public AgentService(ApplicationDbContext db, PasswordHasher passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

        public async Task<List<AgentResponseDto>> GetAllAgentsAsync()
        {
            var agents = await _db.Users
                .Include(u => u.Role)
                .Where(u => u.Role.Name == Roles.Agent)
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ToListAsync();

            return await MapAgentsAsync(agents);
        }

        public async Task<AgentResponseDto?> GetAgentByIdAsync(int id)
        {
            var agent = await GetAgentUserQuery()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (agent == null)
                return null;

            return await MapAgentAsync(agent);
        }

        public async Task<AgentResponseDto> CreateAgentAsync(CreateAgentDto dto, int createdByUserId)
        {
            ValidateCreate(dto);

            var agentRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == Roles.Agent);
            if (agentRole == null)
                throw new InvalidOperationException("Agent role not found. Please seed the Agent role first.");

            var normalizedEmail = dto.Email.Trim();
            var emailExists = await _db.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Email == normalizedEmail);

            if (emailExists)
                throw new InvalidOperationException("Email already registered.");

            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var now = DateTime.UtcNow;
                var user = new User
                {
                    FirstName = dto.FirstName.Trim(),
                    LastName = dto.LastName.Trim(),
                    Email = normalizedEmail,
                    Phone = dto.Phone,
                    Avatar = dto.Avatar,
                    PasswordHash = _passwordHasher.HashPassword(dto.Password),
                    RoleId = agentRole.Id,
                    IsActive = dto.IsActive,
                    IsOnline = false,
                    IsDeleted = false,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                _db.AgentProfiles.Add(new AgentProfile
                {
                    UserId = user.Id,
                    HireDate = dto.HireDate,
                    TypeContrat = string.IsNullOrWhiteSpace(dto.TypeContrat) ? "PLEIN_TEMPS" : dto.TypeContrat.Trim(),
                    ObjectifMensuel = dto.ObjectifMensuel,
                    SalaireBase = dto.SalaireBase,
                    PrimeAssiduite = dto.PrimeAssiduite,
                    Notes = dto.Notes,
                    UpdatedAt = now
                });

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return await MapAgentAsync(user);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<AgentResponseDto?> UpdateAgentAsync(int id, UpdateAgentDto dto)
        {
            var agent = await GetAgentUserQuery()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (agent == null)
                return null;

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var normalizedEmail = dto.Email.Trim();
                var emailExists = await _db.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Id != id && u.Email == normalizedEmail);

                if (emailExists)
                    throw new InvalidOperationException("Email already registered.");

                agent.Email = normalizedEmail;
            }

            if (dto.FirstName != null)
                agent.FirstName = dto.FirstName.Trim();

            if (dto.LastName != null)
                agent.LastName = dto.LastName.Trim();

            if (dto.Phone != null)
                agent.Phone = dto.Phone;

            if (dto.Avatar != null)
                agent.Avatar = dto.Avatar;

            if (!string.IsNullOrWhiteSpace(dto.Password))
                agent.PasswordHash = _passwordHasher.HashPassword(dto.Password);

            if (dto.IsActive.HasValue)
                agent.IsActive = dto.IsActive.Value;

            if (dto.IsOnline.HasValue)
                agent.IsOnline = dto.IsOnline.Value;

            agent.UpdatedAt = DateTime.UtcNow;

            var profile = await _db.AgentProfiles.FirstOrDefaultAsync(p => p.UserId == agent.Id);
            if (profile == null)
            {
                profile = new AgentProfile
                {
                    UserId = agent.Id
                };
                _db.AgentProfiles.Add(profile);
            }

            ApplyProfileUpdates(profile, dto);

            await _db.SaveChangesAsync();
            return await MapAgentAsync(agent);
        }

        public async Task<bool> DeleteAgentAsync(int id)
        {
            var agent = await GetAgentUserQuery()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (agent == null)
                return false;

            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                var now = DateTime.UtcNow;

                agent.IsDeleted = true;
                agent.IsActive = false;
                agent.IsOnline = false;
                agent.UpdatedAt = now;

                await _db.CampaignAgents
                    .Where(ca => ca.UserId == id && ca.IsActive)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(ca => ca.IsActive, false));

                await _db.CampaignFileContacts
                    .Where(c => c.AssignedAgentId == id && c.CallStatus == CallStatus.Assigned)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(c => c.AssignedAgentId, (int?)null)
                        .SetProperty(c => c.AssignedAt, (DateTime?)null)
                        .SetProperty(c => c.CallStatus, CallStatus.Pending));

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<AgentCampaignSummaryDto>> GetAgentCampaignsAsync(int id)
        {
            var agentExists = await GetAgentUserQuery().AnyAsync(u => u.Id == id);
            if (!agentExists)
                throw new ArgumentException($"Agent {id} not found.");

            return await _db.CampaignAgents
                .Include(ca => ca.Campaign)
                .Where(ca => ca.UserId == id && ca.Campaign != null)
                .OrderByDescending(ca => ca.AssignedAt)
                .Select(ca => new AgentCampaignSummaryDto
                {
                    CampaignAgentId = ca.Id,
                    CampaignId = ca.CampaignId,
                    CampaignName = ca.Campaign != null ? ca.Campaign.Name : "",
                    IsActive = ca.IsActive,
                    AssignedAt = ca.AssignedAt,
                    Quota = ca.Quota,
                    Weight = ca.Weight
                })
                .ToListAsync();
        }

        public async Task<List<AgentAppointmentDto>> GetAgentAppointmentsAsync(int id)
        {
            var agent = await GetAgentUserQuery()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (agent == null)
                throw new ArgumentException($"Agent {id} not found.");

            var agentName = $"{agent.FirstName} {agent.LastName}".Trim();

            return await _db.CampaignFileContacts
                .Include(c => c.Campaign)
                .Include(c => c.SourceFileContact)
                .Where(c => c.QualifiedByUserId == id && c.AppointmentDate != null)
                .OrderBy(c => c.AppointmentDate)
                .Select(c => new AgentAppointmentDto
                {
                    CampaignFileContactId = c.Id,
                    CampaignId = c.CampaignId,
                    CampaignName = c.Campaign != null ? c.Campaign.Name : "",
                    AgentId = id,
                    AgentName = agentName,
                    ClientName = c.SourceFileContact == null
                        ? ""
                        : (c.SourceFileContact.FirstName + " " + c.SourceFileContact.LastName).Trim(),
                    PhoneNumber = c.SourceFileContact != null ? c.SourceFileContact.PhoneNumber : "",
                    City = c.SourceFileContact != null ? c.SourceFileContact.City : null,
                    QualificationStatus = c.QualificationStatus,
                    AppointmentType = c.AppointmentType,
                    AppointmentDate = c.AppointmentDate
                })
                .ToListAsync();
        }

        private IQueryable<User> GetAgentUserQuery()
        {
            return _db.Users
                .Include(u => u.Role)
                .Include(u => u.AgentProfile)
                .Where(u => u.Role.Name == Roles.Agent);
        }

        private async Task<AgentResponseDto> MapAgentAsync(User agent)
        {
            var mapped = await MapAgentsAsync(new List<User> { agent });
            return mapped[0];
        }

        private async Task<List<AgentResponseDto>> MapAgentsAsync(List<User> agents)
        {
            var agentIds = agents.Select(a => a.Id).ToList();
            var profiles = await _db.AgentProfiles
                .Where(p => agentIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId);

            var campaigns = await _db.CampaignAgents
                .Include(ca => ca.Campaign)
                .Where(ca => agentIds.Contains(ca.UserId) && ca.Campaign != null)
                .OrderByDescending(ca => ca.AssignedAt)
                .Select(ca => new
                {
                    ca.UserId,
                    Summary = new AgentCampaignSummaryDto
                    {
                        CampaignAgentId = ca.Id,
                        CampaignId = ca.CampaignId,
                        CampaignName = ca.Campaign != null ? ca.Campaign.Name : "",
                        IsActive = ca.IsActive,
                        AssignedAt = ca.AssignedAt,
                        Quota = ca.Quota,
                        Weight = ca.Weight
                    }
                })
                .ToListAsync();

            var campaignsByAgent = campaigns
                .GroupBy(c => c.UserId)
                .ToDictionary(g => g.Key, g => g.Select(c => c.Summary).ToList());

            return agents.Select(agent =>
            {
                profiles.TryGetValue(agent.Id, out var profile);
                campaignsByAgent.TryGetValue(agent.Id, out var agentCampaigns);
                agentCampaigns ??= new List<AgentCampaignSummaryDto>();

                return new AgentResponseDto
                {
                    Id = agent.Id,
                    UserId = agent.Id,
                    FirstName = agent.FirstName,
                    LastName = agent.LastName,
                    FullName = $"{agent.FirstName} {agent.LastName}".Trim(),
                    Email = agent.Email,
                    Phone = agent.Phone,
                    Avatar = agent.Avatar,
                    IsActive = agent.IsActive,
                    IsOnline = agent.IsOnline,
                    CreatedAt = agent.CreatedAt,
                    UpdatedAt = agent.UpdatedAt,
                    Profile = profile == null ? null : MapProfile(profile),
                    ActiveCampaignsCount = agentCampaigns.Count(c => c.IsActive),
                    Campaigns = agentCampaigns
                };
            }).ToList();
        }

        private static AgentProfileDto MapProfile(AgentProfile profile)
        {
            return new AgentProfileDto
            {
                Id = profile.Id,
                UserId = profile.UserId,
                HireDate = profile.HireDate,
                TypeContrat = profile.TypeContrat,
                ObjectifMensuel = profile.ObjectifMensuel,
                SalaireBase = profile.SalaireBase,
                PrimeAssiduite = profile.PrimeAssiduite,
                TotalRdv = profile.TotalRdv,
                TotalRdvConfirme = profile.TotalRdvConfirme,
                TotalRdvSigne = profile.TotalRdvSigne,
                TotalRdvAnnule = profile.TotalRdvAnnule,
                TotalPose = profile.TotalPose,
                NoteEvaluationMoyenne = profile.NoteEvaluationMoyenne,
                DerniereActivite = profile.DerniereActivite,
                Notes = profile.Notes,
                UpdatedAt = profile.UpdatedAt
            };
        }

        private static void ApplyProfileUpdates(AgentProfile profile, UpdateAgentDto dto)
        {
            if (dto.HireDate.HasValue)
                profile.HireDate = dto.HireDate.Value;

            if (!string.IsNullOrWhiteSpace(dto.TypeContrat))
                profile.TypeContrat = dto.TypeContrat.Trim();

            if (dto.ObjectifMensuel.HasValue)
                profile.ObjectifMensuel = dto.ObjectifMensuel.Value;

            if (dto.SalaireBase.HasValue)
                profile.SalaireBase = dto.SalaireBase.Value;

            if (dto.PrimeAssiduite.HasValue)
                profile.PrimeAssiduite = dto.PrimeAssiduite.Value;

            if (dto.TotalRdv.HasValue)
                profile.TotalRdv = dto.TotalRdv.Value;

            if (dto.TotalRdvConfirme.HasValue)
                profile.TotalRdvConfirme = dto.TotalRdvConfirme.Value;

            if (dto.TotalRdvSigne.HasValue)
                profile.TotalRdvSigne = dto.TotalRdvSigne.Value;

            if (dto.TotalRdvAnnule.HasValue)
                profile.TotalRdvAnnule = dto.TotalRdvAnnule.Value;

            if (dto.TotalPose.HasValue)
                profile.TotalPose = dto.TotalPose.Value;

            if (dto.NoteEvaluationMoyenne.HasValue)
                profile.NoteEvaluationMoyenne = dto.NoteEvaluationMoyenne.Value;

            if (dto.DerniereActivite.HasValue)
                profile.DerniereActivite = dto.DerniereActivite.Value;

            if (dto.Notes != null)
                profile.Notes = dto.Notes;

            profile.UpdatedAt = DateTime.UtcNow;
        }

        private static void ValidateCreate(CreateAgentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName))
                throw new ArgumentException("First name is required.");

            if (string.IsNullOrWhiteSpace(dto.LastName))
                throw new ArgumentException("Last name is required.");

            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new ArgumentException("Email is required.");

            if (string.IsNullOrWhiteSpace(dto.Password))
                throw new ArgumentException("Password is required.");
        }
    }
}
