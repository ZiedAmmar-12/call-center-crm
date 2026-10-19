using Backend.DTOs.CountryDTO;
using Backend.Services.Country;
using Backend.Entities;
using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/Countries")]
    [Authorize]
    public class CountryController : ControllerBase
    {
        private readonly ICountryService _countryService;
        private readonly ILogger<CountryController> _logger;

        public CountryController(ICountryService countryService, ILogger<CountryController> logger)
        {
            _countryService = countryService;
            _logger = logger;
        }

        // GET: api/Countries
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var countries = await _countryService.GetAllAsync();
            return Ok(countries);
        }
        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin, ServiceTechnique")]
        public async Task<IActionResult> Create([FromBody] CreateCountryDto dto)
        {
            try
            {
                var country = await _countryService.CreateAsync(dto);
                return Ok(new
                {
                    success = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating country");

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating the country.",
                    error = ex.Message
                });
            }


        }
    }
}