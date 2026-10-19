using Backend.Entities;

namespace Backend.Services.UserService
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(int id);
        Task<List<User>> GetAllAsync();
        Task<User?> GetByEmailAsync(string email);
    }
}
