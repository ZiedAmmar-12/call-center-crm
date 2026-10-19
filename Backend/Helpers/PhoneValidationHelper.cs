using System.Text.RegularExpressions;

namespace Backend.Helpers
{
    public class PhoneValidationResult
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public string? NormalizedPhone { get; set; }
    }

    public static class PhoneValidationHelper
    {
        // Keyed by 2-letter code. CountryService auto-generates a 3-letter code
        // (first 3 letters of the country name, e.g. "TUN" for Tunisie) whenever a
        // country is created without an explicit Code, so both forms are accepted —
        // see Iso3ToIso2 below, which maps the 3-letter forms this app actually
        // generates back onto these keys.
        private static readonly Dictionary<string, string> DialCodes = new()
        {
            { "BE", "32" },
            { "FR", "33" },
            { "CH", "41" },
            { "MA", "212" },
            { "TN", "216" },
            { "LU", "352" },
        };

        // ✅ Patterns now only match normalized (+prefix) numbers
        private static readonly Dictionary<string, string> PhonePatterns = new()
        {
           { "FR", @"^\+33[1-9]\d{8}$" },
            { "BE", @"^\+32[1-9]\d{7,8}$" },
            { "CH", @"^\+41[1-9]\d{8}$" },
            { "MA", @"^\+212[5-7]\d{8}$" },
            { "TN", @"^\+216[2-9]\d{7}$" },
            { "LU", @"^\+352[2-9]\d{7,9}$" },
        };

        // Maps the 3-letter codes CountryService.GenerateCode produces (first 3
        // uppercase letters of the country name) onto the 2-letter keys above.
        private static readonly Dictionary<string, string> Iso3ToIso2 = new()
        {
            { "TUN", "TN" }, // Tunisie
            { "FRA", "FR" }, // France
            { "BEL", "BE" }, // Belgique
            { "SUI", "CH" }, // Suisse
            { "MAR", "MA" }, // Maroc
            { "LUX", "LU" }, // Luxembourg
        };

        private static string? ResolveKnownCode(string countryCode)
        {
            if (string.IsNullOrEmpty(countryCode))
                return null;

            var upper = countryCode.ToUpperInvariant();
            if (DialCodes.ContainsKey(upper))
                return upper;

            return Iso3ToIso2.TryGetValue(upper, out var iso2) ? iso2 : null;
        }

        public static string NormalizePhoneNumber(string phone, string countryCode)
        {
            if (string.IsNullOrEmpty(phone))
                return phone;

            var cleaned = Regex.Replace(phone, @"[\s\-\(\)\.]", "");

            var resolvedCode = ResolveKnownCode(countryCode);
            if (resolvedCode == null)
            {
                // Unrecognized country code (unknown format). Don't crash the whole
                // import over one country's code — just return the number with
                // formatting characters stripped; it will fail the (permissive)
                // fallback pattern check in ValidatePhone if it's not plausible.
                return cleaned;
            }

            var countryDigits = DialCodes[resolvedCode];
            var prefixWithPlus = "+" + countryDigits;

            if (!cleaned.StartsWith("+"))
            {
                if (cleaned.StartsWith(countryDigits))
                    cleaned = "+" + cleaned;
                else if (cleaned.StartsWith("0"))
                    cleaned = prefixWithPlus + cleaned.Substring(1);
                else
                    cleaned = prefixWithPlus + cleaned;
            }

            // ✅ Fix double-prefix: +330XXXXXXXX → +33XXXXXXXX
            if (cleaned.StartsWith(prefixWithPlus + "0"))
            {
                cleaned = prefixWithPlus + cleaned.Substring(prefixWithPlus.Length + 1);
            }

            return cleaned;
        }

        public static PhoneValidationResult ValidatePhone(string phone, string countryCode)
        {
            var result = new PhoneValidationResult();

            if (string.IsNullOrEmpty(phone))
            {
                result.IsValid = false;
                result.ErrorMessage = "Phone number is empty";
                return result;
            }

            var normalized = NormalizePhoneNumber(phone, countryCode);
            result.NormalizedPhone = normalized;

            // Clean any remaining formatting characters
            var cleaned = Regex.Replace(normalized, @"[\s\-\(\)\.]", "");

            var resolvedCode = ResolveKnownCode(countryCode);
            if (resolvedCode != null && PhonePatterns.TryGetValue(resolvedCode, out var pattern))
            {
                result.IsValid = Regex.IsMatch(cleaned, pattern);
                if (!result.IsValid)
                    result.ErrorMessage = $"Invalid format for {countryCode}: got '{cleaned}'";
            }
            else
            {
                result.IsValid = Regex.IsMatch(cleaned, @"^\+\d{8,15}$");
                if (!result.IsValid)
                    result.ErrorMessage = "Phone must be 8-15 digits with country code";
            }

            return result;
        }
    }
}