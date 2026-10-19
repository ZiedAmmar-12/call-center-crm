using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "type_contrat",
                table: "users");

            migrationBuilder.AddColumn<int>(
                name: "UserId1",
                table: "agent_profiles",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_agent_profiles_UserId1",
                table: "agent_profiles",
                column: "UserId1",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_agent_profiles_users_UserId1",
                table: "agent_profiles",
                column: "UserId1",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_agent_profiles_users_UserId1",
                table: "agent_profiles");

            migrationBuilder.DropIndex(
                name: "IX_agent_profiles_UserId1",
                table: "agent_profiles");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "agent_profiles");

            migrationBuilder.AddColumn<string>(
                name: "type_contrat",
                table: "users",
                type: "text",
                nullable: true);
        }
    }
}
