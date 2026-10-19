using System.Security.Claims;
using Backend.Data;
using Microsoft.EntityFrameworkCore;
namespace Backend.Services
{
public class CurrentUserService
{
    private readonly IHttpContextAccessor _http;
        public CurrentUserService(IHttpContextAccessor http)
        {
            _http = http;
        }
        public int UserId => int.Parse(
            _http.HttpContext!.User
          .FindFirstValue(ClaimTypes.NameIdentifier)!);

        public int RoleId => int.Parse(
            _http.HttpContext!.User
                .FindFirstValue("role_id")!);

        public bool IsAuthenticated =>
            _http.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
}