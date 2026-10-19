using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Helpers
{
    /// <summary>
    /// The Suppliers/SourceFiles/ImportJobs module (merged in from a colleague's codebase)
    /// stores "created by" / "uploaded by" as a foreign key to the "users" table.
    /// The real authentication system used across the rest of the app is the separate
    /// "Utilisateur" table (JWT NameIdentifier claim holds a Utilisateur.Id).
    /// These two tables are not kept in sync, so a logged-in SuperAdmin/Admin's id
    /// frequently has no matching row in "users" — any insert referencing it as a FK
    /// throws a DbUpdateException.
    ///
    /// This helper resolves a valid "users.id" to use for these FK columns without
    /// requiring the two tables to be merged: if a row already exists for the given
    /// id, use it; otherwise fall back to any existing row; otherwise create a single
    /// placeholder row (and a placeholder role, if needed) so uploads never hard-fail
    /// on this unrelated data-model gap.
    /// </summary>
    public static class UserBridgeHelper
    {
        public static async Task<int> EnsureValidUserIdAsync(ApplicationDbContext db, int preferredUserId)
        {
            var exists = await db.Users.AnyAsync(u => u.Id == preferredUserId);
            if (exists)
                return preferredUserId;

            var anyExistingId = await db.Users.Select(u => u.Id).FirstOrDefaultAsync();
            if (anyExistingId != 0)
                return anyExistingId;

            var roleId = await db.Roles.Select(r => r.Id).FirstOrDefaultAsync();
            if (roleId == 0)
            {
                var placeholderRole = new Role { Name = "System", IsActive = true, CreatedAt = DateTime.UtcNow };
                db.Roles.Add(placeholderRole);
                await db.SaveChangesAsync();
                roleId = placeholderRole.Id;
            }

            var placeholderUser = new User
            {
                FirstName = "Système",
                LastName = "CRM",
                Email = "system.placeholder@ebi.local",
                PasswordHash = string.Empty,
                RoleId = roleId,
                IsActive = true,
                IsOnline = false,
                // PresenceStatus is NOT NULL in the DB but nullable on the entity with no
                // C# default, so EF was sending an explicit NULL and overriding the column's
                // DB-level default — set it explicitly to avoid the 23502 violation.
                PresenceStatus = "Offline",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(placeholderUser);
            await db.SaveChangesAsync();
            return placeholderUser.Id;
        }
    }
}
