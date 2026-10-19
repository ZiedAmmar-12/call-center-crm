namespace Backend.DTOs.Agents
{
    public class AgentProfileDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime? HireDate { get; set; }
        public string TypeContrat { get; set; } = "PLEIN_TEMPS";
        public int ObjectifMensuel { get; set; }
        public decimal SalaireBase { get; set; }
        public decimal PrimeAssiduite { get; set; }
        public int TotalRdv { get; set; }
        public int TotalRdvConfirme { get; set; }
        public int TotalRdvSigne { get; set; }
        public int TotalRdvAnnule { get; set; }
        public int TotalPose { get; set; }
        public decimal NoteEvaluationMoyenne { get; set; }
        public DateTime? DerniereActivite { get; set; }
        public string? Notes { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AgentCampaignSummaryDto
    {
        public int CampaignAgentId { get; set; }
        public int CampaignId { get; set; }
        public string CampaignName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime AssignedAt { get; set; }
        public int? Quota { get; set; }
        public int? Weight { get; set; }
    }

    public class AgentAppointmentDto
    {
        public int CampaignFileContactId { get; set; }
        public int CampaignId { get; set; }
        public string CampaignName { get; set; } = string.Empty;
        public int AgentId { get; set; }
        public string AgentName { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? QualificationStatus { get; set; }
        public string? AppointmentType { get; set; }
        public DateTime? AppointmentDate { get; set; }
    }

    public class AgentResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Avatar { get; set; }
        public bool IsActive { get; set; }
        public bool IsOnline { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public AgentProfileDto? Profile { get; set; }
        public int ActiveCampaignsCount { get; set; }
        public List<AgentCampaignSummaryDto> Campaigns { get; set; } = new();
    }

    public class CreateAgentDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Avatar { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? HireDate { get; set; }
        public string TypeContrat { get; set; } = "PLEIN_TEMPS";
        public int ObjectifMensuel { get; set; }
        public decimal SalaireBase { get; set; }
        public decimal PrimeAssiduite { get; set; } = 100;
        public string? Notes { get; set; }
    }

    public class UpdateAgentDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? Phone { get; set; }
        public string? Avatar { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsOnline { get; set; }
        public DateTime? HireDate { get; set; }
        public string? TypeContrat { get; set; }
        public int? ObjectifMensuel { get; set; }
        public decimal? SalaireBase { get; set; }
        public decimal? PrimeAssiduite { get; set; }
        public int? TotalRdv { get; set; }
        public int? TotalRdvConfirme { get; set; }
        public int? TotalRdvSigne { get; set; }
        public int? TotalRdvAnnule { get; set; }
        public int? TotalPose { get; set; }
        public decimal? NoteEvaluationMoyenne { get; set; }
        public DateTime? DerniereActivite { get; set; }
        public string? Notes { get; set; }
    }
}
