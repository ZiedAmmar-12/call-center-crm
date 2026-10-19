using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Attributes;
using Backend.Constants;
using Backend.DTOs.Permissions;
using Backend.Services.Permission;
namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Permissions")]
    [Authorize]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _permissionService;

        public PermissionController(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        [HttpGet]
        [RequirePermission(Permissions.Roles.AssignPermissions)]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _permissionService.GetAllPermissionsAsync();
            return Ok(new { success = true, data = permissions });
        }

        [HttpGet("roles")]
        [RequirePermission(Permissions.Roles.AssignPermissions)]
        public async Task<IActionResult> GetRolesWithPermissions()
        {
            var roles = await _permissionService.GetRolesWithPermissionsAsync();
            return Ok(new { success = true, data = roles });
        }

        [HttpPut("roles/{roleId}")]
        [RequirePermission(Permissions.Roles.AssignPermissions)]
        public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody]
         UpdateRolePermissionsDto dto)
        {
            await _permissionService.UpdateRolePermissionsAsync(roleId, dto.PermissionNames);
            return Ok(new { success = true });
        }

        [HttpGet("users")]
        [RequirePermission(Permissions.Users.AssignPermissions)]
        public async Task<IActionResult> GetUsersWithPermissions()
        {
            var users = await _permissionService.GetUsersWithPermissionsAsync();
            return Ok(new { success = true, data = users });
        }

        [HttpGet("targets/users")]
        [RequirePermission(Permissions.Users.AssignPermissions)]
        public async Task<IActionResult> GetPermissionTargetUsers()
        {
            var users = await _permissionService.GetPermissionTargetUsersAsync();
            return Ok(new { success = true, data = users });
        }

        [HttpPut("users/{userId}")]
        [RequirePermission(Permissions.Users.AssignPermissions)]
        public async Task<IActionResult> UpdateUserPermissions(int userId, [FromBody] UpdateUserPermissionsDto dto)
        {
            await _permissionService.UpdateUserPermissionsAsync(userId, dto);
            return Ok(new { success = true });
        }
    }
}
