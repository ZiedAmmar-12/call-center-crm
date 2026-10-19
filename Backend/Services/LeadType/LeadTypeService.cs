using Microsoft.EntityFrameworkCore;
using Backend.DTOs.LeadType;
using Backend.Data;
using Backend.DTOs;
using Backend.Entities;
namespace Backend.Services.LeadType
{
    public class LeadTypeService : ILeadTypeService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<LeadTypeService> _logger;

        public LeadTypeService(ApplicationDbContext db, ILogger<LeadTypeService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<List<LeadTypeResponseDto>> GetAllAsync()
        {
            return await _db.LeadTypes
                .Select(lt => new LeadTypeResponseDto
                {
                    Id = lt.Id,
                    Code = lt.Code,
                    Name = lt.Name,
                    IsActive = lt.IsActive,
                    CreatedAt = lt.CreatedAt,
                    CountryId = lt.CountryId,
                    CountryName = lt.Country.Name,
                    CountryCode = lt.Country.Code
                })
                .ToListAsync();
        }

        public async Task<List<LeadTypeResponseDto>> GetByCountryAsync(int countryId)
        {
            // check country exists first
            var countryExists = await _db.Countries.AnyAsync(c => c.Id == countryId);
            if (!countryExists)
                throw new KeyNotFoundException($"Country {countryId} not found");

            return await _db.LeadTypes
                .Where(lt => lt.CountryId == countryId && lt.IsActive)
                .OrderBy(lt => lt.Code)
                .Select(lt => new LeadTypeResponseDto
                {
                    Id = lt.Id,
                    Code = lt.Code,
                    Name = lt.Name,
                    IsActive = lt.IsActive,
                    CreatedAt = lt.CreatedAt,
                    CountryId = lt.CountryId,
                    CountryName = lt.Country.Name,
                    CountryCode = lt.Country.Code
                })
                .ToListAsync();
        }

        public async Task<LeadTypeResponseDto> CreateAsync(CreateLeadTypeDto dto)
        {
            // check country exists
            var country = await _db.Countries.FindAsync(dto.CountryId);
            if (country == null)
                throw new KeyNotFoundException($"Country {dto.CountryId} not found");

            // duplicate check — same code in same country
            var exists = await _db.LeadTypes.AnyAsync(lt =>
                lt.CountryId == dto.CountryId &&
                lt.Code.ToLower() == dto.Code.ToLower().Trim());

            if (exists)
                throw new InvalidOperationException(
                    $"Lead type '{dto.Code}' already exists for country '{country.Name}'");

            var leadType = new Backend.Entities.LeadType
            {
                Code = dto.Code.ToUpper().Trim(),
                Name = dto.Name?.Trim() ?? dto.Code.Trim(), // fallback to code if no name
                IsActive = true,           // always true on creation
                CountryId = dto.CountryId,
                CreatedAt = DateTime.UtcNow
            };

            _db.LeadTypes.Add(leadType);
            await _db.SaveChangesAsync();

            _logger.LogInformation("LeadType created: {Code} for country {CountryId}",
                leadType.Code, leadType.CountryId);

            // return DTO with country info included
            return new LeadTypeResponseDto
            {
                Id = leadType.Id,
                Code = leadType.Code,
                Name = leadType.Name,
                IsActive = leadType.IsActive,
                CreatedAt = leadType.CreatedAt,
                CountryId = leadType.CountryId,
                CountryName = country.Name,
                CountryCode = country.Code
            };
        }
    }
}