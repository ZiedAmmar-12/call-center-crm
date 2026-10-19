using Backend.DTOs;
using Backend.Services.Files;
namespace Backend.Services.Files
{
    public class FileStorageService : IFileStorageService
    {
        private readonly IWebHostEnvironment _env;
        public FileStorageService(IWebHostEnvironment env)
        {
            _env = env;
        }
        // In FileStorageService.cs
        public async Task<string> SaveFileFromStreamAsync(Stream stream, string fileName, int supplierId)
        {
            stream.Position = 0; // Ensure stream is at the beginning
            var folder = Path.Combine(_env.ContentRootPath ?? "private-uploads", $"supplier_{supplierId}");

            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }

            var uniqueFileName = $"{DateTime.Now:yyyyMMdd_HHmmss}_{fileName}";
            var filePath = Path.Combine(folder, uniqueFileName);

            // ✅ Reset stream position before saving
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await stream.CopyToAsync(fileStream);
            }

            return filePath;
        }
        public async Task DeleteFileAsync(string path)
        {
            if (File.Exists(path))
                File.Delete(path);
            await Task.CompletedTask;
        }

    }
}