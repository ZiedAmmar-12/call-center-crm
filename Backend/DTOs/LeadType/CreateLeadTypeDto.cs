using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.LeadType
{
    public class CreateLeadTypeDto
    {
        [Required]
        [MaxLength(20)]
        public string Code { get; set; } = "";

        [MaxLength(100)]
        public string? Name { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "CountryId is required")]
        public int CountryId { get; set; }

    }
}
