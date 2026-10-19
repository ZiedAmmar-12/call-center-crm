using Backend.Entities;
namespace Backend.DTOs.Campaign
{
    public class CampaignFileDto
    {
        public int Id { get; set; }
        public int CampaignId { get; set; }
        public int SourceFileId { get; set; }
        public string SourceFileName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsRecycled { get; set; }
        public bool IsInjected { get; set; }
        public int Priority { get; set; }
        public int ContactsTotal { get; set; }
        public int ContactsCalled { get; set; }
        public int ContactsRemaining { get; set; }
        public DateTime? InjectedAt { get; set; }
        public DateTime? RecycledAt { get; set; }
    }

    public class AddFileToCampaignDto
    {
        public int SourceFileId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateCampaignFileStatusDto
    {
        public bool? IsActive { get; set; }  // Activate/Deactivate file in campaign
        public int? Priority { get; set; }
    }

    // UpdateFileInCampaignDto.cs
    public class UpdateFileInCampaignDto
    {
        public bool IsActive { get; set; }
    }

    // AddAgentToCampaignDto.cs
    public class AddAgentToCampaignDto
    {
        public int AgentId { get; set; }
    }

    // UpdateAgentStatusDto.cs
    public class UpdateAgentStatusDto
    {
        public bool IsActive { get; set; }
    }

    // UpdateAgentBatchSizeDto.cs
    public class UpdateAgentBatchSizeDto
    {
        public int BatchSize { get; set; }
    }

    // UpdateAgentWeightDto.cs
    public class UpdateAgentWeightDto
    {
        public int Weight { get; set; }
    }
}
