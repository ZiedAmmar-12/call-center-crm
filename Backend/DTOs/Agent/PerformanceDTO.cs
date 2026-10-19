using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs.Agent;

public class PerformanceDTO
{
    public long Id { get; set; }
    public long AgentId { get; set; }
    public string NomAgent { get; set; } = string.Empty;
    public DateTime DateDebut { get; set; }
    public DateTime DateFin { get; set; }
    public string Periode { get; set; } = string.Empty;

    // Appels
    public int NbAppels { get; set; }
    public int NbAppelsQualifies { get; set; }

    // Rendez-vous
    public int NbRendezVousBruts { get; set; }
    public int NbRendezVousConfirmes { get; set; }
    public int NbRendezVousAnnules { get; set; }
    public int NbRendezVousReportes { get; set; }
    public int NbRendezVousHC { get; set; }
    public int NbRendezVousNonSignes { get; set; }
    public int NbRendezVousSignes { get; set; }
    public int NbInstallations { get; set; }

    // Objectifs
    public int ObjectifMensuel { get; set; }
    public bool ObjectifAtteint { get; set; }

    // Primes
    public double PrimeAssiduite { get; set; }
    public double PrimeMensuelle { get; set; }
    public double PrimeTrimestrielle { get; set; }
    public double TotalPrimes { get; set; }
}

public class RemunerationDTO
{
    public long AgentId { get; set; }
    public string NomAgent { get; set; } = string.Empty;
    public string TypeContrat { get; set; } = string.Empty;
    public int Annee { get; set; }
    public int Mois { get; set; }

    // Salaire
    public double SalaireBase { get; set; }
    public double PrimeAssiduite { get; set; }
    public double PrimeMensuelle { get; set; }
    public double PrimeTrimestrielle { get; set; }
    public double TotalEstime { get; set; }

    // Conditions
    public int NbAbsences { get; set; }
    public int NbRetards { get; set; }
    public int NbRendezVous { get; set; }
    public int NbInstallations { get; set; }
    public bool PrimeAssiduiteEligible { get; set; }
    public string Details { get; set; } = string.Empty;
}