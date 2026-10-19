using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CsvHelper;
using System.Globalization;
using OfficeOpenXml;
using Backend.Data;
using Backend.DTOs.Lead;
using Backend.Entities;

namespace Backend.Controllers;

[ApiController]
[Route("api/leads-import")]
[Authorize(Roles = "ADMIN,QUALITE,SuperAdmin")]
public class LeadsImportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public LeadsImportController(ApplicationDbContext context) => _context = context;

    // ── Importer un fichier CSV ou XLSX ───────────────────────────────────────
    [HttpPost("import")]
    // Swashbuckle plante sur [FromForm] IFormFile (bug connu) : IFormFile est déjà
    // bindé depuis le multipart/form-data automatiquement, pas besoin de l'attribut.
    public async Task<IActionResult> Import(IFormFile file, [FromForm] string? campaignName, [FromForm] string? companyName)
    {
        if (file == null || file.Length == 0) return BadRequest(new { error = "Fichier requis" });
        var campaign = campaignName ?? "Campagne par défaut";
        var company = companyName ?? "Autre";
        int imported = 0;
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        using var stream = file.OpenReadStream();
        if (extension == ".csv")
        {
            using var reader = new StreamReader(stream);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            var records = csv.GetRecords<dynamic>().ToList();
            foreach (var record in records)
            {
                var d = (IDictionary<string, object>)record;
                _context.ImportedLeads.Add(new ImportedLead
                {
                    CompanyName = company,
                    ContactName = d.TryGetValue("name", out var n) ? n?.ToString() : d.TryGetValue("contact_name", out var cn) ? cn?.ToString() : null,
                    Phone = d.TryGetValue("phone", out var ph) ? ph?.ToString() : null,
                    Email = d.TryGetValue("email", out var em) ? em?.ToString() : null,
                    PostalCode = d.TryGetValue("postal_code", out var pc) ? pc?.ToString() : null,
                    CampaignName = campaign,
                    Status = "new"
                });
                imported++;
            }
        }
        else if (extension == ".xlsx" || extension == ".xls")
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using var pkg = new ExcelPackage(stream);
            var ws = pkg.Workbook.Worksheets.FirstOrDefault();
            if (ws?.Dimension != null)
            {
                for (int row = 2; row <= ws.Dimension.End.Row; row++)
                {
                    _context.ImportedLeads.Add(new ImportedLead
                    {
                        CompanyName = company,
                        ContactName = ws.Cells[row, 1].Text,
                        Phone = ws.Cells[row, 2].Text,
                        Email = ws.Cells[row, 3].Text,
                        PostalCode = ws.Cells[row, 4].Text,
                        CampaignName = campaign,
                        Status = "new"
                    });
                    imported++;
                }
            }
        }
        else return BadRequest(new { error = "Format non supporté (.csv ou .xlsx uniquement)" });

        await _context.SaveChangesAsync();
        return Ok(new ImportResultDto { Success = true, Filename = file.FileName, Imported = imported, Campaign = campaign });
    }

    // ── Stats des leads importés ──────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var leads = await _context.ImportedLeads.AsNoTracking().ToListAsync();
        return Ok(new LeadStatsDto
        {
            Total = leads.Count,
            Campaigns = leads.GroupBy(l => l.CampaignName ?? "default").Select(g => new CampaignCountDto { Campaign = g.Key, Count = g.Count() }).ToList(),
            Statuses = leads.GroupBy(l => l.Status ?? "unknown").Select(g => new StatusCountDto { Status = g.Key, Count = g.Count() }).ToList()
        });
    }

    // ── Liste des leads ───────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetLeads([FromQuery] string? campaign, [FromQuery] string? status, [FromQuery] int limit = 200)
    {
        var query = _context.ImportedLeads.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(campaign)) query = query.Where(l => l.CampaignName == campaign);
        if (!string.IsNullOrEmpty(status)) query = query.Where(l => l.Status == status);
        var leads = await query.OrderByDescending(l => l.CreatedAt).Take(limit)
            .Select(l => new LeadDto { Id = l.Id, Name = l.ContactName, Phone = l.Phone, Email = l.Email, Status = l.Status, PostalCode = l.PostalCode, CampaignName = l.CampaignName, CompanyName = l.CompanyName })
            .ToListAsync();
        return Ok(leads);
    }

    // ── Mettre à jour le statut d'un lead ─────────────────────────────────────
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateLeadStatusDto dto)
    {
        var lead = await _context.ImportedLeads.FindAsync(id);
        if (lead == null) return NotFound(new { error = "Lead introuvable" });
        lead.Status = dto.Status;
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public class UpdateLeadStatusDto
{
    public string Status { get; set; } = string.Empty;
}
