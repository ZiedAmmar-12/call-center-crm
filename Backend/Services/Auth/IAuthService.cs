using Backend.DTOs.Agent;

namespace Backend.Services.Auth;

public interface IAuthService
{
    Task<LoginResponseDTO> LoginAsync(LoginDTO dto);
    Task<LoginResponseDTO> FirstLoginAsync(FirstLoginDTO dto);
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(string token, string newPassword);
    Task<string> AdminResetPasswordAsync(long userId);
    Task ChangePasswordAsync(long userId, string oldPassword, string newPassword);
    Task<LoginResponseDTO> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(long userId);
}
