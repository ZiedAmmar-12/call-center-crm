namespace Backend.DTOs.Supplier
{
    public class UpdateSupplierDto
    {
        public string? Name { get; set; }
        public int? CountryId { get; set; }
        public int? LeadTypeId { get; set; }
    }
}