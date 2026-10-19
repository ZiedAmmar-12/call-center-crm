using Backend.Entities;

namespace Backend.DTOs.Tree
{   
    public class TreeCountryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public List<TreeLeadTypeDto> LeadTypes { get; set; } = new();
    }
    public class TreeLeadTypeDto
    {   
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public List<TreeSupplierDto> Suppliers { get; set; } = new();

    }
    public class TreeSupplierDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<TreeFileDto> SourceFiles { get; set; } = new();
    }
    public class TreeFileDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string OriginalName { get; set; } = string.Empty;
        public string FileSizeLabel { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public string Format { get; set; } = string.Empty;
        public string Statut { get; set; } = string.Empty;
        public int ContactCount { get; set; }
        public int ListNumber { get; set; }
        public DateTime UploadedAt { get; set; }
        public bool IsActive { get; set; }
    }
}