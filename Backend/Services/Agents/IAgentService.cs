using Backend.DTOs.Agents;

namespace Backend.Services.Agents
{
    public interface IAgentService
    {
        Task<List<AgentResponseDto>> GetAllAgentsAsync();
        Task<AgentResponseDto?> GetAgentByIdAsync(int id);
        Task<AgentResponseDto> CreateAgentAsync(CreateAgentDto dto, int createdByUserId);
        Task<AgentResponseDto?> UpdateAgentAsync(int id, UpdateAgentDto dto);
        Task<bool> DeleteAgentAsync(int id);
        Task<List<AgentCampaignSummaryDto>> GetAgentCampaignsAsync(int id);
        Task<List<AgentAppointmentDto>> GetAgentAppointmentsAsync(int id);
    }
}
