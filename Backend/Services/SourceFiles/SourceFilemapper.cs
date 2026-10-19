using Backend.DTOs;
using Backend.Entities;

namespace Backend.Services.SourceFiles
{

    public static class SourceFileMapper
    {
        public static SourceFileResponseDto ToDto(SourceFile file, Supplier supplier)
        {
            return new SourceFileResponseDto
            {
                Id = file.Id,
                SupplierId = file.SupplierId,
                SupplierName = supplier?.Name ?? "",
                CountryId = supplier?.CountryId ?? 0,
                CountryName = supplier?.Country?.Name ?? "",
                CountryCode = supplier?.Country?.Code ?? "",
                LeadTypeId = supplier?.LeadTypeId ?? 0,
                LeadTypeCode = supplier?.LeadType?.Code ?? "",
                LeadTypeName = supplier?.LeadType?.Name ?? "",
                Name = file.Name,
                OriginalName = file.OriginalName,
                FileSizeLabel = file.FileSizeLabel,
                FileSizeBytes = file.FileSizeBytes,
                Format = file.Format,
                Statut = file.Statut,
                IsActive = file.IsActive,
                UploadedAt = file.UploadedAt,
                ListNumber = file.ListNumber,
                ContactCount = file.ContactCount,
                TotalLines = file.TotalLines,
                EmptyRows = file.EmptyRows,
                InvalidPhones = file.InvalidPhones,
                Duplicates = file.Duplicates
            };
        }
    }
}