using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Proxy vers Groq (Llama 3.3 70B) pour le chatbot assistant centre d'appel</summary>
[ApiController]
[Route("api/ai-chat")]
[Authorize]
public class AiChatController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;

    private const string SYSTEM_PROMPT =
        "Tu es un assistant IA expert pour EBI Énergie, un centre d'appels spécialisé dans la vente de solutions " +
        "énergétiques (solaire, pompes à chaleur, isolation, etc.).\n\n" +
        "Tu aides les agents, confirmatrices, superviseurs et autres membres de l'équipe avec :\n" +
        "- La qualification des prospects et contacts\n" +
        "- Les objections courantes des clients et comment les traiter\n" +
        "- Les techniques de vente et de prise de rendez-vous\n" +
        "- Les produits énergétiques (panneaux solaires, pompes à chaleur, isolation thermique)\n" +
        "- Les aides financières (MaPrimeRénov', CEE, TVA réduite)\n" +
        "- La rédaction de scripts d'appel et de réponses aux clients\n" +
        "- L'analyse des KPIs et bonnes pratiques CRM\n\n" +
        "Réponds toujours en français, de manière concise et professionnelle.";

    public AiChatController(IConfiguration config, IHttpClientFactory httpFactory)
    {
        _config   = config;
        _httpFactory = httpFactory;
    }

    public record ChatMessageDto(string Role, string Content);
    public record ChatRequestDto(List<ChatMessageDto> Messages);

    /// <summary>Envoyer un message au chatbot IA (Groq / Llama 3.3)</summary>
    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] ChatRequestDto request)
    {
        if (request?.Messages == null || request.Messages.Count == 0)
            return BadRequest(new { error = "Messages requis." });

        var apiKey = _config["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "VOTRE_CLE_API_GROQ")
            return StatusCode(503, new { error = "Clé API Groq non configurée. Créez une clé gratuite sur console.groq.com et ajoutez-la dans appsettings.json." });

        var model     = _config["Groq:Model"]    ?? "llama-3.3-70b-versatile";
        var maxTokens = _config.GetValue<int>("Groq:MaxTokens", 1024);

        // Build messages list: system + conversation
        var messages = new List<object>
        {
            new { role = "system", content = SYSTEM_PROMPT }
        };
        messages.AddRange(
            request.Messages
                .Where(m => m.Role is "user" or "assistant")
                .Select(m => (object)new { role = m.Role, content = m.Content })
        );

        var body = new
        {
            model,
            max_tokens = maxTokens,
            messages,
            temperature = 0.7
        };

        using var client = _httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var json    = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage resp;
        try
        {
            resp = await client.PostAsync("https://api.groq.com/openai/v1/chat/completions", content);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Erreur de connexion à Groq : {ex.Message}" });
        }

        var raw = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("error", out var err))
                {
                    var msg = err.TryGetProperty("message", out var m) ? m.GetString() : raw;
                    return StatusCode((int)resp.StatusCode, new { error = msg });
                }
            }
            catch { }
            return StatusCode((int)resp.StatusCode, new { error = "Erreur API Groq." });
        }

        try
        {
            using var doc  = JsonDocument.Parse(raw);
            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return Ok(new { reply = text });
        }
        catch
        {
            return StatusCode(500, new { error = "Réponse inattendue de Groq." });
        }
    }
}
