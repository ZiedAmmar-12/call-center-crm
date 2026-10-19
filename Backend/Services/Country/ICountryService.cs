using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Entities;
using Backend.DTOs.CountryDTO;
namespace Backend.Services.Country
{
    public interface ICountryService
    {
        Task<List<Backend.Entities.Country>> GetAllAsync();
        Task<Backend.Entities.Country> CreateAsync(CreateCountryDto dto);
    }
}