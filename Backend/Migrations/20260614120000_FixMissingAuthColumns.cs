using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class FixMissingAuthColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add columns only if they don't already exist (idempotent via raw SQL)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Utilisateur' AND column_name='MustChangePassword') THEN
                        ALTER TABLE ""Utilisateur"" ADD COLUMN ""MustChangePassword"" boolean NOT NULL DEFAULT false;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Utilisateur' AND column_name='RefreshToken') THEN
                        ALTER TABLE ""Utilisateur"" ADD COLUMN ""RefreshToken"" text;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Utilisateur' AND column_name='RefreshTokenExpiryTime') THEN
                        ALTER TABLE ""Utilisateur"" ADD COLUMN ""RefreshTokenExpiryTime"" timestamp with time zone;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Utilisateur' AND column_name='PasswordResetToken') THEN
                        ALTER TABLE ""Utilisateur"" ADD COLUMN ""PasswordResetToken"" text;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Utilisateur' AND column_name='PasswordResetTokenExpiry') THEN
                        ALTER TABLE ""Utilisateur"" ADD COLUMN ""PasswordResetTokenExpiry"" timestamp with time zone;
                    END IF;
                END
                $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "MustChangePassword",      table: "Utilisateur");
            migrationBuilder.DropColumn(name: "RefreshToken",            table: "Utilisateur");
            migrationBuilder.DropColumn(name: "RefreshTokenExpiryTime",  table: "Utilisateur");
            migrationBuilder.DropColumn(name: "PasswordResetToken",      table: "Utilisateur");
            migrationBuilder.DropColumn(name: "PasswordResetTokenExpiry",table: "Utilisateur");
        }
    }
}
