namespace Backend.Config
{
    /// <summary>
    /// Configuration settings for file processing and auto-split functionality
    /// </summary>
    public static class FileProcessingConfig
    {
        /// <summary>
        /// Maximum number of contacts per file before auto-split is triggered
        /// When a file has more than this many valid contacts, it will be split into multiple batches
        /// </summary>
        public const int MAX_CONTACTS_PER_FILE = 80000;

        /// <summary>
        /// Size of each batch when splitting large files
        /// Each split file will contain this many contacts
        /// </summary>
        public const int BATCH_SIZE = 50000;

        /// <summary>
        /// Minimum number of contacts required to process a file
        /// Files with fewer contacts than this will be rejected
        /// </summary>
        public const int MIN_CONTACTS_FOR_PROCESSING = 100;

        /// <summary>
        /// Maximum allowed file size in bytes (100 MB)
        /// Files larger than this will be rejected before processing
        /// </summary>
        public const long MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
    
        /// <summary>
        /// Helper method to get max file size in MB (for display purposes)
        /// </summary>
        public static int MaxFileSizeMB => (int)(MAX_FILE_SIZE_BYTES / (1024 * 1024));

        /// <summary>
        /// Helper method to check if a file needs splitting
        /// </summary>
        public static bool NeedsSplit(int contactCount) => contactCount > MAX_CONTACTS_PER_FILE;

        /// <summary>
        /// Helper method to calculate number of batches needed
        /// </summary>
        public static int CalculateBatchCount(int totalContacts) =>
            (int)Math.Ceiling((double)totalContacts / BATCH_SIZE);

        public static readonly string[] ALLOWED_EXTENSIONS = new[] { ".csv", ".xlsx", ".xls" };
        public const int MAX_ROWS=100_000;

    }
}