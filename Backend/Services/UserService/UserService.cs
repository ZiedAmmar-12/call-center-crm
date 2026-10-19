using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.UserService
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _db;
        public UserService(ApplicationDbContext db) { _db = db; }
        
        public async Task<User?> GetByIdAsync(int id) =>
            await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        
        public async Task<List<User>> GetAllAsync() =>
            await _db.Users.Include(u => u.Role).Where(u => !u.IsDeleted).ToListAsync();
            
        public async Task<User?> GetByEmailAsync(string email) =>
            await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);
    }
}
