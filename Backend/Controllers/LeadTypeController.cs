using Backend.Entities;
using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Backend.DTOs.LeadType;
namespace Backend.Controllers
{
    [ApiController]
    [Route("api/LeadTypes")]
    [Authorize]
    public class LeadTypeController : ControllerBase
    {
        private readonly ILeadTypeService _leadTypeService;

        public LeadTypeController(ILeadTypeService leadTypeService)
        {
            _leadTypeService = leadTypeService;
        }

        [HttpGet]
        public async Task<ActionResult<List<LeadTypeResponseDto>>> GetAll()
        {
            var leadTypes = await _leadTypeService.GetAllAsync();
            return Ok(leadTypes);
        }

        [HttpGet("by-country/{countryId}")]
        public async Task<ActionResult<List<LeadTypeResponseDto>>> GetByCountry(int countryId)
        {
            try
            {
                var leadTypes = await _leadTypeService.GetByCountryAsync(countryId);
                return Ok(leadTypes);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin,ServiceTechnique")]
        public async Task<ActionResult<LeadTypeResponseDto>> Create([FromBody] CreateLeadTypeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var leadType = await _leadTypeService.CreateAsync(dto);
                return Ok(leadType);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message }); // 409 for duplicates
            }
        }
    }
}