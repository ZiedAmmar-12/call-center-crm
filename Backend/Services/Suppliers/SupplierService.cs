using Backend.DTOs;
using Backend.Data;
using Backend.DTOs.Supplier;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;

namespace Backend.Services.Suppliers
{
    public class SupplierService : ISupplierService
    {
        private readonly ApplicationDbContext _db;
        public SupplierService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<SupplierResponseDto>> GetSuppliersByFiltersAsync(int countryId, int leadTypeId)
        {
            return await _db.Suppliers
                .Where(s => s.CountryId == countryId && s.LeadTypeId == leadTypeId)
                .OrderBy(s => s.Name)
                .Select(s => new SupplierResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    CountryId = s.CountryId,
                    CountryName = s.Country != null ? s.Country.Name : "",
                    CountryCode = s.Country != null ? s.Country.Code : "",
                    LeadTypeId = s.LeadTypeId,
                    LeadTypeName = s.LeadType != null ? s.LeadType.Name : "",
                    LeadTypeCode = s.LeadType != null ? s.LeadType.Code : "",
                    CreatedAt = s.CreatedAt,
                    CreatedByUserId = s.CreatedByUserId,
                    SourceFilesCount = s.SourceFiles != null ? s.SourceFiles.Count : 0
                })
                .ToListAsync();
        }
        public async Task<Supplier> GetOrCreateSupplierAsync(SourceFileUploadDto dto, int userId)
        {
            // Validate input
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            // Case 1: Use existing supplier by ID
            if (dto.SupplierId.HasValue && dto.SupplierId.Value > 0)
            {
                var supplier = await _db.Suppliers
                    .Include(s => s.Country)
                    .Include(s => s.LeadType)
                    .FirstOrDefaultAsync(s => s.Id == dto.SupplierId.Value);

                if (supplier == null)
                    throw new InvalidOperationException($"Supplier with ID {dto.SupplierId.Value} not found");

                return supplier;
            }

            // Case 2: Create new supplier
            if (!string.IsNullOrWhiteSpace(dto.NewSupplierName))
            {
                // Validate required fields for new supplier
                if (dto.CountryId <= 0)
                    throw new InvalidOperationException("Country is required for creating a new supplier");

                if (dto.LeadTypeId <= 0)
                    throw new InvalidOperationException("LeadType is required for creating a new supplier");

                // Validate and fetch related entities sequentially — EF Core's DbContext
                // is not thread-safe, so running these concurrently on the same _db
                // instance throws "A second operation was started on this context
                // instance before a previous operation completed."
                var country = await _db.Countries.FindAsync(dto.CountryId);
                var leadType = await _db.LeadTypes.FindAsync(dto.LeadTypeId);

                if (country == null)
                    throw new InvalidOperationException($"Country with ID {dto.CountryId} not found");

                if (leadType == null)
                    throw new InvalidOperationException($"LeadType with ID {dto.LeadTypeId} not found");

                // Check for existing supplier with same name, country, and lead type
                var existingSupplier = await _db.Suppliers
                    .FirstOrDefaultAsync(s => s.Name == dto.NewSupplierName
                                            && s.CountryId == dto.CountryId
                                            && s.LeadTypeId == dto.LeadTypeId);

                if (existingSupplier != null)
                {
                    // Return existing supplier with included navigation properties
                    return await _db.Suppliers
                        .Include(s => s.Country)
                        .Include(s => s.LeadType)
                        .FirstAsync(s => s.Id == existingSupplier.Id);
                }

                // Create new supplier
                // CreatedByUserId FKs to the separate "users" table (not the real Utilisateur
                // auth table), which frequently has no row matching the logged-in user's id —
                // resolve to a valid id so the insert doesn't fail on this unrelated FK.
                var bridgedUserId = await Backend.Helpers.UserBridgeHelper.EnsureValidUserIdAsync(_db, userId);
                var newSupplier = new Supplier
                {
                    Name = dto.NewSupplierName.Trim(),
                    CountryId = dto.CountryId,
                    LeadTypeId = dto.LeadTypeId,
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = bridgedUserId,
                    SourceFiles = new List<SourceFile>()
                };

                _db.Suppliers.Add(newSupplier);

                try
                {
                    await _db.SaveChangesAsync();
                }
                catch (DbUpdateException ex)
                {
                    // Handle potential duplicate key or other database constraints
                    throw new InvalidOperationException("Failed to create supplier. A supplier with the same details may already exist.", ex);
                }

                // Return the newly created supplier with navigation properties
                var createdSupplier = await _db.Suppliers
                    .Include(s => s.Country)
                    .Include(s => s.LeadType)
                    .FirstOrDefaultAsync(s => s.Id == newSupplier.Id);

                if (createdSupplier == null)
                    throw new InvalidOperationException("Failed to retrieve the newly created supplier");

                return createdSupplier;
            }

            // Neither SupplierId nor NewSupplierName provided
            throw new InvalidOperationException("Either SupplierId or NewSupplierName must be provided");
        }
        public async Task<SupplierResponseDto> CreateSupplierAsync(CreateSupplierDto dto, int userId)
        {
            // Map DTO to Entity
            var supplier = new Supplier
            {
                Name = dto.Name,
                CountryId = dto.CountryId,
                LeadTypeId = dto.LeadTypeId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.Suppliers.Add(supplier);
            await _db.SaveChangesAsync();

            // Return DTO, not Entity
            return new SupplierResponseDto
            {
                Id = supplier.Id,
                Name = supplier.Name,
                CountryId = supplier.CountryId,
                LeadTypeId = supplier.LeadTypeId,
                CreatedAt = supplier.CreatedAt,
                CreatedByUserId = supplier.CreatedByUserId
            };
        }
        public async Task<List<SupplierResponseDto>> GetAllSuppliersAsync()
        {
            return await _db.Suppliers
                .Include(s => s.Country)
                .Include(s => s.LeadType)
                .Select(s => new SupplierResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    CountryId = s.CountryId,
                    CountryName = s.Country.Name,   // flat string, no object
                    LeadTypeId = s.LeadTypeId,
                    LeadTypeName = s.LeadType.Name, // flat string, no object
                    CreatedAt = s.CreatedAt,
                    CreatedByUserId = s.CreatedByUserId
                })
                .ToListAsync();
        }

        // ✅ Fixed (returns DTO)
        public async Task<SupplierResponseDto?> GetSupplierByIdAsync(int id)
        {
            var supplier = await _db.Suppliers
                .Include(s => s.Country)
                .Include(s => s.LeadType)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (supplier == null)
            {
                return null;
            }

            return new SupplierResponseDto
            {
                Id = supplier.Id,
                Name = supplier.Name,
                CountryId = supplier.CountryId,
                CountryName = supplier.Country?.Name ?? "",
                CountryCode = supplier.Country?.Code ?? "",
                LeadTypeId = supplier.LeadTypeId,
                LeadTypeName = supplier.LeadType?.Name ?? "",
                LeadTypeCode = supplier.LeadType?.Code ?? "",
                CreatedAt = supplier.CreatedAt,
                CreatedByUserId = supplier.CreatedByUserId,
                SourceFilesCount = supplier.SourceFiles?.Count ?? 0
            };
        }
        public async Task<bool> DeleteSupplierAsync(int id, int deletedByUserId)
        {
            var supplier = await _db.Suppliers
                .Include(s => s.SourceFiles)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (supplier == null)
            {
                return false;
            }

            var deletedAt = DateTime.UtcNow;

            supplier.IsDeleted = true;
            supplier.DeletedAt = deletedAt;
            supplier.DeletedByUserId = deletedByUserId;

            foreach (var file in supplier.SourceFiles.Where(f => !f.IsDeleted))
            {
                file.IsDeleted = true;
                file.DeletedAt = deletedAt;
                file.DeletedByUserId = deletedByUserId;
            }

            await _db.SaveChangesAsync();
            return true;
        }
        public async Task<bool> UpdateSupplierAsync(int id, UpdateSupplierDto dto)
        {
            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null)
            {
                return false;
            }

            if (!string.IsNullOrEmpty(dto.Name))
                supplier.Name = dto.Name;

            if (dto.CountryId.HasValue && dto.CountryId.Value > 0)
            {
                var country = await _db.Countries.FindAsync(dto.CountryId.Value);
                if (country != null)
                {
                    supplier.CountryId = dto.CountryId.Value;
                }
            }
            if (dto.LeadTypeId.HasValue && dto.LeadTypeId.Value > 0)
            {
                var leadType = await _db.LeadTypes.FindAsync(dto.LeadTypeId.Value);
                if (leadType != null)
                    supplier.LeadTypeId = dto.LeadTypeId.Value;
            }
            

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
