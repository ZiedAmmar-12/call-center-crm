using Backend.DTOs.Confirmation;

namespace Backend.Services.Confirmation;

public interface IConfirmationService
{
    // Pour Confirmatrice 1
    Task<ConfirmationDashboardDTO> GetDashboardAsync();
    Task<List<AgentEvaluationDTO>> GetAgentsEvaluationAsync();
    Task<List<FichierContactDTO>> GetFichiersContactsAsync();
    Task<StatistiquesGlobalesDTO> GetStatistiquesGlobalesAsync(string periode = "mois");
    Task<RdvConfirmationDTO> UpdateRdvStatutAsync(long rdvId, string statut, string? commentaire);
    
    // Pour Confirmatrice 2
    Task<List<RdvConfirmationDTO>> GetAgendaClientAsync();
    Task<List<CommercialDTO>> GetCommerciauxAsync();
    Task<RdvConfirmationDTO> AssignerCommercialAsync(long rdvId, long commercialId);
    Task<RdvConfirmationDTO> UpdateCommentaireBanqueAsync(long rdvId, string? commentaire);
}