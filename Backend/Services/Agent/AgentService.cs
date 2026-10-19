using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Agent;
using Backend.Entities;
using AgentEntity = Backend.Entities.Agent;

namespace Backend.Services.Agent;

public class AgentService : IAgentService
{
    private readonly ApplicationDbContext _context;

    public AgentService(ApplicationDbContext context)
    {
        _context = context;
    }

    // ─── Helpers de mapping ────────────────────────────────────────────────────

    private static AgentDTO MapToDto(AgentEntity a) => new AgentDTO
    {
        Id = a.Id,
        Nom = a.Nom,
        Prenom = a.Prenom,
        Email = a.Email,
        Role = a.Role,
        TypeContrat = a.TypeContrat ?? TypeContrat.PLEIN_TEMPS,
        ObjectifMensuel = a.ObjectifMensuel,
        SalaireBase = a.SalaireBase,
        PrimeAssiduite = a.PrimeAssiduite,
        Actif = a.Actif,
        DerniereConnexion = a.DerniereConnexion ?? DateTime.MinValue,
        DateCreation = a.DateCreation,
        IdentifiantMachine = a.IdentifiantMachine
    };

    private static AppelDTO MapAppelToDto(Appel a) => new AppelDTO
    {
        Id = a.Id,
        AgentId = a.AgentId,
        NomAgent = a.Agent != null ? $"{a.Agent.Prenom} {a.Agent.Nom}" : "",
        ContactId = a.ContactId,
        NomContact = a.Contact != null ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "",
        DateHeure = a.DateHeure,
        DureeSecondes = a.DureeSecondes,
        Qualification = a.Qualification,
        CheminEnregistrement = a.CheminEnregistrement,
        Enregistre = a.Enregistre
    };

    private static PointageDTO MapPointageToDto(Pointage p) => new PointageDTO
    {
        Id = p.Id,
        AgentId = p.AgentId,
        NomAgent = p.Agent != null ? $"{p.Agent.Prenom} {p.Agent.Nom}" : "",
        Date = p.Date,
        PremierAppel = p.PremierAppel,
        DernierAppel = p.DernierAppel,
        TotalSecondesTravaillees = p.TotalSecondesTravaillees,
        TempsTravailleFormate = p.TotalSecondesTravaillees.HasValue
            ? $"{(int)TimeSpan.FromSeconds(p.TotalSecondesTravaillees.Value).TotalHours}h {TimeSpan.FromSeconds(p.TotalSecondesTravaillees.Value).Minutes}m"
            : "0h 0m",
        Pauses = p.Pauses?.Select(pause => new PauseDTO
        {
            Debut = pause.Debut,
            Fin = pause.Fin,
            DureeSecondes = pause.DureeSecondes,
            AlerteEnvoyee = pause.AlerteEnvoyee
        }).ToList() ?? new()
    };

    // ─── CRUD Agent ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<AgentDTO>> GetAllAgentsAsync()
    {
        var agents = await _context.Agents.AsNoTracking().ToListAsync();
        return agents.Select(MapToDto);
    }

    public async Task<AgentDTO?> GetAgentByIdAsync(long id)
    {
        var agent = await _context.Agents.FindAsync(id);
        return agent == null ? null : MapToDto(agent);
    }

    public async Task<AgentDTO> CreateAgentAsync(CreateAgentDTO dto)
    {
        var existing = await _context.Agents
            .FirstOrDefaultAsync(a => a.Email == dto.Email);
        if (existing != null)
            throw new InvalidOperationException(
                $"Un agent avec l'email '{dto.Email}' existe déjà.");

        var agent = new AgentEntity
        {
            Nom = dto.Nom,
            Prenom = dto.Prenom,
            Email = dto.Email,
            TypeContrat = dto.TypeContrat,
            Role = "AGENT",
            Actif = true,
            Statut = "EN_ATTENTE",
            DateCreation = DateTime.UtcNow
        };

        agent.MotDePasse = BCrypt.Net.BCrypt.HashPassword(dto.MotDePasse);

        if (agent.TypeContrat == TypeContrat.MI_TEMPS)
        {
            agent.SalaireBase = 600;
            agent.PrimeAssiduite = 100;
            agent.ObjectifMensuel = 13;
        }
        else
        {
            agent.SalaireBase = 900;
            agent.PrimeAssiduite = 100;
            agent.ObjectifMensuel = 22;
        }

        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();
        return MapToDto(agent);
    }

    public async Task<AgentDTO?> UpdateAgentAsync(long id, UpdateAgentDTO dto)
    {
        var agent = await _context.Agents.FindAsync(id);
        if (agent == null) return null;

        if (dto.Nom != null) agent.Nom = dto.Nom;
        if (dto.Prenom != null) agent.Prenom = dto.Prenom;
        if (dto.Email != null) agent.Email = dto.Email;
        if (dto.TypeContrat.HasValue) agent.TypeContrat = dto.TypeContrat.Value;
        if (dto.ObjectifMensuel.HasValue) agent.ObjectifMensuel = dto.ObjectifMensuel.Value;
        if (dto.SalaireBase.HasValue) agent.SalaireBase = dto.SalaireBase.Value;
        if (dto.Actif.HasValue) agent.Actif = dto.Actif.Value;

        await _context.SaveChangesAsync();
        return MapToDto(agent);
    }

    public async Task<bool> DeleteAgentAsync(long id)
    {
        var agent = await _context.Agents.FindAsync(id);
        if (agent == null) return false;
        _context.Agents.Remove(agent);
        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Dashboard ─────────────────────────────────────────────────────────────

    public async Task<DashboardAgentDTO> GetDashboardAsync(long agentId)
    {
        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null)
            throw new Exception("Agent non trouvé");

        var aujourdhui = DateTime.UtcNow.Date;
        var finJournee = aujourdhui.AddDays(1);

        var appelsDuJour = await _context.Appels
            .Where(a => a.AgentId == agentId
                     && a.DateHeure >= aujourdhui
                     && a.DateHeure < finJournee)
            .ToListAsync();

        var conversionsDuJour = appelsDuJour.Count(
            a => a.Qualification == TypeQualification.RENDEZ_VOUS);
        var tauxConversion = appelsDuJour.Count > 0
            ? (double)conversionsDuJour / appelsDuJour.Count * 100
            : 0;

        var statsParHeure = new List<HoraireStatDTO>();
        for (int h = 8; h <= 18; h++)
        {
            var dh = aujourdhui.AddHours(h);
            var fh = dh.AddHours(1);
            statsParHeure.Add(new HoraireStatDTO
            {
                Heure = $"{h:00}:00",
                Appels = appelsDuJour.Count(a => a.DateHeure >= dh && a.DateHeure < fh),
                Conversions = appelsDuJour.Count(a =>
                    a.Qualification == TypeQualification.RENDEZ_VOUS
                    && a.DateHeure >= dh && a.DateHeure < fh)
            });
        }

        var appelsRecents = await _context.Appels
            .Include(a => a.Contact)
            .Where(a => a.AgentId == agentId)
            .OrderByDescending(a => a.DateHeure)
            .Take(5)
            .Select(a => new AppelRecentDTO
            {
                Id = a.Id,
                Contact = a.Contact != null
                    ? $"{a.Contact.Prenom} {a.Contact.Nom}" : "Inconnu",
                Societe  = a.Contact != null ? a.Contact.Source : "Inconnu",
                Duree    = $"{a.DureeSecondes / 60}:{a.DureeSecondes % 60:D2}",
                Resultat = a.Qualification.ToString(),
                Score    = 85,
                DateHeure = a.DateHeure
            })
            .ToListAsync();

        var hier = aujourdhui.AddDays(-1);
        var appelsHier = await _context.Appels
            .CountAsync(a => a.AgentId == agentId
                          && a.DateHeure >= hier
                          && a.DateHeure < aujourdhui);

        var evolutionAppels = appelsHier > 0
            ? (double)(appelsDuJour.Count - appelsHier) / appelsHier * 100
            : -100;

        return new DashboardAgentDTO
        {
            AppelsDuJour         = appelsDuJour.Count,
            ConversionsDuJour    = conversionsDuJour,
            TauxConversion       = Math.Round(tauxConversion, 1),
            TempsProductif       = "0h 0m",
            ScoreQualite         = 85,
            EvolutionAppels      = Math.Round(evolutionAppels, 1),
            EvolutionConversions = 0,
            StatistiquesParHeure = statsParHeure,
            AppelsRecents        = appelsRecents
        };
    }

    // ─── Appels ────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<AppelDTO>> GetAppelsParAgentAsync(long agentId)
    {
        var appels = await _context.Appels
            .Include(a => a.Contact)
            .Include(a => a.Agent)
            .Where(a => a.AgentId == agentId)
            .OrderByDescending(a => a.DateHeure)
            .AsNoTracking()
            .ToListAsync();

        return appels.Select(MapAppelToDto);
    }

    public async Task<AppelDTO> EnregistrerAppelAsync(CreateAppelDTO dto)
    {
        if (dto.Qualification == TypeQualification.RAPPEL && dto.DateRappelPlanifie == null)
            throw new InvalidOperationException(
                "Une qualification 'RAPPEL' doit obligatoirement avoir une date de rappel planifiée.");

        var appel = new Appel
        {
            AgentId              = dto.AgentId,
            ContactId            = dto.ContactId,
            DureeSecondes        = dto.DureeSecondes,
            Qualification        = dto.Qualification,
            DateHeure            = DateTime.UtcNow,
            CheminEnregistrement = dto.CheminEnregistrement,
            Enregistre           = dto.DureeSecondes > 120
        };

        _context.Appels.Add(appel);

        var contact = await _context.Contacts.FindAsync(dto.ContactId);
        if (contact != null)
        {
            contact.Statut            = dto.Qualification.ToString();
            contact.DateDernierAppel  = DateTime.UtcNow;
            contact.DureeDernierAppel = dto.DureeSecondes;
            if (dto.Qualification == TypeQualification.RAPPEL)
                contact.DateRappelPlanifie = dto.DateRappelPlanifie;
        }

        await MettreAJourPointageAsync(dto.AgentId, dto.DureeSecondes);
        await _context.SaveChangesAsync();

        var appelSave = await _context.Appels
            .Include(a => a.Agent)
            .Include(a => a.Contact)
            .FirstAsync(a => a.Id == appel.Id);

        return MapAppelToDto(appelSave);
    }

    // ─── Pointage ──────────────────────────────────────────────────────────────

    private async Task MettreAJourPointageAsync(long agentId, int dureeSecondes)
    {
        var aujourd = DateTime.UtcNow.Date;
        var pointage = await _context.Pointages
            .FirstOrDefaultAsync(p => p.AgentId == agentId && p.Date == aujourd);

        if (pointage == null)
        {
            _context.Pointages.Add(new Pointage
            {
                AgentId  = agentId,
                Date     = aujourd,
                PremierAppel             = DateTime.UtcNow,
                DernierAppel             = DateTime.UtcNow,
                TotalSecondesTravaillees = dureeSecondes
            });
        }
        else
        {
            pointage.DernierAppel = DateTime.UtcNow;
            pointage.TotalSecondesTravaillees =
                (pointage.TotalSecondesTravaillees ?? 0) + dureeSecondes;
        }
    }

    public async Task<IEnumerable<PointageDTO>> GetPointagesAsync(
        long agentId, DateTime? dateDebut, DateTime? dateFin)
    {
        var query = _context.Pointages
            .Include(p => p.Agent)
            .Where(p => p.AgentId == agentId);

        if (dateDebut.HasValue)
            query = query.Where(p => p.Date >= dateDebut.Value.Date);
        if (dateFin.HasValue)
            query = query.Where(p => p.Date <= dateFin.Value.Date);

        var pointages = await query
            .OrderByDescending(p => p.Date)
            .AsNoTracking()
            .ToListAsync();

        return pointages.Select(MapPointageToDto);
    }

    // ─── Performance ───────────────────────────────────────────────────────────

    public async Task<PerformanceDTO?> GetPerformanceAsync(long agentId, int annee, int mois)
    {
        var dateDebut = new DateTime(annee, mois, 1, 0, 0, 0, DateTimeKind.Utc);
        var dateFin   = dateDebut.AddMonths(1).AddDays(-1);

        var perf = await _context.Performances
            .Include(p => p.Agent)
            .FirstOrDefaultAsync(p =>
                p.AgentId   == agentId &&
                p.DateDebut >= dateDebut &&
                p.DateFin   <= dateFin);

        if (perf == null)
        {
            return new PerformanceDTO
            {
                AgentId         = agentId,
                NomAgent        = "Agent Demo",
                DateDebut       = dateDebut,
                DateFin         = dateFin,
                Periode         = $"{mois}/{annee}",
                ObjectifMensuel = 13
            };
        }

        return new PerformanceDTO
        {
            Id                    = perf.Id,
            AgentId               = perf.AgentId,
            NomAgent              = perf.Agent != null
                ? $"{perf.Agent.Prenom} {perf.Agent.Nom}" : "",
            DateDebut             = perf.DateDebut,
            DateFin               = perf.DateFin,
            Periode               = perf.Periode,
            NbAppels              = perf.NbAppels,
            NbAppelsQualifies     = perf.NbAppelsQualifies,
            NbRendezVousBruts     = perf.NbRendezVousBruts,
            NbRendezVousConfirmes = perf.NbRendezVousConfirmes,
            NbRendezVousAnnules   = perf.NbRendezVousAnnules,
            NbRendezVousReportes  = perf.NbRendezVousReportes,
            NbRendezVousHC        = perf.NbRendezVousHC,
            NbRendezVousNonSignes = perf.NbRendezVousNonSignes,
            NbRendezVousSignes    = perf.NbRendezVousSignes,
            NbInstallations       = perf.NbInstallations,
            ObjectifMensuel       = perf.ObjectifMensuel,
            ObjectifAtteint       = perf.ObjectifAtteint,
            PrimeAssiduite        = perf.PrimeAssiduite,
            PrimeMensuelle        = perf.PrimeMensuelle,
            PrimeTrimestrielle    = perf.PrimeTrimestrielle,
            TotalPrimes           = perf.TotalPrimes
        };
    }

    // ─── Rémunération ────────────────────────────────────────────────────────────

    public async Task<RemunerationDTO> CalculerRemunerationAsync(long agentId, int annee, int mois)
    {
        var agent = await _context.Agents.FindAsync(agentId)
            ?? throw new KeyNotFoundException($"Agent {agentId} introuvable.");

        var dateDebut = new DateTime(annee, mois, 1);
        var dateFin   = dateDebut.AddMonths(1).AddDays(-1);

        var perf = await _context.Performances
            .FirstOrDefaultAsync(p =>
                p.AgentId   == agentId &&
                p.DateDebut >= dateDebut &&
                p.DateFin   <= dateFin);

        bool miTemps       = agent.TypeContrat == TypeContrat.MI_TEMPS;
        double salaireBase = miTemps ? 600 : 900;
        int nbRdv          = perf?.NbRendezVousBruts ?? 0;
        int nbInstallations = perf?.NbInstallations ?? 0;
        int objectifRdv    = miTemps ? 13 : 22;
        int nbAbsences     = 0;
        int nbRetards      = 0;

        bool eligibleAssiduite = nbAbsences == 0 && nbRetards <= 1 && nbRdv >= objectifRdv;
        double primeAssiduite  = eligibleAssiduite ? 100 : 0;

        double primeMensuelle = 0;
        if (miTemps  && nbInstallations >= 1) primeMensuelle = 300;
        if (!miTemps && nbInstallations >= 2) primeMensuelle = 400;

        double primeTrimestrielle = 0;
        if (mois % 3 == 0)
        {
            var debutTrimestre = new DateTime(annee, mois - 2, 1);
            int totalInstalls = await _context.Performances
                .Where(p => p.AgentId == agentId
                         && p.DateDebut >= debutTrimestre
                         && p.DateFin   <= dateFin)
                .SumAsync(p => p.NbInstallations);

            if (totalInstalls >= 2)
                primeTrimestrielle = miTemps ? 150 * totalInstalls : 100 * totalInstalls;
        }

        double total = salaireBase + primeAssiduite + primeMensuelle + primeTrimestrielle;

        return new RemunerationDTO
        {
            AgentId                = agentId,
            NomAgent               = $"{agent.Prenom} {agent.Nom}",
            TypeContrat            = agent.TypeContrat.ToString(),
            Annee                  = annee,
            Mois                   = mois,
            SalaireBase            = salaireBase,
            PrimeAssiduite         = primeAssiduite,
            PrimeMensuelle         = primeMensuelle,
            PrimeTrimestrielle     = primeTrimestrielle,
            TotalEstime            = total,
            NbAbsences             = nbAbsences,
            NbRetards              = nbRetards,
            NbRendezVous           = nbRdv,
            NbInstallations        = nbInstallations,
            PrimeAssiduiteEligible = eligibleAssiduite,
            Details = $"Contrat: {agent.TypeContrat} | Objectif RDV: {objectifRdv} | " +
                      $"RDV: {nbRdv} | Installations: {nbInstallations} | " +
                      $"Absences: {nbAbsences} | Retards: {nbRetards}"
        };
    }

    // ─── Securite PC ────────────────────────────────────────────────────────────

    public async Task<bool> VerifierEmpreintePCAsync(long agentId, string identifiantMachine)
    {
        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return false;

        if (agent.IdentifiantMachine == null)
        {
            agent.IdentifiantMachine = identifiantMachine;
            await _context.SaveChangesAsync();
            return true;
        }

        return agent.IdentifiantMachine == identifiantMachine;
    }
}
