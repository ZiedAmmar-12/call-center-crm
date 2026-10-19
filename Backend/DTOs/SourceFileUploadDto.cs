using Backend.Entities;
using Microsoft.AspNetCore.Http;

namespace Backend.DTOs
{
    public class SourceFileUploadDto
    {
        // File being uploaded
        public IFormFile File { get; set; } = null!;

        // Supplier information
        public int? SupplierId { get; set; }           // Existing supplier ID (optional)
        public string? NewSupplierName { get; set; }   // New supplier name (if creating new)

        // File naming
        public string? Name { get; set; }              // Custom display name (optional)

        // Foreign keys
        public int CountryId { get; set; }             // Country ID (required)
        public int LeadTypeId { get; set; }            // Lead type ID (required)

        // User information
        public int UserId { get; set; }                // User ID who is uploading
        public Dictionary<string, string>? ColumnMapping { get; set; } // Optional mapping of file columns to expected fields (e.g., "Phone" => "PhoneNumber")
    }
    public class SourceFileResponseDto
    {
        // Existing properties
        public int Id { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = "";
        public int CountryId { get; set; }
        public string CountryName { get; set; } = "";
        public string CountryCode { get; set; } = "";
        public int LeadTypeId { get; set; }
        public string LeadTypeCode { get; set; } = "";
        public string LeadTypeName { get; set; } = "";
        public string Name { get; set; } = "";
        public string OriginalName { get; set; } = "";
        public string FileSizeLabel { get; set; } = "";
        public long FileSizeBytes { get; set; }
        public string Format { get; set; } = "";
        public string Statut { get; set; } = "";
        public bool IsActive { get; set; }
        public DateTime UploadedAt { get; set; }
        public int ListNumber { get; set; }
        public int ContactCount { get; set; }

        // ✅ ADD THESE MISSING PROPERTIES
        public int TotalLines { get; set; }      // Total lines in file (including header)
        public int EmptyRows { get; set; }       // Number of empty rows found
        public int InvalidPhones { get; set; }   // Number of invalid phone numbers
        public int Duplicates { get; set; }      // Number of duplicate entries
    }
    public class FileValidationReportDto
    {
        public int TotalLines { get; set; }
        public int ValidContacts { get; set; }
        public int EmptyRows { get; set; }
        public int InvalidPhones { get; set; }
        public int Duplicates { get; set; }
        public int InvalidContacts { get; set; }
        public List<InvalidRowDto> InvalidRows { get; set; } = new();
    }
    public class InvalidRowDto
    {
        public int RowNumber { get; set; }        // which line in the file
        public string? Phone { get; set; }        // the phone number that failed
        public string? Name { get; set; }         // contact name for context
        public string Reason { get; set; } = "";  // why it failed
    }
    public class FileValidationResult
    {
        public int TotalLines { get; set; }
        public int ValidContacts { get; set; }
        public int EmptyRows { get; set; }
        public int InvalidPhones { get; set; }
        public int Duplicates { get; set; }
        public int InvalidContacts { get; set; }
        public List<InvalidRowDto> InvalidRows { get; set; } = new();
    }
    public class UploadResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public SourceFileResponseDto? File { get; set; }
        public string? JobId { get; set; }
        public ImportJobResponseDto? Job { get; set; }
    }

    public class ImportJobResponseDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? SourceFileId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int ProcessedRows { get; set; }
        public DateTime? LastHeartbeatAt { get; set; }
        public string? WorkerId { get; set; }
        public int Attempts { get; set; }
        public int MaxAttempts { get; set; }
        public DateTime? RawFileDeletedAt { get; set; }
        public int ValidContacts { get; set; }
        public int EmptyRows { get; set; }
        public int InvalidPhones { get; set; }
        public int Duplicates { get; set; }
        public int InvalidContacts => EmptyRows + InvalidPhones + Duplicates;
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
    public class RenameFileDto
    {
        public string NewName { get; set; } = string.Empty;
    }
    public class DeleteResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int Id { get; set; }
        public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = true;
    }
    public class MappingPreviewDto
    {
        public int SourceFileId { get; set; }                    // If you already saved a temporary file

        public List<string> DetectedColumns { get; set; } = new();   // Columns found in the uploaded file

        public Dictionary<string, string> SuggestedMapping { get; set; } = new(); // Auto-suggested mapping

        public List<string> RequiredFields { get; set; } = new()     // Help frontend know what is mandatory
        {
            "phoneNumber"
        };

        public string Message { get; set; } = string.Empty;
    }
}
