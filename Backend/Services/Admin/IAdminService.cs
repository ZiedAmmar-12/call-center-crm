using Backend.DTOs.Admin;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Services.Admin;

public interface IAdminService
{
    Task<DashboardAdminDTO> GetDashboardLiveAsync();
    Task<List<AgentStatutDTO>> GetAgentsStatutAsync();
    Task<List<ScorecardAgentDTO>> GetScorecardsAgentsAsync();
    Task<List<AgentSuiviDTO>> GetAgentsSuiviAsync();
    Task<PointageAdminDTO> GetPointageAsync(DateTime date);
    Task<CarteGeographiqueDTO> GetCarteGeographiqueAsync(string pays = "all");
    Task<ConfigurationIADTO> GetConfigurationIAAsync();
    Task UpdateConfigurationIAAsync(ConfigurationIADTO config);
    Task<List<UtilisateurDTO>> GetUtilisateursAsync();
    Task<UtilisateurDTO> CreateUtilisateurAsync(UtilisateurRequestDTO request);
    Task DeleteUtilisateurAsync(long id);
    
    // Nouvelles méthodes pour la gestion des agendas des confirmatrices
    Task<List<ConfirmatriceAgendaDTO>> GetConfirmatricesAgendasAsync();
    Task<ConfirmatriceAgendaDTO> AssignAgendaToConfirmatriceAsync(long id, AssignAgendaDTO dto);
}