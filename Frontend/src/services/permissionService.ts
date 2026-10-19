import type { Permission } from "../types/permissions";
export const permissionService = {
    //check if user has a specific permission
    hasPermission(userPermissions: Permission[] | undefined, permission: Permission): boolean {
        if (!userPermissions) return false;
        return userPermissions.includes(permission);
    },
    //check if user has any of the permissions in a list
    hasAnyPermission(userPermissions: Permission[] | undefined, permissions: Permission[]): boolean {
        if (!userPermissions) return false;
        return permissions.some(p => userPermissions.includes(p));
    },
    hasAllPermissions(userPermissions: Permission[] | undefined, permissions: Permission[]): boolean {
        if (!userPermissions) return false;
        return permissions.every(p => userPermissions.includes(p));
    },
    getPermissionsByGroup(userPermissions: Permission[], group: string): Permission[] {
        return userPermissions.filter(p => p.startsWith(group));
    },
    groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
        const groups: Record<string, Permission[]> = {};

        permissions.forEach(permission => {
            const group = permission.split('.')[0];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(permission);
        });

        return groups;
    }
};