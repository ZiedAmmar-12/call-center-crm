namespace Backend.DTOs.Alert;

public class AlertRuleDto
{
    public long Id { get; set; }
    public string RuleType { get; set; } = string.Empty;
    public int ThresholdValue { get; set; }
    public string? NotificationEmail { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateAlertRuleDto
{
    public string RuleType { get; set; } = string.Empty;
    public int ThresholdValue { get; set; }
    public string? NotificationEmail { get; set; }
}

public class UpdateAlertRuleDto
{
    public int? ThresholdValue { get; set; }
    public bool? IsActive { get; set; }
}

public class AlertHistoryDto
{
    public long Id { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = "warning";
    public string? Message { get; set; }
    public int ThresholdValue { get; set; }
    public float ActualValue { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AlertCheckResultDto
{
    public List<AlertItemDto> Alerts { get; set; } = new();
    public int Count { get; set; }
}

public class AlertItemDto
{
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = "warning";
    public string? Message { get; set; }
    public int ThresholdValue { get; set; }
    public float ActualValue { get; set; }
}
