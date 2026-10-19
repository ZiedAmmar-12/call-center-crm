using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    salaire_base = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    prime_assiduite = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    total_rdv = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_confirme = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_signe = table.Column<int>(type: "integer", nullable: false),
                    total_rdv_annule = table.Column<int>(type: "integer", nullable: false),
                    total_pose = table.Column<int>(type: "integer", nullable: false),
                    note_evaluation_moyenne = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
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

            migrationBuilder.CreateIndex(
                name: "IX_agent_profiles_user_id",
                table: "agent_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO agent_profiles (
                    user_id,
                    type_contrat,
                    objectif_mensuel,
                    salaire_base,
                    prime_assiduite,
                    total_rdv,
                    total_rdv_confirme,
                    total_rdv_signe,
                    total_rdv_annule,
                    total_pose,
                    note_evaluation_moyenne,
                    updated_at
                )
                SELECT
                    u.id,
                    COALESCE(u.type_contrat, 'PLEIN_TEMPS'),
                    0,
                    0,
                    100,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    NOW()
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                WHERE r.name = 'Agent'
                  AND u.is_deleted = false
                  AND NOT EXISTS (
                      SELECT 1
                      FROM agent_profiles ap
                      WHERE ap.user_id = u.id
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "agent_profiles");
        }
    }
}
