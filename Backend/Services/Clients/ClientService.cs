using Backend.Data;
using Backend.DTOs.Client;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.Clients
{
    public class ClientService : IClientService
    {
        private readonly ApplicationDbContext _db;

        public ClientService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<ClientResponseDto>> GetAllAsync()
        {
            return await _db.Clients
                .OrderBy(c => c.Code)
                .Select(c => ToDto(c))
                .ToListAsync();
        }

        // Returns only code + id — safe to expose to agents and other roles
        public async Task<List<ClientPublicDto>> GetAllPublicAsync()
        {
            return await _db.Clients
                .Where(c => c.IsActive)
                .OrderBy(c => c.Code)
                .Select(c => new ClientPublicDto { Id = c.Id, Code = c.Code })
                .ToListAsync();
        }

        public async Task<ClientResponseDto?> GetByIdAsync(int id)
        {
            var client = await _db.Clients.FindAsync(id);
            return client == null ? null : ToDto(client);
        }

        public async Task<ClientResponseDto> CreateAsync(CreateClientDto dto)
        {
            var codeExists = await _db.Clients
                .AnyAsync(c => c.Code == dto.Code.Trim().ToLower());

            if (codeExists)
                throw new InvalidOperationException($"A client with code '{dto.Code}' already exists.");

            var client = new Client
            {
                Code = dto.Code.Trim().ToLower(),
                Nom = dto.Nom.Trim(),
                Email = dto.Email?.Trim(),
                Telephone = dto.Telephone?.Trim(),
                Adresse = dto.Adresse?.Trim(),
                IsActive = dto.IsActive
            };

            _db.Clients.Add(client);
            await _db.SaveChangesAsync();

            return ToDto(client);
        }

        public async Task<ClientResponseDto?> UpdateAsync(int id, UpdateClientDto dto)
        {
            var client = await _db.Clients.FindAsync(id);
            if (client == null) return null;

            if (dto.Nom != null) client.Nom = dto.Nom.Trim();
            if (dto.Email != null) client.Email = dto.Email.Trim();
            if (dto.Telephone != null) client.Telephone = dto.Telephone.Trim();
            if (dto.Adresse != null) client.Adresse = dto.Adresse.Trim();
            if (dto.IsActive.HasValue) client.IsActive = dto.IsActive.Value;

            await _db.SaveChangesAsync();
            return ToDto(client);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var client = await _db.Clients.FindAsync(id);
            if (client == null) return false;

            _db.Clients.Remove(client);
            await _db.SaveChangesAsync();
            return true;
        }

        private static ClientResponseDto ToDto(Client c) => new()
        {
            Id = c.Id,
            Code = c.Code,
            Nom = c.Nom,
            Email = c.Email,
            Telephone = c.Telephone,
            Adresse = c.Adresse,
            IsActive = c.IsActive
        };
    }
}
