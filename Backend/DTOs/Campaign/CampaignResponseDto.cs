using Backend.Entities;

namespace Backend.DTOs.Campaign
{
	public class CampaignResponseDto
	{
		public int Id { get; set; }
		public string Name { get; set; } = string.Empty;
		public string? Description { get; set; }
		public DateTime? StartDate { get; set; }
		public DateTime? CreatedAt { get; set; }
		public DateTime? UpdatedAt { get; set; }
        public CampaignStatus Status { get; set; }
        public int RecycleCount { get; set; }  // How many times this campaign has been recycled
        public int CreatedByUserId { get; set; }
		public string? CreatedByUserName { get; set; }
		public int TotalContacts { get; set; }      // Sum of all contacts in all files
		public int QualifiedContacts { get; set; }  // How many qualified
		public int RemainingContacts { get; set; }  // Still to call
		public bool AutoPoolSizing { get; set; }
		public int ActivePoolTarget { get; set; }
		public int LowContactsThreshold { get; set; }
		public int ContactsPerAgentPerHour { get; set; }
		public int PoolBufferHours { get; set; }
		public int MaxPoolTarget { get; set; }
		public int MinPoolTarget { get; set; }
		public decimal LowPoolRatio { get; set; }
													// Associated data
		public List<CampaignFileDto> CampaignFiles { get; set; } = new();
		public List<CampaignAgentDto> CampaignAgents { get; set; } = new();
	}
}
