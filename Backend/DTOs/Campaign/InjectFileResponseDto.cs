namespace Backend.DTOs.Campaign
{
    public class InjectFileResponseDto
    {
        public int CampaignId { get; set; }
        public int CampaignFileId { get; set; }
        public string SourceFileName { get; set; } = string.Empty;

        public int ContactsTotal { get; set; }
        public int ContactsDistributed { get; set; }

        public int AgentsCount { get; set; }           // Number of agents in the campaign
        public string DistributionMode { get; set; } = "Dynamic";  // "Dynamic" or "RoundRobin"

        public DateTime InjectedAt { get; set; }

        // Optional: Only populated in RoundRobin mode
        //public List<AgentDistributionSummary> AgentSummaries { get; set; } = new();

        // Helpful message for frontend
        public string Message { get; set; } = string.Empty;
    }

    public class AgentDistributionSummary
    {
        public int AgentId { get; set; }
        public string AgentName { get; set; } = string.Empty;
        public int ContactsAssigned { get; set; }
    }
}