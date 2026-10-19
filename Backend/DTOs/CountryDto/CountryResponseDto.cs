using System.ComponentModel.DataAnnotations; 

namespace Backend.DTOs.CountryDTO
{
    public class CountryResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
    
    }
}