public class FileSearchResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string FileHash { get; set; }
    public string SupplierName { get; set; }
    public int SupplierId { get; set; }
    public DateTime UploadedAt { get; set; }
    public int TotalContacts { get; set; }
}