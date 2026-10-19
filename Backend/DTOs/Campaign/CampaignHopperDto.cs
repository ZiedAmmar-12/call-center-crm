namespace Backend.DTOs.Campaign
{
    public class CampaignHopperDto
    {
        public int CampaignId { get; set; }
        public bool AutoPoolSizing { get; set; }
        public int ActivePoolTarget { get; set; }
        public int LowContactsThreshold { get; set; }
        public int ContactsPerAgentPerHour { get; set; }
        public int PoolBufferHours { get; set; }
        public int MaxPoolTarget { get; set; }
        public int MinPoolTarget { get; set; }
        public decimal LowPoolRatio { get; set; }
        public int ActiveAgents { get; set; }
        public int ActiveAssignableContacts { get; set; }
        public int PendingBacklogContacts { get; set; }
        public int TotalPendingContacts { get; set; }
        public int TargetContacts { get; set; }
        public int LowThresholdContacts { get; set; }
        public double EstimatedContactsPerAgentPerHour { get; set; }
        public int CompletedLastTwoHours { get; set; }
        public string Status { get; set; } = "empty";
    }
}
