using Backend.Attributes;
using Backend.Constants;
using Backend.DTOs.Client;
using Backend.Services.Clients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Clients")]
    [Authorize]
    public class ClientController : ControllerBase
    {
        private readonly IClientService _service;
        private readonly ILogger<ClientController> _logger;

        public ClientController(IClientService service, ILogger<ClientController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // Admin only — returns full info including real company name
        [HttpGet]
        [RequirePermission(Permissions.Clients.View)]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var clients = await _service.GetAllAsync();
                return Ok(new { success = true, data = clients });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting clients");
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving clients." });
            }
        }

        // Any authenticated user — returns only code + id (safe for agents)
        [HttpGet("public")]
        public async Task<IActionResult> GetAllPublic()
        {
            try
            {
                var clients = await _service.GetAllPublicAsync();
                return Ok(new { success = true, data = clients });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public clients list");
                return StatusCode(500, new { success = false, message = "An error occurred." });
            }
        }

        [HttpGet("{id}")]
        [RequirePermission(Permissions.Clients.View)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var client = await _service.GetByIdAsync(id);
                if (client == null)
                    return NotFound(new { success = false, message = $"Client {id} not found." });

                return Ok(new { success = true, data = client });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred." });
            }
        }

        [HttpPost]
        [RequirePermission(Permissions.Clients.Create)]
        public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Validation failed.", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });

            try
            {
                var client = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = client.Id }, new { success = true, data = client });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating client");
                return StatusCode(500, new { success = false, message = "An error occurred while creating the client." });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission(Permissions.Clients.Edit)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateClientDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Validation failed." });

            try
            {
                var client = await _service.UpdateAsync(id, dto);
                if (client == null)
                    return NotFound(new { success = false, message = $"Client {id} not found." });

                return Ok(new { success = true, data = client });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating client {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating the client." });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission(Permissions.Clients.Delete)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _service.DeleteAsync(id);
                if (!deleted)
                    return NotFound(new { success = false, message = $"Client {id} not found." });

                return Ok(new { success = true, message = "Client deleted successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting client {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the client." });
            }
        }
    }
}
