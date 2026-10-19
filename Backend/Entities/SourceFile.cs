using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Entities;

namespace Backend.Entities
{
    public enum SourceFileType
    {
        Original = 0,
        Processed = 1,
        Recycled = 2
    }

    [Table("source_files")]
    public class SourceFile
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("supplier_id")]
        public int SupplierId { get; set; }

        [ForeignKey("SupplierId")]
        public Supplier? Supplier { get; set; }

        [Column("name")]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("original_name")]
        [MaxLength(255)]
        public string OriginalName { get; set; } = string.Empty;

        [Column("file_size_label")]
        [MaxLength(50)]
        public string FileSizeLabel { get; set; } = string.Empty;

        [Column("file_size_bytes")]
        public long FileSizeBytes { get; set; }

        [Column("file_path")]
        public string FilePath { get; set; } = string.Empty;

        [Column("format")]
        [MaxLength(10)]
        public string Format { get; set; } = string.Empty;

        [Column("type")]
        public SourceFileType Type { get; set; } = SourceFileType.Original;

        [Column("statut")]
        [MaxLength(20)]
        public string Statut { get; set; } = "original";

        [Column("is_active")]
        public bool IsActive { get; set; } = false;

        [Column("total_lines")]
        public int TotalLines { get; set; }

        [Column("valid_contacts")]
        public int ValidContacts { get; set; }

        [Column("duplicates")]
        public int Duplicates { get; set; }

        [Column("empty_rows")]
        public int EmptyRows { get; set; }

        [Column("invalid_phones")]
        public int InvalidPhones { get; set; }

        [Column("contact_count")]
        public int ContactCount { get; set; }

        [Column("list_number")]
        public int ListNumber { get; set; }

        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; }
        [Column("file_hash")]
        [MaxLength(64)]
        public string? FileHash { get; set; }
        [Column("validated_at")]
        public DateTime? ValidatedAt { get; set; }

        [Column("parsed_at")]
        public DateTime? ParsedAt { get; set; }

        [Column("uploaded_by_user_id")]
        public int UploadedByUserId { get; set; }

        [ForeignKey("UploadedByUserId")]
        public User? UploadedByUser { get; set; }

        [Column("parent_source_file_id")]
        public int? ParentSourceFileId { get; set; }

        [ForeignKey("ParentSourceFileId")]
        public SourceFile? ParentSourceFile { get; set; }

        [Column("split_part_number")]
        public int? SplitPartNumber { get; set; }

        [Column("split_total_parts")]
        public int? SplitTotalParts { get; set; }

        [InverseProperty("ParentSourceFile")]
        public List<SourceFile>? ChildFiles { get; set; }
        [Column("recycled_from_campaign_list_id")]
        public int? RecycledFromCampaignListId { get; set; }
        [Column("is_split_parent")]
        public bool IsSplitParent { get; set; } = false;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by_user_id")]
        public int? DeletedByUserId { get; set; }

    }
}