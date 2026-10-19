using Backend.Entities;

namespace Backend.DTOs.Campaign
{
    public class UpdateCampaignDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public DateTime? StartDate { get; set; }
        public bool? AutoPoolSizing { get; set; }
        public int? ActivePoolTarget { get; set; }
        public int? LowContactsThreshold { get; set; }
        public int? ContactsPerAgentPerHour { get; set; }
        public int? PoolBufferHours { get; set; }
        public int? MaxPoolTarget { get; set; }
        public int? MinPoolTarget { get; set; }
        public decimal? LowPoolRatio { get; set; }
    }
    public class UpdateCampaignStatusDto
    {
        public bool IsActive { get; set; }
    }
}
