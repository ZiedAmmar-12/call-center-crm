using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignContactHopper : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "auto_pool_sizing",
                table: "campaigns",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "contacts_per_agent_per_hour",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_user_id",
                table: "campaigns",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "low_pool_ratio",
                table: "campaigns",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "max_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "min_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "pool_buffer_hours",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "priority",
                table: "campaign_files",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "activated_at",
                table: "campaign_file_contacts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assignment_priority",
                table: "campaign_file_contacts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "is_assignable",
                table: "campaign_file_contacts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "random_order",
                table: "campaign_file_contacts",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "auto_pool_sizing",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "contacts_per_agent_per_hour",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "low_pool_ratio",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "max_pool_target",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "min_pool_target",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "pool_buffer_hours",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "priority",
                table: "campaign_files");

            migrationBuilder.DropColumn(
                name: "activated_at",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "assignment_priority",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "is_assignable",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "random_order",
                table: "campaign_file_contacts");
        }
    }
}
