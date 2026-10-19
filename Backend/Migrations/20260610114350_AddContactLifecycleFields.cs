using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddContactLifecycleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "next_action",
                table: "campaign_file_contacts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "preferred_agent_id",
                table: "campaign_file_contacts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_campaign_file_contacts_next_action",
                table: "campaign_file_contacts",
                columns: new[] { "campaign_id", "next_action", "next_call_at" });

            migrationBuilder.CreateIndex(
                name: "idx_campaign_file_contacts_preferred_agent",
                table: "campaign_file_contacts",
                columns: new[] { "preferred_agent_id", "call_status", "next_call_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_campaign_file_contacts_next_action",
                table: "campaign_file_contacts");

            migrationBuilder.DropIndex(
                name: "idx_campaign_file_contacts_preferred_agent",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "next_action",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "preferred_agent_id",
                table: "campaign_file_contacts");
        }
    }
}
