using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Client
{
    public class UpdateClientDto
    {
        [MaxLength(255)]
        public string? Nom { get; set; }

        [MaxLength(255)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Telephone { get; set; }

        [MaxLength(500)]
        public string? Adresse { get; set; }

        public bool? IsActive { get; set; }
    }
}
