using Backend.Data;
using Backend.Entities;
using Backend.DTOs.CountryDTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Services.Country
{
    public class CountryService : ICountryService
    {
        private readonly ApplicationDbContext _db;
        private readonly ILogger<CountryService> _logger;

        public CountryService(ApplicationDbContext db, ILogger<CountryService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<List<Backend.Entities.Country>> GetAllAsync()
        {
            return await _db.Countries
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<Backend.Entities.Country> CreateAsync(CreateCountryDto dto)
        {
            // duplicate check — business logic belongs here, not in controller
            var exists = await _db.Countries
                .AnyAsync(c => c.Name.ToLower() == dto.Name.ToLower().Trim());

            if (exists)
                throw new InvalidOperationException($"Country '{dto.Name}' already exists.");

            var country = new Backend.Entities.Country
            {
                Name = dto.Name.Trim(),
                Code = dto.Code?.ToUpper().Trim() ?? GenerateCode(dto.Name),
                PhonePrefix = dto.PhonePrefix?.Trim() ?? "",
                IsActive = true,           // always true on creation
                CreatedAt = DateTime.UtcNow // set here, not by client
            };

            _db.Countries.Add(country);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Country created: {Name} ({Code})", country.Name, country.Code);
            return country;
        }

        private static string GenerateCode(string name) =>
            name.Replace(" ", "").ToUpper()[..Math.Min(3, name.Replace(" ", "").Length)];
    }
}