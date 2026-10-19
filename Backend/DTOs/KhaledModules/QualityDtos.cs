namespace Backend.DTOs.Quality;

public class CreateEvaluationDto
{
    public long AgentId { get; set; }
    public string? CallRef { get; set; }
    public float? GlobalScore { get; set; }
    public string? Decision { get; set; }
    public string? Commentaires { get; set; }
    public Dictionary<string, int>? Scores { get; set; }
}

public class EvaluationDto
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public string? AgentName { get; set; }
    public long EvaluatorId { get; set; }
    public string? EvaluatorName { get; set; }
    public DateTime EvaluationDate { get; set; }
    public string? CallRef { get; set; }
    public float GlobalScore { get; set; }
    public string? Decision { get; set; }
    public string? Commentaires { get; set; }
    public string? ScoresJson { get; set; }
}

public class QualityStatsDto
{
    public int Total { get; set; }
    public double AvgScore { get; set; }
    public Dictionary<string, int> ByDecision { get; set; } = new();
}
