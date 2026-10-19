using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public static class DbSeeder
{
    private static readonly string[] SeedPhones =
    {
        "0999000001", "0999000002", "0999000003",
        "0999000004", "0999000005"
    };

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        // ── 1. Agent cible (Karim Mansouri ou premier agent dispo) ───────────
        var agent = await db.Agents.FirstOrDefaultAsync(a => a.Nom == "Mansouri")
                 ?? await db.Agents.FirstOrDefaultAsync();
        if (agent == null)
        {
            agent = new Agent
            {
                Nom             = "Mansouri",
                Prenom          = "Karim",
                Email           = "karim.mansouri@ebi.com",
                MotDePasse      = BCrypt.Net.BCrypt.HashPassword("Test1234!"),
                Role            = "AGENT",
                Statut          = "ACTIF",
                Actif           = true,
                ObjectifMensuel = 20,
                SalaireBase     = 1500,
            };
            db.Agents.Add(agent);
            await db.SaveChangesAsync();
        }
        Console.WriteLine($"[DbSeeder] Agent cible : {agent.Prenom} {agent.Nom} (Id={agent.Id})");

        // ── 2. Contacts de test dédiés au workflow ────────────────────────────
        var existingSeedContacts = await db.Contacts
            .Where(c => SeedPhones.Contains(c.Telephone))
            .ToListAsync();

        Contact GetOrCreate(string phone, string nom, string prenom, string projet)
        {
            var existing = existingSeedContacts.FirstOrDefault(c => c.Telephone == phone);
            if (existing != null) return existing;
            var c = new Contact
            {
                Telephone  = phone,
                Nom        = nom,
                Prenom     = prenom,
                Projet     = projet,
                Source     = "SEED",
                DateImport = DateTime.UtcNow,
                Statut     = "RDV",
                AgentId    = agent.Id,
            };
            db.Contacts.Add(c);
            return c;
        }

        var sc0 = GetOrCreate("0999000001", "Fontaine", "Pierre",   "PAC");
        var sc1 = GetOrCreate("0999000002", "Girard",   "Nathalie", "PV");
        var sc2 = GetOrCreate("0999000003", "Renaud",   "Alain",    "Isolation");
        var sc3 = GetOrCreate("0999000004", "Blanc",    "Céline",   "Chaudière");
        var sc4 = GetOrCreate("0999000005", "Morin",    "Luc",      "PAC");
        await db.SaveChangesAsync(); // persiste les nouveaux contacts → IDs disponibles

        // ── 3. Supprimer les anciens RDVs seed et recréer avec les dates actuelles ──
        // On supprime TOUJOURS les RDVs seed existants pour les recréer
        // avec des dates ancrées sur aujourd'hui.
        var oldSeedRdvIds = await db.RendezVous
            .Where(r => SeedPhones.Contains(r.Contact!.Telephone))
            .Select(r => r.Id)
            .ToListAsync();

        if (oldSeedRdvIds.Count > 0)
        {
            var toDelete = oldSeedRdvIds.Select(id => new RendezVous { Id = id }).ToList();
            db.RendezVous.RemoveRange(toDelete);
            await db.SaveChangesAsync();
            Console.WriteLine($"[DbSeeder] {oldSeedRdvIds.Count} anciens RDVs seed supprimés.");
        }

        // Dates ancrées sur aujourd'hui
        var today = DateTime.UtcNow.Date;

        var rdvs = new List<RendezVous>
        {
            // ── Aujourd'hui 10h00 → statut CONFIRME (visible agenda agent + conf call) ──
            new() {
                ContactId      = sc0.Id,
                AgentId        = agent.Id,
                DateRendezVous = today.AddHours(10),
                DateCreation   = DateTime.UtcNow,
                Statut         = StatutRendezVous.CONFIRME,
                Commentaire    = "[SEED] PAC 18kW — Fontaine Pierre — à contacter matin",
            },
            // ── Aujourd'hui 14h30 → statut CONFIRME ──────────────────────────────────
            new() {
                ContactId      = sc1.Id,
                AgentId        = agent.Id,
                DateRendezVous = today.AddHours(14).AddMinutes(30),
                DateCreation   = DateTime.UtcNow,
                Statut         = StatutRendezVous.CONFIRME,
                Commentaire    = "[SEED] PV 6 panneaux — Girard Nathalie — couple proprio 2010",
            },
            // ── Demain 09h00 → CONFIRME_CONF_CALL / CLIENT1 (visible conf client) ───
            new() {
                ContactId               = sc2.Id,
                AgentId                 = agent.Id,
                DateRendezVous          = today.AddDays(1).AddHours(9),
                DateCreation            = DateTime.UtcNow,
                Statut                  = StatutRendezVous.CONFIRME_CONF_CALL,
                TypeRendezVous          = "CLIENT1",
                Commentaire             = "[SEED] Isolation combles — Renaud Alain — maison 1985",
                CommentaireConfirmation = "Confirmé conf call → Agenda Client 1",
            },
            // ── Demain 11h00 → CONFIRME_CONF_CALL / CLIENT2 (visible conf client) ───
            new() {
                ContactId               = sc3.Id,
                AgentId                 = agent.Id,
                DateRendezVous          = today.AddDays(1).AddHours(11),
                DateCreation            = DateTime.UtcNow,
                Statut                  = StatutRendezVous.CONFIRME_CONF_CALL,
                TypeRendezVous          = "CLIENT2",
                Commentaire             = "[SEED] Chaudière gaz urgence — Blanc Céline",
                CommentaireConfirmation = "Confirmé conf call → Agenda Client 2",
            },
            // ── Après-demain 15h00 → CONFIRME_TOTAL (retour chez agent) ─────────────
            new() {
                ContactId               = sc4.Id,
                AgentId                 = agent.Id,
                DateRendezVous          = today.AddDays(2).AddHours(15),
                DateCreation            = DateTime.UtcNow,
                Statut                  = StatutRendezVous.CONFIRME_TOTAL,
                TypeRendezVous          = "CLIENT1",
                Commentaire             = "[SEED] PAC air/eau — Morin Luc — confirmé totalement",
                CommentaireConfirmation = "RDV confirmé totalement par conf client ✓",
            },
        };

        db.RendezVous.AddRange(rdvs);
        await db.SaveChangesAsync();

        Console.WriteLine($"[DbSeeder] ✓ {rdvs.Count} RDVs workflow insérés (today={today:dd/MM/yyyy}).");
        Console.WriteLine($"[DbSeeder]   - {sc0.Prenom} {sc0.Nom} : aujourd'hui 10h  → CONFIRME");
        Console.WriteLine($"[DbSeeder]   - {sc1.Prenom} {sc1.Nom} : aujourd'hui 14h30 → CONFIRME");
        Console.WriteLine($"[DbSeeder]   - {sc2.Prenom} {sc2.Nom} : demain 09h       → CONFIRME_CONF_CALL / CLIENT1");
        Console.WriteLine($"[DbSeeder]   - {sc3.Prenom} {sc3.Nom} : demain 11h       → CONFIRME_CONF_CALL / CLIENT2");
        Console.WriteLine($"[DbSeeder]   - {sc4.Prenom} {sc4.Nom} : après-demain 15h → CONFIRME_TOTAL");
    }
}
