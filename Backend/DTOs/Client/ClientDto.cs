namespace Backend.DTOs.Client
{
    // What agents see
    public class PartenairePublicDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = ""; // "client1"
    }

    // What admin sees
    public class PartenaireAdminDto : PartenairePublicDto
    {
        public string Nom { get; set; } = "";
        public string? Email { get; set; }
        public string? Telephone { get; set; }
        public string? Adresse { get; set; }
    }
}