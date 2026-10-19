using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.CountryDTO
{
    public class CreateCountryDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = "";

        [MaxLength(3)]
        public string? Code { get; set; }

        [MaxLength(10)]
        public string? PhonePrefix { get; set; }
    }
}