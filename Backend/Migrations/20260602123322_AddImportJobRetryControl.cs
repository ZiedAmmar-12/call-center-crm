using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddImportJobRetryControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "attempts",
                table: "import_jobs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_heartbeat_at",
                table: "import_jobs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "max_attempts",
                table: "import_jobs",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<DateTime>(
                name: "raw_file_deleted_at",
                table: "import_jobs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "worker_id",
                table: "import_jobs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_import_jobs_status_heartbeat",
                table: "import_jobs",
                columns: new[] { "status", "last_heartbeat_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_import_jobs_status_heartbeat",
                table: "import_jobs");

            migrationBuilder.DropColumn(
                name: "attempts",
                table: "import_jobs");

            migrationBuilder.DropColumn(
                name: "last_heartbeat_at",
                table: "import_jobs");

            migrationBuilder.DropColumn(
                name: "max_attempts",
                table: "import_jobs");

            migrationBuilder.DropColumn(
                name: "raw_file_deleted_at",
                table: "import_jobs");

            migrationBuilder.DropColumn(
                name: "worker_id",
                table: "import_jobs");
        }
    }
}
