using Microsoft.EntityFrameworkCore;
using Backend.Entities;

namespace Backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    // ─── MY EXISTING DbSets (TPH CRM) ────────────────────────────────────────
    public DbSet<Utilisateur> Utilisateurs => Set<Utilisateur>();
    public DbSet<SuperAdmin> SuperAdmins => Set<SuperAdmin>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Commercial> Commerciaux => Set<Commercial>();
    public DbSet<Qualite> ServiceQualite => Set<Qualite>();
    public DbSet<Technique> ServiceTechnique => Set<Technique>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Appel> Appels => Set<Appel>();
    public DbSet<RendezVous> RendezVous => Set<RendezVous>();
    public DbSet<Performance> Performances => Set<Performance>();
    public DbSet<Pointage> Pointages => Set<Pointage>();
    public DbSet<Agenda> Agendas => Set<Agenda>();
    public DbSet<FichierImport> FichiersImport => Set<FichierImport>();
    public DbSet<Conge> Conges => Set<Conge>();
    public DbSet<Confirmatrice> Confirmatrices => Set<Confirmatrice>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    // ─── COLLEAGUE'S DbSets (Supplier/Campaign system) ───────────────────────
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Country> Countries { get; set; }
    public DbSet<LeadType> LeadTypes { get; set; }
    public DbSet<SourceFile> SourceFiles { get; set; }
    public DbSet<SourceFileContact> SourceFileContacts { get; set; }
    public DbSet<SourceFileInvalidRow> SourceFileInvalidRows { get; set; }
    public DbSet<ImportJob> ImportJobs { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<CampaignFile> CampaignFiles { get; set; }
    public DbSet<CampaignFileContact> CampaignFileContacts { get; set; }
    public DbSet<CampaignAgents> CampaignAgents { get; set; }
    public DbSet<CallAttempt> CallAttempts { get; set; }
    public DbSet<AgentProfile> AgentProfiles { get; set; }
    public DbSet<DistributedContact> DistributedContacts { get; set; }
    public DbSet<Client> Clients { get; set; }
    public DbSet<ContactNote> ContactNotes { get; set; }

    // ─── KHALED'S DbSets (Qualité, IA, Salaires, Alertes, Leads) ─────────────
    public DbSet<ManualEvaluation> ManualEvaluations => Set<ManualEvaluation>();
    public DbSet<SalaryRule> SalaryRules => Set<SalaryRule>();
    public DbSet<SalaireAgent> SalairesAgents => Set<SalaireAgent>();
    public DbSet<AiEligibilityLog> AiEligibilityLogs => Set<AiEligibilityLog>();
    public DbSet<AlertRule> AlertRules => Set<AlertRule>();
    public DbSet<AlertHistory> AlertHistories => Set<AlertHistory>();
    public DbSet<ImportedLead> ImportedLeads => Set<ImportedLead>();
    public DbSet<AdvancedAttendance> AdvancedAttendances => Set<AdvancedAttendance>();
    public DbSet<AttendanceBreak> AttendanceBreaks => Set<AttendanceBreak>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── MY EXISTING: Héritage TPH ────────────────────────────────────────
        // ─── Fix: migration created "Utilisateur" (singular), DbSet name defaults to plural ─
        modelBuilder.Entity<Utilisateur>().ToTable("Utilisateur");

        modelBuilder.Entity<Utilisateur>()
            .HasDiscriminator<string>("Role")
            .HasValue<SuperAdmin>("SuperAdmin")
            .HasValue<Agent>("AGENT")
            .HasValue<Commercial>("COMMERCIAL")
            .HasValue<Admin>("ADMIN")
            .HasValue<Confirmatrice>("CONFIRMATRICE")
            .HasValue<Qualite>("QUALITE")
            .HasValue<Technique>("TECH");
        
        modelBuilder.Entity<Confirmatrice>()
            .Property(c => c.Type)
            .HasConversion<string>();

        modelBuilder.Entity<Agent>(entity =>
        {
            entity.Property(a => a.TypeContrat)
                .HasConversion(
                    v => v.HasValue ? v.Value.ToString() : null,
                    v => v != null ? (TypeContrat?)Enum.Parse<TypeContrat>(v) : null
                );
            entity.HasOne(a => a.Agenda).WithOne(ag => ag.Agent)
                .HasForeignKey<Agenda>(ag => ag.AgentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(a => a.Contacts).WithOne(c => c.Agent)
                .HasForeignKey(c => c.AgentId).OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(a => a.Appels).WithOne(ap => ap.Agent)
                .HasForeignKey(ap => ap.AgentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(a => a.RendezVous).WithOne(r => r.Agent)
                .HasForeignKey(r => r.AgentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(a => a.Performances).WithOne(p => p.Agent)
                .HasForeignKey(p => p.AgentId).OnDelete(DeleteBehavior.Cascade);
        });

        // ─── COLLEAGUE'S: RolePermission (composite key) ─────────────────────
        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId);

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId);

        // ─── SOURCE FILE CONTACTS ─────────────────────────────────────────────
        modelBuilder.Entity<SourceFileContact>(entity =>
        {
            entity.ToTable("source_file_contacts");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.SourceFile)
                .WithMany()
                .HasForeignKey(e => e.SourceFileId)
                .HasConstraintName("fk_source_file_contacts_source_file");
        });

        // ─── IMPORT JOBS ──────────────────────────────────────────────────────
        modelBuilder.Entity<ImportJob>(entity =>
        {
            entity.ToTable("import_jobs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<int>();
        });

        // ─── CAMPAIGN ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Campaign>(entity =>
        {
            entity.ToTable("campaigns");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<int>();
        });

        // ─── CAMPAIGN FILE ────────────────────────────────────────────────────
        modelBuilder.Entity<CampaignFile>(entity =>
        {
            entity.ToTable("campaign_files");
            entity.HasKey(e => e.Id);
            entity.HasOne(cf => cf.Campaign)
                .WithMany(c => c.CampaignFiles)
                .HasForeignKey(cf => cf.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(cf => cf.SourceFile)
                .WithMany()
                .HasForeignKey(cf => cf.SourceFileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── CAMPAIGN FILE CONTACT ────────────────────────────────────────────
        modelBuilder.Entity<CampaignFileContact>(entity =>
        {
            entity.ToTable("campaign_file_contacts");
            entity.HasKey(e => e.Id);
        });

        // ─── CAMPAIGN AGENTS ──────────────────────────────────────────────────
        modelBuilder.Entity<CampaignAgents>(entity =>
        {
            entity.ToTable("campaign_agents");
            entity.HasKey(e => e.Id);
        });

        // ─── SOURCE FILE ──────────────────────────────────────────────────────
        modelBuilder.Entity<SourceFile>(entity =>
        {
            entity.ToTable("source_files");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasConversion<int>();
            entity.HasOne(sf => sf.Supplier)
                .WithMany(s => s.SourceFiles)
                .HasForeignKey(sf => sf.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── SUPPLIER ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.ToTable("suppliers");
            entity.HasKey(e => e.Id);
            entity.HasOne(s => s.Country)
                .WithMany(c => c.Suppliers)
                .HasForeignKey(s => s.CountryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.LeadType)
                .WithMany(lt => lt.Suppliers)
                .HasForeignKey(s => s.LeadTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── USER (colleague's User entity, separate from Utilisateur) ────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── AGENT PROFILE ────────────────────────────────────────────────────
        modelBuilder.Entity<AgentProfile>(entity =>
        {
            entity.ToTable("agent_profiles");
            entity.HasKey(e => e.Id);
            entity.HasOne(ap => ap.User)
                .WithOne(u => u.AgentProfile)
                .HasForeignKey<AgentProfile>(ap => ap.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ─── DISTRIBUTED CONTACT ──────────────────────────────────────────────
        modelBuilder.Entity<DistributedContact>(entity =>
        {
            entity.ToTable("contacts");
            entity.HasKey(e => e.Id);
        });

        // ─── KHALED's ENTITIES ────────────────────────────────────────────────
        modelBuilder.Entity<ManualEvaluation>(entity =>
        {
            entity.ToTable("ManualEvaluations");
            entity.HasOne(e => e.Agent)
                .WithMany()
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Evaluator)
                .WithMany()
                .HasForeignKey(e => e.EvaluatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SalaryRule>(entity =>
        {
            entity.ToTable("SalaryRules");
            entity.Property(e => e.Role).HasDefaultValue("agent");
        });

        modelBuilder.Entity<SalaireAgent>(entity =>
        {
            entity.ToTable("SalairesAgents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PaymentStatus).HasDefaultValue("pending");
            entity.HasOne(e => e.Agent)
                .WithMany()
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiEligibilityLog>(entity =>
        {
            entity.ToTable("AiEligibilityLogs");
        });

        modelBuilder.Entity<AlertRule>(entity =>
        {
            entity.ToTable("AlertRules");
        });

        modelBuilder.Entity<AlertHistory>(entity =>
        {
            entity.ToTable("AlertHistories");
            entity.Property(e => e.Severity).HasDefaultValue("warning");
        });

        modelBuilder.Entity<ImportedLead>(entity =>
        {
            entity.ToTable("ImportedLeads");
            entity.Property(e => e.Status).HasDefaultValue("new");
        });

        modelBuilder.Entity<AdvancedAttendance>(entity =>
        {
            entity.ToTable("AdvancedAttendances");
            entity.Property(e => e.Status).HasDefaultValue("active");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AttendanceBreak>(entity =>
        {
            entity.ToTable("AttendanceBreaks");
            entity.HasOne(e => e.Attendance)
                .WithMany(a => a.Breaks)
                .HasForeignKey(e => e.AttendanceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
