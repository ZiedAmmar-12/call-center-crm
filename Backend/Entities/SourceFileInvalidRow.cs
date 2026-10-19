using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    [Table("source_file_invalid_rows")]
    public class SourceFileInvalidRow
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("import_job_id")]
        public int ImportJobId { get; set; }

        [ForeignKey("ImportJobId")]
        public ImportJob? ImportJob { get; set; }

        [Column("source_file_id")]
        public int? SourceFileId { get; set; }

        [ForeignKey("SourceFileId")]
        public SourceFile? SourceFile { get; set; }

        [Column("row_number")]
        public int RowNumber { get; set; }

        [Column("phone")]
        [MaxLength(100)]
        public string? Phone { get; set; }

        [Column("name")]
        [MaxLength(255)]
        public string? Name { get; set; }

        [Column("reason")]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
