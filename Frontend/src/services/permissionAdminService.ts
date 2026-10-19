import api from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PermissionDto {
  id: number;
  name: string;
  groupName: string;
}

export interface RolePermissionDto {
  roleId: number;
  roleName: string;
  permissionNames: string[];
}

export interface UserPermissionScopeDto {
  permissionName: string;
  scopeType?: string | null;
  scopeUserId?: number | null;
  scopeUserName?: string | null;
}

export interface UserPermissionDto {
  userId: number;
  userName: string;
  email: string;
  roleName: string;
  permissionNames: string[];
  scopedPermissions: UserPermissionScopeDto[];
}

export interface PermissionTargetUserDto {
  userId: number;
  userName: string;
  email: string;
  roleName: string;
}

export const PermissionAdminService = {
  async getPermissions(): Promise<PermissionDto[]> {
    const response = await api.get<ApiEnvelope<PermissionDto[]>>("/Permissions");
    return response.data.data;
  },

  async getRolesWithPermissions(): Promise<RolePermissionDto[]> {
    const response = await api.get<ApiEnvelope<RolePermissionDto[]>>("/Permissions/roles");
    return response.data.data;
  },

  async updateRolePermissions(roleId: number, permissionNames: string[]): Promise<void> {
    await api.put(`/Permissions/roles/${roleId}`, { permissionNames });
  },

  async getUsersWithPermissions(): Promise<UserPermissionDto[]> {
    const response = await api.get<ApiEnvelope<UserPermissionDto[]>>("/Permissions/users");
    return response.data.data;
  },

  async getPermissionTargetUsers(): Promise<PermissionTargetUserDto[]> {
    const response = await api.get<ApiEnvelope<PermissionTargetUserDto[]>>("/Permissions/targets/users");
    return response.data.data;
  },

  async updateUserPermissions(
    userId: number,
    permissionNames: string[],
    scopedPermissions: UserPermissionScopeDto[],
  ): Promise<void> {
    await api.put(`/Permissions/users/${userId}`, { permissionNames, scopedPermissions });
  },
};
