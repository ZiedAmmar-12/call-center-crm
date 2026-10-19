using Backend.DTOs;
using Backend.Services.SourceFiles;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Constants;
using Backend.Attributes;
using System.Security.Claims;
using System; 

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/SourceFiles")]
    [Authorize]
    public class SourceFileController : ControllerBase
    {
        private readonly ISourceFileService _service;
        private readonly ILogger<SourceFileController> _logger;

        public SourceFileController(ISourceFileService service, ILogger<SourceFileController> logger)
        {
            _service = service;
            _logger = logger;
        }
        // POST: api/SourceFiles/upload
        [HttpPost("upload")]
        [RequirePermission(Permissions.Files.Upload)]
        public async Task<IActionResult> Upload([FromForm] SourceFileUploadDto uploadDto)
        {
            _logger.LogInformation("Upload request - SupplierId: {SupplierId}, Country: {CountryId}, FileName: {FileName}",
                uploadDto.SupplierId, uploadDto.CountryId, uploadDto.File?.FileName);

            try
            {
                //validate file exists
                if (uploadDto.File == null || uploadDto.File.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No file uploaded." });
                }

                //validate file type
                var safeFileName = Path.GetFileName(uploadDto.File.FileName);  // ← FIX: Added missing safeFileName variable
                var allowedExtensions = new[] { ".csv", ".xlsx", ".xls" };
                var extension = Path.GetExtension(safeFileName).ToLower();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { success = false, message = "Invalid file type. Only CSV and Excel files are allowed." });
                }

                //get current user id
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var job = await _service.QueueUploadAsync(uploadDto, userId);

                return AcceptedAtAction(
                    nameof(GetJobStatus),
                    new { jobId = job.Id },
                    new
                    {
                        success = true,
                        message = "File accepted for import.",
                        jobId = job.Id.ToString(),
                        job
                    });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Upload rejected: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error: {Message}", ex.Message);
                // TEMP (debug): surface the real exception while diagnosing the demo upload flow.
                // Revert to the generic "Internal server error" message before shipping.
                return StatusCode(500, new
                {
                    success = false,
                    message = $"{ex.GetType().Name}: {ex.Message}" + (ex.InnerException != null ? $" | Inner: {ex.InnerException.Message}" : "")
                });
            }
        }

        [HttpPost("Validate")]
        [RequirePermission(Permissions.Files.Upload)]
        public async Task<IActionResult> ValidateFile([FromForm] SourceFileUploadDto uploadDto)
        {
            try
            {
                if (uploadDto?.File == null || uploadDto.File.Length == 0)
                {
                    return BadRequest(new { success = false, message = "No file uploaded." });
                }
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }
                var report = await _service.ValidateFileAsync(uploadDto , userId);
                    return Ok(new { success = true, report = report});
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error: {Message}", ex.Message);
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error: {Message}", ex.Message);
                // TEMP (debug): surface the real exception while diagnosing the demo upload flow.
                // Revert to the generic "Internal server error" message before shipping.
                return StatusCode(500, new
                {
                    success = false,
                    message = $"{ex.GetType().Name}: {ex.Message}" + (ex.InnerException != null ? $" | Inner: {ex.InnerException.Message}" : "")
                });
            }
        }

        [HttpGet("job-status/{jobId:int}")]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetJobStatus(int jobId)
        {
            var job = await _service.GetImportJobAsync(jobId);

            if (job == null)
                return NotFound(new { success = false, state = "NotFound" });

            return Ok(new { success = true, state = job.Status, job });
        }

        [HttpGet("job-status/{jobId:int}/invalid-rows")]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetJobInvalidRows(int jobId)
        {
            var job = await _service.GetImportJobAsync(jobId);
            if (job == null)
                return NotFound(new { success = false, message = "Import job not found" });

            var rows = await _service.GetImportJobInvalidRowsAsync(jobId);
            return Ok(new { success = true, rows });
        }

        [HttpGet("search")]
        [RequirePermission(Permissions.Files.Search)]
        public async Task<ActionResult<List<FileSearchResponseDto>>> SearchFiles([FromQuery] string searchTerm)
        {
            try
            {
                // Add logging
                _logger.LogInformation("Searching files with term: {SearchTerm}", searchTerm);

                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return Ok(new List<FileSearchResponseDto>());
                }

                var files = await _service.SearchFiles(searchTerm);

                return Ok(new
                {
                    success = true,
                    files = files
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching files with term {SearchTerm}", searchTerm);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpGet]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetAllFiles()
        {
            try
            {
                var files = await _service.GetAllFilesAsync();
                return Ok(new
                {
                    success = true,
                    files = files
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting files");

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving the files.",
                    error = ex.Message
                });
            }
        }

        // GET: api/SourceFiles/supplier/5
        [HttpGet("supplier/{supplierId}")]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetSupplierFiles(int supplierId)
        {
            try
            {
                var files = await _service.GetFilesBySupplierAsync(supplierId);
                return Ok(new
                {
                    success = true,
                    files = files
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting file with id {SupplierId}", supplierId);

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving the files.",
                    error = ex.Message
                });
            }
        }

        //Get file by id
        [HttpGet("{id}")]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetFile(int id)
        {
            try
            {
                var file = await _service.GetFileByIdAsync(id);
                if (file == null)
                    return NotFound(new { success = false, message = "File not found" });
                return Ok(new
                {
                    success = true,
                    file = file
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting file with id {FileId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission(Permissions.Files.Delete)]
        public async Task<IActionResult> DeleteFile(int id)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var result = await _service.DeleteFileAsync(id, userId);
                if (!result)
                    return NotFound(new { success = false, message = "File not found." });

                return Ok(new { success = true, message = "File deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file with id {FileId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the file." });
            }
        }

        [HttpPut("{id}/rename")]
        [RequirePermission(Permissions.Files.Rename)]
        public async Task<IActionResult> Rename(int id, [FromBody] RenameFileDto renameDto)
        {
            try
            {
                var file = await _service.RenameFileAsync(id, renameDto.NewName);
                return Ok(new
                {
                    success = true,
                    message = "File renamed successfully.",
                    file = file
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error renaming file with id {FileId}", id);

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while renaming the file.",
                    error = ex.Message
                });
            }
        }

        [HttpGet("tree")]
        [RequirePermission(Permissions.Files.View)]
        public async Task<IActionResult> GetTree()
        {
            try
            {
                var tree = await _service.GetTreeAsync();
                return Ok(new
                {
                    success = true,
                    tree = tree
                });

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting file tree");

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving the file tree.",
                    error = ex.Message
                });
            }
        }

        [HttpGet("{fileId}/download")]
        [RequirePermission(Permissions.Files.Download)]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            try
            {
                var (fileContent, fileName, contentType) = await _service.DownloadFileAsync(fileId);
                return File(fileContent, contentType, fileName);
            }
            catch (FileNotFoundException)
            {
                return NotFound(new
                {
                    success = false,
                    message = "File not found."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading file {FileId}", fileId);  
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while downloading the file.",
                    error = ex.Message
                });
            }
        }
    }
}
