using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
	[Table("Client")]
	public class Client
	{
		[Key]
		public int Id { get; set; }
		[Column("code")]
		public string Code { get; set; } = "";
		[Column("nom")]
		public string Nom { get; set; } = "";
		[Column("email")]
		public string? Email { get; set; } = "";
		[Column("telephone")]
		public string? Telephone { get; set; } = "";
		[Column("adresse")]
		public string? Adresse { get; set; } = "";
		[Column("is_active")]
		public bool IsActive { get; set; } = true;

	}
}
