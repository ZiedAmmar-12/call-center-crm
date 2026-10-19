namespace Backend.DTOs.Permissions
{
    public class PermissionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
    }

    public class RolePermissionDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public List<string> PermissionNames { get; set; } = new();
    }

    public class UpdateRolePermissionsDto
    {
        public List<string> PermissionNames { get; set; } = new();
    }

    public class UserPermissionScopeDto
    {
        public string PermissionName { get; set; } = string.Empty;
        public string? ScopeType { get; set; }
        public int? ScopeUserId { get; set; }
        public string? ScopeUserName { get; set; }
    }

    public class UserPermissionDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public List<string> PermissionNames { get; set; } = new();
        public List<UserPermissionScopeDto> ScopedPermissions { get; set; } = new();
    }

    public class PermissionTargetUserDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
    }

    public class UpdateUserScopedPermissionDto
    {
        public string PermissionName { get; set; } = string.Empty;
        public string? ScopeType { get; set; }
        public int? ScopeUserId { get; set; }
    }

    public class UpdateUserPermissionsDto
    {
        public List<string> PermissionNames { get; set; } = new();
        public List<UpdateUserScopedPermissionDto> ScopedPermissions { get; set; } = new();
    }
}
