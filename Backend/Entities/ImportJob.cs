using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities
{
    public enum ImportJobStatus
    {
        Queued = 0,
        Processing = 1,
        Completed = 2,
        Failed = 3
    }

    [Table("import_jobs")]
    public class ImportJob
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("status")]
        [MaxLength(20)]
        public ImportJobStatus Status { get; set; } = ImportJobStatus.Queued;

        [Column("source_file_id")]
        public int? SourceFileId { get; set; }

        [ForeignKey("SourceFileId")]
        public SourceFile? SourceFile { get; set; }

        [Column("supplier_id")]
        public int SupplierId { get; set; }

        [ForeignKey("SupplierId")]
        public Supplier? Supplier { get; set; }

        [Column("country_id")]
        public int CountryId { get; set; }

        [ForeignKey("CountryId")]
        public Country? Country { get; set; }

        [Column("lead_type_id")]
        public int LeadTypeId { get; set; }

        [ForeignKey("LeadTypeId")]
        public LeadType? LeadType { get; set; }

        [Column("uploaded_by_user_id")]
        public int UploadedByUserId { get; set; }

        [ForeignKey("UploadedByUserId")]
        public User? UploadedByUser { get; set; }

        [Column("original_file_name")]
        [MaxLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        [Column("display_name")]
        [MaxLength(255)]
        public string? DisplayName { get; set; }

        [Column("stored_file_path")]
        public string StoredFilePath { get; set; } = string.Empty;

        [Column("file_size_bytes")]
        public long FileSizeBytes { get; set; }

        [Column("file_hash")]
        [MaxLength(64)]
        public string FileHash { get; set; } = string.Empty;

        [Column("format")]
        [MaxLength(10)]
        public string Format { get; set; } = string.Empty;

        [Column("column_mapping_json")]
        public string? ColumnMappingJson { get; set; }

        [Column("total_rows")]
        public int TotalRows { get; set; }

        [Column("processed_rows")]
        public int ProcessedRows { get; set; }

        [Column("last_heartbeat_at")]
        public DateTime? LastHeartbeatAt { get; set; }

        [Column("worker_id")]
        [MaxLength(100)]
        public string? WorkerId { get; set; }

        [Column("attempts")]
        public int Attempts { get; set; }

        [Column("max_attempts")]
        public int MaxAttempts { get; set; } = 3;

        [Column("raw_file_deleted_at")]
        public DateTime? RawFileDeletedAt { get; set; }

        [Column("valid_contacts")]
        public int ValidContacts { get; set; }

        [Column("empty_rows")]
        public int EmptyRows { get; set; }

        [Column("invalid_phones")]
        public int InvalidPhones { get; set; }

        [Column("duplicates")]
        public int Duplicates { get; set; }

        [Column("error_message")]
        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("started_at")]
        public DateTime? StartedAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }
    }
}
