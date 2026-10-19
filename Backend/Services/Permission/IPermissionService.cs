// Services/IPermissionService.cs
using Backend.DTOs.Permissions;

namespace Backend.Services.Permission 
{
    public interface IPermissionService
    {
        // Basic permission check (sync - from JWT claims)
        bool HasPermission(string permission);
        // Async DB-based checks
        Task<bool> HasPermissionAsync(int userId, string permission);
        Task<bool> HasPermissionForUserScopeAsync(int userId, string permission, int scopeUserId);
        Task<List<string>> GetUserPermissionsAsync(int userId);
        Task InitializePermissionsAsync();
        // Admin methods (for PermissionController)
        Task<List<PermissionDto>> GetAllPermissionsAsync();
        Task<List<RolePermissionDto>> GetRolesWithPermissionsAsync();
        Task UpdateRolePermissionsAsync(int roleId, List<string> permissionNames);
        Task<List<UserPermissionDto>> GetUsersWithPermissionsAsync();
        Task<List<PermissionTargetUserDto>> GetPermissionTargetUsersAsync();
        Task UpdateUserPermissionsAsync(int userId, UpdateUserPermissionsDto dto);
    }
}
