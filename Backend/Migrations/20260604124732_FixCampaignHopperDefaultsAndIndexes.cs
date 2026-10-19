using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class FixCampaignHopperDefaultsAndIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "pool_buffer_hours",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 7,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "min_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 5000,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "max_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 75000,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<decimal>(
                name: "low_pool_ratio",
                table: "campaigns",
                type: "numeric",
                nullable: false,
                defaultValue: 0.30m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<int>(
                name: "contacts_per_agent_per_hour",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 25,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<bool>(
                name: "auto_pool_sizing",
                table: "campaigns",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<int>(
                name: "active_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 75000);

            migrationBuilder.AddColumn<int>(
                name: "low_contacts_threshold",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 20000);

            migrationBuilder.AlterColumn<int>(
                name: "priority",
                table: "campaign_files",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<double>(
                name: "random_order",
                table: "campaign_file_contacts",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.AlterColumn<bool>(
                name: "is_assignable",
                table: "campaign_file_contacts",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<int>(
                name: "assignment_priority",
                table: "campaign_file_contacts",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.Sql("""
                UPDATE campaigns
                SET auto_pool_sizing = true,
                    contacts_per_agent_per_hour = CASE WHEN contacts_per_agent_per_hour <= 0 THEN 25 ELSE contacts_per_agent_per_hour END,
                    pool_buffer_hours = CASE WHEN pool_buffer_hours <= 0 THEN 7 ELSE pool_buffer_hours END,
                    min_pool_target = CASE WHEN min_pool_target <= 0 THEN 5000 ELSE min_pool_target END,
                    max_pool_target = CASE WHEN max_pool_target <= 0 THEN 75000 ELSE max_pool_target END,
                    low_pool_ratio = CASE WHEN low_pool_ratio <= 0 THEN 0.30 ELSE low_pool_ratio END
                WHERE contacts_per_agent_per_hour <= 0
                   OR pool_buffer_hours <= 0
                   OR min_pool_target <= 0
                   OR max_pool_target <= 0
                   OR low_pool_ratio <= 0;
                """);

            migrationBuilder.Sql("""
                UPDATE campaign_file_contacts
                SET random_order = random()
                WHERE random_order = 0;
                """);

            migrationBuilder.Sql("""
                UPDATE campaign_file_contacts AS c
                SET assignment_priority = cf.priority
                FROM campaign_files AS cf
                WHERE c.campaign_file_id = cf.id
                  AND c.assignment_priority = 0
                  AND cf.priority <> 0;
                """);

            migrationBuilder.CreateIndex(
                name: "idx_campaign_file_contacts_assignable_queue",
                table: "campaign_file_contacts",
                columns: new[] { "campaign_id", "is_assignable", "call_status", "assigned_agent_id", "assignment_priority", "random_order", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_campaign_file_contacts_assignable_queue",
                table: "campaign_file_contacts");

            migrationBuilder.DropColumn(
                name: "active_pool_target",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "low_contacts_threshold",
                table: "campaigns");

            migrationBuilder.AlterColumn<int>(
                name: "pool_buffer_hours",
                table: "campaigns",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 7);

            migrationBuilder.AlterColumn<int>(
                name: "min_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 5000);

            migrationBuilder.AlterColumn<int>(
                name: "max_pool_target",
                table: "campaigns",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 75000);

            migrationBuilder.AlterColumn<decimal>(
                name: "low_pool_ratio",
                table: "campaigns",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldDefaultValue: 0.30m);

            migrationBuilder.AlterColumn<int>(
                name: "contacts_per_agent_per_hour",
                table: "campaigns",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 25);

            migrationBuilder.AlterColumn<bool>(
                name: "auto_pool_sizing",
                table: "campaigns",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<int>(
                name: "priority",
                table: "campaign_files",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<double>(
                name: "random_order",
                table: "campaign_file_contacts",
                type: "double precision",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 0.0);

            migrationBuilder.AlterColumn<bool>(
                name: "is_assignable",
                table: "campaign_file_contacts",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "assignment_priority",
                table: "campaign_file_contacts",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);
        }
    }
}
