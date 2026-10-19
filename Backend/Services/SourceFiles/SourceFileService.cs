using Backend.DTOs;
using Backend.DTOs.Tree;
using Backend.Data;
using static Backend.Config.FileProcessingConfig;
using Backend.Services.Suppliers;
using Backend.Services.Files;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using Backend.Entities;
using Backend.Helpers;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;

//using ValidationResult = Backend.Helpers.FileValidationResult;
using Microsoft.AspNetCore.Identity;

namespace Backend.Services.SourceFiles
{
    public class SourceFileService : ISourceFileService
    {
        private const int CONTACT_INSERT_BATCH_SIZE = 2000;
        private const int INVALID_ROW_INSERT_BATCH_SIZE = 1000;

        private static readonly Regex CleanPhoneRegex = new(
            @"[\s\-\(\)\.]",
            RegexOptions.Compiled | RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1));

        private static readonly string[] PhoneHeaderKeywords =
        {
            "telephone", "tel", "portable", "gsm", "mobile", "numero",
            "phone", "phonenumber", "contact", "n"
        };

        private static readonly Dictionary<string, string[]> FieldSynonyms = new(StringComparer.OrdinalIgnoreCase)
        {
            ["lastname"] = new[] { "nom", "familyname", "surname", "lastname", "last" },
            ["firstname"] = new[] { "prenom", "firstname", "first", "givenname" },
            ["address"] = new[] { "adresse", "address", "rue", "street" },
            ["postalcode"] = new[] { "codepostal", "postalcode", "postcode", "zipcode", "zip", "cp" },
            ["city"] = new[] { "ville", "city", "commune", "town" },
            ["email"] = new[] { "email", "mail", "courriel" }
        };

        private readonly ILogger<SourceFileService> _logger;
        private readonly ApplicationDbContext _db;
        private readonly ISupplierService _supplierService;
        private readonly IFileStorageService _fileStorageService;
        private readonly FileValidationHelper _fileValidationHelper;

        public SourceFileService(ILogger<SourceFileService> logger, ApplicationDbContext db,
            ISupplierService supplierService,
            IFileStorageService fileStorageService,
            FileValidationHelper fileValidationHelper)
        {
            _logger = logger;  
            _db = db;
            _supplierService = supplierService;
            _fileStorageService = fileStorageService;
            _fileValidationHelper = fileValidationHelper;
        }

        public async Task<ImportJobResponseDto> QueueUploadAsync(SourceFileUploadDto uploadDto, int userId)
        {
            if (uploadDto.File == null || uploadDto.File.Length == 0)
                throw new ArgumentException("No file uploaded.");

            var safeFileName = Path.GetFileName(uploadDto.File.FileName);
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
            if (!ALLOWED_EXTENSIONS.Contains(extension))
                throw new ArgumentException("Invalid file type. Only CSV and Excel files are allowed.");

            if (uploadDto.File.Length > MAX_FILE_SIZE_BYTES)
            {
                throw new ArgumentException(
                    $"File too large. Maximum size is {MaxFileSizeMB} MB. " +
                    $"Your file: {(uploadDto.File.Length / (1024 * 1024)):F2} MB");
            }

            var supplier = await _supplierService.GetOrCreateSupplierAsync(uploadDto, userId);
            var country = await _db.Countries.FindAsync(uploadDto.CountryId);
            if (country == null)
                throw new ArgumentException($"Country with ID {uploadDto.CountryId} not found");

            // ImportJob.UploadedByUserId FKs to the separate "users" table (see UserBridgeHelper).
            var bridgedUserId = await Helpers.UserBridgeHelper.EnsureValidUserIdAsync(_db, userId);

            string? storedFilePath = null;
            try
            {
                await using (var uploadStream = uploadDto.File.OpenReadStream())
                {
                    storedFilePath = await _fileStorageService.SaveFileFromStreamAsync(
                        uploadStream,
                        safeFileName,
                        supplier.Id);
                }

                var fileHash = await CalculateHashFromFileAsync(storedFilePath);
                var existingFile = await _db.SourceFiles
                    .Include(f => f.Supplier)
                    .FirstOrDefaultAsync(f => f.FileHash == fileHash);

                if (existingFile != null)
                {
                    await _fileStorageService.DeleteFileAsync(storedFilePath);
                    throw new ArgumentException(
                        $"Ce fichier a deja ete telecharge. " +
                        $"Fichier existant: '{existingFile.Name}' (ID: {existingFile.Id}) " +
                        $"pour le fournisseur: {existingFile.SupplierId}");
                }

                var job = new ImportJob
                {
                    Status = ImportJobStatus.Queued,
                    SupplierId = supplier.Id,
                    CountryId = uploadDto.CountryId,
                    LeadTypeId = uploadDto.LeadTypeId,
                    UploadedByUserId = bridgedUserId,
                    OriginalFileName = safeFileName,
                    DisplayName = uploadDto.Name,
                    StoredFilePath = storedFilePath,
                    FileSizeBytes = uploadDto.File.Length,
                    FileHash = fileHash,
                    Format = extension.TrimStart('.'),
                    ColumnMappingJson = uploadDto.ColumnMapping?.Any() == true
                        ? JsonSerializer.Serialize(uploadDto.ColumnMapping)
                        : null,
                    MaxAttempts = 3,
                    CreatedAt = DateTime.UtcNow
                };

                _db.ImportJobs.Add(job);
                await _db.SaveChangesAsync();

                _logger.LogInformation(
                    "Import job {JobId} queued for {FileName}. File was stored at {FilePath}.",
                    job.Id,
                    safeFileName,
                    storedFilePath);

                return ToImportJobDto(job);
            }
            catch
            {
                if (!string.IsNullOrWhiteSpace(storedFilePath) && File.Exists(storedFilePath))
                    await _fileStorageService.DeleteFileAsync(storedFilePath);

                throw;
            }
        }

        public async Task<ImportJobResponseDto?> GetImportJobAsync(int jobId)
        {
            var job = await _db.ImportJobs
                .AsNoTracking()
                .FirstOrDefaultAsync(j => j.Id == jobId);

            return job == null ? null : ToImportJobDto(job);
        }

        public async Task<List<InvalidRowDto>> GetImportJobInvalidRowsAsync(int jobId)
        {
            return await _db.SourceFileInvalidRows
                .AsNoTracking()
                .Where(r => r.ImportJobId == jobId)
                .OrderBy(r => r.RowNumber)
                .Select(r => new InvalidRowDto
                {
                    RowNumber = r.RowNumber,
                    Phone = r.Phone,
                    Name = r.Name,
                    Reason = r.Reason
                })
                .ToListAsync();
        }

        public async Task ProcessImportJobAsync(int jobId, CancellationToken cancellationToken = default)
        {
            var job = await _db.ImportJobs.FirstAsync(j => j.Id == jobId, cancellationToken);
            if (job.Status != ImportJobStatus.Processing)
                return;

            try
            {
                if (!File.Exists(job.StoredFilePath))
                    throw new FileNotFoundException("Queued import file is missing from disk.", job.StoredFilePath);

                await ResetPartialImportStateAsync(job, cancellationToken);

                var supplier = await _db.Suppliers
                    .Include(s => s.Country)
                    .Include(s => s.LeadType)
                    .FirstOrDefaultAsync(s => s.Id == job.SupplierId, cancellationToken);
                if (supplier == null)
                    throw new InvalidOperationException($"Supplier {job.SupplierId} not found.");

                var country = await _db.Countries.FindAsync(new object[] { job.CountryId }, cancellationToken);
                if (country == null)
                    throw new InvalidOperationException($"Country {job.CountryId} not found.");

                var sourceFile = await CreateProcessingSourceFileAsync(job, supplier, cancellationToken);
                job.SourceFileId = sourceFile.Id;
                await _db.SaveChangesAsync(cancellationToken);

                var columnMapping = DeserializeColumnMapping(job.ColumnMappingJson);
                var counters = await ProcessStoredFileInBatchesAsync(
                    job,
                    sourceFile,
                    country.Code,
                    columnMapping,
                    cancellationToken);

                sourceFile.TotalLines = counters.TotalRows;
                sourceFile.ValidContacts = counters.ValidContacts;
                sourceFile.ContactCount = counters.ValidContacts;
                sourceFile.EmptyRows = counters.EmptyRows;
                sourceFile.InvalidPhones = counters.InvalidPhones;
                sourceFile.Duplicates = counters.Duplicates;
                sourceFile.ParsedAt = DateTime.UtcNow;
                sourceFile.ValidatedAt = DateTime.UtcNow;

                job.TotalRows = counters.TotalRows;
                job.ProcessedRows = counters.TotalRows;
                job.ValidContacts = counters.ValidContacts;
                job.EmptyRows = counters.EmptyRows;
                job.InvalidPhones = counters.InvalidPhones;
                job.Duplicates = counters.Duplicates;
                job.CompletedAt = DateTime.UtcNow;
                job.LastHeartbeatAt = DateTime.UtcNow;

                if (counters.ValidContacts < MIN_CONTACTS_FOR_PROCESSING)
                {
                    sourceFile.Statut = "failed";
                    sourceFile.IsActive = false;
                    job.Status = ImportJobStatus.Failed;
                    job.ErrorMessage =
                        $"File has only {counters.ValidContacts} valid contacts. " +
                        $"Minimum required is {MIN_CONTACTS_FOR_PROCESSING} contacts.";
                }
                else
                {
                    sourceFile.Statut = "original";
                    sourceFile.IsActive = false;
                    job.Status = ImportJobStatus.Completed;
                    job.ErrorMessage = null;
                }

                await _db.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Import job {JobId} finished with status {Status}. Valid={Valid}, InvalidPhones={InvalidPhones}, Empty={Empty}, Duplicates={Duplicates}.",
                    job.Id,
                    job.Status,
                    job.ValidContacts,
                    job.InvalidPhones,
                    job.EmptyRows,
                    job.Duplicates);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Import job {JobId} failed.", jobId);
                await MarkImportJobFailedAsync(jobId, ex.Message, CancellationToken.None);
            }
        }

        private sealed class ImportCounters
        {
            public int TotalRows { get; set; }
            public int ValidContacts { get; set; }
            public int EmptyRows { get; set; }
            public int InvalidPhones { get; set; }
            public int Duplicates { get; set; }
        }

        private static ImportJobResponseDto ToImportJobDto(ImportJob job)
        {
            return new ImportJobResponseDto
            {
                Id = job.Id,
                Status = job.Status.ToString(),
                SourceFileId = job.SourceFileId,
                FileName = job.OriginalFileName,
                TotalRows = job.TotalRows,
                ProcessedRows = job.ProcessedRows,
                LastHeartbeatAt = job.LastHeartbeatAt,
                WorkerId = job.WorkerId,
                Attempts = job.Attempts,
                MaxAttempts = job.MaxAttempts,
                RawFileDeletedAt = job.RawFileDeletedAt,
                ValidContacts = job.ValidContacts,
                EmptyRows = job.EmptyRows,
                InvalidPhones = job.InvalidPhones,
                Duplicates = job.Duplicates,
                ErrorMessage = job.ErrorMessage,
                CreatedAt = job.CreatedAt,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt
            };
        }

        private static async Task<string> CalculateHashFromFileAsync(string filePath)
        {
            await using var stream = new FileStream(
                filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 1024 * 128,
                useAsync: true);
            using var sha256 = SHA256.Create();
            var hashBytes = await sha256.ComputeHashAsync(stream);
            return Convert.ToHexString(hashBytes);
        }

        private static Dictionary<string, string>? DeserializeColumnMapping(string? json)
        {
            return string.IsNullOrWhiteSpace(json)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, string>>(json);
        }

        private async Task<SourceFile> CreateProcessingSourceFileAsync(
            ImportJob job,
            Supplier supplier,
            CancellationToken cancellationToken)
        {
            var nextListNumber = await GetNextListNumberAsync(supplier.Id);
            var displayName = string.IsNullOrWhiteSpace(job.DisplayName)
                ? SourceFileHelpers.GenerateDisplayName(supplier.Name, nextListNumber)
                : job.DisplayName.Trim();

            var sourceFile = new SourceFile
            {
                SupplierId = supplier.Id,
                Name = displayName,
                OriginalName = job.OriginalFileName,
                FilePath = job.StoredFilePath,
                FileSizeBytes = job.FileSizeBytes,
                FileSizeLabel = SourceFileHelpers.FormatFileSize(job.FileSizeBytes),
                Format = job.Format,
                Statut = "processing",
                Type = SourceFileType.Original,
                ListNumber = nextListNumber,
                UploadedAt = DateTime.UtcNow,
                UploadedByUserId = job.UploadedByUserId,
                IsActive = false,
                FileHash = job.FileHash
            };

            _db.SourceFiles.Add(sourceFile);
            await _db.SaveChangesAsync(cancellationToken);
            return sourceFile;
        }

        private async Task ResetPartialImportStateAsync(ImportJob job, CancellationToken cancellationToken)
        {
            var partialSourceFileId = job.SourceFileId;

            job.SourceFileId = null;
            job.TotalRows = 0;
            job.ProcessedRows = 0;
            job.ValidContacts = 0;
            job.EmptyRows = 0;
            job.InvalidPhones = 0;
            job.Duplicates = 0;
            job.ErrorMessage = null;
            job.CompletedAt = null;
            job.LastHeartbeatAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            await _db.SourceFileInvalidRows
                .Where(r => r.ImportJobId == job.Id)
                .ExecuteDeleteAsync(cancellationToken);

            if (!partialSourceFileId.HasValue)
                return;

            await _db.SourceFileContacts
                .Where(c => c.SourceFileId == partialSourceFileId.Value)
                .ExecuteDeleteAsync(cancellationToken);

            await _db.SourceFiles
                .Where(f => f.Id == partialSourceFileId.Value)
                .ExecuteDeleteAsync(cancellationToken);
        }

        private async Task MarkImportJobFailedAsync(
            int jobId,
            string errorMessage,
            CancellationToken cancellationToken)
        {
            var job = await _db.ImportJobs.FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);
            if (job == null)
                return;

            job.Status = ImportJobStatus.Failed;
            job.ErrorMessage = errorMessage;
            job.CompletedAt = DateTime.UtcNow;
            job.LastHeartbeatAt = DateTime.UtcNow;

            if (job.SourceFileId.HasValue)
            {
                var sourceFile = await _db.SourceFiles
                    .FirstOrDefaultAsync(f => f.Id == job.SourceFileId.Value, cancellationToken);
                if (sourceFile != null)
                {
                    sourceFile.Statut = "failed";
                    sourceFile.IsActive = false;
                    sourceFile.ParsedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync(cancellationToken);
        }

        private async Task<ImportCounters> ProcessStoredFileInBatchesAsync(
            ImportJob job,
            SourceFile sourceFile,
            string countryCode,
            Dictionary<string, string>? columnMapping,
            CancellationToken cancellationToken)
        {
            var extension = Path.GetExtension(job.OriginalFileName).ToLowerInvariant();
            return extension switch
            {
                ".csv" => await ProcessCsvFileInBatchesAsync(job, sourceFile, countryCode, columnMapping, cancellationToken),
                ".xlsx" or ".xls" => await ProcessExcelFileInBatchesAsync(job, sourceFile, countryCode, columnMapping, cancellationToken),
                _ => throw new ArgumentException($"Unsupported file extension '{extension}'.")
            };
        }

        private async Task<ImportCounters> ProcessCsvFileInBatchesAsync(
            ImportJob job,
            SourceFile sourceFile,
            string countryCode,
            Dictionary<string, string>? columnMapping,
            CancellationToken cancellationToken)
        {
            var counters = new ImportCounters();
            var uniqueContacts = new HashSet<string>(StringComparer.Ordinal);
            var contacts = new List<SourceFileContact>(CONTACT_INSERT_BATCH_SIZE);
            var invalidRows = new List<SourceFileInvalidRow>(INVALID_ROW_INSERT_BATCH_SIZE);

            var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                MissingFieldFound = null,
                BadDataFound = args => _logger.LogDebug(
                    "Bad CSV data in import job {JobId} at row {Row}: {Field}",
                    job.Id,
                    args.Context.Parser.Row,
                    args.Field),
                TrimOptions = TrimOptions.Trim
            };

            using var reader = new StreamReader(job.StoredFilePath);
            using var csv = new CsvReader(reader, csvConfig);

            if (!await csv.ReadAsync())
                throw new ArgumentException("CSV file is empty.");

            csv.ReadHeader();
            var headers = csv.HeaderRecord ?? Array.Empty<string>();
            var phoneIndex = FindPhoneColumnIndex(headers, columnMapping);
            if (phoneIndex < 0)
                throw new ArgumentException("No phone column found. Map a column to phoneNumber or use a phone/tel/mobile header.");

            var headerMap = BuildHeaderMap(headers, columnMapping);

            while (await csv.ReadAsync())
            {
                cancellationToken.ThrowIfCancellationRequested();
                ThrowIfRowLimitExceeded(counters.TotalRows);

                var rowNumber = csv.Context.Parser.Row;
                var record = csv.Context.Parser.Record ?? Array.Empty<string>();
                counters.TotalRows++;

                if (record.All(string.IsNullOrWhiteSpace))
                {
                    counters.EmptyRows++;
                    invalidRows.Add(CreateInvalidRow(job, sourceFile, rowNumber, null, null, "Ligne vide"));
                    await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
                    continue;
                }

                string GetField(string fieldName) =>
                    headerMap.TryGetValue(fieldName, out var index)
                        ? (csv.GetField(index) ?? string.Empty)
                        : string.Empty;

                await AddParsedContactOrInvalidRowAsync(
                    job,
                    sourceFile,
                    counters,
                    contacts,
                    invalidRows,
                    uniqueContacts,
                    rowNumber,
                    csv.GetField(phoneIndex)?.Trim() ?? string.Empty,
                    GetField,
                    countryCode,
                    cancellationToken);
            }

            await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, true, cancellationToken);
            return counters;
        }

        private async Task<ImportCounters> ProcessExcelFileInBatchesAsync(
            ImportJob job,
            SourceFile sourceFile,
            string countryCode,
            Dictionary<string, string>? columnMapping,
            CancellationToken cancellationToken)
        {
            var counters = new ImportCounters();
            var uniqueContacts = new HashSet<string>(StringComparer.Ordinal);
            var contacts = new List<SourceFileContact>(CONTACT_INSERT_BATCH_SIZE);
            var invalidRows = new List<SourceFileInvalidRow>(INVALID_ROW_INSERT_BATCH_SIZE);

            ExcelPackage.License.SetNonCommercialPersonal("EBI");
            using var package = new ExcelPackage(new FileInfo(job.StoredFilePath));
            var worksheet = package.Workbook.Worksheets.FirstOrDefault()
                ?? throw new ArgumentException("Excel file has no worksheet.");

            var dimension = worksheet.Dimension;
            if (dimension == null)
                throw new ArgumentException("Excel file is empty.");

            var headers = new string[dimension.Columns];
            for (var col = 1; col <= dimension.Columns; col++)
                headers[col - 1] = worksheet.Cells[1, col]?.Text?.Trim() ?? string.Empty;

            var phoneIndex = FindPhoneColumnIndex(headers, columnMapping);
            if (phoneIndex < 0)
                throw new ArgumentException("No phone column found in the Excel sheet.");

            var phoneColumn = phoneIndex + 1;
            var headerMap = BuildHeaderMap(headers, columnMapping);

            for (var row = 2; row <= dimension.Rows; row++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                ThrowIfRowLimitExceeded(counters.TotalRows);
                counters.TotalRows++;

                var isEmptyRow = true;
                for (var col = 1; col <= dimension.Columns; col++)
                {
                    if (!string.IsNullOrWhiteSpace(worksheet.Cells[row, col]?.Text))
                    {
                        isEmptyRow = false;
                        break;
                    }
                }

                if (isEmptyRow)
                {
                    counters.EmptyRows++;
                    invalidRows.Add(CreateInvalidRow(job, sourceFile, row, null, null, "Ligne vide"));
                    await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
                    continue;
                }

                string GetField(string fieldName) =>
                    headerMap.TryGetValue(fieldName, out var zeroBasedIndex)
                        ? (worksheet.Cells[row, zeroBasedIndex + 1]?.Text?.Trim() ?? string.Empty)
                        : string.Empty;

                await AddParsedContactOrInvalidRowAsync(
                    job,
                    sourceFile,
                    counters,
                    contacts,
                    invalidRows,
                    uniqueContacts,
                    row,
                    GetPhoneNumberFromCell(worksheet.Cells[row, phoneColumn]),
                    GetField,
                    countryCode,
                    cancellationToken);
            }

            await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, true, cancellationToken);
            return counters;
        }

        private async Task AddParsedContactOrInvalidRowAsync(
            ImportJob job,
            SourceFile sourceFile,
            ImportCounters counters,
            List<SourceFileContact> contacts,
            List<SourceFileInvalidRow> invalidRows,
            HashSet<string> uniqueContacts,
            int rowNumber,
            string rawPhone,
            Func<string, string> getField,
            string countryCode,
            CancellationToken cancellationToken)
        {
            var name = BuildContactName(getField);
            if (string.IsNullOrWhiteSpace(rawPhone))
            {
                counters.InvalidPhones++;
                invalidRows.Add(CreateInvalidRow(job, sourceFile, rowNumber, rawPhone, name, "Numero manquant"));
                await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
                return;
            }

            var normalized = PhoneValidationHelper.NormalizePhoneNumber(rawPhone, countryCode);
            var validation = PhoneValidationHelper.ValidatePhone(normalized, countryCode);
            if (!validation.IsValid)
            {
                counters.InvalidPhones++;
                invalidRows.Add(CreateInvalidRow(job, sourceFile, rowNumber, rawPhone, name, "Numero invalide"));
                await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
                return;
            }

            var cleaned = CleanPhoneRegex.Replace(normalized, string.Empty);
            if (!uniqueContacts.Add(cleaned))
            {
                counters.Duplicates++;
                invalidRows.Add(CreateInvalidRow(job, sourceFile, rowNumber, rawPhone, name, "Numero en double"));
                await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
                return;
            }

            contacts.Add(new SourceFileContact
            {
                SourceFileId = sourceFile.Id,
                LastName = Truncate(getField("lastname"), 100),
                FirstName = Truncate(getField("firstname"), 100),
                Address = Truncate(getField("address"), 255),
                PostalCode = Truncate(getField("postalcode"), 20),
                City = Truncate(getField("city"), 100),
                Email = string.IsNullOrWhiteSpace(getField("email")) ? null : Truncate(getField("email"), 150),
                PhoneNumber = cleaned,
                OriginalPhoneNumber = Truncate(rawPhone, 100),
                RowNumber = rowNumber,
                IsValid = true,
                CreatedAt = DateTime.UtcNow
            });
            counters.ValidContacts++;

            await FlushImportBatchesIfNeededAsync(job, sourceFile, counters, contacts, invalidRows, false, cancellationToken);
        }

        private async Task FlushImportBatchesIfNeededAsync(
            ImportJob job,
            SourceFile sourceFile,
            ImportCounters counters,
            List<SourceFileContact> contacts,
            List<SourceFileInvalidRow> invalidRows,
            bool force,
            CancellationToken cancellationToken)
        {
            if (!force &&
                contacts.Count < CONTACT_INSERT_BATCH_SIZE &&
                invalidRows.Count < INVALID_ROW_INSERT_BATCH_SIZE)
            {
                return;
            }

            if (contacts.Count > 0)
                await MoveDatabaseDuplicatesToInvalidRowsAsync(job, sourceFile, counters, contacts, invalidRows, cancellationToken);

            if (contacts.Count > 0)
                _db.SourceFileContacts.AddRange(contacts);

            if (invalidRows.Count > 0)
                _db.SourceFileInvalidRows.AddRange(invalidRows);

            job.TotalRows = counters.TotalRows;
            job.ProcessedRows = counters.TotalRows;
            job.ValidContacts = counters.ValidContacts;
            job.EmptyRows = counters.EmptyRows;
            job.InvalidPhones = counters.InvalidPhones;
            job.Duplicates = counters.Duplicates;
            job.LastHeartbeatAt = DateTime.UtcNow;

            sourceFile.TotalLines = counters.TotalRows;
            sourceFile.ValidContacts = counters.ValidContacts;
            sourceFile.ContactCount = counters.ValidContacts;
            sourceFile.EmptyRows = counters.EmptyRows;
            sourceFile.InvalidPhones = counters.InvalidPhones;
            sourceFile.Duplicates = counters.Duplicates;

            await _db.SaveChangesAsync(cancellationToken);

            foreach (var entry in _db.ChangeTracker.Entries<SourceFileContact>().ToList())
                entry.State = EntityState.Detached;
            foreach (var entry in _db.ChangeTracker.Entries<SourceFileInvalidRow>().ToList())
                entry.State = EntityState.Detached;

            contacts.Clear();
            invalidRows.Clear();
        }

        private async Task MoveDatabaseDuplicatesToInvalidRowsAsync(
            ImportJob job,
            SourceFile sourceFile,
            ImportCounters counters,
            List<SourceFileContact> contacts,
            List<SourceFileInvalidRow> invalidRows,
            CancellationToken cancellationToken)
        {
            var phones = contacts.Select(c => c.PhoneNumber).Distinct().ToList();
            var existingPhones = await _db.SourceFileContacts
                .AsNoTracking()
                .Where(c => c.SourceFileId != sourceFile.Id && phones.Contains(c.PhoneNumber))
                .Select(c => c.PhoneNumber)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (existingPhones.Count == 0)
                return;

            var existingPhoneSet = existingPhones.ToHashSet(StringComparer.Ordinal);
            for (var i = contacts.Count - 1; i >= 0; i--)
            {
                var contact = contacts[i];
                if (!existingPhoneSet.Contains(contact.PhoneNumber))
                    continue;

                counters.ValidContacts--;
                counters.Duplicates++;
                invalidRows.Add(CreateInvalidRow(
                    job,
                    sourceFile,
                    contact.RowNumber,
                    contact.OriginalPhoneNumber,
                    BuildContactName(contact.LastName, contact.FirstName),
                    "Doublon base"));
                contacts.RemoveAt(i);
            }
        }

        private static SourceFileInvalidRow CreateInvalidRow(
            ImportJob job,
            SourceFile sourceFile,
            int rowNumber,
            string? phone,
            string? name,
            string reason)
        {
            return new SourceFileInvalidRow
            {
                ImportJobId = job.Id,
                SourceFileId = sourceFile.Id,
                RowNumber = rowNumber,
                Phone = Truncate(phone, 100),
                Name = Truncate(name, 255),
                Reason = Truncate(reason, 500),
                CreatedAt = DateTime.UtcNow
            };
        }

        private static void ThrowIfRowLimitExceeded(int alreadyProcessedRows)
        {
            if (alreadyProcessedRows >= MAX_ROWS)
                throw new InvalidOperationException($"File exceeds the configured row limit of {MAX_ROWS} rows.");
        }

        private static int FindPhoneColumnIndex(
            IReadOnlyList<string> headers,
            Dictionary<string, string>? columnMapping)
        {
            var mappedColumns = BuildColumnMapFromMapping(headers, columnMapping);
            if (mappedColumns.TryGetValue("phonenumber", out var mappedIndex))
                return mappedIndex;

            for (var i = 0; i < headers.Count; i++)
            {
                var normalized = NormalizeColumnName(headers[i]);
                if (HeaderMatchesAny(normalized, PhoneHeaderKeywords.Select(NormalizeColumnName), allowContains: true))
                    return i;
            }

            return -1;
        }

        private static Dictionary<string, int> BuildHeaderMap(
            IReadOnlyList<string> headers,
            Dictionary<string, string>? columnMapping)
        {
            var map = BuildColumnMapFromMapping(headers, columnMapping);

            for (var i = 0; i < headers.Count; i++)
            {
                var normalized = NormalizeColumnName(headers[i]);
                foreach (var (canonical, synonyms) in FieldSynonyms)
                {
                    if (!map.ContainsKey(canonical) &&
                        HeaderMatchesAny(normalized, synonyms.Select(NormalizeColumnName), allowContains: false))
                    {
                        map[canonical] = i;
                        break;
                    }
                }
            }

            return map;
        }

        private static Dictionary<string, int> BuildColumnMapFromMapping(
            IReadOnlyList<string> headers,
            Dictionary<string, string>? columnMapping)
        {
            var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            if (columnMapping == null || columnMapping.Count == 0)
                return map;

            var headerIndexes = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Count; i++)
            {
                var normalizedHeader = NormalizeColumnName(headers[i]);
                if (!string.IsNullOrWhiteSpace(normalizedHeader) && !headerIndexes.ContainsKey(normalizedHeader))
                    headerIndexes[normalizedHeader] = i;
            }

            foreach (var (sourceColumn, targetField) in columnMapping)
            {
                var canonicalField = NormalizeTargetField(targetField);
                if (canonicalField == null || map.ContainsKey(canonicalField))
                    continue;

                var normalizedSourceColumn = NormalizeColumnName(sourceColumn);
                if (headerIndexes.TryGetValue(normalizedSourceColumn, out var index))
                    map[canonicalField] = index;
            }

            return map;
        }

        private static bool HeaderMatchesAny(
            string normalizedHeader,
            IEnumerable<string> normalizedKeywords,
            bool allowContains)
        {
            if (string.IsNullOrWhiteSpace(normalizedHeader))
                return false;

            return normalizedKeywords.Any(keyword =>
                normalizedHeader == keyword ||
                normalizedHeader.StartsWith(keyword) ||
                (allowContains && normalizedHeader.Contains(keyword)));
        }

        private static string? NormalizeTargetField(string? targetField)
        {
            return NormalizeColumnName(targetField) switch
            {
                "phonenumber" or "phone" or "telephone" or "tel" or "mobile" or "gsm" or "numero" => "phonenumber",
                "lastname" or "last" or "surname" or "familyname" or "nom" => "lastname",
                "firstname" or "first" or "givenname" or "prenom" => "firstname",
                "address" or "adresse" => "address",
                "postalcode" or "postcode" or "zipcode" or "zip" or "cp" => "postalcode",
                "city" or "ville" or "commune" => "city",
                "email" or "mail" or "courriel" => "email",
                _ => null
            };
        }

        private static string NormalizeColumnName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                    continue;

                if (char.IsLetterOrDigit(c) || c == '+')
                    builder.Append(c);
            }

            return builder.ToString();
        }

        private static string GetPhoneNumberFromCell(ExcelRange cell)
        {
            if (cell?.Value == null)
                return string.Empty;

            return cell.Value switch
            {
                string value => value.Trim(),
                double value => value.ToString("F0", CultureInfo.InvariantCulture),
                decimal value => value.ToString("F0", CultureInfo.InvariantCulture),
                int value => value.ToString(CultureInfo.InvariantCulture),
                long value => value.ToString(CultureInfo.InvariantCulture),
                _ => cell.Text?.Trim() ?? string.Empty
            };
        }

        private static string BuildContactName(Func<string, string> getField)
        {
            return BuildContactName(getField("lastname"), getField("firstname"));
        }

        private static string BuildContactName(string? lastName, string? firstName)
        {
            return string.Join(" ", new[] { lastName, firstName }
                    .Where(value => !string.IsNullOrWhiteSpace(value)))
                .Trim();
        }

        private static string Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var trimmed = value.Trim();
            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }

        // ============================================================
        // UPLOAD FILE - Main method for processing uploaded files
        // ============================================================
        public Task<SourceFileResponseDto> UploadFileAsync(SourceFileUploadDto uploadDto, int userId)
        {
            throw new NotSupportedException(
                "Synchronous file import has been removed. Use QueueUploadAsync and poll GetImportJobAsync.");
        }
        private async Task<SourceFileResponseDto> ProcessSmallFileAsync(
            MemoryStream memoryStream,
            SourceFileUploadDto uploadDto,
            string safeFileName,
            Supplier supplier,
            Backend.Entities.Country country,
            int userId,
            string fileHash)
        {
            // ── validate contacts — invalid phones are skipped, not blocked ───
            var (validationResult, cleanedContacts) = await ValidateContactsFromStreamAsync(
                memoryStream, safeFileName, country.Code, uploadDto.ColumnMapping);

            if (validationResult.ValidContacts == 0)
                throw new ArgumentException("No valid contacts found in file.");

            if (validationResult.InvalidPhones > 0)
                _logger.LogWarning(
                    "{Count} invalid phone(s) skipped in '{FileName}'",
                    validationResult.InvalidPhones, safeFileName);

            var nextListNumber = await GetNextListNumberAsync(supplier.Id);
            var displayName = SourceFileHelpers.GenerateDisplayName(supplier.Name, nextListNumber);

            // ── wrap both disk write and DB write in one transaction ──────────
            // if DB fails → catch block deletes the file from disk
            // ensures disk and DB are always in sync
            using var transaction = await _db.Database.BeginTransactionAsync();
            string? filePath = null;

            try
            {
                // save file to disk inside the try so catch can clean it up
                filePath = await _fileStorageService.SaveFileFromStreamAsync(
                    memoryStream, safeFileName, supplier.Id);

                var sourceFile = new SourceFile
                {
                    SupplierId = supplier.Id,
                    Name = displayName,
                    OriginalName = safeFileName,
                    FilePath = filePath,
                    FileSizeBytes = uploadDto.File.Length,
                    FileSizeLabel = SourceFileHelpers.FormatFileSize(uploadDto.File.Length),
                    Format = Path.GetExtension(safeFileName).TrimStart('.'),
                    Statut = "original",
                    ListNumber = nextListNumber,
                    UploadedAt = DateTime.UtcNow,
                    UploadedByUserId = userId,
                    IsActive = false,
                    TotalLines = validationResult.TotalLines,
                    ContactCount = validationResult.ValidContacts,
                    EmptyRows = validationResult.EmptyRows,
                    InvalidPhones = validationResult.InvalidPhones,
                    Duplicates = validationResult.Duplicates,
                    FileHash = fileHash
                };

                _db.SourceFiles.Add(sourceFile);
                await _db.SaveChangesAsync();

                // set SourceFileId on contacts now that we have the DB-generated ID
                if (cleanedContacts.Any())
                {
                    cleanedContacts.ForEach(c => c.SourceFileId = sourceFile.Id);
                    _db.SourceFileContacts.AddRange(cleanedContacts);
                    await _db.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                

                return SourceFileMapper.ToDto(sourceFile, supplier);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                // clean up file on disk — DB was rolled back so they stay in sync
                if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
                {
                    File.Delete(filePath);
                    _logger.LogWarning("Orphaned file deleted after rollback: {FilePath}", filePath);
                }

                _logger.LogError(ex, "Small file upload failed — transaction rolled back");
                throw;
            }
        }
        // ============================================================
        // QUICK COUNT CONTACTS - Added this missing method
        // ============================================================
        private async Task<int> QuickCountContactsFromStreamAsync(MemoryStream stream, string fileName)
        {
            stream.Position = 0;
            var tempFilePath = Path.GetTempFileName();

            try
            {
                using (var fileStream = new FileStream(tempFilePath, FileMode.Create))
                {
                    await stream.CopyToAsync(fileStream);
                }

                stream.Position = 0;
                var extension = Path.GetExtension(fileName).ToLower();

                if (extension == ".csv")
                {
                    return await CountCsvRowsAsync(tempFilePath);
                }
                else if (extension == ".xlsx" || extension == ".xls")
                {
                    return await CountExcelRowsAsync(tempFilePath);
                }

                return 0;
            }
            finally
            {
                if (File.Exists(tempFilePath))
                    File.Delete(tempFilePath);
            }
        }

        // ============================================================
        // Process large file with split
        // ============================================================
        private async Task<SourceFileResponseDto> ProcessLargeFileWithSplitAsync(
    MemoryStream stream,
    SourceFileUploadDto uploadDto,
    string safeFileName,        // sanitized filename passed from UploadFileAsync
    Supplier supplier,
    Backend.Entities.Country country,
    int userId,
    string fileHash,
    int batchSize)
        {
            var logPrefix = $"[AutoSplit] [{DateTime.Now:HH:mm:ss.fff}]";
            _logger.LogInformation("{Prefix} ========== AUTO-SPLIT STARTED ==========", logPrefix);
            _logger.LogInformation("{Prefix} Supplier: {SupplierName} (ID: {SupplierId})", logPrefix, supplier.Name, supplier.Id);
            _logger.LogInformation("{Prefix} Batch size: {BatchSize}", logPrefix, batchSize);

            // ── STEP 1: reset stream position before reading ──────────────────────────
            // MemoryStream keeps track of where it was last read.
            // If we don't reset to 0, the read below starts from the end and gets nothing.
            stream.Position = 0;

            // ── STEP 2: validate all contacts and get the clean phone list ─────────────
            // This reads every row, removes empty/invalid phones, and returns:
            //   validationResult → stats (total lines, empty rows, duplicates, etc.)
            //   allCleanedContacts → the actual list of valid phone numbers as strings
            var (validationResult, allCleanedContacts) = await ValidateContactsFromStreamAsync(
                stream, safeFileName, country.Code, uploadDto.ColumnMapping);

            int totalValidContacts = allCleanedContacts.Count;
            _logger.LogInformation("{Prefix} Total valid contacts to split: {Total}", logPrefix, totalValidContacts);

            // ── STEP 3: calculate how many batches we need ────────────────────────────
            // Example: 25,000 contacts / 10,000 per batch = 3 batches (ceiling rounds up)
            int totalBatches = (int)Math.Ceiling((double)totalValidContacts / batchSize);
            _logger.LogInformation("{Prefix} Creating {TotalBatches} batches", logPrefix, totalBatches);

            // ── STEP 4: log the distribution before saving anything ──────────────────
            // Useful for debugging — shows exactly how many contacts go in each batch
            for (int i = 1; i <= totalBatches; i++)
            {
                int startIdx = (i - 1) * batchSize;
                int endIdx = Math.Min(startIdx + batchSize, totalValidContacts);
                int batchContactCount = endIdx - startIdx;
                _logger.LogInformation("{Prefix} Batch {BatchNum}: {Count} contacts (indices {Start}-{End})",
                    logPrefix, i, batchContactCount, startIdx + 1, endIdx);
            }

            // ── STEP 5: get the next list number for this supplier ────────────────────
            // Each file upload for a supplier gets an incrementing number: List1, List2, etc.
            var nextListNumber = await GetNextListNumberAsync(supplier.Id);

            // ── STEP 6: build the parent file record (not saved yet) ─────────────────
            // The parent represents the original upload.
            // It holds the totals and links to all the child batches.
            // IsActive = false means agents can't use it yet — inject will set it to true later.
            var parentFile = new SourceFile
            {
                SupplierId = supplier.Id,
                Name = SourceFileHelpers.GenerateDisplayName(supplier.Name, nextListNumber),
                OriginalName = safeFileName,                          // safe name, not raw client name
                FilePath = "",                                    // parent has no file on disk — children do
                FileSizeBytes = uploadDto.File.Length,
                FileSizeLabel = SourceFileHelpers.FormatFileSize(uploadDto.File.Length),
                Format = Path.GetExtension(safeFileName).TrimStart('.'),
                Statut = "split_parent",                        // special status so UI knows it's a container
                Type = SourceFileType.Original,
                UploadedAt = DateTime.UtcNow,
                ListNumber = nextListNumber,
                UploadedByUserId = userId,
                IsActive = false,
                TotalLines = validationResult.TotalLines,
                ContactCount = totalValidContacts,
                ValidContacts = totalValidContacts,
                EmptyRows = validationResult.EmptyRows,
                InvalidPhones = validationResult.InvalidPhones,
                Duplicates = validationResult.Duplicates,
                FileHash = fileHash,
                SplitTotalParts = totalBatches,
                IsSplitParent = true
            };

            // ── STEP 7: open a database transaction ───────────────────────────────────
            // A transaction means ALL saves succeed together, or NONE of them do.
            // Without this: if we crash after saving batch 3 of 10, the DB has
            // a broken split (parent + 3 orphan children, 7 missing).
            // With this: crash = everything rolls back, DB stays clean, user can retry.
            using var transaction = await _db.Database.BeginTransactionAsync();

            try
            {
                // ── STEP 8: save the parent file to DB ────────────────────────────────
                _db.SourceFiles.Add(parentFile);
                await _db.SaveChangesAsync();
                // parentFile.Id is now populated by EF after this save

                var childFiles = new List<SourceFile>();
                int contactsProcessed = 0;

                // ── STEP 9: loop through each batch ───────────────────────────────────
                for (int batchNumber = 1; batchNumber <= totalBatches; batchNumber++)
                {
                    // ── STEP 9a: slice the contacts for this batch ────────────────────
                    // Skip contacts from previous batches, take only up to batchSize
                    // Example batch 2 of 10,000: Skip(10000).Take(10000)
                    var batchContacts = allCleanedContacts
                        .Skip((batchNumber - 1) * batchSize)
                        .Take(batchSize)
                        .ToList();

                    int batchContactCount = batchContacts.Count;
                    contactsProcessed += batchContactCount;

                    // ── STEP 9b: write this batch's contacts to a CSV file on disk ────
                    // Returns the file path where the batch CSV was saved
                    var batchFilePath = await CreateBatchFileAsync(
                        batchContacts, safeFileName, supplier.Id, batchNumber);

                    // ── STEP 9c: build the child file record ──────────────────────────
                    // Each child is a real slice of contacts that agents will call.
                    // ParentSourceFileId links it back to the parent for grouping in the UI.
                    var childFile = new SourceFile
                    {
                        SupplierId = supplier.Id,
                        ParentSourceFileId = parentFile.Id,            // link to parent
                        Name = $"{parentFile.Name} (Batch {batchNumber}/{totalBatches})",
                        OriginalName = safeFileName,
                        FilePath = batchFilePath,            // actual CSV on disk
                        FileSizeBytes = new FileInfo(batchFilePath).Length,
                        FileSizeLabel = SourceFileHelpers.FormatFileSize(new FileInfo(batchFilePath).Length),
                        Format = Path.GetExtension(safeFileName).TrimStart('.'),
                        Statut = "original",
                        Type = SourceFileType.Original,
                        ListNumber = nextListNumber + batchNumber, // List5, List6, List7...
                        SplitPartNumber = batchNumber,              // which batch this is (1 of 5, 2 of 5...)
                        SplitTotalParts = totalBatches,             // total batches in this split
                        UploadedAt = DateTime.UtcNow,
                        UploadedByUserId = userId,
                        IsActive = false,
                        TotalLines = batchContactCount,
                        ContactCount = batchContactCount,
                        ValidContacts = batchContactCount,
                        EmptyRows = 0,
                        InvalidPhones = 0,
                        Duplicates = 0,
                        FileHash = $"{fileHash}_batch_{batchNumber}" // unique hash per batch
                    };

                    // ── STEP 9d: save the child file record to DB ─────────────────────
                    _db.SourceFiles.Add(childFile);
                    await _db.SaveChangesAsync();
                    // childFile.Id is now populated

                    // ── STEP 9e: build and save the individual contact rows ───────────
                    // Each phone number gets its own row in SourceFileContacts
                    // linked to this child file's ID
                    // ✅ CORRECT - batchContacts already contains SourceFileContact objects
                    // Just set the SourceFileId and save
                    foreach (var contact in batchContacts)
                    {
                        contact.SourceFileId = childFile.Id;
                    }

                    _db.SourceFileContacts.AddRange(batchContacts);
                    await _db.SaveChangesAsync();

                    childFiles.Add(childFile);
                    _logger.LogInformation("{Prefix} Batch {BatchNum} completed. ID: {FileId}, Contacts: {Count}",
                        logPrefix, batchNumber, childFile.Id, batchContactCount);
                }

                // ── STEP 10: all batches saved — commit the transaction ───────────────
                // This is the moment everything becomes permanent in the database.
                // Before this line, nothing was truly saved — it was all pending.
                await transaction.CommitAsync();

                _logger.LogInformation("{Prefix} ========== AUTO-SPLIT COMPLETED ==========", logPrefix);
                _logger.LogInformation("{Prefix} Parent ID: {ParentId}, Children: {ChildrenCount}", logPrefix, parentFile.Id, childFiles.Count);
                _logger.LogInformation("{Prefix} Total contacts saved: {Processed}/{Total}", logPrefix, contactsProcessed, totalValidContacts);

                // ── STEP 11: return the parent file DTO to the controller ─────────────
                // The controller will send this back to the frontend as the API response
                return SourceFileMapper.ToDto(parentFile, supplier);
            }
            catch (Exception ex)
            {
                // ── STEP 12: something failed — roll back everything ──────────────────
                // This undoes ALL the DB saves from this transaction:
                // parent file, all child files, all contact rows.
                // The database goes back to exactly how it was before step 8.
                // The user can safely retry the upload.
                await transaction.RollbackAsync();

                _logger.LogError(ex, "{Prefix} Split failed — transaction rolled back. No data was saved.", logPrefix);

                // Re-throw so the controller catches it and returns a 500 error to the frontend
                throw;
            }
        }

      
        // ============================================================
        // CREATE BATCH FILE
        // ============================================================
        private async Task<string> CreateBatchFileAsync(
            List<SourceFileContact> contacts, 
            string originalFileName,
            int supplierId,
            int batchNumber)
        {
            var logPrefix = $"[CreateBatch] [{DateTime.Now:HH:mm:ss.fff}]";

            var folder = Path.Combine(Directory.GetCurrentDirectory(), "private-uploads", $"supplier_{supplierId}", "batches");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var cleanName = Path.GetFileNameWithoutExtension(originalFileName);
            var batchFileName = $"{cleanName}_batch_{batchNumber}_{timestamp}.csv";
            var filePath = Path.Combine(folder, batchFileName);

            _logger.LogInformation("{Prefix} Creating batch file: {FilePath}", logPrefix, filePath);
            _logger.LogInformation("{Prefix} Writing {Count} contacts to file...", logPrefix, contacts.Count);

            using (var writer = new StreamWriter(filePath))
            {
                // Write CSV header with all fields
                await writer.WriteLineAsync("LastName,FirstName,Address,PostalCode,City,PhoneNumber,Email");

                foreach (var contact in contacts)  //contact is SourceFileContact
                {
                    // Write all contact data to CSV
                    await writer.WriteLineAsync(
                        $"{SourceFileHelpers.EscapeCsvField(contact.LastName)}," +
                        $"{SourceFileHelpers.EscapeCsvField(contact.FirstName)}," +
                        $"{SourceFileHelpers.EscapeCsvField(contact.Address)}," +
                        $"{SourceFileHelpers.EscapeCsvField(contact.PostalCode)}," +
                        $"{SourceFileHelpers.EscapeCsvField(contact.City)}," +
                        $"{contact.PhoneNumber}," +
                        $"{SourceFileHelpers.EscapeCsvField(contact.Email)}"
                    );
                }
            }

            _logger.LogInformation("{Prefix} Batch file created: {FilePath} ({Count} contacts)",
                logPrefix, filePath, contacts.Count);

            return filePath;
        }


        public async Task<ActionResult<List<FileSearchResponseDto>>> SearchFiles( string searchTerm)
        { 
            var query =_db.SourceFiles
                .Where(f => !f.IsDeleted)
                .Include(f => f.Supplier)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim();
                query = query.Where(f =>
                f.Name.Contains(term) ||
                f.Supplier.Name.Contains(term));
            }
            var results = await query
                .OrderByDescending(f => f.UploadedAt)
                .Select(f => new FileSearchResponseDto
                {
                    Id= f.Id,
                    Name = f.Name,
                    FileHash = f.FileHash,
                    SupplierName = f.Supplier.Name,
                    SupplierId = f.SupplierId,
                    UploadedAt = f.UploadedAt,
                    TotalContacts = f.ContactCount
                })
                .ToListAsync();
            return results;
        }



        // ============================================================
        // Validate contacts from MemoryStream
        // ============================================================
        private async Task<(Backend.Helpers.FileValidationResult Result, List<SourceFileContact> Contacts)>
    ValidateContactsFromStreamAsync(
        MemoryStream stream,
        string fileName,
        string countryCode,
        Dictionary<string, string>? columnMapping = null)
        {
            stream.Position = 0;

            // ✅ Create a copy of the stream for validation
            using var validationStream = new MemoryStream();
            await stream.CopyToAsync(validationStream);
            validationStream.Position = 0;

            var formFile = new FormFile(validationStream, 0, validationStream.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = SourceFileHelpers.GetContentType(fileName)
            };

            var (result, cleanedContacts) = await _fileValidationHelper.ValidateContactsInFileAsync(
                formFile,
                countryCode,
                columnMapping: columnMapping);

            stream.Position = 0;

            // validationStream is disposed here automatically
            return (result, cleanedContacts);
        }

        // ============================================================
        // GET FILE BY ID - FIXED missing closing brace
        // ============================================================
        public async Task<SourceFileResponseDto> GetFileByIdAsync(int Id)
        {
            var file = await _db.SourceFiles
                .Include(f => f.Supplier)
                .FirstOrDefaultAsync(f => f.Id == Id && !f.IsDeleted);

            if (file == null)
            {
                _logger.LogWarning("File not found: {FileId}", Id);
                throw new Exception("File not found");
            }

            return SourceFileMapper.ToDto(file, file.Supplier);
        }

        // ============================================================
        // Validate files
        // ============================================================
        public async Task<FileValidationReportDto> ValidateFileAsync (SourceFileUploadDto uploadDto, int userId)
        {   //validate file size 
            if (uploadDto.File.Length > MAX_FILE_SIZE_BYTES)
            {
                throw new ArgumentException(
                    $"File too large. Maximum size is {MaxFileSizeMB} MB. " +
                    $"Your file: {(uploadDto.File.Length / (1024 * 1024)):F2} MB");
            }
            // Read file into MemoryStream
            using var memoryStream = new MemoryStream();
            await uploadDto.File.CopyToAsync(memoryStream);
            memoryStream.Position = 0;
            _logger.LogInformation("File copied to memory stream. Size: {Size} bytes", memoryStream.Length);
            
            var country = await _db.Countries.FindAsync(uploadDto.CountryId);

            if (country == null)
                throw new ArgumentException($"Country with ID {uploadDto.CountryId} not found");
            //Run Validation
            var result = await ValidateContactsFromStreamAsync(
                memoryStream,
                uploadDto.File.FileName,
                country.Code,
                uploadDto.ColumnMapping);
            //check DB for phones in the uploaded file and count duplicates
            _logger.LogInformation("Before DB check — ValidContacts: {Valid}, TotalLines: {Total}, EmptyRows: {Empty}, InvalidPhones: {Invalid}, Duplicates: {Dups}",
             result.Result.ValidContacts,
             result.Result.TotalLines,
             result.Result.EmptyRows,
             result.Result.InvalidPhones,
             result.Result.Duplicates);
            var phones = result.Contacts.Select(c => c.PhoneNumber).ToList();
            var dbDuplicatePhones = await _db.SourceFileContacts
                .Where(c => phones.Contains(c.PhoneNumber))
                .Select(c => c.PhoneNumber)
                .Distinct()
                .ToListAsync();
            //add db duplicates to the result
            foreach(var phone in dbDuplicatePhones)
            {
                var contact = result.Contacts.FirstOrDefault(c => c.PhoneNumber == phone);
                result.Result.InvalidRows.Add(new InvalidRowDto
                {
                    RowNumber = contact?.RowNumber ?? 0,
                    Phone = phone,
                    Name = contact != null ? $"{contact.LastName} {contact.FirstName}".Trim() : "",
                    Reason = "Doublon base"
                });
            }
            var report = new FileValidationReportDto
            {
                TotalLines = result.Result.TotalLines,
                ValidContacts = result.Result.ValidContacts - dbDuplicatePhones.Count,
                EmptyRows = result.Result.EmptyRows,
                InvalidPhones = result.Result.InvalidPhones,
                Duplicates = result.Result.Duplicates,
                InvalidContacts = result.Result.InvalidPhones
                        + result.Result.EmptyRows
                        + result.Result.Duplicates
                        + dbDuplicatePhones.Count,
                InvalidRows = result.Result.InvalidRows
            };
            _logger.LogInformation("Total: {Total}, Valid: {Valid}, InvalidPhones: {InvalidPhones}, InvalidContacts: {InvalidContacts}, Duplicates: {Duplicates}",
                    report.TotalLines,
                    report.ValidContacts,
                    report.InvalidPhones,
                    report.InvalidContacts,
                    report.Duplicates);
            return report;
            }


        // ============================================================
        // GET FILES BY SUPPLIER
        // ============================================================
        public async Task<List<SourceFileResponseDto>> GetFilesBySupplierAsync(int supplierId)
        {
            var files = await _db.SourceFiles
                .Where(f => !f.IsDeleted) // Exclude deleted files
                .Where(f => f.SupplierId == supplierId)
                .Include(f => f.Supplier)
                .ThenInclude(s => s.Country)
                .Include(f => f.Supplier)
                .ThenInclude(s => s.LeadType)
                .OrderByDescending(f => f.UploadedAt)
                .ToListAsync();

            return files.Select(f => SourceFileMapper.ToDto(f, f.Supplier)).ToList();
        }

        // ============================================================
        // GET ALL FILES
        // ============================================================
        public async Task<List<SourceFileResponseDto>> GetAllFilesAsync()
        {
            var files = await _db.SourceFiles
                .Include(f => f.Supplier)
                .ThenInclude(s => s.Country)
                .Include(f => f.Supplier)
                .ThenInclude(s => s.LeadType)
                .OrderByDescending(f => f.UploadedAt)
                .ToListAsync();

            return files.Select(f => SourceFileMapper.ToDto(f, f.Supplier)).ToList();
        }

        // ============================================================
        // DOWNLOAD FILE
        // ============================================================
        public async Task<(byte[] FileContent, string FileName, string ContentType)> DownloadFileAsync(int fileId)
        {
            var file = await _db.SourceFiles.FirstOrDefaultAsync(f => f.Id == fileId);
            if (file == null)
            {
                throw new KeyNotFoundException($"File with ID {fileId} not found");
            }
            //chekk if file exists
            if (!File.Exists(file.FilePath))
                throw new FileNotFoundException($"File not found on disk: {file.FilePath}");
            //read file content


            // Read file content as byte array
            var fileContent = await File.ReadAllBytesAsync(file.FilePath);

            // Determine content type based on file format
            var contentType = file.Format?.ToLower() switch
            {
                "csv" => "text/csv",
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "xls" => "application/vnd.ms-excel",
                _ => "application/octet-stream"
            };

            // Generate download filename with date
            var fileName = $"{file.Name}_{DateTime.Now:yyyyMMdd}.{file.Format}";

            return (fileContent, fileName, contentType);
        }


















        // ============================================================
        // DELETE FILE
        // ============================================================
        public async Task<bool> DeleteFileAsync(int id , int deletedByUserId)
        {
            var file = await _db.SourceFiles
                .Include(f => f.ChildFiles) // include batch children
                .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);

            if (file == null)
                return false;

            // If this is a split parent — delete all child files from disk and DB first
            if (file.IsSplitParent && file.ChildFiles != null && file.ChildFiles.Any())
            {
                foreach (var child in file.ChildFiles)
                {
                    child.IsDeleted = true;
                    child.DeletedAt = DateTime.UtcNow;
                    child.DeletedByUserId = deletedByUserId;
                }
            }
            // Soft delete the parent
            file.IsDeleted = true;
            file.DeletedAt = DateTime.UtcNow;
            file.DeletedByUserId = deletedByUserId;

            await _db.SaveChangesAsync();
            return true;
        }

        // ============================================================
        // RENAME FILE
        // ============================================================
        public async Task<SourceFileResponseDto> RenameFileAsync(int Id, string newName)
        {
            var file = await _db.SourceFiles
                .Include(f => f.Supplier)
                .FirstOrDefaultAsync(f => f.Id == Id);

            if (file == null)
                throw new Exception("File not found");

            if (string.IsNullOrWhiteSpace(newName))
                throw new Exception("New name cannot be empty");

            if (newName.Length > 255)
                throw new Exception("New name is too long");

            file.Name = newName;
            await _db.SaveChangesAsync();

            return SourceFileMapper.ToDto(file, file.Supplier);
        }

        //Column Mapping
        public async Task<MappingPreviewDto> GetColumnMappingPreviewAsync(SourceFileUploadDto uploadDto)
        {
            using var stream = new MemoryStream();
            await uploadDto.File.CopyToAsync(stream);
            stream.Position = 0;

            var detectedColumns = new List<string>();

            var extension = Path.GetExtension(uploadDto.File.FileName).ToLowerInvariant();

            if (extension == ".csv")
            {
                using var reader = new StreamReader(stream);
                var headerLine = await reader.ReadLineAsync();
                if (!string.IsNullOrWhiteSpace(headerLine))
                {
                    detectedColumns = headerLine.Split(',')
                        .Select(h => h.Trim().Replace("\"", ""))
                        .Where(h => !string.IsNullOrWhiteSpace(h))
                        .ToList();
                }
            }
            else if (extension == ".xlsx" || extension == ".xls")
            {
                using var package = new ExcelPackage(stream);
                var worksheet = package.Workbook.Worksheets[0];
                if (worksheet.Dimension != null)
                {
                    for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                    {
                        var cellValue = worksheet.Cells[1, col].Text?.Trim();
                        if (!string.IsNullOrWhiteSpace(cellValue))
                            detectedColumns.Add(cellValue);
                    }
                }
            }

            var suggestedMapping = SourceFileHelpers.SuggestMapping(detectedColumns);

            return new MappingPreviewDto
            {
                DetectedColumns = detectedColumns,
                SuggestedMapping = suggestedMapping,
                Message = "Preview generated successfully"
            };
        }
        // ============================================================
        // GET TREE
        // ============================================================
        public async Task<List<TreeCountryDto>> GetTreeAsync()
        {
            var allCountries = await _db.Countries
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();

            var allLeadTypes = await _db.LeadTypes
                .Where(lt => lt.IsActive)
                .OrderBy(lt => lt.Name)
                .ToListAsync();

            var suppliers = await _db.Suppliers
                .Include(s => s.Country)
                .Include(s => s.LeadType)
                .Include(s => s.SourceFiles)
                .ToListAsync();

            var tree = allCountries
                .Select(country => new TreeCountryDto
                {
                    Id = country.Id,
                    Name = country.Name,
                    Code = country.Code,
                    LeadTypes = allLeadTypes
                        .Where(lt => lt.CountryId == country.Id)
                        .Select(leadtype => new TreeLeadTypeDto
                        {
                            Id = leadtype.Id,
                            Code = leadtype.Code,
                            Name = leadtype.Name,
                            Suppliers = suppliers
                                .Where(s => s.CountryId == country.Id && s.LeadTypeId == leadtype.Id)
                                .Select(supplier => new TreeSupplierDto
                                {
                                    Id = supplier.Id,
                                    Name = supplier.Name,
                                    SourceFiles = supplier.SourceFiles
                                        .Where(f => f.Statut == "original" && !f.IsDeleted)
                                        .OrderByDescending(f => f.UploadedAt)
                                        .Select(file => new TreeFileDto
                                        {
                                            Id = file.Id,
                                            Name = file.Name,
                                            OriginalName = file.OriginalName,
                                            FileSizeLabel = file.FileSizeLabel,
                                            FileSizeBytes = file.FileSizeBytes,
                                            Format = file.Format,
                                            Statut = file.Statut,
                                            ContactCount = file.ContactCount,
                                            IsActive = file.IsActive,
                                            UploadedAt = file.UploadedAt,
                                            ListNumber = file.ListNumber
                                        }).ToList()
                                }).ToList()
                        })
                        .Where(lt => lt.Suppliers.Count > 0)
                        .ToList()
                })
                .Where(c => c.LeadTypes.Count > 0)
                .ToList();

            return tree;
        }

        // ============================================================
        // COUNT EXCEL ROWS
        // ============================================================
        private async Task<int> CountExcelRowsAsync(string filePath)
        {
            ExcelPackage.License.SetNonCommercialPersonal("EBI");
            using (var package = new ExcelPackage(new FileInfo(filePath)))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var dimension = worksheet.Dimension;
                if (dimension == null) return 0;
                return dimension.Rows - 1;
            }
        }

        // ============================================================
        // COUNT CSV ROWS
        // ============================================================
        private async Task<int> CountCsvRowsAsync(string filePath)
        {
            int contactCount = 0;
            bool isFirstLine = true;

            using (var reader = new StreamReader(filePath))
            {
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    if (isFirstLine)
                    {
                        isFirstLine = false;
                        continue;
                    }
                    contactCount++;
                }
            }
            return contactCount;
        }


        // ============================================================
        // GET NEXT LIST NUMBER
        // ============================================================
        private async Task<int> GetNextListNumberAsync(int supplierId)
        {
            var maxNumber = await _db.SourceFiles
                .Where(f => f.SupplierId == supplierId)
                .MaxAsync(f => (int?)f.ListNumber) ?? 0;

            return maxNumber + 1;
        }

        // ============================================================
        // FORMAT FILE SIZE
        // ============================================================
        
    }
}
