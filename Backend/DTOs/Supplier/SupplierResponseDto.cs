namespace Backend.DTOs.Supplier
{
    public class SupplierResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CountryId { get; set; }
        public string CountryName { get; set; } = string.Empty;
        public string CountryCode { get; set; } = string.Empty;
        public int LeadTypeId { get; set; }
        public string LeadTypeName { get; set; } = string.Empty;
        public string LeadTypeCode { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int CreatedByUserId { get; set; }
        public int SourceFilesCount { get; set; }
    }
}