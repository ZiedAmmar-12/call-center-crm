using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingCahierDesChargesFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── CONTACT : nouveaux champs qualification complète ──────────────────

            migrationBuilder.AddColumn<string>(
                name: "NumGSM", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodePostal", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ville", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatutAgent", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Commentaire", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommentaireConfirmation", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommentaireCommercial", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommentaireBanque", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Projet", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeRendezVous", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProprietaireDepuis", table: "Contacts",
                type: "timestamp with time zone", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModeChauffage", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConsommationChauffage", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AgeChaudiere", table: "Contacts", type: "integer", nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EtudePV", table: "Contacts", type: "boolean", nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EquipePV", table: "Contacts", type: "boolean", nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EquipePAC", table: "Contacts", type: "boolean", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EtatToiture", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EtatIsolation", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Surface", table: "Contacts", type: "double precision", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NombrePersonnes", table: "Contacts", type: "integer", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfessionMr", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfessionMme", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Credits", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Revenus", table: "Contacts", type: "text", nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Fichage", table: "Contacts", type: "boolean", nullable: true);

            // ── UTILISATEUR (TPH) : champs Agent élite + date embauche + Service Qualité ─

            migrationBuilder.AddColumn<DateTime>(
                name: "DateEmbauche", table: "Utilisateur",
                type: "timestamp with time zone", nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsElite", table: "Utilisateur",
                type: "boolean", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Service", table: "Utilisateur",
                type: "text", nullable: true);

            // ── RENDEZ-VOUS : nouveaux champs ─────────────────────────────────────

            migrationBuilder.AddColumn<string>(
                name: "TypeRendezVous", table: "RendezVous", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommentaireConfirmation", table: "RendezVous", type: "text", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommentaireCommercial", table: "RendezVous", type: "text", nullable: true);

            // ── TABLE EVALUATIONS ─────────────────────────────────────────────────

            migrationBuilder.CreateTable(
                name: "Evaluations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    EvaluateurId = table.Column<long>(type: "bigint", nullable: false),
                    DateEvaluation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NotePitchCommercial = table.Column<int>(type: "integer", nullable: false),
                    NoteTraitementObjections = table.Column<int>(type: "integer", nullable: false),
                    NoteQualiteAppel = table.Column<int>(type: "integer", nullable: false),
                    NoteRespectScript = table.Column<int>(type: "integer", nullable: false),
                    NoteEcoute = table.Column<int>(type: "integer", nullable: false),
                    NoteGlobale = table.Column<double>(type: "double precision", nullable: false),
                    Commentaire = table.Column<string>(type: "text", nullable: true),
                    AppelId = table.Column<long>(type: "bigint", nullable: true),
                    NbRdvBrut = table.Column<int>(type: "integer", nullable: false),
                    NbRdvConfirme = table.Column<int>(type: "integer", nullable: false),
                    NbRdvAnnule = table.Column<int>(type: "integer", nullable: false),
                    NbRdvSigne = table.Column<int>(type: "integer", nullable: false),
                    NbPose = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evaluations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evaluations_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Evaluations_Appels_AppelId",
                        column: x => x.AppelId,
                        principalTable: "Appels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Evaluations_AgentId",
                table: "Evaluations",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Evaluations_AppelId",
                table: "Evaluations",
                column: "AppelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Evaluations");

            // RendezVous
            migrationBuilder.DropColumn(name: "TypeRendezVous", table: "RendezVous");
            migrationBuilder.DropColumn(name: "CommentaireConfirmation", table: "RendezVous");
            migrationBuilder.DropColumn(name: "CommentaireCommercial", table: "RendezVous");

            // Utilisateur (Agent + Qualite)
            migrationBuilder.DropColumn(name: "DateEmbauche", table: "Utilisateur");
            migrationBuilder.DropColumn(name: "IsElite", table: "Utilisateur");
            migrationBuilder.DropColumn(name: "Service", table: "Utilisateur");

            // Contacts
            migrationBuilder.DropColumn(name: "NumGSM", table: "Contacts");
            migrationBuilder.DropColumn(name: "CodePostal", table: "Contacts");
            migrationBuilder.DropColumn(name: "Ville", table: "Contacts");
            migrationBuilder.DropColumn(name: "StatutAgent", table: "Contacts");
            migrationBuilder.DropColumn(name: "Commentaire", table: "Contacts");
            migrationBuilder.DropColumn(name: "CommentaireConfirmation", table: "Contacts");
            migrationBuilder.DropColumn(name: "CommentaireCommercial", table: "Contacts");
            migrationBuilder.DropColumn(name: "CommentaireBanque", table: "Contacts");
            migrationBuilder.DropColumn(name: "Projet", table: "Contacts");
            migrationBuilder.DropColumn(name: "TypeRendezVous", table: "Contacts");
            migrationBuilder.DropColumn(name: "ProprietaireDepuis", table: "Contacts");
            migrationBuilder.DropColumn(name: "ModeChauffage", table: "Contacts");
            migrationBuilder.DropColumn(name: "ConsommationChauffage", table: "Contacts");
            migrationBuilder.DropColumn(name: "AgeChaudiere", table: "Contacts");
            migrationBuilder.DropColumn(name: "EtudePV", table: "Contacts");
            migrationBuilder.DropColumn(name: "EquipePV", table: "Contacts");
            migrationBuilder.DropColumn(name: "EquipePAC", table: "Contacts");
            migrationBuilder.DropColumn(name: "EtatToiture", table: "Contacts");
            migrationBuilder.DropColumn(name: "EtatIsolation", table: "Contacts");
            migrationBuilder.DropColumn(name: "Surface", table: "Contacts");
            migrationBuilder.DropColumn(name: "NombrePersonnes", table: "Contacts");
            migrationBuilder.DropColumn(name: "ProfessionMr", table: "Contacts");
            migrationBuilder.DropColumn(name: "ProfessionMme", table: "Contacts");
            migrationBuilder.DropColumn(name: "Credits", table: "Contacts");
            migrationBuilder.DropColumn(name: "Revenus", table: "Contacts");
            migrationBuilder.DropColumn(name: "Fichage", table: "Contacts");
        }
    }
}
