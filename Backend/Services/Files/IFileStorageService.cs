namespace Backend.Services.Files
{
	public interface IFileStorageService
	{
        Task<string> SaveFileFromStreamAsync(Stream stream, string fileName, int supplierId);
       // Task<string> SaveFileAsync(IFormFile file, int supplierId);

        Task DeleteFileAsync(string path);
	}
}
