using Backend.DTOs.Client;

namespace Backend.Services.Clients
{
    public interface IClientService
    {
        Task<List<ClientResponseDto>> GetAllAsync();
        Task<List<ClientPublicDto>> GetAllPublicAsync();
        Task<ClientResponseDto?> GetByIdAsync(int id);
        Task<ClientResponseDto> CreateAsync(CreateClientDto dto);
        Task<ClientResponseDto?> UpdateAsync(int id, UpdateClientDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
