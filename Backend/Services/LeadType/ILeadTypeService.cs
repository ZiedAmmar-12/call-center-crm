using Backend.Entities;
using Backend.DTOs.LeadType;
public interface ILeadTypeService
{
    Task<List<LeadTypeResponseDto>> GetAllAsync();
    Task<List<LeadTypeResponseDto>> GetByCountryAsync(int countryId);
    Task<LeadTypeResponseDto> CreateAsync(CreateLeadTypeDto dto);
}