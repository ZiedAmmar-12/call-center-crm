using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddChatAndAIFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Table ChatMessages (SignalR persistance) ───────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ChatMessages"" (
                    ""Id""          bigserial       NOT NULL PRIMARY KEY,
                    ""SenderId""    bigint          NOT NULL DEFAULT 0,
                    ""SenderName""  text            NOT NULL DEFAULT '',
                    ""SenderRole""  text            NOT NULL DEFAULT '',
                    ""Content""     character varying(2000) NOT NULL,
                    ""Channel""     text            NOT NULL DEFAULT 'GENERAL',
                    ""SentAt""      timestamp with time zone NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_ChatMessages_Channel_SentAt""
                    ON ""ChatMessages"" (""Channel"", ""SentAt"" DESC);
            ");

            // ── 2. Champs IA sur Contact ──────────────────────────────────────────
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Contacts' AND column_name='NombreNRP') THEN
                        ALTER TABLE ""Contacts"" ADD COLUMN ""NombreNRP"" integer NOT NULL DEFAULT 0;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Contacts' AND column_name='ScoreIA') THEN
                        ALTER TABLE ""Contacts"" ADD COLUMN ""ScoreIA"" double precision;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Contacts' AND column_name='CreneauOptimalIA') THEN
                        ALTER TABLE ""Contacts"" ADD COLUMN ""CreneauOptimalIA"" text;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='Contacts' AND column_name='DateScoreIA') THEN
                        ALTER TABLE ""Contacts"" ADD COLUMN ""DateScoreIA"" timestamp with time zone;
                    END IF;
                END
                $$;
            ");

            // Index partiel pour accélérer la requête "contacts scorés"
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_Contacts_ScoreIA""
                    ON ""Contacts"" (""ScoreIA"" DESC)
                    WHERE ""ScoreIA"" IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""ChatMessages"";");
            migrationBuilder.DropColumn(name: "NombreNRP",       table: "Contacts");
            migrationBuilder.DropColumn(name: "ScoreIA",          table: "Contacts");
            migrationBuilder.DropColumn(name: "CreneauOptimalIA", table: "Contacts");
            migrationBuilder.DropColumn(name: "DateScoreIA",      table: "Contacts");
        }
    }
}
