using Backend.Attributes;
using Backend.Constants;
using Backend.DTOs.Agents;
using Backend.Services.Agents;
using Backend.Services.Permission;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Agents")]
    [Authorize]
    public class AgentsController : ControllerBase
    {
        private readonly IAgentService _service;
        private readonly IPermissionService _permissionService;
        private readonly ILogger<AgentsController> _logger;

        public AgentsController(
            IAgentService service,
            IPermissionService permissionService,
            ILogger<AgentsController> logger)
        {
            _service = service;
            _permissionService = permissionService;
            _logger = logger;
        }

        [HttpGet]
        [RequirePermission(Permissions.Agents.ViewAll)]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var agents = await _service.GetAllAgentsAsync();
                return Ok(new { success = true, data = agents });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting agents");
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving agents.", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [RequirePermission(Permissions.Agents.ViewAll)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var agent = await _service.GetAgentByIdAsync(id);
                if (agent == null)
                    return NotFound(new { success = false, message = "Agent not found." });

                return Ok(new { success = true, data = agent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting agent {AgentId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving the agent.", error = ex.Message });
            }
        }

        [HttpGet("{id}/campaigns")]
        [RequirePermission(Permissions.Agents.ViewAll)]
        public async Task<IActionResult> GetCampaigns(int id)
        {
            try
            {
                var campaigns = await _service.GetAgentCampaignsAsync(id);
                return Ok(new { success = true, data = campaigns });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting campaigns for agent {AgentId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving agent campaigns.", error = ex.Message });
            }
        }

        [HttpGet("{id}/appointments")]
        public async Task<IActionResult> GetAppointments(int id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue)
                    return Unauthorized(new { success = false, message = "User not authenticated." });

                var canAccess = currentUserId.Value == id
                    || await _permissionService.HasPermissionForUserScopeAsync(
                        currentUserId.Value,
                        Permissions.Agents.ViewOtherAgendas,
                        id);

                if (!canAccess)
                    return Forbid();

                var appointments = await _service.GetAgentAppointmentsAsync(id);
                return Ok(new { success = true, data = appointments });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting appointments for agent {AgentId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving agent appointments.", error = ex.Message });
            }
        }

        [HttpPost]
        [RequirePermission(Permissions.Agents.Manage)]
        public async Task<IActionResult> Create([FromBody] CreateAgentDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                    return Unauthorized(new { success = false, message = "User not authenticated." });

                var createdAgent = await _service.CreateAgentAsync(dto, userId.Value);
                return CreatedAtAction(nameof(GetById), new { id = createdAgent.Id }, new { success = true, data = createdAgent });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating agent {Email}", dto.Email);
                return StatusCode(500, new { success = false, message = "An error occurred while creating the agent.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission(Permissions.Agents.Manage)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAgentDto dto)
        {
            try
            {
                var updatedAgent = await _service.UpdateAgentAsync(id, dto);
                if (updatedAgent == null)
                    return NotFound(new { success = false, message = "Agent not found." });

                return Ok(new { success = true, data = updatedAgent });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating agent {AgentId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating the agent.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission(Permissions.Agents.Manage)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _service.DeleteAgentAsync(id);
                if (!deleted)
                    return NotFound(new { success = false, message = "Agent not found." });

                return Ok(new { success = true, message = "Agent deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting agent {AgentId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the agent.", error = ex.Message });
            }
        }

        private int? GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdString, out var userId) ? userId : null;
        }
    }
}
