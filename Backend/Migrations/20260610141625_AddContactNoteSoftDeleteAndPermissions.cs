using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.API.Migrations
{
    /// <inheritdoc />
    public partial class AddContactNoteSoftDeleteAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "contact_notes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by_user_id",
                table: "contact_notes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "contact_notes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "source_file_contact_id",
                table: "contact_notes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "contact_notes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "updated_by_user_id",
                table: "contact_notes",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE contact_notes AS note
                SET source_file_contact_id = contact.source_file_contact_id
                FROM campaign_file_contacts AS contact
                WHERE note.campaign_file_contact_id = contact.id
                  AND note.source_file_contact_id IS NULL;
                """);

            migrationBuilder.Sql("""
                INSERT INTO permissions (name, group_name, created_at)
                SELECT permission_name, 'Contacts', CURRENT_TIMESTAMP
                FROM (VALUES
                    ('Contacts.View'),
                    ('Contacts.Create'),
                    ('Contacts.Qualify'),
                    ('Contacts.Update'),
                    ('Contacts.ViewHistory'),
                    ('Contacts.AddNote'),
                    ('Contacts.EditNote'),
                    ('Contacts.DeleteNote')
                ) AS contact_permissions(permission_name)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM permissions
                    WHERE permissions.name = contact_permissions.permission_name
                );
                """);

            migrationBuilder.CreateIndex(
                name: "idx_contact_notes_source_contact_created",
                table: "contact_notes",
                columns: new[] { "source_file_contact_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_contact_notes_visible_contact_created",
                table: "contact_notes",
                columns: new[] { "is_deleted", "campaign_file_contact_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_contact_notes_deleted_by_user_id",
                table: "contact_notes",
                column: "deleted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_notes_updated_by_user_id",
                table: "contact_notes",
                column: "updated_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_contact_notes_source_file_contacts_source_file_contact_id",
                table: "contact_notes",
                column: "source_file_contact_id",
                principalTable: "source_file_contacts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_contact_notes_users_deleted_by_user_id",
                table: "contact_notes",
                column: "deleted_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_contact_notes_users_updated_by_user_id",
                table: "contact_notes",
                column: "updated_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_contact_notes_source_file_contacts_source_file_contact_id",
                table: "contact_notes");

            migrationBuilder.DropForeignKey(
                name: "FK_contact_notes_users_deleted_by_user_id",
                table: "contact_notes");

            migrationBuilder.DropForeignKey(
                name: "FK_contact_notes_users_updated_by_user_id",
                table: "contact_notes");

            migrationBuilder.DropIndex(
                name: "idx_contact_notes_source_contact_created",
                table: "contact_notes");

            migrationBuilder.DropIndex(
                name: "idx_contact_notes_visible_contact_created",
                table: "contact_notes");

            migrationBuilder.DropIndex(
                name: "IX_contact_notes_deleted_by_user_id",
                table: "contact_notes");

            migrationBuilder.DropIndex(
                name: "IX_contact_notes_updated_by_user_id",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "deleted_by_user_id",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "source_file_contact_id",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "contact_notes");

            migrationBuilder.DropColumn(
                name: "updated_by_user_id",
                table: "contact_notes");

            migrationBuilder.Sql("""
                DELETE FROM role_permissions
                WHERE permission_id IN (
                    SELECT id
                    FROM permissions
                    WHERE name IN ('Contacts.AddNote', 'Contacts.EditNote', 'Contacts.DeleteNote')
                );

                DELETE FROM user_permissions
                WHERE permission_id IN (
                    SELECT id
                    FROM permissions
                    WHERE name IN ('Contacts.AddNote', 'Contacts.EditNote', 'Contacts.DeleteNote')
                );

                DELETE FROM permissions
                WHERE name IN ('Contacts.AddNote', 'Contacts.EditNote', 'Contacts.DeleteNote');
                """);
        }
    }
}
