using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Client
{
    public class CreateClientDto
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = "";  // "client1", "client2", "client3"

        [Required]
        [MaxLength(255)]
        public string Nom { get; set; } = "";   // real company name, admin only

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Telephone { get; set; }

        [MaxLength(500)]
        public string? Adresse { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
