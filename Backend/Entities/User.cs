using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("users")]
    public class User
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("first_name")]  // ← ADD THIS
        public string FirstName { get; set; } = string.Empty;

        [Column("last_name")]   // ← ADD THIS
        public string LastName { get; set; } = string.Empty;

        [Column("email")]       // ← ADD THIS
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
  
        [Column("PasswordHash")]  // ← ADD THIS
        public string PasswordHash { get; set; } = string.Empty;

        [Column("role_id")]     // ← Already has
        public int RoleId { get; set; }

        [Column("avatar")]      // ← ADD THIS
        public string? Avatar { get; set; }

        [Column("phone")]       // ← ADD THIS
        public string? Phone { get; set; }

        [Column("is_active")]  
        public bool IsActive { get; set; } = true;
        [Column("is_online")]  
        public bool IsOnline { get; set; } = true;
        [Column("is_deleted")]  
        public bool IsDeleted { get; set; } = false;

        [Column("refresh_token")]  
        public string? RefreshToken { get; set; }

        [Column("refresh_token_expiry_time")] 
        public DateTime? RefreshTokenExpiryTime { get; set; }
        [Column("password_reset_token")]
        public string? PasswordResetToken { get; set; }

        [Column("password_reset_token_expiry")]
        public DateTime? PasswordResetTokenExpiry { get; set; }
        [Column("created_at")]  
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]  
        public DateTime? UpdatedAt { get; set; }

        [Column("last_login_at")]
        public DateTime? LastLoginAt { get; set; }

        [Column("last_heartbeat_at")]
        public DateTime? LastHeartbeatAt { get; set; }

        [Column("presence_status")]
        public string? PresenceStatus { get; set; }

        [Column("presence_changed_at")]
        public DateTime? PresenceChangedAt { get; set; }

        [ForeignKey("RoleId")]
        public Role Role { get; set; } = null!;
        [Column("must_change_password")]
        public bool MustChangePassword { get; set; } = false;

        [Column("password_reset_by_user_id")]
        public int? PasswordResetByUserId { get; set; }
        [ForeignKey("PasswordResetByUserId")]
        public User? PasswordResetBy { get; set; }
        public AgentProfile? AgentProfile { get; set; }
        public ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();

    }
}
