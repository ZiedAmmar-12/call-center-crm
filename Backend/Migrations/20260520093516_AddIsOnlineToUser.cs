using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsOnlineToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_online",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "type_contrat",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "campaigns",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaigns", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaigns_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                        onDelete: ReferentialAction.Restrict);
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
                    removed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    recycled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    injected_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_injected = table.Column<bool>(type: "boolean", nullable: false),
                    contacts_total = table.Column<int>(type: "integer", nullable: false),
                    contacts_called = table.Column<int>(type: "integer", nullable: false),
                    contacts_remaining = table.Column<int>(type: "integer", nullable: false),
                    distribution_mode = table.Column<string>(type: "text", nullable: false),
                    performance_weight = table.Column<int>(type: "integer", nullable: false),
                    random_weight = table.Column<int>(type: "integer", nullable: false),
                    quota_per_agent = table.Column<int>(type: "integer", nullable: true),
                    auto_redistribute = table.Column<bool>(type: "boolean", nullable: false),
                    injected_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    copied_file_path = table.Column<string>(type: "text", nullable: true),
                    is_scheduled = table.Column<bool>(type: "boolean", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    scheduled_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    schedule_status = table.Column<string>(type: "text", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_campaign_agents_campaign_id_user_id",
                table: "campaign_agents",
                columns: new[] { "campaign_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaign_agents_user_id",
                table: "campaign_agents",
                column: "user_id");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "campaign_agents");

            migrationBuilder.DropTable(
                name: "campaign_files");

            migrationBuilder.DropTable(
                name: "campaigns");

            migrationBuilder.DropColumn(
                name: "is_online",
                table: "users");

            migrationBuilder.DropColumn(
                name: "type_contrat",
                table: "users");
        }
    }
}
