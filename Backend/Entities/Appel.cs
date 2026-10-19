namespace Backend.Entities;

public class Appel
{
    public long Id { get; set; }
    public long ContactId { get; set; }
    public virtual Contact Contact { get; set; } = null!;
    
    public long AgentId { get; set; }
    public virtual Agent Agent { get; set; } = null!;
    
    public DateTime DateHeure { get; set; }
    public int DureeSecondes { get; set; }
    public TypeQualification Qualification { get; set; }
    public string? CheminEnregistrement { get; set; }
    public bool Enregistre { get; set; }
}

public enum TypeQualification
{
    RENDEZ_VOUS,
    HORS_CIBLE_LOGEMENT,
    HORS_CIBLE_AGE,
    REFUS_ABSENCE_COUPLE,
    REFUS_HORS_CIBLE_CONSO,
    REFUS_PAS_INTERESSE,
    REFUS_PAS_DE_PROJET,
    REPONDEUR,
    NRP,
    RAPPEL
}