using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignFileContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "auto_redistribute",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "copied_file_path",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "distribution_mode",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "performance_weight",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "quota_per_agent",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "random_weight",
                table: "campaign_files");

            migrationBuilder.AlterColumn<DateTime>(
                name: "removed_at",
                table: "campaign_files",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

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
                    fichage = table.Column<bool>(type: "boolean", nullable: true)
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "campaign_file_contacts");

            migrationBuilder.AlterColumn<DateTime>(
                name: "removed_at",
                table: "campaign_files",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "auto_redistribute",
                table: "campaign_files",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "copied_file_path",
                table: "campaign_files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "distribution_mode",
                table: "campaign_files",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "performance_weight",
                table: "campaign_files",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "quota_per_agent",
                table: "campaign_files",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "random_weight",
                table: "campaign_files",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
