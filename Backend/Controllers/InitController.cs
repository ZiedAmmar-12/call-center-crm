using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Entities;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InitController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InitController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("create-admin")]
        public async Task<IActionResult> CreateAdmin()
        {
            // Vérifier si l'admin existe déjà
            var adminExists = _context.Set<Utilisateur>().Any(u => u.Email == "admin@ebi.com");
            
            if (adminExists)
                return Ok(new { message = "Admin already exists", email = "admin@ebi.com" });

            // Créer l'admin
            var admin = new Agent
            {
                Nom = "Admin",
                Prenom = "Système",
                Email = "admin@ebi.com",
                MotDePasse = BCrypt.Net.BCrypt.HashPassword("role123"),
                Role = "ADMIN",
                Actif = true,
                DateCreation = DateTime.UtcNow,
                TypeContrat = TypeContrat.PLEIN_TEMPS,
                ObjectifMensuel = 22,
                SalaireBase = 900,
                PrimeAssiduite = 100
            };

            _context.Set<Agent>().Add(admin);
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Admin created successfully", 
                email = "admin@ebi.com", 
                password = "role123",
                role = "ADMIN"
            });
        }
        
        [HttpPost("create-agent")]
        public async Task<IActionResult> CreateAgent()
        {
            // Vérifier si l'agent existe déjà
            var agentExists = _context.Set<Utilisateur>().Any(u => u.Email == "agent@ebi.com");
            
            if (agentExists)
                return Ok(new { message = "Agent already exists", email = "agent@ebi.com" });

            // Créer l'agent
            var agent = new Agent
            {
                Nom = "Agent",
                Prenom = "Démo",
                Email = "agent@ebi.com",
                MotDePasse = BCrypt.Net.BCrypt.HashPassword("role123"),
                Role = "AGENT",
                Actif = true,
                DateCreation = DateTime.UtcNow,
                TypeContrat = TypeContrat.PLEIN_TEMPS,
                ObjectifMensuel = 22,
                SalaireBase = 900,
                PrimeAssiduite = 100
            };

            _context.Set<Agent>().Add(agent);
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Agent created successfully", 
                email = "agent@ebi.com", 
                password = "role123",
                role = "AGENT"
            });
        }
        
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = _context.Set<Utilisateur>()
                .Select(u => new { u.Id, u.Email, u.Nom, u.Prenom, u.Role, u.Actif })
                .ToList();
            
            return Ok(users);
        }
    }
}