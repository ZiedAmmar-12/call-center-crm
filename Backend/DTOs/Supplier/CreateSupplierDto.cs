namespace Backend.DTOs.Supplier
{
    public class CreateSupplierDto
    {
        public string Name { get; set; } = string.Empty;
        public int CountryId { get; set; }
        public int LeadTypeId { get; set; }
        public int CreatedByUserId { get; set; }
    }
}