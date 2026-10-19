using Backend.DTOs;
using Backend.DTOs.Supplier;
using Backend.Entities;  

namespace Backend.Services.Suppliers
{
    public interface ISupplierService
    {
        Task<Supplier> GetOrCreateSupplierAsync(SourceFileUploadDto dto, int userId);
        Task<SupplierResponseDto> CreateSupplierAsync(CreateSupplierDto dto, int userId);
        Task<List<SupplierResponseDto>> GetAllSuppliersAsync();
        Task<SupplierResponseDto?> GetSupplierByIdAsync(int id);
        Task<List<SupplierResponseDto>> GetSuppliersByFiltersAsync(int countryId, int leadTypeId);
        Task<bool> DeleteSupplierAsync(int id, int deletedByUserId);
        Task<bool> UpdateSupplierAsync(int id, UpdateSupplierDto dto);
    }
}
