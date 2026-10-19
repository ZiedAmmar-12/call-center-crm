namespace Backend.Entities;

/// <summary>Utilisateur du service technique (support / IT)</summary>
public class Technique : Utilisateur
{
    public Technique()
    {
        Service = "TECHNIQUE";
    }
}
