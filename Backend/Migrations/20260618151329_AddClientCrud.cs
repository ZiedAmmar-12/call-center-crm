using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddClientCrud : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "client_id",
                table: "campaign_file_contacts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "clients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    nom = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    telephone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    adresse = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clients", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_campaign_file_contacts_client_id",
                table: "campaign_file_contacts",
                column: "client_id");

            migrationBuilder.CreateIndex(
                name: "idx_clients_code",
                table: "clients",
                column: "code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_campaign_file_contacts_clients_client_id",
                table: "campaign_file_contacts",
                column: "client_id",
                principalTable: "clients",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_campaign_file_contacts_clients_client_id",
                table: "campaign_file_contacts");

            migrationBuilder.DropTable(
                name: "clients");

            migrationBuilder.DropIndex(
                name: "IX_campaign_file_contacts_client_id",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "client_id",
                table: "campaign_file_contacts");
        }
    }
}
