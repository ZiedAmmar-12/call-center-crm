namespace Backend.DTOs.Lead;

public class LeadDto
{
    public long Id { get; set; }
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Status { get; set; }
    public string? PostalCode { get; set; }
    public string? CampaignName { get; set; }
    public string? CompanyName { get; set; }
    public string? Agent { get; set; }
}

public class LeadStatsDto
{
    public int Total { get; set; }
    public List<CampaignCountDto> Campaigns { get; set; } = new();
    public List<StatusCountDto> Statuses { get; set; } = new();
}

public class CampaignCountDto
{
    public string Campaign { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class StatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ImportResultDto
{
    public bool Success { get; set; }
    public string? Filename { get; set; }
    public int Imported { get; set; }
    public string? Campaign { get; set; }
}
