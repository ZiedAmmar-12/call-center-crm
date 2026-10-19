using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignedContactReleaseIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "idx_campaign_file_contacts_agent_assigned_timeout",
                table: "campaign_file_contacts",
                columns: new[] { "assigned_agent_id", "call_status", "assigned_at" });

            migrationBuilder.CreateIndex(
                name: "idx_campaign_file_contacts_assigned_timeout",
                table: "campaign_file_contacts",
                columns: new[] { "call_status", "assigned_at" });

            migrationBuilder.CreateIndex(
                name: "idx_call_attempts_status_started",
                table: "call_attempts",
                columns: new[] { "status", "started_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_campaign_file_contacts_agent_assigned_timeout",
                table: "campaign_file_contacts");

            migrationBuilder.DropIndex(
                name: "idx_campaign_file_contacts_assigned_timeout",
                table: "campaign_file_contacts");

            migrationBuilder.DropIndex(
                name: "idx_call_attempts_status_started",
                table: "call_attempts");
        }
    }
}
