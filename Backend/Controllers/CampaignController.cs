using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.DTOs.Campaign;
using Backend.Services.ContactDistribution;
using Backend.Services.Campaigns;
using Backend.Entities;
using Backend.Constants;
using Backend.Attributes;
using System.Security.Claims;  
using Backend.Services.Permission;
using Backend.Data;
using Backend.Filters;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Campaigns")]
    [Authorize]
    public class CampaignController : ControllerBase
    {
        private readonly ICampaignService _campaignService;
        private readonly IContactDistributionService _distributionService;   
        private readonly ILogger<CampaignController> _logger;

        public CampaignController(ICampaignService campaignService, IContactDistributionService distributionService, ILogger<CampaignController> logger)
        {
            _campaignService = campaignService;
            _distributionService = distributionService;
            _logger = logger;
        }

        // ==================== CAMPAIGN CRUD ====================

        [HttpGet]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetCampaigns()
        {
            try
            {
                var campaigns = await _campaignService.GetAllAsync();
                return Ok(new { success = true, data = campaigns });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all campaigns");
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving campaigns.", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetCampaignById(int id)
        {
            try
            {
                var campaign = await _campaignService.GetByIdAsync(id);
                if (campaign == null)
                    return NotFound(new { success = false, message = "Campaign not found." });
                return Ok(new { success = true, data = campaign });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting campaign with ID {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving the campaign.", error = ex.Message });
            }
        }

        [HttpPost]
        [RequirePermission(Permissions.Campaigns.Create)]
        public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignDto dto)
        {
            try
            {
                var campaign = await _campaignService.CreateAsync(dto);
                return Ok(new { success = true, data = campaign });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating campaign");
                return StatusCode(500, new { success = false, message = "An error occurred while creating the campaign.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> UpdateCampaign(int id, [FromBody] UpdateCampaignDto dto)
        {
            try
            {
                var updatedCampaign = await _campaignService.UpdateAsync(id, dto);
                if (updatedCampaign == null)
                    return NotFound(new { success = false, message = "Campaign not found." });
                return Ok(new { success = true, data = updatedCampaign });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating campaign with ID {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating the campaign.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [RequirePermission(Permissions.Campaigns.Delete)]
        public async Task<IActionResult> DeleteCampaign(int id)
        {
            try
            {
                var deleted = await _campaignService.DeleteAsync(id);
                if (!deleted)
                    return NotFound(new { success = false, message = "Campaign not found." });
                return Ok(new { success = true, message = "Campaign deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting campaign with ID {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the campaign.", error = ex.Message });
            }
        }
      
        // ==================== CAMPAIGN STATUS MANAGEMENT ====================

        [HttpPatch("{id}/status")]
        [RequirePermission(Permissions.Campaigns.Launch)]
        public async Task<IActionResult> UpdateCampaignStatus(int id, [FromBody] UpdateCampaignStatusDto dto)
        {
            try
            {
                var updatedCampaign = await _campaignService.PatchCampaignStatusAsync(id, dto.IsActive);
                if (updatedCampaign == null)
                    return NotFound(new { success = false, message = "Campaign not found." });
                var message = dto.IsActive ? "Campaign activated" : "Campaign deactivated";

                return Ok(new { success = true, data = updatedCampaign });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating campaign status with ID {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating the campaign status.", error = ex.Message });
            }
        }
        
        // ==================== FILE MANAGEMENT ====================

        [HttpGet("{campaignId}/files")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetCampaignFiles(int campaignId)
        {
            try
            {
                var files = await _campaignService.GetCampaignFilesAsync(campaignId);
                return Ok(new { success = true, data = files });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting files for campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving campaign files.", error = ex.Message });
            }
        }

        [HttpGet("{campaignId}/hopper")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetCampaignHopper(int campaignId)
        {
            try
            {
                var hopper = await _campaignService.GetCampaignHopperAsync(campaignId);
                if (hopper == null)
                    return NotFound(new { success = false, message = "Campaign not found." });

                return Ok(new { success = true, data = hopper });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting hopper stats for campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving hopper stats.", error = ex.Message });
            }
        }
        
        [HttpDelete("{campaignId}/files/{fileId}")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> RemoveFileFromCampaign(int campaignId, int fileId)
        {
            try
            {
                var removed = await _campaignService.RemoveFileFromCampaignAsync(campaignId, fileId);
                if (!removed)
                    return NotFound(new { success = false, message = "File or campaign not found." });
                return Ok(new { success = true, message = "File removed from campaign successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing file with ID {FileId} from campaign with ID {CampaignId}", fileId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while removing file from campaign.", error = ex.Message });
            }
        }
        
        [HttpPatch("{campaignId}/files/{fileId}")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> UpdateFileInCampaignStatus(int campaignId, int fileId, [FromBody] UpdateCampaignFileStatusDto dto)
        {
            try
            {
                var updatedFile = await _campaignService.UpdateFileInCampaignAsync(campaignId, fileId, dto);
                if (updatedFile == null)
                    return NotFound(new { success = false, message = "File or campaign not found." });
                return Ok(new { success = true, data = updatedFile });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating file with ID {FileId} in campaign with ID {CampaignId}", fileId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while updating file in campaign.", error = ex.Message });
            }
        }

        [HttpPost("{campaignId}/files/{campaignFileId}/inject")]
        [RequirePermission(Permissions.Files.Inject)]
        public async Task<IActionResult> InjectCampaignFile(int campaignId, int campaignFileId)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var result = await _distributionService.InjectFileAsync(campaignId, campaignFileId, userId);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error injecting campaign file {CampaignFileId} in campaign {CampaignId}", campaignFileId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while injecting the file.", error = ex.Message });
            }
        }

        [HttpPost("{campaignId}/source-files/{sourceFileId}/inject")]
        [RequirePermission(Permissions.Files.Inject)]
        public async Task<IActionResult> InjectSourceFile(int campaignId, int sourceFileId)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var result = await _distributionService.InjectSourceFileAsync(campaignId, sourceFileId, userId);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error injecting source file {SourceFileId} in campaign {CampaignId}", sourceFileId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while injecting the file.", error = ex.Message });
            }
        }

        [HttpGet("{campaignId}/files/{campaignFileId}/recycle-options")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetRecycleOptions(int campaignId, int campaignFileId)
        {
            try
            {
                var result = await _campaignService.GetRecycleOptionsAsync(campaignId, campaignFileId);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recycle options for campaign file {CampaignFileId}", campaignFileId);
                return StatusCode(500, new { success = false, message = "An error occurred while loading recycle options.", error = ex.Message });
            }
        }

        [HttpPost("{campaignId}/files/{campaignFileId}/recycle")]
        [RequirePermission(Permissions.Files.Inject)]
        public async Task<IActionResult> RecycleCampaignFile(int campaignId, int campaignFileId, [FromBody] RecycleCampaignFileRequestDto dto)
        {
            try
            {
                var result = await _campaignService.RecycleCampaignFileAsync(campaignId, campaignFileId, dto);
                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recycling campaign file {CampaignFileId}", campaignFileId);
                return StatusCode(500, new { success = false, message = "An error occurred while recycling the file.", error = ex.Message });
            }
        }

        // ==================== AGENT MANAGEMENT ====================

        [HttpGet("{campaignId}/agents")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetAgentsInCampaign(int campaignId)
        {
            try
            {
                var agents = await _campaignService.GetAgentsInCampaignAsync(campaignId);
                return Ok(new { success = true, data = agents });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting agents for campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving agents in campaign.", error = ex.Message });
            }
        }
        
        [HttpGet("{campaignId}/agents/{agentId}")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetAgentInCampaignById(int campaignId, int agentId)
        {
            try
            {
                var agent = await _campaignService.GetAgentInCampaignByIdAsync(campaignId, agentId);
                if (agent == null)
                    return NotFound(new { success = false, message = "Agent or campaign not found." });
                return Ok(new { success = true, data = agent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting agent with ID {AgentId} in campaign with ID {CampaignId}", agentId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving agent in campaign.", error = ex.Message });
            }
        }

        [HttpPost("{campaignId}/agents")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> AddAgentToCampaign(int campaignId, [FromBody] AssignAgentToCampaignDto dto)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var agent = await _campaignService.AssignAgentAsync(campaignId, dto, userId);
                return Ok(new { success = true, data = agent });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding agent to campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while adding agent to campaign.", error = ex.Message });
            }
        }

        [HttpDelete("{campaignId}/agents/{agentId}")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> RemoveAgentFromCampaign(int campaignId, int agentId)
        {
            try
            {
                var agent = await _campaignService.RemoveAgentAsync(campaignId, agentId);
                return Ok(new { success = true, data = agent });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in removing agent from campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while removing agent from campaign.", error = ex.Message });
            }
        }
        [HttpGet("{campaignId}/AvailableAgents")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetAvailableAgentsForCampaign(int campaignId)
        {
            try
            {
                var agents = await _campaignService.GetAvailableAgentsAsync(campaignId);
                return Ok(new { success = true, data = agents });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available agents for campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving available agents for campaign.", error = ex.Message });
            }
        }


        //Agent pulls next contact
        [HttpPost("{campaignId}/next-contact")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> GetNextContact(int campaignId)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                
                
                var contact = await _distributionService.GetNextContactAsync(campaignId, userId);
                if (contact == null)
                    return Ok(new { success = true, data = (object?)null, message = "No more contacts available" });
                return Ok(new { success = true, data = contact });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next contact for campaign with ID {CampaignId}", campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while getting next contact.", error = ex.Message });
            }
        }
        //agent qualifies a contact
        [HttpPatch("{campaignId}/contacts/{campaignFileContactId}/qualify")]
        [RequirePermission(Permissions.Campaigns.View)]
        public async Task<IActionResult> QualifyContact( int campaignId,int campaignFileContactId, [FromBody] QualifyContactDto dto)
        {
            try
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(userIdString, out var userId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                await _distributionService.QualifyContactAsync(campaignId, campaignFileContactId, dto, userId);
                return Ok(new { success = true, message = "Contact qualified successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error qualifying contact {ContactId}", campaignFileContactId);
                return StatusCode(500, new { success = false, message = "An error occurred." });
            }
        }
        /*
        [HttpPatch("{campaignId}/agents/{agentId}/status")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> UpdateAgentStatus(int campaignId, int agentId, [FromBody] UpdateAgentStatusDto dto)
        {
            try
            {
                var updatedAgent = await _campaignService.UpdateAgentStatusAsync(campaignId, agentId, dto);
                if (updatedAgent == null)
                    return NotFound(new { success = false, message = "Agent or campaign not found." });
                return Ok(new { success = true, data = updatedAgent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating agent status with ID {AgentId} in campaign with ID {CampaignId}", agentId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while updating agent status.", error = ex.Message });
            }
        }

        [HttpPatch("{campaignId}/agents/{agentId}/batchsize")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> UpdateAgentBatchSize(int campaignId, int agentId, [FromBody] UpdateAgentBatchSizeDto dto)
        {
            try
            {
                var updatedAgent = await _campaignService.UpdateAgentQuotaAsync(campaignId, agentId, dto);
                if (updatedAgent == null)
                    return NotFound(new { success = false, message = "Agent or campaign not found." });
                return Ok(new { success = true, data = updatedAgent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating agent quota with ID {AgentId} in campaign with ID {CampaignId}", agentId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while updating agent quota.", error = ex.Message });
            }
        }

        [HttpPatch("{campaignId}/agents/{agentId}/weight")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> UpdateAgentWeight(int campaignId, int agentId, [FromBody] UpdateAgentWeightDto dto)
        {
            try
            {
                var updatedAgent = await _campaignService.UpdateAgentWeightAsync(campaignId, agentId, dto);
                if (updatedAgent == null)
                    return NotFound(new { success = false, message = "Agent or campaign not found." });
                return Ok(new { success = true, data = updatedAgent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating agent weight with ID {AgentId} in campaign with ID {CampaignId}", agentId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while updating agent weight.", error = ex.Message });
            }
        }

        [HttpDelete("{campaignId}/agents/{agentId}")]
        [RequirePermission(Permissions.Campaigns.Edit)]
        public async Task<IActionResult> RemoveAgentFromCampaign(int campaignId, int agentId)
        {
            try
            {
                var removed = await _campaignService.RemoveAgentFromCampaignAsync(campaignId, agentId);
                if (!removed)
                    return NotFound(new { success = false, message = "Agent or campaign not found." });
                return Ok(new { success = true, message = "Agent removed from campaign successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing agent with ID {AgentId} from campaign with ID {CampaignId}", agentId, campaignId);
                return StatusCode(500, new { success = false, message = "An error occurred while removing agent from campaign.", error = ex.Message });
            }
        }*/
    }
}
