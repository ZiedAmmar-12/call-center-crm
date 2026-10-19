using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBlacklistAndCampaignSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "call_timeout_minutes",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<int>(
                name: "max_attempts_per_contact",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.CreateTable(
                name: "blacklist",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    phone_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    added_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    added_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    campaign_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_blacklist", x => x.id);
                    table.ForeignKey(
                        name: "FK_blacklist_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_blacklist_users_added_by_user_id",
                        column: x => x.added_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "idx_blacklist_phone_number",
                table: "blacklist",
                column: "phone_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_blacklist_added_by_user_id",
                table: "blacklist",
                column: "added_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_blacklist_campaign_id",
                table: "blacklist",
                column: "campaign_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "blacklist");

            migrationBuilder.DropColumn(
                name: "call_timeout_minutes",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "max_attempts_per_contact",
                table: "campaigns");
        }
    }
}
