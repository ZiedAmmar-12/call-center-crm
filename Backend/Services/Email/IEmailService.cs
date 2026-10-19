namespace Backend.Services.Email;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(string toEmail, string nom, string prenom, string role, string plainPassword);
    Task SendPasswordResetEmailAsync(string toEmail, string nom, string prenom, string resetToken);
    Task SendAdminResetPasswordEmailAsync(string toEmail, string nom, string prenom, string tempPassword);
}
