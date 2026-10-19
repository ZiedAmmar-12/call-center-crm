using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations;

/// <inheritdoc />
public partial class AddAttendanceBreakFields : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add Type column to AttendanceBreaks
        migrationBuilder.Sql(@"
            ALTER TABLE ""AttendanceBreaks""
            ADD COLUMN IF NOT EXISTS ""Type"" character varying(50) NOT NULL DEFAULT '';
        ");

        // Add DurationMinutes column to AttendanceBreaks
        migrationBuilder.Sql(@"
            ALTER TABLE ""AttendanceBreaks""
            ADD COLUMN IF NOT EXISTS ""DurationMinutes"" integer NOT NULL DEFAULT 0;
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"ALTER TABLE ""AttendanceBreaks"" DROP COLUMN IF EXISTS ""Type"";");
        migrationBuilder.Sql(@"ALTER TABLE ""AttendanceBreaks"" DROP COLUMN IF EXISTS ""DurationMinutes"";");
    }
}
