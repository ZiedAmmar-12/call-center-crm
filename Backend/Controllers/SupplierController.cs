using Backend.DTOs;
using Backend.Services.Suppliers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Backend.Entities;
using Backend.DTOs.Supplier;
using System.Security.Claims;  // ← ADD THIS for ClaimTypes
using Backend.Attributes;  // ← ADD THIS for RequirePermission attribute
using Backend.Constants;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Suppliers")]
    [Authorize]
    public class SupplierController : ControllerBase
    {
        private readonly ISupplierService _service;
        private readonly ILogger<SupplierController> _logger;
        public SupplierController(ISupplierService service, ILogger<SupplierController> logger)
        {
            _service = service;
            _logger = logger;
        }
        // GET: api/Suppliers
        [HttpGet]
        [Authorize(Roles = "SuperAdmin,Admin,ServiceTechnique")]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var suppliers = await _service.GetAllSuppliersAsync();

                return Ok(new { success = true, data = suppliers });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all suppliers");

                return StatusCode(500, new { success = false, message = "An error occurred while retrieving suppliers.", error = ex.Message });
            }
        }

        [HttpGet("filter")]
        public async Task<IActionResult> GetByFilters([FromQuery] int countryId, [FromQuery] int leadTypeId)
        {
            try
            {
                var suppliers = await _service.GetSuppliersByFiltersAsync(countryId, leadTypeId);

                return Ok(new { success = true, data = suppliers });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid filter parameters");
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error filtering suppliers");
                return StatusCode(500, new { success = false, message = "An error occurred while filtering suppliers" });
            }
        }

        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin")]
       
        public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Validation failed", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
            }
            try
            {
                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                _logger.LogInformation("Creating new supplier: {SupplierName} by user {UserId}", dto.Name, userId);

                var createdSupplier = await _service.CreateSupplierAsync(dto, userId.Value); // Fixed: removed duplicate call

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = createdSupplier.Id },
                    new { success = true, message = "Supplier created successfully", data = createdSupplier }
                );
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Duplicate supplier attempt: {SupplierName}", dto.Name);
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating supplier: {SupplierName}", dto.Name);
                return StatusCode(500, new { success = false, message = "An error occurred while creating the supplier" });
            }
        }

        // GET: api/Suppliers/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,ServiceTechnique")]
        [RequirePermission(Permissions.Suppliers.View)]
        public async Task<IActionResult> GetById(int id)
        {
            // FIX: Added parentheses around condition (was missing)
            if (id <= 0)  // ← FIXED: was "if id <= 0" missing parentheses
            {
                return BadRequest(new { success = false, message = "Invalid supplier ID" });
            }
            try
            {
                var supplier = await _service.GetSupplierByIdAsync(id);
                if (supplier == null)
                {
                    return NotFound(new { success = false, message = $"Supplier with ID {id} not found" });
                }
                return Ok(new { success = true, data = supplier });

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting supplier {SupplierId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving the supplier" });
            }
        }

        // DELETE: api/Suppliers/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [RequirePermission(Permissions.Suppliers.Delete)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                if (id <= 0)
                    return BadRequest(new { success = false, message = "Invalid supplier ID" });

                var userId = GetCurrentUserId();
                if (!userId.HasValue)
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                _logger.LogWarning("Deleting supplier {SupplierId} by user {UserId}", id, userId);
                var deleteResult = await _service.DeleteSupplierAsync(id, userId.Value);
                if (!deleteResult)
                {
                    return NotFound(new { success = false, message = $"Supplier with ID {id} not found" });
                }
                return Ok(new { success = true, message = "Supplier deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting supplier {SupplierId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the supplier" });
            }
        }

        // PUT: api/Suppliers/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [RequirePermission(Permissions.Suppliers.Edit)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Validation failed" });

            if (id <= 0)
                return BadRequest(new { success = false, message = "Invalid supplier ID" });

            try
            {
                var updateResult = await _service.UpdateSupplierAsync(id, dto);
                if (!updateResult)
                {
                    return NotFound(new { success = false, message = $"Supplier with ID {id} not found" });
                }
                return Ok(new { success = true, message = "Supplier updated successfully" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Conflict updating supplier {SupplierId}", id);
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating supplier {SupplierId}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating the supplier" });
            }
        }

        private int? GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdString, out var userId))
                return userId;
            return null;
        }
    }
}
