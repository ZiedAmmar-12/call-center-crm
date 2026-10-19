namespace Backend.DTOs.Campaign
{
    public class RecycleCampaignFileRequestDto
    {
        public List<string> QualificationStatuses { get; set; } = new();
    }

    public class RecycleQualificationCountDto
    {
        public string QualificationStatus { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class RecycleOptionsResponseDto
    {
        public int CampaignId { get; set; }
        public int CampaignFileId { get; set; }
        public int TotalQualifiedContacts { get; set; }
        public List<RecycleQualificationCountDto> QualificationCounts { get; set; } = new();
    }

    public class RecycleCampaignFileResponseDto
    {
        public int CampaignId { get; set; }
        public string CampaignName { get; set; } = string.Empty;
        public int CampaignFileId { get; set; }
        public int SourceFileId { get; set; }
        public string SourceFileName { get; set; } = string.Empty;
        public int ContactsRecycled { get; set; }
        public List<string> QualificationStatuses { get; set; } = new();
        public DateTime RecycledAt { get; set; }
    }
}
