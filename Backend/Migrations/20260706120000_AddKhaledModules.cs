using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddKhaledModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. ManualEvaluations ──────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ManualEvaluations"" (
                    ""Id""              bigserial                   NOT NULL PRIMARY KEY,
                    ""AgentId""         bigint                      NOT NULL,
                    ""EvaluatorId""     bigint                      NOT NULL,
                    ""CallRef""         character varying(100),
                    ""GlobalScore""     real                        NOT NULL DEFAULT 0,
                    ""Decision""        character varying(50),
                    ""Commentaires""    text,
                    ""ScoresJson""      text,
                    ""EvaluationDate""  timestamp with time zone    NOT NULL DEFAULT now(),
                    ""CreatedAt""       timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_ManualEvaluations_AgentId""
                    ON ""ManualEvaluations"" (""AgentId"");

                CREATE INDEX IF NOT EXISTS ""IX_ManualEvaluations_EvaluationDate""
                    ON ""ManualEvaluations"" (""EvaluationDate"" DESC);
            ");

            // ── 2. SalaryRules ────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""SalaryRules"" (
                    ""Id""          bigserial                   NOT NULL PRIMARY KEY,
                    ""RuleName""    character varying(100)      NOT NULL DEFAULT '',
                    ""RuleType""    character varying(50)       NOT NULL DEFAULT '',
                    ""Amount""      real                        NOT NULL DEFAULT 0,
                    ""Role""        character varying(50)       NOT NULL DEFAULT 'agent',
                    ""IsActive""    boolean                     NOT NULL DEFAULT true,
                    ""CreatedAt""   timestamp with time zone    NOT NULL DEFAULT now(),
                    ""UpdatedAt""   timestamp with time zone    NOT NULL DEFAULT now()
                );
            ");

            // ── 3. SalairesAgents ─────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""SalairesAgents"" (
                    ""Id""                  bigserial                   NOT NULL PRIMARY KEY,
                    ""AgentId""             bigint                      NOT NULL,
                    ""Month""               character varying(7)        NOT NULL DEFAULT '',
                    ""BaseSalary""          real                        NOT NULL DEFAULT 0,
                    ""RdvCount""            integer                     NOT NULL DEFAULT 0,
                    ""PoseCount""           integer                     NOT NULL DEFAULT 0,
                    ""RefusCount""          integer                     NOT NULL DEFAULT 0,
                    ""QualityRate""         real                        NOT NULL DEFAULT 0,
                    ""RdvBonus""            real                        NOT NULL DEFAULT 0,
                    ""PoseBonus""           real                        NOT NULL DEFAULT 0,
                    ""QualityBonus""        real                        NOT NULL DEFAULT 0,
                    ""InstallationBonus""   real                        NOT NULL DEFAULT 0,
                    ""Penalties""           real                        NOT NULL DEFAULT 0,
                    ""TotalSalary""         real                        NOT NULL DEFAULT 0,
                    ""PaymentStatus""       character varying(20)       NOT NULL DEFAULT 'pending',
                    ""CreatedAt""           timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_SalairesAgents_AgentId_Month""
                    ON ""SalairesAgents"" (""AgentId"", ""Month"");
            ");

            // ── 4. AiEligibilityLogs ──────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AiEligibilityLogs"" (
                    ""Id""          bigserial                   NOT NULL PRIMARY KEY,
                    ""AgentId""     bigint                      NOT NULL,
                    ""ClientData""  text,
                    ""Result""      text,
                    ""CreatedAt""   timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_AiEligibilityLogs_AgentId""
                    ON ""AiEligibilityLogs"" (""AgentId"");
            ");

            // ── 5. AlertRules ─────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AlertRules"" (
                    ""Id""                  bigserial                   NOT NULL PRIMARY KEY,
                    ""RuleType""            character varying(50)       NOT NULL DEFAULT '',
                    ""ThresholdValue""      integer                     NOT NULL DEFAULT 0,
                    ""IsActive""            boolean                     NOT NULL DEFAULT true,
                    ""NotificationEmail""   text,
                    ""UpdatedAt""           timestamp with time zone    NOT NULL DEFAULT now()
                );
            ");

            // ── 6. AlertHistories ─────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AlertHistories"" (
                    ""Id""              bigserial                   NOT NULL PRIMARY KEY,
                    ""AgentName""       text                        NOT NULL DEFAULT '',
                    ""AlertType""       text                        NOT NULL DEFAULT '',
                    ""ActualValue""     real                        NOT NULL DEFAULT 0,
                    ""ThresholdValue""  integer                     NOT NULL DEFAULT 0,
                    ""Severity""        character varying(20)       NOT NULL DEFAULT 'warning',
                    ""Message""         text,
                    ""CreatedAt""       timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_AlertHistories_CreatedAt""
                    ON ""AlertHistories"" (""CreatedAt"" DESC);
            ");

            // ── 7. ImportedLeads ──────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ImportedLeads"" (
                    ""Id""              bigserial                   NOT NULL PRIMARY KEY,
                    ""ContactName""     text,
                    ""Phone""           text,
                    ""Email""           text,
                    ""Address""         text,
                    ""PostalCode""      text,
                    ""CompanyName""     text,
                    ""CampaignName""    text,
                    ""Status""          text                        NOT NULL DEFAULT 'new',
                    ""AgentId""         integer,
                    ""CreatedAt""       timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_ImportedLeads_CampaignName""
                    ON ""ImportedLeads"" (""CampaignName"");

                CREATE INDEX IF NOT EXISTS ""IX_ImportedLeads_Status""
                    ON ""ImportedLeads"" (""Status"");
            ");

            // ── 8. AdvancedAttendances ────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AdvancedAttendances"" (
                    ""Id""          bigserial                   NOT NULL PRIMARY KEY,
                    ""UserId""      bigint                      NOT NULL,
                    ""Date""        timestamp with time zone    NOT NULL,
                    ""ClockIn""     timestamp with time zone    NOT NULL,
                    ""ClockOut""    timestamp with time zone,
                    ""Status""      character varying(20)       NOT NULL DEFAULT 'active',
                    ""CreatedAt""   timestamp with time zone    NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ""IX_AdvancedAttendances_UserId_Date""
                    ON ""AdvancedAttendances"" (""UserId"", ""Date"" DESC);
            ");

            // ── 9. AttendanceBreaks ───────────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AttendanceBreaks"" (
                    ""Id""              bigserial                   NOT NULL PRIMARY KEY,
                    ""AttendanceId""    bigint                      NOT NULL,
                    ""StartTime""       timestamp with time zone    NOT NULL,
                    ""EndTime""         timestamp with time zone,

                    CONSTRAINT ""FK_AttendanceBreaks_AdvancedAttendances""
                        FOREIGN KEY (""AttendanceId"")
                        REFERENCES ""AdvancedAttendances"" (""Id"")
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS ""IX_AttendanceBreaks_AttendanceId""
                    ON ""AttendanceBreaks"" (""AttendanceId"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AttendanceBreaks"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AdvancedAttendances"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""ImportedLeads"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AlertHistories"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AlertRules"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AiEligibilityLogs"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""SalairesAgents"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""SalaryRules"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""ManualEvaluations"";");
        }
    }
}
