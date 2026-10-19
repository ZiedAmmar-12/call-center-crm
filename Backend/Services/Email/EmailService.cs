using System.Net;
using System.Net.Mail;

namespace Backend.Services.Email;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendWelcomeEmailAsync(
        string toEmail, string nom, string prenom, string role, string plainPassword)
    {
        var host     = _config["Email:SmtpHost"]    ?? throw new InvalidOperationException("Email:SmtpHost manquant");
        var port     = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var useSsl   = bool.Parse(_config["Email:UseSsl"]  ?? "false");
        var sender   = _config["Email:SenderEmail"] ?? throw new InvalidOperationException("Email:SenderEmail manquant");
        var senderName = _config["Email:SenderName"] ?? "EBI Call Center";
        var password = _config["Email:Password"]    ?? throw new InvalidOperationException("Email:Password manquant");
        var appUrl   = _config["App:Url"]           ?? "http://localhost:5173";

        var roleLabel = role.ToUpper() switch
        {
            "CONFIRMATRICE" => "Confirmatrice",
            "AGENT"         => "Agent",
            "ADMIN"         => "Administrateur",
            "TECH"          => "Service Technique",
            "QUAL"          => "Service Qualité",
            _               => role
        };

        var subject = "Bienvenue sur EBI Call Center – Vos identifiants de connexion";
        var body    = BuildHtmlEmail(prenom, nom, toEmail, plainPassword, roleLabel, appUrl);

        using var smtp   = new SmtpClient(host, port);
        smtp.EnableSsl   = useSsl;
        smtp.Credentials = new NetworkCredential(sender, password);
        smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

        using var message = new MailMessage
        {
            From       = new MailAddress(sender, senderName),
            Subject    = subject,
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(toEmail, $"{prenom} {nom}"));

        try
        {
            await smtp.SendMailAsync(message);
            _logger.LogInformation("Welcome email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            // Log but don't block user creation if email fails
            _logger.LogError(ex, "Failed to send welcome email to {Email}", toEmail);
        }
    }

    public async Task SendPasswordResetEmailAsync(
        string toEmail, string nom, string prenom, string resetToken)
    {
        var host       = _config["Email:SmtpHost"]    ?? throw new InvalidOperationException("Email:SmtpHost manquant");
        var port       = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var useSsl     = bool.Parse(_config["Email:UseSsl"]  ?? "false");
        var sender     = _config["Email:SenderEmail"] ?? throw new InvalidOperationException("Email:SenderEmail manquant");
        var senderName = _config["Email:SenderName"]  ?? "EBI Call Center";
        var password   = _config["Email:Password"]    ?? throw new InvalidOperationException("Email:Password manquant");
        var appUrl     = _config["App:Url"]           ?? "http://localhost:5173";

        var resetUrl = $"{appUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        var subject  = "Réinitialisation de votre mot de passe – EBI Call Center";
        var body     = BuildPasswordResetEmail(prenom, nom, resetUrl);

        using var smtp = new SmtpClient(host, port);
        smtp.EnableSsl     = useSsl;
        smtp.Credentials   = new NetworkCredential(sender, password);
        smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

        using var message = new MailMessage
        {
            From = new MailAddress(sender, senderName),
            Subject = subject,
            Body    = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(toEmail, $"{prenom} {nom}"));

        try
        {
            await smtp.SendMailAsync(message);
            _logger.LogInformation("Password reset email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
        }
    }

    public async Task SendAdminResetPasswordEmailAsync(
        string toEmail, string nom, string prenom, string tempPassword)
    {
        var host       = _config["Email:SmtpHost"]    ?? throw new InvalidOperationException("Email:SmtpHost manquant");
        var port       = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var useSsl     = bool.Parse(_config["Email:UseSsl"]  ?? "false");
        var sender     = _config["Email:SenderEmail"] ?? throw new InvalidOperationException("Email:SenderEmail manquant");
        var senderName = _config["Email:SenderName"]  ?? "EBI Call Center";
        var password   = _config["Email:Password"]    ?? throw new InvalidOperationException("Email:Password manquant");
        var appUrl     = _config["App:Url"]           ?? "http://localhost:5173";

        var subject = "Votre mot de passe a été réinitialisé – EBI Call Center";
        var body    = BuildAdminResetPasswordEmail(prenom, nom, toEmail, tempPassword, appUrl);

        using var smtp = new SmtpClient(host, port);
        smtp.EnableSsl     = useSsl;
        smtp.Credentials   = new NetworkCredential(sender, password);
        smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

        using var message = new MailMessage
        {
            From = new MailAddress(sender, senderName),
            Subject = subject,
            Body    = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(toEmail, $"{prenom} {nom}"));

        try
        {
            await smtp.SendMailAsync(message);
            _logger.LogInformation("Admin reset password email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send admin reset password email to {Email}", toEmail);
        }
    }

    private static string BuildPasswordResetEmail(string prenom, string nom, string resetUrl) => $"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"/><title>Réinitialisation mot de passe</title></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                     style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">EBI Call Center</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:15px;">Réinitialisation de mot de passe</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Bonjour {prenom} {nom},</h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous.
                      Ce lien est valable <strong>1 heure</strong>.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <a href="{resetUrl}"
                           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                                  text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">
                          Réinitialiser mon mot de passe →
                        </a>
                      </td></tr>
                    </table>
                    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">
                      Si vous n'avez pas fait cette demande, ignorez cet e-mail.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:13px;">EBI Call Center – message automatique</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        """;

    private static string BuildAdminResetPasswordEmail(
        string prenom, string nom, string email, string tempPassword, string appUrl) => $"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"/><title>Mot de passe réinitialisé</title></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                     style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">EBI Call Center</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:15px;">Mot de passe réinitialisé par l'administrateur</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#1e293b;">Bonjour {prenom} {nom},</h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      L'administrateur a réinitialisé votre mot de passe. Voici vos nouveaux identifiants :
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                      <tr><td style="padding:24px;">
                        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.8px;">Email</p>
                        <p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:600;">{email}</p>
                        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.8px;">Mot de passe temporaire</p>
                        <span style="color:#6366f1;font-size:20px;font-weight:700;letter-spacing:2px;
                                     background:#ede9fe;padding:6px 14px;border-radius:8px;">{tempPassword}</span>
                      </td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin-bottom:24px;">
                      <tr><td style="padding:16px 20px;">
                        <p style="margin:0;color:#9a3412;font-size:14px;">
                          ⚠️ <strong>Important :</strong> Vous devrez changer ce mot de passe à votre prochaine connexion.
                        </p>
                      </td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <a href="{appUrl}/login"
                           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                                  text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">
                          Se connecter →
                        </a>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:13px;">EBI Call Center – message automatique</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        """;

    private static string BuildHtmlEmail(
        string prenom, string nom, string email, string password, string role, string appUrl)
    {
        return $"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bienvenue sur EBI Call Center</title>
        </head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                       style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 40px 32px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                        EBI Call Center
                      </h1>
                      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:15px;">
                        Plateforme de gestion CRM
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">
                        Bonjour {prenom} {nom} 👋
                      </h2>
                      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                        Votre compte <strong>{role}</strong> a été créé par l'administrateur.
                        Voici vos identifiants pour votre première connexion :
                      </p>

                      <!-- Credentials box -->
                      <table width="100%" cellpadding="0" cellspacing="0"
                             style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
                        <tr>
                          <td style="padding:24px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                                  <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.8px;font-weight:600;">
                                    Adresse e-mail
                                  </span><br/>
                                  <span style="color:#1e293b;font-size:16px;font-weight:600;margin-top:4px;display:inline-block;">
                                    {email}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0;">
                                  <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.8px;font-weight:600;">
                                    Mot de passe temporaire
                                  </span><br/>
                                  <span style="color:#6366f1;font-size:20px;font-weight:700;letter-spacing:2px;margin-top:4px;display:inline-block;
                                               background:#ede9fe;padding:6px 14px;border-radius:8px;">
                                    {password}
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Warning -->
                      <table width="100%" cellpadding="0" cellspacing="0"
                             style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin-bottom:28px;">
                        <tr>
                          <td style="padding:16px 20px;">
                            <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.5;">
                              ⚠️ <strong>Important :</strong> Pour des raisons de sécurité, vous devrez
                              changer ce mot de passe dès votre première connexion. Ne partagez pas
                              ces identifiants.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="{appUrl}/first-login?email={Uri.EscapeDataString(email)}"
                               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                      color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;
                                      padding:14px 36px;border-radius:10px;letter-spacing:.3px;">
                              Activer mon compte →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
                      <p style="margin:0;color:#94a3b8;font-size:13px;">
                        Cet e-mail a été envoyé automatiquement par EBI Call Center.<br/>
                        Si vous n'avez pas demandé ce compte, ignorez ce message.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
    }
}
