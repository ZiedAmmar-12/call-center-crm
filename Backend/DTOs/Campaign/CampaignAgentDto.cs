using Backend.Entities;
using Backend.Entities;

namespace Backend.DTOs.Campaign
{
    public class CampaignAgentDto
    {
        public int Id { get; set; }
        public int CampaignId { get; set; }
        public int AgentId { get; set; }
        public int UserId { get; set; } 
        public string AgentName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime AssignedAt { get; set; }
        public int AssignedByUserId { get; set; }
        public int? Quota { get; set; }

        // Statistics (calculated from CampaignFileContact)
        public int ContactsAssigned { get; set; }
        public int ContactsCalled { get; set; }
        public int RdvCount { get; set; }
    }

    public class AssignAgentToCampaignDto
    {
        public int UserId { get; set; }
        public int AgentId { get; set; }
        public int? Quota { get; set; }
        public int? Weight { get; set; }
        public bool IsActive { get; set; } = true;
    }
  
    public class AvailableAgentDto
        {
            public int Id { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string LastName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? Phone { get; set; }
            public bool IsActive { get; set; }
            //public double PerformanceScore { get; set; }
            public bool IsOnline{ get; set; }
        }
    public class GetNextContactResponseDto
    {
        public int ContactId { get; set; }
        public int CampaignFileContactId { get; set; }
        //contact info from source file contact
        public string? LastName { get; set; }
        public string? FirstName { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? PostalCode { get; set; }
        public string? City { get; set; }
        public string? Email { get; set; }
        // Previous qualification if re-called
        public string? PreviousQualification { get; set; }
        public string? PreviousComment { get; set; }
        public int AttemptCount { get; set; }
    }
    public class QualifyContactDto 
    {
    public string QualificationStatus { get; set; } = string.Empty;

    public string? AgentComment { get; set; }
    public string? Projet { get; set; }
    // Fiche fields — required based on qualification
    public int? ProprietaireDepuis { get; set; }
    public string? ModeChauffage { get; set; }
    public string? ConsommationChauffage { get; set; }
    public int? AgeChaudiere { get; set; }
    public bool? EquipePV { get; set; }
    public bool? EquipePAC { get; set; }
    public string? EtatToiture { get; set; }
    public string? EtatIsolation { get; set; }
    public int? NbrePersonnes { get; set; }
    public string? ProfessionMr { get; set; }
    public string? ProfessionMme { get; set; }
    public string? Revenus { get; set; }
    public bool? Credits { get; set; }
    public bool? Fichage { get; set; }

    // For RDV statuses
    public DateTime? AppointmentDate { get; set; }
    public string? AppointmentType { get; set; }

    // For ARappeler
    public DateTime? NextCallAt { get; set; }

}
}
