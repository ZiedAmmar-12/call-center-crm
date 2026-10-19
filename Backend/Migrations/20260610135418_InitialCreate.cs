using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FichiersImport",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NomFichier = table.Column<string>(type: "text", nullable: false),
                    DateImport = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Importateur = table.Column<string>(type: "text", nullable: false),
                    NombreTotalLignes = table.Column<int>(type: "integer", nullable: false),
                    NombreContactsImportes = table.Column<int>(type: "integer", nullable: false),
                    NombreErreurs = table.Column<int>(type: "integer", nullable: false),
                    Actif = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<string>(type: "text", nullable: false),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    Erreurs = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FichiersImport", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    group_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Utilisateur",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    Prenom = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    MotDePasse = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    Actif = table.Column<bool>(type: "boolean", nullable: false),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    DerniereConnexion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IdentifiantMachine = table.Column<string>(type: "text", nullable: true),
                    Niveau = table.Column<string>(type: "text", nullable: true),
                    TypeContrat = table.Column<string>(type: "text", nullable: true),
                    ObjectifMensuel = table.Column<int>(type: "integer", nullable: true),
                    SalaireBase = table.Column<double>(type: "double precision", nullable: true),
                    PrimeAssiduite = table.Column<double>(type: "double precision", nullable: true),
                    Matricule = table.Column<string>(type: "text", nullable: true),
                    TauxCommission = table.Column<double>(type: "double precision", nullable: true),
                    Type = table.Column<string>(type: "text", nullable: true),
                    Specialite = table.Column<string>(type: "text", nullable: true),
                    AgendasAccess = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Utilisateur", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    role_id = table.Column<string>(type: "text", nullable: false),
                    permission_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.role_id, x.permission_id });
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Agendas",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    Nom = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agendas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Agendas_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Conges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CommercialId = table.Column<long>(type: "bigint", nullable: false),
                    DateDebut = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateFin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Statut = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conges_Utilisateur_CommercialId",
                        column: x => x.CommercialId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Contacts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nom = table.Column<string>(type: "text", nullable: true),
                    Prenom = table.Column<string>(type: "text", nullable: true),
                    Telephone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Adresse = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    DateImport = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    QualificationDetaillee = table.Column<string>(type: "text", nullable: true),
                    DateDernierAppel = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DureeDernierAppel = table.Column<int>(type: "integer", nullable: true),
                    DateRappelPlanifie = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AgentId = table.Column<long>(type: "bigint", nullable: true),
                    FichierImportId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contacts_FichiersImport_FichierImportId",
                        column: x => x.FichierImportId,
                        principalTable: "FichiersImport",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Contacts_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Performances",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    DateDebut = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateFin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Periode = table.Column<string>(type: "text", nullable: false),
                    NbAppels = table.Column<int>(type: "integer", nullable: false),
                    NbAppelsQualifies = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousBruts = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousConfirmes = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousAnnules = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousReportes = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousHC = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousNonSignes = table.Column<int>(type: "integer", nullable: false),
                    NbRendezVousSignes = table.Column<int>(type: "integer", nullable: false),
                    NbInstallations = table.Column<int>(type: "integer", nullable: false),
                    ObjectifMensuel = table.Column<int>(type: "integer", nullable: false),
                    ObjectifAtteint = table.Column<bool>(type: "boolean", nullable: false),
                    PrimeAssiduite = table.Column<double>(type: "double precision", nullable: false),
                    PrimeMensuelle = table.Column<double>(type: "double precision", nullable: false),
                    PrimeTrimestrielle = table.Column<double>(type: "double precision", nullable: false),
                    TotalPrimes = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Performances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Performances_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pointages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PremierAppel = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DernierAppel = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalSecondesTravaillees = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pointages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pointages_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Appels",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContactId = table.Column<long>(type: "bigint", nullable: false),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    DateHeure = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DureeSecondes = table.Column<int>(type: "integer", nullable: false),
                    Qualification = table.Column<string>(type: "text", nullable: false),
                    CheminEnregistrement = table.Column<string>(type: "text", nullable: true),
                    Enregistre = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appels_Contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "Contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appels_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RendezVous",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContactId = table.Column<long>(type: "bigint", nullable: false),
                    AgentId = table.Column<long>(type: "bigint", nullable: false),
                    CommercialId = table.Column<long>(type: "bigint", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateRendezVous = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Statut = table.Column<string>(type: "text", nullable: false),
                    TypeProjet = table.Column<string>(type: "text", nullable: true),
                    Commentaire = table.Column<string>(type: "text", nullable: true),
                    DateReport = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CommentaireBanque = table.Column<string>(type: "text", nullable: true),
                    MotifRefus = table.Column<string>(type: "text", nullable: true),
                    ARecontacter = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RendezVous", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RendezVous_Contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "Contacts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RendezVous_Utilisateur_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RendezVous_Utilisateur_CommercialId",
                        column: x => x.CommercialId,
                        principalTable: "Utilisateur",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Pauses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Debut = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DureeSecondes = table.Column<int>(type: "integer", nullable: false),
                    AlerteEnvoyee = table.Column<bool>(type: "boolean", nullable: false),
                    PointageId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pauses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pauses_Pointages_PointageId",
                        column: x => x.PointageId,
                        principalTable: "Pointages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Agendas_AgentId",
                table: "Agendas",
                column: "AgentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appels_AgentId",
                table: "Appels",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Appels_ContactId",
                table: "Appels",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_Conges_CommercialId",
                table: "Conges",
                column: "CommercialId");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_AgentId",
                table: "Contacts",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_FichierImportId",
                table: "Contacts",
                column: "FichierImportId");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_Telephone",
                table: "Contacts",
                column: "Telephone");

            migrationBuilder.CreateIndex(
                name: "IX_Pauses_PointageId",
                table: "Pauses",
                column: "PointageId");

            migrationBuilder.CreateIndex(
                name: "IX_Performances_AgentId_DateDebut_DateFin",
                table: "Performances",
                columns: new[] { "AgentId", "DateDebut", "DateFin" });

            migrationBuilder.CreateIndex(
                name: "IX_permissions_name",
                table: "permissions",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pointages_AgentId_Date",
                table: "Pointages",
                columns: new[] { "AgentId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RendezVous_AgentId",
                table: "RendezVous",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_RendezVous_CommercialId",
                table: "RendezVous",
                column: "CommercialId");

            migrationBuilder.CreateIndex(
                name: "IX_RendezVous_ContactId",
                table: "RendezVous",
                column: "ContactId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_permission_id",
                table: "role_permissions",
                column: "permission_id");

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateur_Email",
                table: "Utilisateur",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Agendas");

            migrationBuilder.DropTable(
                name: "Appels");

            migrationBuilder.DropTable(
                name: "Conges");

            migrationBuilder.DropTable(
                name: "Pauses");

            migrationBuilder.DropTable(
                name: "Performances");

            migrationBuilder.DropTable(
                name: "RendezVous");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "Pointages");

            migrationBuilder.DropTable(
                name: "Contacts");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "FichiersImport");

            migrationBuilder.DropTable(
                name: "Utilisateur");
        }
    }
}
