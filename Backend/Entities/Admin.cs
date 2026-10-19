namespace Backend.Entities;

public class Admin : Utilisateur
{
    // Propriétés spécifiques à l'admin
    public string? Niveau { get; set; } = "SuperAdmin";
}