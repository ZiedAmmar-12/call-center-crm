namespace Backend.Entities;

public class Performance
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public virtual Agent Agent { get; set; } = null!;
    
    public DateTime DateDebut { get; set; }
    public DateTime DateFin { get; set; }
    public string Periode { get; set; } = string.Empty;
    
    // Statistiques des appels
    public int NbAppels { get; set; }
    public int NbAppelsQualifies { get; set; }
    
    // Statistiques des rendez-vous
    public int NbRendezVousBruts { get; set; }
    public int NbRendezVousConfirmes { get; set; }
    public int NbRendezVousAnnules { get; set; }
    public int NbRendezVousReportes { get; set; }
    public int NbRendezVousHC { get; set; }
    public int NbRendezVousNonSignes { get; set; }
    public int NbRendezVousSignes { get; set; }
    public int NbInstallations { get; set; }
    
    // Objectifs et primes
    public int ObjectifMensuel { get; set; }
    public bool ObjectifAtteint { get; set; }
    public double PrimeAssiduite { get; set; }
    public double PrimeMensuelle { get; set; }
    public double PrimeTrimestrielle { get; set; }
    public double TotalPrimes { get; set; }
}