using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddColleagueFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appels_Contacts_ContactId",
                table: "Appels");

            migrationBuilder.DropForeignKey(
                name: "FK_Contacts_FichiersImport_FichierImportId",
                table: "Contacts");

            migrationBuilder.DropForeignKey(
                name: "FK_RendezVous_Contacts_ContactId",
                table: "RendezVous");

            migrationBuilder.DropForeignKey(
                name: "FK_RendezVous_Utilisateur_CommercialId",
                table: "RendezVous");

            migrationBuilder.DropTable(
                name: "Pauses");

            migrationBuilder.DropIndex(
                name: "IX_Utilisateur_Email",
                table: "Utilisateur");

            migrationBuilder.DropIndex(
                name: "IX_Pointages_AgentId_Date",
                table: "Pointages");

            migrationBuilder.DropIndex(
                name: "IX_permissions_name",
                table: "permissions");

            migrationBuilder.DropIndex(
                name: "IX_Performances_AgentId_DateDebut_DateFin",
                table: "Performances");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_Telephone",
                table: "Contacts");

            migrationBuilder.Sql(
                "ALTER TABLE role_permissions ALTER COLUMN role_id TYPE integer USING role_id::integer;");

            migrationBuilder.Sql(
                "ALTER TABLE \"RendezVous\" ALTER COLUMN \"Statut\" TYPE integer USING \"Statut\"::integer;");

            migrationBuilder.Sql(
                "ALTER TABLE \"FichiersImport\" ALTER COLUMN \"Statut\" TYPE integer USING \"Statut\"::integer;");

            migrationBuilder.Sql(
                "ALTER TABLE \"FichiersImport\" ALTER COLUMN \"Erreurs\" TYPE text[] USING ARRAY[\"Erreurs\"];");

            migrationBuilder.Sql(
                "ALTER TABLE \"Appels\" ALTER COLUMN \"Qualification\" TYPE integer USING \"Qualification\"::integer;");

            migrationBuilder.CreateTable(
                name: "countries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    code = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    phone_prefix = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Pause",
                columns: table => new
                {
                    PointageId = table.Column<long>(type: "bigint", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Debut = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DureeSecondes = table.Column<int>(type: "integer", nullable: false),
                    AlerteEnvoyee = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pause", x => new { x.PointageId, x.Id });
                    table.ForeignKey(
                        name: "FK_Pause_Pointages_PointageId",
                        column: x => x.PointageId,
                        principalTable: "Pointages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lead_types",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    country_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_types", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_types_countries_country_id",
                        column: x => x.country_id,
                        principalTable: "countries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    first_name = table.Column<string>(type: "text", nullable: false),
                    last_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    role_id = table.Column<int>(type: "integer", nullable: false),
                    avatar = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_online = table.Column<bool>(type: "boolean", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    refresh_token = table.Column<string>(type: "text", nullable: true),
                    refresh_token_expiry_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    password_reset_token = table.Column<string>(type: "text", nullable: true),
                    password_reset_token_expiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    must_change_password = table.Column<bool>(type: "boolean", nullable: false),
                    password_reset_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_users_users_password_reset_by_user_id",
                        column: x => x.password_reset_by_user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "agent_profiles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    hire_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    type_contrat = table.Column<string>(type: "text", nullable: false),
                    objectif_mensuel = table.Column<int>(type: "integer", nullable: false),
                    salaire_base = table.Column<decimal>(type: "numeric", nullable: false),
                    prime_assiduite = table.Column<decimal>(type: "numeric", nullable: false),
                    total_rdv = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_confirme = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_signe = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_annule = table.Column<int>(type: "integer", nullable: false),
                    total_pose = table.Column<int>(type: "integer", nullable: false),
                    note_evaluation_moyenne = table.Column<decimal>(type: "numeric", nullable: false),
                    derniere_activite = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agent_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_agent_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaigns",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    auto_pool_sizing = table.Column<bool>(type: "boolean", nullable: false),
                    active_pool_target = table.Column<int>(type: "integer", nullable: false),
                    low_contacts_threshold = table.Column<int>(type: "integer", nullable: false),
                    contacts_per_agent_per_hour = table.Column<int>(type: "integer", nullable: false),
                    pool_buffer_hours = table.Column<int>(type: "integer", nullable: false),
                    max_pool_target = table.Column<int>(type: "integer", nullable: false),
                    min_pool_target = table.Column<int>(type: "integer", nullable: false),
                    low_pool_ratio = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaigns", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaigns_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    country_id = table.Column<int>(type: "integer", nullable: false),
                    lead_type_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_suppliers", x => x.id);
                    table.ForeignKey(
                        name: "FK_suppliers_countries_country_id",
                        column: x => x.country_id,
                        principalTable: "countries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_suppliers_lead_types_lead_type_id",
                        column: x => x.lead_type_id,
                        principalTable: "lead_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_suppliers_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false),
                    scope_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    scope_user_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_permissions", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_permissions_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_permissions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaign_agents",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    assigned_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    quota = table.Column<int>(type: "integer", nullable: true),
                    weight = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_agents", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_agents_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_agents_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "source_files",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    supplier_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    original_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_size_label = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    file_path = table.Column<string>(type: "text", nullable: false),
                    format = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    statut = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    total_lines = table.Column<int>(type: "integer", nullable: false),
                    valid_contacts = table.Column<int>(type: "integer", nullable: false),
                    duplicates = table.Column<int>(type: "integer", nullable: false),
                    empty_rows = table.Column<int>(type: "integer", nullable: false),
                    invalid_phones = table.Column<int>(type: "integer", nullable: false),
                    contact_count = table.Column<int>(type: "integer", nullable: false),
                    list_number = table.Column<int>(type: "integer", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    validated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    parsed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    uploaded_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    parent_source_file_id = table.Column<int>(type: "integer", nullable: true),
                    split_part_number = table.Column<int>(type: "integer", nullable: true),
                    split_total_parts = table.Column<int>(type: "integer", nullable: true),
                    recycled_from_campaign_list_id = table.Column<int>(type: "integer", nullable: true),
                    is_split_parent = table.Column<bool>(type: "boolean", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_source_files_source_files_parent_source_file_id",
                        column: x => x.parent_source_file_id,
                        principalTable: "source_files",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_source_files_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_source_files_users_uploaded_by_user_id",
                        column: x => x.uploaded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaign_files",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<int>(type: "integer", nullable: false),
                    source_file_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<bool>(type: "boolean", nullable: false),
                    is_recycled = table.Column<bool>(type: "boolean", nullable: false),
                    is_removed = table.Column<bool>(type: "boolean", nullable: false),
                    removed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    recycled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_injected = table.Column<bool>(type: "boolean", nullable: false),
                    injected_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    injected_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    contacts_total = table.Column<int>(type: "integer", nullable: false),
                    contacts_called = table.Column<int>(type: "integer", nullable: false),
                    contacts_remaining = table.Column<int>(type: "integer", nullable: false),
                    is_scheduled = table.Column<bool>(type: "boolean", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    scheduled_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    schedule_status = table.Column<string>(type: "text", nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_files_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_files_source_files_source_file_id",
                        column: x => x.source_file_id,
                        principalTable: "source_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "import_jobs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    status = table.Column<int>(type: "integer", maxLength: 20, nullable: false),
                    source_file_id = table.Column<int>(type: "integer", nullable: true),
                    supplier_id = table.Column<int>(type: "integer", nullable: false),
                    country_id = table.Column<int>(type: "integer", nullable: false),
                    lead_type_id = table.Column<int>(type: "integer", nullable: false),
                    uploaded_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    display_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    stored_file_path = table.Column<string>(type: "text", nullable: false),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    format = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    column_mapping_json = table.Column<string>(type: "text", nullable: true),
                    total_rows = table.Column<int>(type: "integer", nullable: false),
                    processed_rows = table.Column<int>(type: "integer", nullable: false),
                    last_heartbeat_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    worker_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    max_attempts = table.Column<int>(type: "integer", nullable: false),
                    raw_file_deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    valid_contacts = table.Column<int>(type: "integer", nullable: false),
                    empty_rows = table.Column<int>(type: "integer", nullable: false),
                    invalid_phones = table.Column<int>(type: "integer", nullable: false),
                    duplicates = table.Column<int>(type: "integer", nullable: false),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_import_jobs_countries_country_id",
                        column: x => x.country_id,
                        principalTable: "countries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_import_jobs_lead_types_lead_type_id",
                        column: x => x.lead_type_id,
                        principalTable: "lead_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_import_jobs_source_files_source_file_id",
                        column: x => x.source_file_id,
                        principalTable: "source_files",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_import_jobs_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_import_jobs_users_uploaded_by_user_id",
                        column: x => x.uploaded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "source_file_contacts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_file_id = table.Column<int>(type: "integer", nullable: false),
                    phone_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_valid = table.Column<bool>(type: "boolean", nullable: false),
                    original_phone_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    error_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_file_contacts", x => x.id);
                    table.ForeignKey(
                        name: "fk_source_file_contacts_source_file",
                        column: x => x.source_file_id,
                        principalTable: "source_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "source_file_invalid_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    import_job_id = table.Column<int>(type: "integer", nullable: false),
                    source_file_id = table.Column<int>(type: "integer", nullable: true),
                    row_number = table.Column<int>(type: "integer", nullable: false),
                    phone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_file_invalid_rows", x => x.id);
                    table.ForeignKey(
                        name: "FK_source_file_invalid_rows_import_jobs_import_job_id",
                        column: x => x.import_job_id,
                        principalTable: "import_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_source_file_invalid_rows_source_files_source_file_id",
                        column: x => x.source_file_id,
                        principalTable: "source_files",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "campaign_file_contacts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_file_id = table.Column<int>(type: "integer", nullable: false),
                    campaign_id = table.Column<int>(type: "integer", nullable: false),
                    confirmation_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    confirmed_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    qualified_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    source_file_contact_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_agent_id = table.Column<int>(type: "integer", nullable: true),
                    call_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qualification_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    max_attempts = table.Column<int>(type: "integer", nullable: false),
                    last_call_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_call_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    call_duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    recording_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    appointment_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    appointment_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    agent_comment = table.Column<string>(type: "text", nullable: true),
                    confirmation_comment = table.Column<string>(type: "text", nullable: true),
                    commercial_comment = table.Column<string>(type: "text", nullable: true),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    qualified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    projet = table.Column<string>(type: "text", nullable: true),
                    proprietaire_depuis = table.Column<int>(type: "integer", nullable: true),
                    mode_chauffage = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    consommation_chauffage = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    age_chaudiere = table.Column<int>(type: "integer", nullable: true),
                    equipe_pv = table.Column<bool>(type: "boolean", nullable: true),
                    equipe_pac = table.Column<bool>(type: "boolean", nullable: true),
                    etat_toiture = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    etat_isolation = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    nbre_personnes = table.Column<int>(type: "integer", nullable: true),
                    profession_mr = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    profession_mme = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    revenus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    credits = table.Column<bool>(type: "boolean", nullable: true),
                    fichage = table.Column<bool>(type: "boolean", nullable: true),
                    is_assignable = table.Column<bool>(type: "boolean", nullable: false),
                    activated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    random_order = table.Column<double>(type: "double precision", nullable: false),
                    assignment_priority = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_file_contacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_file_contacts_campaign_files_campaign_file_id",
                        column: x => x.campaign_file_id,
                        principalTable: "campaign_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_file_contacts_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_file_contacts_source_file_contacts_source_file_con~",
                        column: x => x.source_file_contact_id,
                        principalTable: "source_file_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_file_contacts_users_assigned_agent_id",
                        column: x => x.assigned_agent_id,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_campaign_file_contacts_users_confirmed_by_user_id",
                        column: x => x.confirmed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "contacts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source_file_contact_id = table.Column<int>(type: "integer", nullable: false),
                    agent_id = table.Column<int>(type: "integer", nullable: true),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    address = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    postal_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    gsm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_contacts_source_file_contacts_source_file_contact_id",
                        column: x => x.source_file_contact_id,
                        principalTable: "source_file_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contacts_users_agent_id",
                        column: x => x.agent_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "call_attempts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    campaign_id = table.Column<int>(type: "integer", nullable: false),
                    campaign_file_id = table.Column<int>(type: "integer", nullable: false),
                    campaign_file_contact_id = table.Column<int>(type: "integer", nullable: false),
                    source_file_contact_id = table.Column<int>(type: "integer", nullable: false),
                    agent_id = table.Column<int>(type: "integer", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    qualification_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    provider_call_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    answered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    duration_seconds = table.Column<int>(type: "integer", nullable: true),
                    recording_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_call_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_call_attempts_campaign_file_contacts_campaign_file_contact_~",
                        column: x => x.campaign_file_contact_id,
                        principalTable: "campaign_file_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_call_attempts_campaign_files_campaign_file_id",
                        column: x => x.campaign_file_id,
                        principalTable: "campaign_files",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_call_attempts_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_call_attempts_source_file_contacts_source_file_contact_id",
                        column: x => x.source_file_contact_id,
                        principalTable: "source_file_contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_call_attempts_users_agent_id",
                        column: x => x.agent_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pointages_AgentId",
                table: "Pointages",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Performances_AgentId",
                table: "Performances",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_agent_profiles_user_id",
                table: "agent_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_agent_id",
                table: "call_attempts",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_campaign_file_contact_id",
                table: "call_attempts",
                column: "campaign_file_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_campaign_file_id",
                table: "call_attempts",
                column: "campaign_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_campaign_id",
                table: "call_attempts",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_source_file_contact_id",
                table: "call_attempts",
                column: "source_file_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_agents_campaign_id",
                table: "campaign_agents",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_agents_user_id",
                table: "campaign_agents",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_assigned_agent_id",
                table: "campaign_file_contacts",
                column: "assigned_agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_campaign_file_id",
                table: "campaign_file_contacts",
                column: "campaign_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_campaign_id",
                table: "campaign_file_contacts",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_confirmed_by_user_id",
                table: "campaign_file_contacts",
                column: "confirmed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_source_file_contact_id",
                table: "campaign_file_contacts",
                column: "source_file_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_files_campaign_id",
                table: "campaign_files",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_files_source_file_id",
                table: "campaign_files",
                column: "source_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_created_by_user_id",
                table: "campaigns",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_agent_id",
                table: "contacts",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_contacts_source_file_contact_id",
                table: "contacts",
                column: "source_file_contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_country_id",
                table: "import_jobs",
                column: "country_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_lead_type_id",
                table: "import_jobs",
                column: "lead_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_source_file_id",
                table: "import_jobs",
                column: "source_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_supplier_id",
                table: "import_jobs",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_uploaded_by_user_id",
                table: "import_jobs",
                column: "uploaded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_types_country_id",
                table: "lead_types",
                column: "country_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_file_contacts_source_file_id",
                table: "source_file_contacts",
                column: "source_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_file_invalid_rows_import_job_id",
                table: "source_file_invalid_rows",
                column: "import_job_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_file_invalid_rows_source_file_id",
                table: "source_file_invalid_rows",
                column: "source_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_files_parent_source_file_id",
                table: "source_files",
                column: "parent_source_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_files_supplier_id",
                table: "source_files",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_source_files_uploaded_by_user_id",
                table: "source_files",
                column: "uploaded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_country_id",
                table: "suppliers",
                column: "country_id");

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_created_by_user_id",
                table: "suppliers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_lead_type_id",
                table: "suppliers",
                column: "lead_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_permission_id",
                table: "user_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_user_id",
                table: "user_permissions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_password_reset_by_user_id",
                table: "users",
                column: "password_reset_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_role_id",
                table: "users",
                column: "role_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Appels_Contacts_ContactId",
                table: "Appels",
                column: "ContactId",
                principalTable: "Contacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Contacts_FichiersImport_FichierImportId",
                table: "Contacts",
                column: "FichierImportId",
                principalTable: "FichiersImport",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RendezVous_Contacts_ContactId",
                table: "RendezVous",
                column: "ContactId",
                principalTable: "Contacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RendezVous_Utilisateur_CommercialId",
                table: "RendezVous",
                column: "CommercialId",
                principalTable: "Utilisateur",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_role_permissions_roles_role_id",
                table: "role_permissions",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appels_Contacts_ContactId",
                table: "Appels");

            migrationBuilder.DropForeignKey(
                name: "FK_Contacts_FichiersImport_FichierImportId",
                table: "Contacts");

            migrationBuilder.DropForeignKey(
                name: "FK_RendezVous_Contacts_ContactId",
                table: "RendezVous");

            migrationBuilder.DropForeignKey(
                name: "FK_RendezVous_Utilisateur_CommercialId",
                table: "RendezVous");

            migrationBuilder.DropForeignKey(
                name: "FK_role_permissions_roles_role_id",
                table: "role_permissions");

            migrationBuilder.DropTable(
                name: "agent_profiles");

            migrationBuilder.DropTable(
                name: "call_attempts");

            migrationBuilder.DropTable(
                name: "campaign_agents");

            migrationBuilder.DropTable(
                name: "contacts");

            migrationBuilder.DropTable(
                name: "Pause");

            migrationBuilder.DropTable(
                name: "source_file_invalid_rows");

            migrationBuilder.DropTable(
                name: "user_permissions");

            migrationBuilder.DropTable(
                name: "campaign_file_contacts");

            migrationBuilder.DropTable(
                name: "import_jobs");

            migrationBuilder.DropTable(
                name: "campaign_files");

            migrationBuilder.DropTable(
                name: "source_file_contacts");

            migrationBuilder.DropTable(
                name: "campaigns");

            migrationBuilder.DropTable(
                name: "source_files");

            migrationBuilder.DropTable(
                name: "suppliers");

            migrationBuilder.DropTable(
                name: "lead_types");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "countries");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropIndex(
                name: "IX_Pointages_AgentId",
                table: "Pointages");

            migrationBuilder.DropIndex(
                name: "IX_Performances_AgentId",
                table: "Performances");

            migrationBuilder.AlterColumn<string>(
                name: "role_id",
                table: "role_permissions",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Statut",
                table: "RendezVous",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Statut",
                table: "FichiersImport",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Erreurs",
                table: "FichiersImport",
                type: "text",
                nullable: false,
                oldClrType: typeof(List<string>),
                oldType: "text[]");

            migrationBuilder.AlterColumn<string>(
                name: "Qualification",
                table: "Appels",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateTable(
                name: "Pauses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlerteEnvoyee = table.Column<bool>(type: "boolean", nullable: false),
                    Debut = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DureeSecondes = table.Column<int>(type: "integer", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PointageId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pauses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pauses_Pointages_PointageId",
                        column: x => x.PointageId,
                        principalTable: "Pointages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateur_Email",
                table: "Utilisateur",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pointages_AgentId_Date",
                table: "Pointages",
                columns: new[] { "AgentId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_permissions_name",
                table: "permissions",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Performances_AgentId_DateDebut_DateFin",
                table: "Performances",
                columns: new[] { "AgentId", "DateDebut", "DateFin" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_Telephone",
                table: "Contacts",
                column: "Telephone");

            migrationBuilder.CreateIndex(
                name: "IX_Pauses_PointageId",
                table: "Pauses",
                column: "PointageId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appels_Contacts_ContactId",
                table: "Appels",
                column: "ContactId",
                principalTable: "Contacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Contacts_FichiersImport_FichierImportId",
                table: "Contacts",
                column: "FichierImportId",
                principalTable: "FichiersImport",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RendezVous_Contacts_ContactId",
                table: "RendezVous",
                column: "ContactId",
                principalTable: "Contacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RendezVous_Utilisateur_CommercialId",
                table: "RendezVous",
                column: "CommercialId",
                principalTable: "Utilisateur",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
