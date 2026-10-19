using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Backend.Attributes;
using Backend.Services.Permission;
using System.Security.Claims;

namespace Backend.Filters
{
    public class PermissionFilter : IAsyncAuthorizationFilter
    {
        private readonly IPermissionService _permissions;

        public PermissionFilter(IPermissionService permissions)
            => _permissions = permissions;

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var required = context.ActionDescriptor
                .EndpointMetadata
                .OfType<RequirePermissionAttribute>()
                .FirstOrDefault();

            if (required == null)
                return;

            if (!(context.HttpContext.User.Identity?.IsAuthenticated ?? false))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var userIdValue = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdValue, out var userId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            if (!await _permissions.HasPermissionAsync(userId, required.Permission))
                context.Result = new ForbidResult();
        }
    }
}
