using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Data;
using Backend.Services;
using Backend.Services.Auth;
using Backend.Services.Agent;
using Backend.Services.Admin;
using Backend.Services.Confirmation;
using Backend.Services.Permission;
using Backend.Services.Suppliers;
using Backend.Services.SourceFiles;
using Backend.Services.Country;
using Backend.Services.LeadType;
using Backend.Services.Campaigns;
using Backend.Services.ContactDistribution;
using Backend.Services.Agents;
using Backend.Services.Files;
using Backend.Services.UserService;
using Backend.Services.Email;
using Backend.Services.Clients;
using Backend.Services.Attendance;
using Backend.Filters;
using Backend.Hubs;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================
var jwtConfig = new
{
    Secret   = builder.Configuration["Jwt:Secret"],
    Issuer   = builder.Configuration["Jwt:Issuer"],
    Audience = builder.Configuration["Jwt:Audience"]
};

if (string.IsNullOrEmpty(jwtConfig.Secret))
    throw new InvalidOperationException("JWT Secret is not configured!");
if (string.IsNullOrEmpty(jwtConfig.Issuer))
    throw new InvalidOperationException("JWT Issuer is not configured!");
if (string.IsNullOrEmpty(jwtConfig.Audience))
    throw new InvalidOperationException("JWT Audience is not configured!");

// ============================================================================
// SERVICES REGISTRATION
// ============================================================================
builder.Services.AddControllers(options =>
{
    options.Filters.Add<PermissionFilter>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Database
builder.Services.AddDbContext<Backend.Data.ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── MY EXISTING SERVICES ─────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,         AuthService>();
builder.Services.AddScoped<Backend.Services.Agent.IAgentService, Backend.Services.Agent.AgentService>();
builder.Services.AddScoped<IAdminService,        AdminService>();
builder.Services.AddScoped<IEmailService,        EmailService>();
builder.Services.AddScoped<IConfirmationService, ConfirmationService>();
builder.Services.AddScoped<IDashboardService,    DashboardService>();
builder.Services.AddScoped<Backend.Services.Permission.IPermissionService, Backend.Services.Permission.PermissionService>();
builder.Services.AddHttpContextAccessor();

// ─── COLLEAGUE'S NEW SERVICES ────────────────────────────────────────────
builder.Services.AddScoped<Backend.Helpers.FileValidationHelper>();
builder.Services.AddScoped<ISupplierService,             SupplierService>();
builder.Services.AddScoped<IFileStorageService,          FileStorageService>();
builder.Services.AddScoped<ISourceFileService,           SourceFileService>();
builder.Services.AddScoped<ICountryService,              CountryService>();
builder.Services.AddScoped<ILeadTypeService,             LeadTypeService>();
builder.Services.AddScoped<ICampaignService,             CampaignService>();
builder.Services.AddScoped<IContactDistributionService,  ContactDistributionService>();
builder.Services.AddScoped<Backend.Services.Agents.IAgentService, Backend.Services.Agents.AgentService>();
builder.Services.AddScoped<IClientService,                   ClientService>();
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<JwtTokenGenerator>();
builder.Services.AddHostedService<SourceFileImportWorker>();

// ─── ATTENDANCE / POINTAGE ───────────────────────────────────────────────
builder.Services.AddScoped<IAttendanceService, AttendanceService>();

// ─── SIGNALR (Chat temps réel) ───────────────────────────────────────────
builder.Services.AddSignalR();

// ─── HTTP CLIENT (pour appels microservice IA Python) ────────────────────
builder.Services.AddHttpClient();

// API Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CRM API", Version = "v1" });
    // Certains DTOs portent le même nom de classe dans des namespaces différents
    // (ex: StatistiquesGlobalesDTO dans DTOs.Admin et DTOs.Confirmation), ce qui
    // fait planter la génération du schéma OpenAPI (500 sur /swagger/v1/swagger.json)
    // sans ce réglage — on utilise le nom complet (avec namespace) comme schemaId.
    c.CustomSchemaIds(t => t.FullName);
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// File Upload Configuration
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit         = int.MaxValue;
    options.MultipartBodyLengthLimit = long.MaxValue;
});

// ============================================================================
// CORS CONFIGURATION
// ============================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR WebSocket
    });
});

// ============================================================================
// JWT AUTHENTICATION
// ============================================================================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtConfig.Secret!)),
            ValidateIssuer   = true,
            ValidIssuer      = jwtConfig.Issuer,
            ValidateAudience = true,
            ValidAudience    = jwtConfig.Audience,
            ValidateLifetime = true,
            ClockSkew        = TimeSpan.Zero
        };

        // ── SignalR WebSocket JWT (le browser ne peut pas envoyer d'en-tête Authorization) ──
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// Dynamic policy provider: any "Permission_..." policy just requires authentication
// (Role-based access is enforced separately by RequirePermissionAttribute at runtime)
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.FallbackPolicy = null;
});
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider,
    Backend.Authorization.PermissionPolicyProvider>();

// ============================================================================
// BUILD & CONFIGURE PIPELINE
// ============================================================================
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ─── SIGNALR HUB ─────────────────────────────────────────────────────────
app.MapHub<ChatHub>("/hubs/chat");

// ─── SEED DONNÉES DE TEST (dev uniquement) ────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<Backend.Data.ApplicationDbContext>();
    await Backend.Data.DbSeeder.SeedAsync(db);
}

app.Run();
