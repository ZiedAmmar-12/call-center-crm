using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs.Admin;
using Backend.Entities;
using Backend.Services.Email;
using AdminEntity = Backend.Entities.Admin;
using AgentEntity = Backend.Entities.Agent;

namespace Backend.Services.Admin;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private static ConfigurationIADTO _iaConfig = new();

    public AdminService(ApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DASHBOARD LIVE
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<DashboardAdminDTO> GetDashboardLiveAsync()
    {
        var aujourd = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        // Use base Utilisateur table — never _context.Agents (TPH materialization)
        var totalAgents = await _context.Utilisateurs.CountAsync(u => u.Role == "AGENT");

        var agentsEnLigne = await _context.Pointages
            .Where(p => p.Date == aujourd && p.DernierAppel != null)
            .Select(p => p.AgentId)
            .Distinct()
            .CountAsync();

        var enAppel = await _context.Appels
            .Where(a => a.DateHeure.Date == aujourd && a.DateHeure > DateTime.UtcNow.AddMinutes(-30))
            .Select(a => a.AgentId)
            .Distinct()
            .CountAsync();

        var appelsDuJour = await _context.Appels
            .CountAsync(a => a.DateHeure.Date == aujourd);

        var conversions = await _context.Appels
            .CountAsync(a => a.DateHeure.Date == aujourd && a.Qualification == TypeQualification.RENDEZ_VOUS);

        var tauxConversion = appelsDuJour > 0 ? Math.Round((double)conversions / appelsDuJour * 100, 1) : 0;

        // Performance horaire (8h à 18h)
        var perfHoraire = new List<PerformanceHoraireDTO>();
        for (int h = 8; h <= 18; h++)
        {
            var debut = aujourd.AddHours(h);
            var fin = debut.AddHours(1);
            var appels = await _context.Appels.CountAsync(a => a.DateHeure >= debut && a.DateHeure < fin);
            var convs = await _context.Appels.CountAsync(a => a.DateHeure >= debut && a.DateHeure < fin && a.Qualification == TypeQualification.RENDEZ_VOUS);
            perfHoraire.Add(new PerformanceHoraireDTO { Heure = $"{h:D2}:00", Appels = appels, Conversions = convs });
        }

        // Alertes (pauses > 30min) — avoid Include(p => p.Agent) to skip TPH
        var alertes = new List<AlerteDTO>();
        try
        {
            var pauseAgentIds = await _context.Pointages
                .Where(p => p.Date == aujourd && p.Pauses.Any(pause => pause.DureeSecondes > 1800))
                .Select(p => p.AgentId)
                .ToListAsync();

            if (pauseAgentIds.Any())
            {
                var nomMap = await _context.Utilisateurs
                    .Where(u => pauseAgentIds.Contains(u.Id))
                    .Select(u => new { u.Id, Nom = u.Prenom + " " + u.Nom })
                    .ToDictionaryAsync(u => u.Id, u => u.Nom);

                foreach (var agentId in pauseAgentIds)
                {
                    alertes.Add(new AlerteDTO
                    {
                        AgentNom = nomMap.TryGetValue(agentId, out var n) ? n : "Agent",
                        Message = "Pause prolongée (>30min)",
                        Type = "pause"
                    });
                }
            }
        }
        catch { /* Pauses not available — skip alertes */ }

        return new DashboardAdminDTO
        {
            AgentsEnLigne = agentsEnLigne,
            TotalAgents = totalAgents,
            EnAppel = enAppel,
            AppelsDuJour = appelsDuJour,
            TauxConversion = tauxConversion,
            Alertes = alertes,
            PerformanceHoraire = perfHoraire
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. STATUT DES AGENTS EN TEMPS RÉEL
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<AgentStatutDTO>> GetAgentsStatutAsync()
    {
        var aujourd = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        // Use Utilisateurs base table — never _context.Agents (TPH)
        var agentsBase = await _context.Utilisateurs
            .Where(u => u.Role == "AGENT")
            .Select(u => new { u.Id, u.Nom, u.Prenom })
            .AsNoTracking()
            .ToListAsync();

        // Deduplicate by name (DB may have duplicates)
        agentsBase = agentsBase.DistinctBy(u => u.Id).ToList();

        // Load today's appels counts in bulk
        var agentIds = agentsBase.Select(a => a.Id).ToList();
        var appelsDuJour = await _context.Appels
            .Where(a => a.DateHeure.Date == aujourd && agentIds.Contains(a.AgentId))
            .GroupBy(a => a.AgentId)
            .Select(g => new { AgentId = g.Key, Count = g.Count(), Conv = g.Count(a => a.Qualification == TypeQualification.RENDEZ_VOUS) })
            .ToListAsync();
        var appelsMap = appelsDuJour.ToDictionary(x => x.AgentId, x => x);

        // Load last appel per agent (in last 15min) in bulk
        var cutoff15 = DateTime.UtcNow.AddMinutes(-15);
        var derniersAppels = await _context.Appels
            .Where(a => agentIds.Contains(a.AgentId) && a.DateHeure > cutoff15)
            .OrderByDescending(a => a.DateHeure)
            .GroupBy(a => a.AgentId)
            .Select(g => new { AgentId = g.Key, Appel = g.OrderByDescending(a => a.DateHeure).First() })
            .ToListAsync();
        var derniersMap = derniersAppels.ToDictionary(x => x.AgentId, x => x.Appel);

        // Load pointages in bulk
        var pointages = await _context.Pointages
            .Where(p => p.Date == aujourd && agentIds.Contains(p.AgentId))
            .Select(p => new { p.AgentId, p.TotalSecondesTravaillees })
            .ToListAsync();
        var pointageMap = pointages.ToDictionary(p => p.AgentId, p => p.TotalSecondesTravaillees);

        var result = agentsBase.Select(a =>
        {
            var stats = appelsMap.TryGetValue(a.Id, out var s) ? s : null;
            var statut = "Hors ligne";
            var dureeAppel = "";

            if (derniersMap.TryGetValue(a.Id, out var dernierAppel))
            {
                statut = "En appel";
                dureeAppel = $"{dernierAppel.DureeSecondes / 60}:{dernierAppel.DureeSecondes % 60:D2}";
            }
            else if (pointageMap.TryGetValue(a.Id, out var pts) && pts > 0)
            {
                statut = "En ligne";
            }

            return new AgentStatutDTO
            {
                Id = a.Id,
                Nom = a.Nom,
                Prenom = a.Prenom,
                Statut = statut,
                DureeAppel = dureeAppel,
                Appels = stats?.Count ?? 0,
                Conversions = stats?.Conv ?? 0,
                Score = 85
            };
        }).ToList();

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SCORECARDS AGENTS (CLASSEMENT)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<ScorecardAgentDTO>> GetScorecardsAgentsAsync()
    {
        var debutMois = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Use Utilisateurs base table — never _context.Agents (TPH)
        var agentsBase = (await _context.Utilisateurs
            .Where(u => u.Role == "AGENT")
            .Select(u => new { u.Id, u.Nom, u.Prenom })
            .AsNoTracking()
            .ToListAsync())
            .DistinctBy(u => u.Id)
            .ToList();

        var agentIds = agentsBase.Select(a => a.Id).ToList();

        // Bulk-load appels counts for this month
        var appelsStats = await _context.Appels
            .Where(a => a.DateHeure >= debutMois && agentIds.Contains(a.AgentId))
            .GroupBy(a => a.AgentId)
            .Select(g => new {
                AgentId = g.Key,
                Total = g.Count(),
                Conv = g.Count(a => a.Qualification == TypeQualification.RENDEZ_VOUS)
            })
            .ToListAsync();
        var statsMap = appelsStats.ToDictionary(x => x.AgentId, x => x);

        var agents = agentsBase.Select(a =>
        {
            var stats = statsMap.TryGetValue(a.Id, out var s) ? s : null;
            var appels = stats?.Total ?? 0;
            var conv = stats?.Conv ?? 0;
            var taux = appels > 0 ? (double)conv / appels * 100 : 0;
            var score = (int)(50 + taux * 0.5);

            return new ScorecardAgentDTO
            {
                AgentId = a.Id,
                AgentNom = $"{a.Prenom} {a.Nom}",
                Appels = appels,
                Conversions = conv,
                ScoreGlobal = score,
                Qualite = Math.Min(100, score + 5),
                ARevoir = 0,
                Tendance = score > 80 ? "up" : score > 70 ? "stable" : "down"
            };
        }).OrderByDescending(a => a.ScoreGlobal).ToList();

        for (int i = 0; i < agents.Count; i++)
            agents[i].Rang = i + 1;

        return agents;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. AGENTS NÉCESSITANT UN SUIVI
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<AgentSuiviDTO>> GetAgentsSuiviAsync()
    {
        var debutMois = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Use Utilisateurs base table — never _context.Agents (TPH)
        var agentsBase = (await _context.Utilisateurs
            .Where(u => u.Role == "AGENT")
            .Select(u => new { u.Id, u.Nom, u.Prenom })
            .AsNoTracking()
            .ToListAsync())
            .DistinctBy(u => u.Id)
            .ToList();

        var agentIds = agentsBase.Select(a => a.Id).ToList();

        var appelsSuivi = await _context.Appels
            .Where(a => a.DateHeure >= debutMois && a.Enregistre && agentIds.Contains(a.AgentId))
            .GroupBy(a => a.AgentId)
            .Select(g => new { AgentId = g.Key, Count = g.Count() })
            .ToListAsync();
        var suiviMap = appelsSuivi.ToDictionary(x => x.AgentId, x => x.Count);

        var agents = agentsBase
            .Select(a => new AgentSuiviDTO
            {
                AgentId = a.Id,
                AgentNom = $"{a.Prenom} {a.Nom}",
                Score = 85,
                AppelsAVerifier = suiviMap.TryGetValue(a.Id, out var c) ? c : 0,
                Tendance = "down"
            })
            .Where(a => a.AppelsAVerifier > 0)
            .OrderByDescending(a => a.AppelsAVerifier)
            .Take(5)
            .ToList();

        return agents;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. POINTAGE
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PointageAdminDTO> GetPointageAsync(DateTime date)
    {
        // Load full Pointage entities — Pauses is [Owned] so it loads with the parent.
        // Avoid .Select(p => new { ..., Pauses = p.Pauses }) which EF Core cannot translate.
        var dateUtc = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var pointagesRaw = await _context.Pointages
            .Where(p => p.Date == dateUtc)
            .AsNoTracking()
            .ToListAsync();

        // Load agent names via base Utilisateur (avoids TPH column mapping)
        var agentIds = pointagesRaw.Select(p => p.AgentId).Distinct().ToList();
        var agentNoms = await _context.Utilisateurs
            .Where(u => agentIds.Contains(u.Id))
            .Select(u => new { u.Id, Nom = u.Prenom + " " + u.Nom })
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id, u => u.Nom);

        var totalAgents = await _context.Utilisateurs.CountAsync(u => u.Role == "AGENT");

        var details = pointagesRaw.Select(p => new PointageDetailDTO
        {
            AgentNom = agentNoms.TryGetValue(p.AgentId, out var nom) ? nom : "Inconnu",
            Arrivee = p.PremierAppel?.ToString("HH:mm") ?? "-",
            PremierAppel = p.PremierAppel?.ToString("HH:mm") ?? "-",
            DernierAppel = p.DernierAppel?.ToString("HH:mm") ?? "-",
            Depart = p.DernierAppel?.ToString("HH:mm") ?? "-",
            Pauses = p.Pauses != null && p.Pauses.Any()
                ? $"{p.Pauses.Sum(ps => ps.DureeSecondes) / 60}min"
                : "-",
            TempsProductif = p.TotalSecondesTravaillees.HasValue
                ? $"{p.TotalSecondesTravaillees.Value / 3600}h {(p.TotalSecondesTravaillees.Value % 3600) / 60}m"
                : "-",
            Statut = p.PremierAppel?.Hour > 9 ? "Retard" : "À l'heure"
        }).ToList();

        var presents = pointagesRaw.Count;
        var retards = details.Count(d => d.Statut == "Retard");

        var tempsTotal = pointagesRaw.Where(p => p.TotalSecondesTravaillees.HasValue)
            .Select(p => (double)(p.TotalSecondesTravaillees ?? 0))
            .DefaultIfEmpty(0)
            .Average();

        var pausesTotal = pointagesRaw
            .SelectMany(p => p.Pauses ?? new List<Pause>())
            .Select(p => (double)p.DureeSecondes)
            .DefaultIfEmpty(0)
            .Average();

        return new PointageAdminDTO
        {
            Presents = presents,
            TotalAgents = totalAgents,
            Retards = retards,
            TempsMoyen = $"{(int)tempsTotal / 3600}h {(int)(tempsTotal % 3600) / 60}m",
            PausesMoyennes = $"{(int)pausesTotal / 60}min",
            Details = details
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. CARTE GÉOGRAPHIQUE
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<CarteGeographiqueDTO> GetCarteGeographiqueAsync(string pays = "all")
    {
        var regions = new List<RegionStatsDTO>();
        
        // Données France
        if (pays == "all" || pays == "france")
        {
            regions.Add(new RegionStatsDTO { Nom = "Paris", TauxConversion = 66.1, Conversions = 82, Appels = 124 });
            regions.Add(new RegionStatsDTO { Nom = "Lyon", TauxConversion = 63.3, Conversions = 62, Appels = 98 });
            regions.Add(new RegionStatsDTO { Nom = "Marseille", TauxConversion = 55.8, Conversions = 48, Appels = 86 });
            regions.Add(new RegionStatsDTO { Nom = "Toulouse", TauxConversion = 58.2, Conversions = 42, Appels = 72 });
        }
        
        // Données Tunisie
        if (pays == "all" || pays == "tunisie")
        {
            regions.Add(new RegionStatsDTO { Nom = "Tunis", TauxConversion = 62.8, Conversions = 98, Appels = 156 });
            regions.Add(new RegionStatsDTO { Nom = "Sousse", TauxConversion = 62.5, Conversions = 45, Appels = 72 });
            regions.Add(new RegionStatsDTO { Nom = "Sfax", TauxConversion = 58.4, Conversions = 58, Appels = 99 });
            regions.Add(new RegionStatsDTO { Nom = "Nabeul", TauxConversion = 62.2, Conversions = 58, Appels = 93 });
        }
        
        return new CarteGeographiqueDTO
        {
            Regions = regions,
            Globales = new StatistiquesGlobalesDTO
            {
                TotalAppels = regions.Sum(r => r.Appels),
                Conversions = regions.Sum(r => r.Conversions),
                TauxMoyen = regions.Count > 0 ? Math.Round(regions.Average(r => r.TauxConversion), 1) : 0
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. CONFIGURATION IA
    // ─────────────────────────────────────────────────────────────────────────

    public Task<ConfigurationIADTO> GetConfigurationIAAsync()
    {
        return Task.FromResult(_iaConfig);
    }

    public Task UpdateConfigurationIAAsync(ConfigurationIADTO config)
    {
        _iaConfig = config;
        return Task.CompletedTask;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. GESTION DES UTILISATEURS
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<UtilisateurDTO>> GetUtilisateursAsync()
    {
        // Load into memory first so we can access derived type properties (Confirmatrice.Type)
        var utilisateurs = await _context.Set<Utilisateur>().ToListAsync();

        return utilisateurs.Select(u => new UtilisateurDTO
        {
            Id = u.Id,
            Nom = u.Nom,
            Prenom = u.Prenom,
            Email = u.Email,
            Role = u.Role,
            Type = u is Confirmatrice c ? c.Type.ToString() : null,
            Statut = u.Statut,
            Actif = u.Actif,
            DateCreation = u.DateCreation,
            DerniereConnexion = u.DerniereConnexion
        }).ToList();
    }

    public async Task<UtilisateurDTO> CreateUtilisateurAsync(UtilisateurRequestDTO request)
    {
        Utilisateur utilisateur;
        var plainPassword = request.MotDePasse; // capture before hashing

        // Rôle simplifié pour la base de données (max 13 caractères)
        string roleDb = request.Role.ToLower() switch
        {
            "confirmatrice1" => "CONFIRMATRICE",
            "confirmatrice2" => "CONFIRMATRICE",
            "confirmatriceclient" => "CONFIRMATRICE",
            "confclient" => "CONFIRMATRICE",
            "technique" => "TECH",
            "qualite" => "QUALITE",
            "agent" => "AGENT",
            "admin" => "ADMIN",
            _ => request.Role.ToUpper()
        };
        
        switch (request.Role.ToLower())
        {
            case "agent":
                utilisateur = new AgentEntity
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = roleDb,
                    Actif = true,
                    Statut = "EN_ATTENTE",  
                    DateCreation = DateTime.UtcNow,
                    TypeContrat = TypeContrat.PLEIN_TEMPS,
                    ObjectifMensuel = 22,
                    SalaireBase = 900,
                    PrimeAssiduite = 100
                };
                break;
                
            case "confirmatrice1":
                utilisateur = new Confirmatrice
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = "CONFIRMATRICE",
                    Type = TypeConfirmatrice.CONF1,
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Specialite = request.Equipe ?? "Confirmation"
                };
                break;

            case "confirmatrice2":
                utilisateur = new Confirmatrice
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = "CONFIRMATRICE",
                    Type = TypeConfirmatrice.CONF2,
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Specialite = request.Equipe ?? "Confirmation"
                };
                break;

            case "confirmatriceclient":
            case "confclient":
                utilisateur = new Confirmatrice
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = "CONFIRMATRICE",
                    Type = TypeConfirmatrice.CONFCLIENT,
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Specialite = request.Equipe ?? "Confirmation Client"
                };
                break;
                
            case "technique":
                utilisateur = new Technique
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = "TECH",
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Service = "TECHNIQUE"
                };
                break;
                
            case "qualite":
                utilisateur = new Qualite
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = "QUALITE",
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Service = "QUALITE"
                };
                break;

            case "admin":
                utilisateur = new AdminEntity
                {
                    Nom = request.Nom,
                    Prenom = request.Prenom,
                    Email = request.Email,
                    MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role = roleDb,
                    Actif = true,
                    Statut = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    Niveau = "SuperAdmin"
                };
                break;

            case "commercial":
                utilisateur = new Commercial
                {
                    Nom          = request.Nom,
                    Prenom       = request.Prenom,
                    Email        = request.Email,
                    MotDePasse   = BCrypt.Net.BCrypt.HashPassword(request.MotDePasse),
                    Role         = "COMMERCIAL",
                    Actif        = true,
                    Statut       = "EN_ATTENTE",
                    DateCreation = DateTime.UtcNow,
                    TauxCommission = 5.0
                };
                break;

            default:
                throw new ArgumentException($"Rôle '{request.Role}' non reconnu");
        }
        
        _context.Set<Utilisateur>().Add(utilisateur);
        await _context.SaveChangesAsync();

        // Send welcome email — true fire-and-forget so SMTP never blocks the response
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(
                    toEmail:       utilisateur.Email,
                    nom:           utilisateur.Nom,
                    prenom:        utilisateur.Prenom,
                    role:          utilisateur.Role,
                    plainPassword: plainPassword);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[WARN] Email de bienvenue non envoyé pour {utilisateur.Email}: {ex.Message}");
            }
        });

        return new UtilisateurDTO
        {
            Id = utilisateur.Id,
            Nom = utilisateur.Nom,
            Prenom = utilisateur.Prenom,
            Email = utilisateur.Email,
            Role = utilisateur.Role,
            Type = utilisateur is Confirmatrice conf ? conf.Type.ToString() : null,
            Statut = utilisateur.Statut,
            Actif = utilisateur.Actif,
            DateCreation = utilisateur.DateCreation,
            DerniereConnexion = utilisateur.DerniereConnexion
        };
    }

    public async Task DeleteUtilisateurAsync(long id)
    {
        var user = await _context.Set<Utilisateur>().FindAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"Utilisateur {id} non trouvé.");
        
        // Soft delete
        user.Actif = false;
        user.Statut = "INACTIF";
        
        // Nettoyer l'identifiant machine si c'est un agent
        if (user is AgentEntity agent)
        {
            agent.IdentifiantMachine = null;
        }
        
        // Pour les confirmatrices, aucune propriété spécifique à nettoyer
        // car Type et Specialite doivent être conservés pour l'historique
        
        _context.Set<Utilisateur>().Update(user);
        await _context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. GESTION DES AGENDAS DES CONFIRMATRICES
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<List<ConfirmatriceAgendaDTO>> GetConfirmatricesAgendasAsync()
    {
        var confirmatrices = await _context.Confirmatrices
            .Where(c => c.Actif)
            .ToListAsync();  // Récupérer d'abord en mémoire
        
        var result = confirmatrices.Select(c => new ConfirmatriceAgendaDTO
        {
            Id = c.Id,
            Nom = c.Nom,
            Prenom = c.Prenom,
            Email = c.Email,
            Type = c.Type.ToString(),
            AgendasAccess = string.IsNullOrEmpty(c.AgendasAccess) 
                ? new List<string>() 
                : c.AgendasAccess.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries).Select(a => a.Trim()).ToList()
        }).ToList();

        return result;
    }

    public async Task<ConfirmatriceAgendaDTO> AssignAgendaToConfirmatriceAsync(long id, AssignAgendaDTO dto)
    {
        var confirmatrice = await _context.Confirmatrices.FindAsync(id);
        if (confirmatrice == null)
        {
            throw new KeyNotFoundException($"Confirmatrice avec l'ID {id} non trouvée");
        }

        List<string> agendasActuels;
        if (string.IsNullOrEmpty(confirmatrice.AgendasAccess))
        {
            agendasActuels = new List<string>();
        }
        else
        {
            agendasActuels = confirmatrice.AgendasAccess.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries).Select(a => a.Trim()).ToList();
        }

        if (dto.Assigned)
        {
            if (!agendasActuels.Contains(dto.AgendaId))
            {
                agendasActuels.Add(dto.AgendaId);
            }
        }
        else
        {
            agendasActuels.Remove(dto.AgendaId);
        }

        confirmatrice.AgendasAccess = agendasActuels.Any() ? string.Join(",", agendasActuels) : null;
        await _context.SaveChangesAsync();

        return new ConfirmatriceAgendaDTO
        {
            Id = confirmatrice.Id,
            Nom = confirmatrice.Nom,
            Prenom = confirmatrice.Prenom,
            Email = confirmatrice.Email,
            Type = confirmatrice.Type.ToString(),
            AgendasAccess = agendasActuels
        };
    }
}