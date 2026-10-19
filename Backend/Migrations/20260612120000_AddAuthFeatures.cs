using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RefreshToken",
                table: "Utilisateur",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefreshTokenExpiryTime",
                table: "Utilisateur",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetToken",
                table: "Utilisateur",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetTokenExpiry",
                table: "Utilisateur",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "Utilisateur",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "RefreshToken",            table: "Utilisateur");
            migrationBuilder.DropColumn(name: "RefreshTokenExpiryTime",  table: "Utilisateur");
            migrationBuilder.DropColumn(name: "PasswordResetToken",      table: "Utilisateur");
            migrationBuilder.DropColumn(name: "PasswordResetTokenExpiry",table: "Utilisateur");
            migrationBuilder.DropColumn(name: "MustChangePassword",      table: "Utilisateur");
        }
    }
}
