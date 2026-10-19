namespace Backend.DTOs.Client
{
    // Full DTO — returned to Admin only (contains real name and contact info)
    public class ClientResponseDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = "";
        public string Nom { get; set; } = "";
        public string? Email { get; set; }
        public string? Telephone { get; set; }
        public string? Adresse { get; set; }
        public bool IsActive { get; set; }
    }

    // Public DTO — returned to agents and other roles (label only, no real name)
    public class ClientPublicDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = "";  // "client1", "client2", "client3"
    }
}
