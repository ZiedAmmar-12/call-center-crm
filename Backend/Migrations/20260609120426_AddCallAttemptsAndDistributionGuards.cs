using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCallAttemptsAndDistributionGuards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Assigned"),
                    qualification_status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    provider_call_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    answered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    duration_seconds = table.Column<int>(type: "integer", nullable: true),
                    recording_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
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
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_call_attempts_users_agent_id",
                        column: x => x.agent_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "idx_call_attempts_agent_started",
                table: "call_attempts",
                columns: new[] { "agent_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "idx_call_attempts_campaign_status_started",
                table: "call_attempts",
                columns: new[] { "campaign_id", "status", "started_at" });

            migrationBuilder.CreateIndex(
                name: "idx_call_attempts_contact_attempt",
                table: "call_attempts",
                columns: new[] { "campaign_file_contact_id", "attempt_number" });

            migrationBuilder.CreateIndex(
                name: "idx_call_attempts_provider_call_id",
                table: "call_attempts",
                columns: new[] { "provider", "provider_call_id" });

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_campaign_file_id",
                table: "call_attempts",
                column: "campaign_file_id");

            migrationBuilder.CreateIndex(
                name: "IX_call_attempts_source_file_contact_id",
                table: "call_attempts",
                column: "source_file_contact_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "call_attempts");
        }
    }
}
