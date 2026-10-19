using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.LeadType
{
    public class LeadTypeResponseDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = "";
        public string? Name { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CountryId { get; set; }
        public string CountryName { get; set; } = "";
        public string CountryCode { get; set; } = "";
    }
}