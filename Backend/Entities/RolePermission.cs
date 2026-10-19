using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("role_permissions")]
    public class RolePermission
    {
        [Column("role_id")]
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        [Column("permission_id")]
        public int PermissionId { get; set; }
        public Permission Permission { get; set; } = null!;
    }
}