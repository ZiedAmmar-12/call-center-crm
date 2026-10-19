// Backend/Services/RingOver/IRingOverService.cs
namespace Backend.Services.RingOver
{
    public interface IRingOverService
    {
        Task<string?> InitiateCallAsync(string agentRingOverNumber, string contactPhone);
    }
}