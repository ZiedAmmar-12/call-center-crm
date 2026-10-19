namespace Backend.DTOs.Admin;

public class ConfirmatriceAgendaDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // CONF1 ou CONF2
    public List<string> AgendasAccess { get; set; } = new();
}

public class AssignAgendaDTO
{
    public string AgendaId { get; set; } = string.Empty;
    public bool Assigned { get; set; }
}

public class AgendaDisponibleDTO
{
    public string Id { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}