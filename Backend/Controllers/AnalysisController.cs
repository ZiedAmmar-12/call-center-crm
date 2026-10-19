using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs.Ai;
using System.Text.RegularExpressions;

namespace Backend.Controllers;

/// <summary>
/// Analyse IA des transcriptions d'appel — diarisation, détection refus,
/// qualification, sentiment, résumé automatique, extraction code postal.
/// Toute la logique est rule-based (pas de dépendance LLM externe).
/// </summary>
[ApiController]
[Route("api/analyze")]
[Authorize]
public class AnalysisController : ControllerBase
{
    // ── POST /api/analyze/transcript ─────────────────────────────────────────
    /// <summary>Analyse complète d'une transcription texte.</summary>
    [HttpPost("transcript")]
    public IActionResult AnalyzeTranscript([FromBody] TranscriptAnalysisRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Transcript))
            return BadRequest(new { error = "Transcript requis" });

        var transcript = dto.Transcript;
        var qualification = dto.Qualification ?? "PV";

        var diarization = Diarize(transcript, dto.CallDuration);
        var refusal = DetectRefusal(transcript);
        var qualCheck = CheckQualification(qualification, transcript);
        var appointment = DetectAppointment(transcript);
        var inactivity = AnalyzeInactivity(dto.CallDuration, transcript);
        var postalCode = ExtractPostalCode(transcript);
        var script = AnalyzeScript(transcript, qualification, refusal);
        var summary = Summarize(transcript, dto.AgentName, script);

        return Ok(new
        {
            sentiment = script.Sentiment,
            sentiment_score = script.SentimentScore,
            score_percentage = script.ScorePercentage,
            performance = script.Performance,
            summary = summary.Summary,
            keywords = summary.Keywords.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
            score_ecoute = script.ScoreEcoute,
            score_persuasion = script.ScorePersuasion,
            score_empathie = script.ScoreEmpathie,
            score_argumentation = script.ScoreArgumentation,
            score_refus = script.ScoreRefus,
            score_vente = script.ScoreVente,
            agent_talk_ratio = diarization.AgentTalkRatio,
            client_talk_ratio = diarization.ClientTalkRatio,
            labeled_transcript = diarization.LabeledTranscript,
            script_respected = script.ScriptRespected,
            objections_handled = script.ObjectionsHandled,
            customer_intent = script.CustomerIntent,
            next_steps = script.NextSteps,
            refusal_detected = refusal.RefusalDetected,
            refusal_motive = refusal.PrimaryMotive,
            refusal_keywords = refusal.RefusalKeywords,
            suggested_response = refusal.SuggestedResponse,
            inactivity_detected = inactivity.InactivityDetected,
            inactivity_reason = inactivity.Reason,
            appointment_detected = appointment.Detected,
            appointment_confidence = appointment.Confidence,
            qualification_coherent = qualCheck.Coherent,
            qualification_details = qualCheck.Details,
            postal_code = postalCode.PostalCode,
            postal_region = postalCode.Region
        });
    }

    // ── POST /api/analyze/check-refusal ──────────────────────────────────────
    [HttpPost("check-refusal")]
    public IActionResult CheckRefusal([FromBody] RefusalCheckDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Transcript))
            return BadRequest(new { error = "Transcript requis" });
        return Ok(DetectRefusal(dto.Transcript));
    }

    // ── POST /api/analyze/check-qualification ────────────────────────────────
    [HttpPost("check-qualification")]
    public IActionResult CheckQualif([FromBody] QualificationCheckDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Transcript))
            return BadRequest(new { error = "Transcript requis" });
        return Ok(CheckQualification(dto.Qualification, dto.Transcript));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE-BASED ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    private static DiarizationResultDto Diarize(string text, int? callDuration)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new DiarizationResultDto { Method = "none" };

        var agentSegments = new List<string>();
        var clientSegments = new List<string>();
        var labeledLines = new List<string>();

        foreach (var line in text.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var t = line.Trim();
            if (Regex.IsMatch(t, @"^(Agent|Conseiller|Commercial|Moi)\s*[:\-–—]", RegexOptions.IgnoreCase))
            {
                var seg = Regex.Replace(t, @"^(Agent|Conseiller|Commercial|Moi)\s*[:\-–—]\s*", "", RegexOptions.IgnoreCase);
                agentSegments.Add(seg);
                labeledLines.Add($"[Agent] {seg}");
            }
            else if (Regex.IsMatch(t, @"^(Client|Prospect|Lui|Elle)\s*[:\-–—]", RegexOptions.IgnoreCase))
            {
                var seg = Regex.Replace(t, @"^(Client|Prospect|Lui|Elle)\s*[:\-–—]\s*", "", RegexOptions.IgnoreCase);
                clientSegments.Add(seg);
                labeledLines.Add($"[Client] {seg}");
            }
            else if (!string.IsNullOrWhiteSpace(t))
            {
                var isAgent = agentSegments.Count <= clientSegments.Count;
                if (isAgent) { agentSegments.Add(t); labeledLines.Add($"[Agent] {t}"); }
                else { clientSegments.Add(t); labeledLines.Add($"[Client] {t}"); }
            }
        }

        var agentWords = string.Join(" ", agentSegments).Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var clientWords = string.Join(" ", clientSegments).Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var total = agentWords + clientWords;

        float agentRatio = total > 0 ? (float)Math.Round((float)agentWords / total, 3) : 0;
        float clientRatio = total > 0 ? (float)Math.Round((float)clientWords / total, 3) : 0;

        float agentSecs = 0, clientSecs = 0;
        if (callDuration.HasValue && callDuration.Value > 0 && total > 0)
        {
            var wps = (float)total / callDuration.Value;
            agentSecs = wps > 0 ? (float)Math.Round(agentWords / wps, 1) : 0;
            clientSecs = wps > 0 ? (float)Math.Round(clientWords / wps, 1) : 0;
        }

        return new DiarizationResultDto
        {
            LabeledTranscript = string.Join("\n", labeledLines),
            AgentText = string.Join(" ", agentSegments),
            ClientText = string.Join(" ", clientSegments),
            AgentTalkRatio = agentRatio,
            ClientTalkRatio = clientRatio,
            AgentSeconds = agentSecs,
            ClientSeconds = clientSecs,
            Method = "rule_based"
        };
    }

    private static RefusalResultDto DetectRefusal(string transcript)
    {
        var lower = transcript.ToLowerInvariant();
        var refusalKeywords = new[] {
            "pas intéressé", "trop cher", "je réfléchis", "pas maintenant",
            "je ne veux pas", "non merci", "rappelez plus tard",
            "ça ne m'intéresse pas", "laissez tomber", "pas le temps",
            "déjà équipé", "pas besoin", "je verrai", "peut-être plus tard"
        };
        var found = refusalKeywords.Where(k => lower.Contains(k)).ToList();

        var categories = new List<string>();
        if (new[] { "trop cher", "budget", "pas les moyens" }.Any(p => lower.Contains(p))) categories.Add("budget");
        if (new[] { "pas le temps", "occupé", "pas maintenant" }.Any(p => lower.Contains(p))) categories.Add("timing");
        if (new[] { "déjà équipé", "pas besoin", "pas intéressé" }.Any(p => lower.Contains(p))) categories.Add("besoin");
        if (new[] { "réfléchis", "je verrai", "peut-être", "plus tard" }.Any(p => lower.Contains(p))) categories.Add("report");

        var primary = categories.FirstOrDefault() ?? "none";
        var suggested = primary switch
        {
            "budget" => "Mettre en avant les aides financières et le retour sur investissement",
            "timing" => "Proposer un rendez-vous à un moment plus adapté",
            "besoin" => "Identifier les besoins non couverts actuels",
            "report" => "Proposer un suivi à une date précise plutôt qu'un rappel vague",
            _ => "Poser une question ouverte pour identifier le vrai motif"
        };

        return new RefusalResultDto
        {
            RefusalDetected = found.Count > 0,
            Confidence = found.Count > 0 ? Math.Min(found.Count * 20, 95) : 0,
            RefusalKeywords = found,
            Categories = categories,
            PrimaryMotive = primary,
            SuggestedResponse = suggested
        };
    }

    private static QualificationResultDto CheckQualification(string qualification, string transcript)
    {
        var qualMap = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["PV"] = new[] { "panneau", "solaire", "photovoltaique", "toiture", "électricité", "onduleur", "kwh", "ensoleillement" },
            ["PAC"] = new[] { "pompe", "chaleur", "climatisation", "chauffage", "radiateur", "thermostat", "aérothermie", "géothermie", "réversible" },
            ["ISOLATION"] = new[] { "isolation", "isolant", "combles", "murs", "laine", "polystyrène", "thermique", "acoustique", "ITE", "ITI" },
            ["CCE"] = new[] { "chauffe-eau", "cumulus", "ballon", "eau chaude", "thermique", "résistance" }
        };
        var keywords = qualMap.TryGetValue(qualification, out var kws) ? kws : Array.Empty<string>();
        var lower = transcript.ToLowerInvariant();
        var found = keywords.Count(kw => lower.Contains(kw.ToLower()));
        var ratio = keywords.Length > 0 ? (double)found / keywords.Length : 0;
        var coherent = keywords.Length == 0 || ratio >= 0.3;

        var refusalPatterns = new[] { "pas intéressé", "trop cher", "non merci", "rappelez plus tard" };
        var refusalDetected = refusalPatterns.Count(r => lower.Contains(r)) >= 2;

        return new QualificationResultDto
        {
            Coherent = coherent && !refusalDetected,
            Details = coherent
                ? $"Qualification cohérente ({found}/{keywords.Length} mots-clés, ratio {ratio:P0})"
                : $"Attention: seulement {found}/{keywords.Length} mots-clés ({ratio:P0})" +
                  (refusalDetected ? " + motifs de refus détectés" : ""),
            RefusalDetected = refusalDetected
        };
    }

    private static AppointmentDetectResultDto DetectAppointment(string transcript)
    {
        var patterns = new[] {
            @"rdv", @"rendez[- ]vous", @"le \d{1,2}", @"demain",
            @"lundi|mardi|mercredi|jeudi|vendredi", @"à \d{1,2}[h:]"
        };
        var detected = patterns.Any(p => Regex.IsMatch(transcript, p, RegexOptions.IgnoreCase));
        return new AppointmentDetectResultDto { Detected = detected, Confidence = detected ? 70 : 0, RequiresValidation = true };
    }

    private static InactivityResultDto AnalyzeInactivity(int? callDuration, string transcript)
    {
        if (!callDuration.HasValue || callDuration.Value <= 0)
            return new InactivityResultDto();

        if (callDuration.Value < 30)
            return new InactivityResultDto
            {
                InactivityDetected = true,
                InactivityDuration = 30 - callDuration.Value,
                Reason = "Appel anormalement court (moins de 30s)"
            };

        var wordCount = transcript.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var expectedWords = callDuration.Value * 2;
        if (wordCount < expectedWords * 0.3)
            return new InactivityResultDto
            {
                InactivityDetected = true,
                InactivityDuration = (float)Math.Round(callDuration.Value * (1f - (float)wordCount / expectedWords), 1),
                Reason = "Faible volume de parole par rapport à la durée d'appel"
            };

        return new InactivityResultDto();
    }

    private static PostalCodeExtractResultDto ExtractPostalCode(string transcript)
    {
        var match = Regex.Match(transcript, @"\b(0[1-9]|[1-9]\d)\d{3}\b");
        if (!match.Success) return new PostalCodeExtractResultDto { Extracted = false };

        var code = match.Value;
        var region = code[..2] switch
        {
            "75" or "91" or "92" or "93" or "94" or "95" or "77" or "78" => "Île-de-France",
            "69" => "Auvergne-Rhône-Alpes",
            "13" or "83" or "84" or "06" or "04" or "05" => "Provence-Alpes-Côte d'Azur",
            "33" or "24" or "47" or "40" or "64" or "17" or "16" or "87" or "19" or "23" => "Nouvelle-Aquitaine",
            "59" or "62" or "02" or "60" or "80" => "Hauts-de-France",
            "31" or "81" or "82" or "46" or "65" or "09" or "11" or "34" or "66" or "30" or "48" or "12" => "Occitanie",
            "44" or "85" or "49" or "53" or "72" => "Pays de la Loire",
            "35" or "22" or "29" or "56" => "Bretagne",
            "67" or "68" or "57" or "54" or "88" or "55" or "08" or "51" or "10" or "52" => "Grand Est",
            "76" or "27" or "14" or "50" or "61" => "Normandie",
            "37" or "41" or "45" or "28" or "36" or "18" => "Centre-Val de Loire",
            "21" or "25" or "39" or "70" or "71" or "58" or "89" => "Bourgogne-Franche-Comté",
            _ => "Autre"
        };

        return new PostalCodeExtractResultDto { PostalCode = code, Region = region, Extracted = true };
    }

    private static ScriptAnalysisResultDto AnalyzeScript(string transcript, string qualification, RefusalResultDto refusal)
    {
        var lower = transcript.ToLowerInvariant();
        var words = lower.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

        // Heuristic scoring
        int ecoute = ContainsAny(lower, "j'entends", "je comprends", "tout à fait", "effectivement", "c'est normal") ? 7 : 5;
        int persuasion = ContainsAny(lower, "avantage", "bénéfice", "économie", "aide", "gratuit", "subvention") ? 7 : 5;
        int empathie = ContainsAny(lower, "comprends", "inquiétude", "préoccupation", "rassure", "tranquille") ? 7 : 5;
        int argumentation = ContainsAny(lower, "exemple", "cas", "résultat", "client", "témoignage") ? 7 : 5;
        int gestionRefus = refusal.RefusalDetected ? (ContainsAny(lower, "cependant", "néanmoins", "mais", "par contre") ? 6 : 4) : 7;
        int vente = ContainsAny(lower, "rdv", "rendez-vous", "confirme", "accord", "parfait", "excellent") ? 8 : 5;

        var avg = (ecoute + persuasion + empathie + argumentation + gestionRefus + vente) / 6.0;
        var score = Math.Round(avg * 10, 1);

        var sentiment = refusal.RefusalDetected ? "NEGATIVE"
            : ContainsAny(lower, "parfait", "excellent", "oui", "intéressé", "accord", "super") ? "POSITIVE"
            : "NEUTRAL";
        var sentimentScore = sentiment == "POSITIVE" ? 0.75 : sentiment == "NEGATIVE" ? 0.25 : 0.5;
        var performance = score >= 70 ? "Excellent" : score >= 55 ? "Bon" : score >= 40 ? "Moyen" : "À améliorer";

        var scriptRespected = ContainsAny(lower, "bonjour", "je m'appelle", "je vous appelle", "je suis");
        var objectionsHandled = refusal.RefusalDetected && gestionRefus >= 6;

        string? customerIntent = refusal.RefusalDetected ? "Refus" : ContainsAny(lower, "rdv", "rendez-vous", "intéressé", "accord") ? "Intéressé" : "À qualifier";
        string? nextSteps = customerIntent == "Intéressé" ? "Confirmer le rendez-vous" : customerIntent == "Refus" ? "Archiver le contact" : "Rappeler sous 48h";

        return new ScriptAnalysisResultDto
        {
            ScoreEcoute = ecoute,
            ScorePersuasion = persuasion,
            ScoreEmpathie = empathie,
            ScoreArgumentation = argumentation,
            ScoreRefus = gestionRefus,
            ScoreVente = vente,
            SentimentScore = sentimentScore,
            Sentiment = sentiment,
            ScorePercentage = score,
            Performance = performance,
            ScriptRespected = scriptRespected,
            ObjectionsHandled = objectionsHandled,
            CustomerIntent = customerIntent,
            NextSteps = nextSteps
        };
    }

    private static SummarizeResultDto Summarize(string transcript, string? agentName, ScriptAnalysisResultDto script)
    {
        // Rule-based summary: extract first 3 meaningful sentences
        var sentences = transcript.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => s.Length > 20)
            .Take(3)
            .ToList();

        var summary = sentences.Count > 0
            ? string.Join(". ", sentences) + "."
            : transcript.Length > 200 ? transcript[..200] + "..." : transcript;

        // Extract keywords from qualification + sentiment signals
        var keywordPool = new List<string>();
        var lower = transcript.ToLowerInvariant();
        foreach (var kw in new[] { "rdv", "rendez-vous", "intéressé", "refus", "rappel", "chauffage", "solaire", "PAC", "isolation", "aide", "subvention", "budget" })
            if (lower.Contains(kw.ToLower())) keywordPool.Add(kw);

        return new SummarizeResultDto
        {
            Summary = summary,
            Keywords = string.Join(", ", keywordPool.Take(8))
        };
    }

    private static bool ContainsAny(string text, params string[] terms)
        => terms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));
}
