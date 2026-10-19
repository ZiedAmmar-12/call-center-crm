using Backend.DTOs;
using Backend.DTOs.Tree;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
namespace Backend.Services.SourceFiles
{
    public interface ISourceFileService
    {
        // Upload a file
        Task<SourceFileResponseDto> UploadFileAsync(SourceFileUploadDto uploadDto, int userId);
        Task<ImportJobResponseDto> QueueUploadAsync(SourceFileUploadDto uploadDto, int userId);
        Task<ImportJobResponseDto?> GetImportJobAsync(int jobId);
        Task<List<InvalidRowDto>> GetImportJobInvalidRowsAsync(int jobId);
        Task ProcessImportJobAsync(int jobId, CancellationToken cancellationToken = default);

        // Get all files for a supplier
        Task<List<SourceFileResponseDto>> GetFilesBySupplierAsync(int supplierId);

        //Get all files 
        Task<List<SourceFileResponseDto>> GetAllFilesAsync();

        Task<List<TreeCountryDto>> GetTreeAsync();
        // Get single file by ID
        Task<SourceFileResponseDto> GetFileByIdAsync(int Id);

        // Delete a file
        Task<bool> DeleteFileAsync(int id, int deletedByUserId);
        Task<ActionResult<List<FileSearchResponseDto>>> SearchFiles([FromQuery] string searchTerm);

        // Download file (returns byte array)
        //Task<byte[]> DownloadFileAsync(int Id);
        Task<FileValidationReportDto> ValidateFileAsync(SourceFileUploadDto uploadDto, int userId);

        //Rename file
        Task<SourceFileResponseDto> RenameFileAsync(int Id, string newName);
       // Task<IActionResult> Download(int id);

        //count contacts in file
        //Task<int> CountContactsInFileAsync(IFormFile file);
        Task<(byte[] FileContent, string FileName, string ContentType)> DownloadFileAsync(int fileId);
    }

}
