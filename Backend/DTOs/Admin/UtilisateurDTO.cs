using System;

namespace Backend.DTOs.Admin;

public class UtilisateurDTO
{
    public long Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Type { get; set; }  // ← Ajoutez cette ligne pour CONF1/CONF2
    public string? Equipe { get; set; }
    public string? Statut { get; set; }
    public bool Actif { get; set; }
    public DateTime DateCreation { get; set; }
    public DateTime? DerniereConnexion { get; set; }
}

public class UtilisateurRequestDTO
{
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MotDePasse { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Equipe { get; set; }
}