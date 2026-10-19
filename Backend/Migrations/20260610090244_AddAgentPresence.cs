using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentPresence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "is_online",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<DateTime>(
                name: "last_heartbeat_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "presence_changed_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "presence_status",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Offline");

            migrationBuilder.CreateIndex(
                name: "idx_users_presence_heartbeat",
                table: "users",
                columns: new[] { "is_online", "presence_status", "last_heartbeat_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_users_presence_heartbeat",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_heartbeat_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "presence_changed_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "presence_status",
                table: "users");

            migrationBuilder.AlterColumn<bool>(
                name: "is_online",
                table: "users",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }
    }
}
