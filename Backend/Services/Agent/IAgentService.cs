using Backend.DTOs.Agent;

namespace Backend.Services.Agent;

public interface IAgentService
{
    Task<IEnumerable<AgentDTO>> GetAllAgentsAsync();
    Task<AgentDTO?> GetAgentByIdAsync(long id);
    Task<AgentDTO> CreateAgentAsync(CreateAgentDTO dto);
    Task<AgentDTO?> UpdateAgentAsync(long id, UpdateAgentDTO dto);
    Task<bool> DeleteAgentAsync(long id);

    // Dans IAgentService.cs, ajoutez :
    Task<DashboardAgentDTO> GetDashboardAsync(long agentId);    

    // Appels
    Task<IEnumerable<AppelDTO>> GetAppelsParAgentAsync(long agentId);
    Task<AppelDTO> EnregistrerAppelAsync(CreateAppelDTO dto);

    // Performance & Rémunération
    Task<PerformanceDTO?> GetPerformanceAsync(long agentId, int annee, int mois);
    Task<RemunerationDTO> CalculerRemunerationAsync(long agentId, int annee, int mois);

    // Pointage
    Task<IEnumerable<PointageDTO>> GetPointagesAsync(long agentId, DateTime? dateDebut, DateTime? dateFin);

    // Sécurité PC
    Task<bool> VerifierEmpreintePCAsync(long agentId, string identifiantMachine);
}