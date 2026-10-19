using System.Text.RegularExpressions;
using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CsvHelper;
using CsvHelper.Configuration;
using OfficeOpenXml;
using Backend.Entities;
using Backend.Config;
using Backend.DTOs;
// Line 5: Define namespace to organize code (matches folder structure)
namespace Backend.Helpers
{

    // Line 7-13: Define a class to hold validation results
    public class FileValidationResult
    {
        public int TotalLines { get; set; }      // Total rows processed (including header)
        public int ValidContacts { get; set; }   // Count of valid phone numbers
        public int EmptyRows { get; set; }       // Count of rows with no data
        public int InvalidPhones { get; set; }   // Count of rows with invalid phone numbers
        public int Duplicates { get; set; }      // Count of duplicate phone numbers
        public int InvalidContacts { get; set; } // Count of invalid contacts
        public List<InvalidRowDto> InvalidRows { get; set; } = new(); // Details of invalid rows
        public string? ErrorMessage { get; set; } // General error message (e.g. file format issues)
    }

    public class FileValidationHelper
    {
        private static readonly Regex CleanPhoneRegex = new(
            @"[\s\-\(\)\.]",
            RegexOptions.Compiled | RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1));

        private static readonly string[] PhoneHeaderKeywords = new[]
            {
                "téléphone", "telephone", "tel", "portable", "gsm", "mobile", "numéro", "numero",
                "phone", "phonenumber", "contact", "n°", "n°tel", "+"
            };

        private static readonly Dictionary<string, string[]> FieldSynonyms = new()
        {
            ["lastname"] = new[] { "nom", "nom de famille", "family name", "surname", "lastname", "last name", "nom_famille" },
            ["firstname"] = new[] { "prénom", "prenom", "first name", "firstname", "given name", "prénom_usuel" },
            ["address"] = new[] { "adresse", "address", "rue", "street", "voie", "avenue", "boulevard" },
            ["postalcode"] = new[] { "code postal", "codepostal", "cp", "postal code", "zip", "code_postal", "postcode" },
            ["city"] = new[] { "ville", "city", "commune", "town", "localité", "village" },
            ["email"] = new[] { "email", "e-mail", "courriel", "mail", "adresse email", "messagerie" },
        };

        private static readonly string[] NormalizedPhoneHeaderKeywords =
            PhoneHeaderKeywords.Select(NormalizeColumnName).Where(h => h.Length > 1 || h == "+").ToArray();

        private static readonly Dictionary<string, string[]> NormalizedFieldSynonyms =
            FieldSynonyms.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.Select(NormalizeColumnName).Where(h => h.Length > 0).ToArray(),
                StringComparer.OrdinalIgnoreCase);

        private readonly ILogger<FileValidationHelper> _logger;

        public FileValidationHelper(ILogger<FileValidationHelper> logger)      // writes to your logging provider
        {
            _logger = logger;
        }

        public async Task<(FileValidationResult Result, List<SourceFileContact> Contacts)>
            ValidateContactsInFileAsync(
                IFormFile file,
                string countryCode,
                CancellationToken ct = default,
                Dictionary<string, string>? columnMapping = null)
        // ↑ async = can use await inside
        // ↑ Task = asynchronous operation that returns something
        // ↑ (FileValidationResult, List<SourceFileContact>) = returns two things (tuple)
        // ↑ IFormFile = the uploaded file from HTTP request
        // ↑ string countryCode = "FR", "BE", "US" - NO database here!
        {//Create new empty validation result object
            var result = new FileValidationResult();
            // Create empty list to store cleaned phone numbers
            var contacts = new List<SourceFileContact>();

            // ── Guard clause 1: null/empty file ─────────────
            // Return immediately — no point allocating anything
            if (file == null || file.Length == 0)
            {
                result.ErrorMessage = "No file received.";
                return (result, contacts);
            }

            if (file.Length > FileProcessingConfig.MAX_FILE_SIZE_BYTES)
            {
                result.ErrorMessage =
                    $"File exceeds the {FileProcessingConfig.MaxFileSizeMB} MB limit.";
                _logger.LogWarning("File {Name} rejected: {Size} bytes exceeds limit.",
                    file.FileName, file.Length);
                return (result, contacts);
            }

            //check file extension against allowed list
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!FileProcessingConfig.ALLOWED_EXTENSIONS.Contains(extension))
            {
                result.ErrorMessage = $"Extension '{extension}' is not allowed.";
                return (result, contacts);
            }

            //copy to disk 
            var tempFilePath = Path.GetTempFileName(); // Creates a unique temp file and returns its path
            try
            {
                await using (var fs = new FileStream(tempFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(fs, ct);
                }

                // WHY: a user can rename "virus.exe" → "data.csv".
                if (!await HasValidMagicBytesAsync(tempFilePath, extension, ct))
                {
                    result.ErrorMessage = "File content does not match its extension.";
                    return (result, contacts);
                }

                var uniqueContacts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                //  Check if file is CSV
                if (extension == ".csv")
                {
                    // Line 42-44: Call CSV validation method
                    (result, contacts) = await ValidateCsvContactsAsync(
                        tempFilePath,      // Path to temp file on disk
                        uniqueContacts,    // HashSet to track duplicates
                        countryCode,
                        ct,
                        columnMapping);      // Country code for phone validation
                }
                // Line 48: Check if file is Excel (.xlsx or .xls)
                else if (extension == ".xlsx" || extension == ".xls")
                {
                    // Line 49-51: Call Excel validation method
                    (result, contacts) = await ValidateExcelContactsAsync(
                        tempFilePath,      // Path to temp file on disk
                        uniqueContacts,    // HashSet to track duplicates
                        countryCode,
                        ct,
                        columnMapping);      // Country code for phone validation
                }
            }
            // finally block ALWAYS runs, even if exception occurs
            finally
            {
                // Check if temp file exists
                if (File.Exists(tempFilePath))
                    //  Delete temp file from disk (cleanup)
                    File.Delete(tempFilePath);
            }

            //  Return empty results if file format not supported
            return (result, contacts);
        }

        private static async Task<bool> HasValidMagicBytesAsync(
                   string filePath, string extension, CancellationToken ct)
        {
            // Read only the first 4 bytes — we don't need the whole file
            var buffer = new byte[4];
            await using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            var bytesRead = await fs.ReadAsync(buffer, 0, 4, ct);

            if (bytesRead < 4) return false; // file too short to even check

            bool isZip = buffer[0] == 0x50 && buffer[1] == 0x4B
                      && buffer[2] == 0x03 && buffer[3] == 0x04;

            return extension switch
            {
                // XLSX is a ZIP internally — must start with PK header
                ".xlsx" or ".xls" => isZip,

                // CSV is plain text — it should NOT be a binary format.
                // We just verify it isn't a ZIP/EXE masquerading as CSV.
                // A genuine CSV will have its first byte be a printable ASCII character.
                ".csv" => !isZip && buffer[0] is >= 0x09 and <= 0x7E,

                _ => false
            };
        }

        private async Task<(FileValidationResult Result, List<SourceFileContact> Contacts)>
            ValidateCsvContactsAsync(
                string filePath,
                HashSet<string> uniqueContacts,
                string countryCode,
                CancellationToken ct,
                Dictionary<string, string>? columnMapping)
        // ↑ private = only accessible within this class
        // ↑ string filePath = path to temp CSV file on disk
        // ↑ HashSet<string> uniqueContacts = reference to duplicate tracker
        // ↑ string countryCode = "FR", "BE", etc. for validation
        {
            var logPrefix = $"[ValidateCsvContacts] [{DateTime.Now:HH:mm:ss.fff}]";
            _logger.LogInformation($"{logPrefix} ========== START CSV PROCESSING ==========");
            _logger.LogInformation($"{logPrefix} File path: {filePath}");
            _logger.LogInformation($"{logPrefix} Country code: {countryCode}");
            // Line 68: Create new validation result object
            var result = new FileValidationResult();

            // Line 71: List to store cleaned valid contacts
            var contacts = new List<SourceFileContact>();

            var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                MissingFieldFound = null, // Ignore missing fields (don't throw)
                BadDataFound = ctx =>
                    _logger.LogDebug("Bad CSV data at row {Row}: {Field}",
                        ctx.Context.Parser.Row, ctx.Field),   // Ignore bad data (don't throw)

                TrimOptions = TrimOptions.Trim, // Trim whitespace from fields
                ShouldSkipRecord = args =>
                {
                    // In newer CsvHelper versions, use args.Row instead of args.Record
                    bool allEmpty = true;
                    for (int i = 0; i < args.Row.ColumnCount; i++)
                    {
                        if (!string.IsNullOrWhiteSpace(args.Row[i]))
                        {
                            allEmpty = false;
                            break;
                        }
                    }
                    if (allEmpty) result.EmptyRows++;
                    return allEmpty;
                }
            };

            using var reader = new StreamReader(filePath);
            using var csv = new CsvReader(reader, csvConfig);
            await csv.ReadAsync();
            csv.ReadHeader();

            if (csv.HeaderRecord == null || csv.HeaderRecord.Length == 0)
            {
                result.ErrorMessage = "CSV file has no header row.";
                return (result, contacts);
            }

            //find phone column index
            var phoneIndex = FindPhoneColumnIndex(csv.HeaderRecord, columnMapping);
            if (phoneIndex == -1)
            {
                result.ErrorMessage =
                    "No phone column found. Map a column to phoneNumber or use a header like: phone, tel, mobile, gsm, telephone...";
                _logger.LogWarning("CSV rejected — no phone column in headers: {Headers}",
                    string.Join(", ", csv.HeaderRecord));
                return (result, contacts);
            }

            var headerMap = BuildHeaderMap(csv.HeaderRecord, columnMapping);

            while (await csv.ReadAsync())
            {
                if (result.TotalLines >= FileProcessingConfig.MAX_ROWS)
                {
                    _logger.LogWarning("Row limit {Limit} reached, processing stopped.",
                      FileProcessingConfig.MAX_ROWS);
                    break;
                }

                ct.ThrowIfCancellationRequested();
                result.TotalLines++;

                var rawPhone = csv.GetField(phoneIndex)?.Trim() ?? ""; // Trim whitespace and default to empty string

                // ✅ FIX BUG 1: was "IsNullOrWhiteSpace && ..." which is impossible (null can't start with "+")
                // Now correctly checks: if phone is missing, mark as invalid and skip
                if (string.IsNullOrWhiteSpace(rawPhone))
                {
                    result.InvalidPhones++;
                    result.InvalidRows.Add(new InvalidRowDto
                    {
                        RowNumber = result.TotalLines,
                        Phone = "",
                        Reason = "Numéro manquant"
                    });
                    continue;
                }

                // ✅ FIX BUG 2: normalize FIRST before any validation
                // e.g. "+330617807300" → "+33617807300" (strips the extra 0 after country code)
                var normalized = PhoneValidationHelper.NormalizePhoneNumber(rawPhone, countryCode);

                // Validate the normalized phone number using country-specific patterns
                var validation = PhoneValidationHelper.ValidatePhone(normalized, countryCode);
                if (!validation.IsValid)
                {
                    result.InvalidPhones++;
                    result.InvalidRows.Add(new InvalidRowDto
                    {
                        RowNumber = result.TotalLines,
                        Phone = rawPhone,       // Show original value to user
                        Reason = "Numéro invalide"
                    });
                    _logger.LogDebug("Row {R}: invalid phone '{P}' — {Msg}",
                        result.TotalLines, rawPhone, validation.ErrorMessage);
                    continue;
                }

                // ✅ FIX BUG 3: clean the NORMALIZED phone, not the raw one
                // e.g. normalized "+33 6 12-34.56 78" → "+33612345678"
                var cleaned = CleanPhoneRegex.Replace(normalized, "");

                // HashSet.Add returns FALSE if value already exists.
                // Single O(1) operation — faster than Contains() + Add().
                if (!uniqueContacts.Add(cleaned))
                {
                    result.Duplicates++;
                    result.InvalidRows.Add(new InvalidRowDto
                    {
                        RowNumber = result.TotalLines,
                        Phone = rawPhone,
                        Reason = "Numéro en double"
                    });
                    continue;
                }

                // Local helper: reads a field by name using the header map.
                // Returns "" safely if the column wasn't found.
                string Get(string fieldName) =>
                    headerMap.TryGetValue(fieldName, out var idx)
                        ? (csv.GetField(idx) ?? "")
                        : "";

                contacts.Add(new SourceFileContact
                {
                    LastName = Get("lastname"),
                    FirstName = Get("firstname"),
                    Address = Get("address"),
                    PostalCode = Get("postalcode"),
                    City = Get("city"),
                    Email = Get("email"),
                    PhoneNumber = cleaned,              // normalized & cleaned number stored in DB
                    OriginalPhoneNumber = rawPhone,     // original value kept for reference
                    RowNumber = result.TotalLines,
                    IsValid = true,
                    CreatedAt = DateTime.UtcNow
                });

                result.ValidContacts++;
            }

            return (result, contacts);
        }

        private async Task<(FileValidationResult Result, List<SourceFileContact> Contacts)>
            ValidateExcelContactsAsync(
                string filePath,                // Path to temp Excel file
                HashSet<string> uniqueContacts, // Duplicate tracker
                string countryCode,
                CancellationToken ct,
                Dictionary<string, string>? columnMapping)             // Country code for validation
        {
            var logPrefix = $"[ValidateExcelContacts] [{DateTime.Now:HH:mm:ss.fff}]";

            // Create new validation result object
            var result = new FileValidationResult();
            var contacts = new List<SourceFileContact>();

            _logger.LogInformation($"{logPrefix} ========== START EXCEL PROCESSING ==========");
            // Set EPPlus license (required for commercial use)
            ExcelPackage.License.SetNonCommercialPersonal("EBI"); // ← new way for v8
            //start background task 
            //Opens the Excel file from your temp folder
                using var package = new ExcelPackage(new FileInfo(filePath));
                //gets first worksheet
                var ws = package.Workbook.Worksheets[0];
                //gets sheet dimensions 
                var dim = ws.Dimension;

                //If no data, return empty result
                if (dim == null)
                    return (result, contacts);

                //create header array 
                var rawHeaders = new string[dim.Columns + 1]; // 1-based indexing
                for (int col = 1; col <= dim.Columns; col++)
                    rawHeaders[col] = ws.Cells[1, col]?.Text?.Trim().ToLowerInvariant() ?? "";
                _logger.LogInformation("Excel headers: {Headers}",
                string.Join(", ", rawHeaders.Where(h => !string.IsNullOrEmpty(h))));
                int phoneCol = FindPhoneColumnIndexFromArray(rawHeaders, dim.Columns, columnMapping);
                if (phoneCol < 0)
                {
                    result.ErrorMessage = "No phone column found in the Excel sheet.";
                    _logger.LogWarning("Excel rejected — no phone column found.");
                    _logger.LogInformation("Phone column index: {PhoneCol}", phoneCol);

                    return (result, contacts);
                }

                var headerMap = BuildHeaderMapFromArray(rawHeaders, dim.Columns, columnMapping);

                //start row loop 
                for (int row = 2; row <= dim.Rows; row++)
                {
                    if (result.TotalLines >= FileProcessingConfig.MAX_ROWS) break;
                    ct.ThrowIfCancellationRequested();

                    bool isEmptyRow = true;
                    for (int col = 1; col <= dim.Columns; col++)
                    {
                        if (!string.IsNullOrWhiteSpace(ws.Cells[row, col]?.Text))
                        {
                            isEmptyRow = false;
                            break;
                        }
                    }

                    if (isEmptyRow)
                    {
                        result.EmptyRows++;
                        continue;
                    }

                    result.TotalLines++;

                    var phoneCell = ws.Cells[row, phoneCol];
                    string rawPhone = GetPhoneNumberFromCell(phoneCell);

                    // Check for empty phone
                    if (string.IsNullOrWhiteSpace(rawPhone))
                    {
                        result.InvalidPhones++;
                        result.InvalidRows.Add(new InvalidRowDto
                        {
                            RowNumber = row,
                            Phone = "",
                            Reason = "Numéro manquant"
                        });
                        continue;
                    }

                    // Normalize the phone number (adds +, removes extra zeros)
                    var normalized = PhoneValidationHelper.NormalizePhoneNumber(rawPhone, countryCode);

                    // Validate using the helper
                    var validation = PhoneValidationHelper.ValidatePhone(normalized, countryCode);
                    if (!validation.IsValid)
                    {
                        result.InvalidPhones++;
                        result.InvalidRows.Add(new InvalidRowDto
                        {
                            RowNumber = row,
                            Phone = rawPhone,
                            Reason = "Numéro invalide"
                        });
                    _logger.LogDebug("Row {Row}: invalid phone '{Phone}' — {Error}",
                        row, rawPhone, validation.ErrorMessage);
                    continue;
                    }

                    var cleaned = CleanPhoneRegex.Replace(normalized, "");

                    if (!uniqueContacts.Add(cleaned))
                    {
                        result.Duplicates++;
                        result.InvalidRows.Add(new InvalidRowDto
                        {
                            RowNumber = row,
                            Phone = rawPhone,
                            Reason = "Numéro en double"
                        });
                        continue;
                    }

                    string Get(string fieldName) =>
                        headerMap.TryGetValue(fieldName, out var idx)
                            ? (ws.Cells[row, idx]?.Text?.Trim() ?? "")
                            : "";

                    contacts.Add(new SourceFileContact
                    {
                        LastName = Get("lastname"),
                        FirstName = Get("firstname"),
                        Address = Get("address"),
                        PostalCode = Get("postalcode"),
                        City = Get("city"),
                        Email = Get("email"),
                        PhoneNumber = cleaned,
                        OriginalPhoneNumber = rawPhone,
                        RowNumber = row,
                        IsValid = true,
                        CreatedAt = DateTime.UtcNow
                    });

                    result.ValidContacts++;
                }

            return (result, contacts);
        }

        //finds which column has phone numbers
        private static int FindPhoneColumnIndex(
            IReadOnlyList<string> headers,
            Dictionary<string, string>? columnMapping)
        {
            var mappedColumns = BuildColumnMapFromMapping(headers, columnMapping, oneBased: false);
            if (mappedColumns.TryGetValue("phonenumber", out var mappedIndex))
                return mappedIndex;

            for (int i = 0; i < headers.Count; i++)
            {
                var h = NormalizeColumnName(headers[i]);
                if (HeaderMatchesAny(h, NormalizedPhoneHeaderKeywords, allowContains: true))
                    return i;

            }
            return -1;
        }

        private static int FindPhoneColumnIndexFromArray(
            string[] headers,
            int columnCount,
            Dictionary<string, string>? columnMapping)
        {
            var zeroBasedHeaders = ToZeroBasedHeaders(headers, columnCount);
            var mappedColumns = BuildColumnMapFromMapping(zeroBasedHeaders, columnMapping, oneBased: true);
            if (mappedColumns.TryGetValue("phonenumber", out var mappedIndex))
                return mappedIndex;

            for (int col = 1; col <= columnCount; col++)
            {
                var h = NormalizeColumnName(headers[col]);
                if (HeaderMatchesAny(h, NormalizedPhoneHeaderKeywords, allowContains: true))
                    return col;
            }
            return -1;
        }

        // CSV path — returns dict: "lastname" → 0-based index
        // Only maps each canonical name ONCE — first matching column wins.
        private static Dictionary<string, int> BuildHeaderMap(
            string[] headers,
            Dictionary<string, string>? columnMapping)
        {
            var map = BuildColumnMapFromMapping(headers, columnMapping, oneBased: false);

            for (int i = 0; i < headers.Length; i++)
            {
                var h = NormalizeColumnName(headers[i]);
                foreach (var (canonical, synonyms) in NormalizedFieldSynonyms)
                {
                    if (!map.ContainsKey(canonical) && HeaderMatchesAny(h, synonyms, allowContains: false))
                    {
                        map[canonical] = i;
                        break;
                    }
                }
            }
            return map;
        }

        // Excel path — returns dict: "lastname" → 1-based index
        private static Dictionary<string, int> BuildHeaderMapFromArray(
            string[] headers,
            int columnCount,
            Dictionary<string, string>? columnMapping)
        {
            var zeroBasedHeaders = ToZeroBasedHeaders(headers, columnCount);
            var map = BuildColumnMapFromMapping(zeroBasedHeaders, columnMapping, oneBased: true);

            for (int col = 1; col <= columnCount; col++)
            {
                var h = NormalizeColumnName(headers[col]);
                if (string.IsNullOrEmpty(h)) continue;

                foreach (var (canonical, synonyms) in NormalizedFieldSynonyms)
                {
                    if (!map.ContainsKey(canonical) && HeaderMatchesAny(h, synonyms, allowContains: false))
                    {
                        map[canonical] = col;
                        break;
                    }
                }
            }
            return map;
        }

        private static Dictionary<string, int> BuildColumnMapFromMapping(
            IReadOnlyList<string> headers,
            Dictionary<string, string>? columnMapping,
            bool oneBased)
        {
            var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            if (columnMapping == null || columnMapping.Count == 0)
                return map;

            var headerIndexes = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Count; i++)
            {
                var normalizedHeader = NormalizeColumnName(headers[i]);
                if (string.IsNullOrEmpty(normalizedHeader) || headerIndexes.ContainsKey(normalizedHeader))
                    continue;

                headerIndexes[normalizedHeader] = oneBased ? i + 1 : i;
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

        private static string[] ToZeroBasedHeaders(string[] headers, int columnCount)
        {
            var result = new string[columnCount];
            for (var col = 1; col <= columnCount; col++)
                result[col - 1] = headers[col] ?? "";

            return result;
        }

        private static bool HeaderMatchesAny(
            string normalizedHeader,
            IEnumerable<string> normalizedKeywords,
            bool allowContains)
        {
            if (string.IsNullOrEmpty(normalizedHeader))
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
                return "";

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

        private string GetPhoneNumberFromCell(ExcelRange cell)
        {
            if (cell?.Value == null)
                return "";

            // Case 1: Already a string
            if (cell.Value is string strValue)
                return strValue.Trim();

            // Case 2: Numeric value (including scientific notation from Excel)
            if (cell.Value is double doubleValue)
            {
                // Convert scientific notation to regular number without decimal
                // 3.247011111E+10 -> "32470111110"
                return doubleValue.ToString("F0", System.Globalization.CultureInfo.InvariantCulture);
            }

            // Case 3: Decimal
            if (cell.Value is decimal decimalValue)
            {
                return decimalValue.ToString("F0", System.Globalization.CultureInfo.InvariantCulture);
            }

            // Case 4: Integer
            if (cell.Value is int intValue)
            {
                return intValue.ToString();
            }

            // Case 5: Long
            if (cell.Value is long longValue)
            {
                return longValue.ToString();
            }

            // Fallback
            return cell.Text?.Trim() ?? "";
        }

        public async Task<string> CreateCleanedFileAsync(
            List<SourceFileContact> contacts,   // Only valid contacts
            string originalFileName,
            CancellationToken ct = default)        // Original file name (for naming)
        {
            var dateSuffix = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var baseName = Path.GetFileNameWithoutExtension(originalFileName);
            var outPath = Path.Combine(Path.GetTempPath(), $"cleaned_{baseName}_{dateSuffix}.csv");

            await using var writer = new StreamWriter(outPath, append: false);
            await writer.WriteLineAsync("LastName,FirstName,Address,PostalCode,City,PhoneNumber,Email");

            foreach (var contact in contacts)
            {
                ct.ThrowIfCancellationRequested();
                await writer.WriteLineAsync(string.Join(",", new[]
                {
                    EscapeCsvField(contact.LastName),
                    EscapeCsvField(contact.FirstName),
                    EscapeCsvField(contact.Address),
                    EscapeCsvField(contact.PostalCode),
                    EscapeCsvField(contact.City),
                    EscapeCsvField(contact.PhoneNumber),
                    EscapeCsvField(contact.Email)
                }));
            }

            return outPath;
        }

        private static string EscapeCsvField(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }

        private static string ExtractPhoneNumberFromCsv(string line)
        {
            // Split CSV line by commas into individual columns
            var columns = line.Split(',');
            // Example: "John,0612345678,john@email.com" → ["John", "0612345678", "john@email.com"]

            // Loop through each column
            foreach (var column in columns)
            {
                //  Trim whitespace and remove surrounding quotes
                var trimmed = column.Trim().Trim('"');
                // Example: '"0612345678"' → "0612345678"

                // Check if column looks like a phone number
                if (Regex.IsMatch(trimmed, @"^[\+\d][\d\s\-\(\)\.]{5,}$"))
                // ↑ Regex explanation:
                // ^ = start of string
                // [\+\d] = starts with + OR a digit
                // [\d\s\-\(\)\.]{5,} = at least 5 digits, spaces, dashes, parentheses, or dots
                // $ = end of string
                {
                    // Return first column that looks like a phone
                    return trimmed;
                }
            }
            // No phone found - return empty string
            return "";
        }
    }
}
