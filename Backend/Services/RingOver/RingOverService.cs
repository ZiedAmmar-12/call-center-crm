using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;


namespace Backend.Services.RingOver
{
    public class RingOverService : IRingOverService
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly ILogger<RingOverService> _logger;

        public RingOverService(HttpClient http , IConfiguration config, ILogger<RingOverService> logger)
        {
            _http = http;
            _apiKey = config["RingOver:ApiKey"];
            _logger = logger;
        }

        public async Task<string?> InitiateCallAsync( string agentRingOverNumber,string contactPhone)
        {
            var payload = new             
            {
                agent_number = agentRingOverNumber,
                contact_number = contactPhone
            };
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.ringover.com/v2/calls");
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _http.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to initiate call: {Error}", error);
                    return null;
                }
            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(json);

            // RingOver returns a call_id — we save this to match the webhook later
            return result.GetProperty("call_id").GetString();
        }
        public void MakeCall(string phoneNumber)
        {
            // Logic to make a call using RingOver API
        }
        public void SendMessage(string phoneNumber, string message)
        {
            // Logic to send a message using RingOver API
        }
    }
}
