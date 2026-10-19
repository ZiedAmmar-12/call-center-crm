namespace Backend.Services.SourceFiles
{
	/// <summary>
	/// Pure static helpers — no DB, no DI, no side effects.
	/// Safe to call from anywhere.
	/// </summary>
	public static class SourceFileHelpers
	{
		// ============================================================
		// FORMAT FILE SIZE
		// ============================================================
		public static string FormatFileSize(long bytes)
		{
			if (bytes < 1024) return $"{bytes} B";
			if (bytes < 1024 * 1024) return $"{bytes / 1024} KB";
			return $"{bytes / (1024.0 * 1024):F1} MB";
		}

		// ============================================================
		// ESCAPE CSV FIELD
		// ============================================================
		public static string EscapeCsvField(string? field)
		{
			if (string.IsNullOrEmpty(field))
				return "";

			if (field.Contains(",") || field.Contains("\""))
				return $"\"{field.Replace("\"", "\"\"")}\"";

			return field;
		}

		// ============================================================
		// GENERATE DISPLAY NAME
		// ============================================================
		public static string GenerateDisplayName(string supplierName, int listNumber)
		{
			return $"{supplierName}_List{listNumber}";
		}

		// ============================================================
		// GET CONTENT TYPE FROM FILE EXTENSION
		// ============================================================
		public static string GetContentType(string fileName)
		{
			var extension = Path.GetExtension(fileName).ToLower();
			return extension switch
			{
				".csv" => "text/csv",
				".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				".xls" => "application/vnd.ms-excel",
				_ => "application/octet-stream"
			};
		}

		// ============================================================
		// SUGGEST COLUMN MAPPING
		// ============================================================
		public static Dictionary<string, string> SuggestMapping(List<string> columns)
		{
			var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

			var suggestions = new Dictionary<string, string>
			{
				{ "tel",              "phoneNumber" },
				{ "téléphone",        "phoneNumber" },
				{ "phone",            "phoneNumber" },
				{ "numéro",           "phoneNumber" },
				{ "nom",              "lastName" },
				{ "prénom",           "firstName" },
				{ "adresse",          "address" },
				{ "cp",               "postalCode" },
				{ "code postal",      "postalCode" },
				{ "ville",            "city" },
				{ "email",            "email" },
				{ "mode chauffage",   "modeChauffage" },
				{ "propriétaire",     "proprietaireDepuis" }
			};

			foreach (var col in columns)
			{
				foreach (var suggestion in suggestions)
				{
					if (col.ToLower().Contains(suggestion.Key))
					{
						mapping[col] = suggestion.Value;
						break;
					}
				}
			}

			return mapping;
		}

		// ============================================================
		// CALCULATE SHA256 HASH FROM STREAM
		// ============================================================
		public static async Task<string> CalculateHashFromStreamAsync(Stream stream)
		{
			stream.Position = 0;
			using var sha256 = System.Security.Cryptography.SHA256.Create();
			var hashBytes = await sha256.ComputeHashAsync(stream);
			return Convert.ToHexString(hashBytes);
		}

		// ============================================================
		// REMOVE READ-ONLY ATTRIBUTE BEFORE FILE DELETE
		// ============================================================
		public static void RemoveReadOnly(string filePath)
		{
			var attributes = File.GetAttributes(filePath);
			if (attributes.HasFlag(FileAttributes.ReadOnly))
				File.SetAttributes(filePath, attributes & ~FileAttributes.ReadOnly);
		}
	}
}