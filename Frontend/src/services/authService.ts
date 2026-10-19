import api from './api';
import type { Permission } from '../types/permissions';

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  Email: string;
  Password: string;
  role: string;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleId: number;
  role: number;
  roleName?: string;
  permissions: Permission[];
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

const clearAuthStorage = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const normalizeUser = (rawUser: any): User => ({
  ...rawUser,
  id: rawUser.id ?? rawUser.Id,
  firstName: rawUser.firstName ?? rawUser.FirstName ?? '',
  lastName: rawUser.lastName ?? rawUser.LastName ?? '',
  email: rawUser.email ?? rawUser.Email ?? '',
  phone: rawUser.phone ?? rawUser.Phone,
  roleId: rawUser.roleId ?? rawUser.RoleId ?? (rawUser.role && typeof rawUser.role === 'object' ? rawUser.role.id : rawUser.role),
  role: rawUser.role ?? rawUser.Role ?? rawUser.roleId ?? rawUser.RoleId,
  roleName: rawUser.roleName ?? rawUser.RoleName,
  avatar: rawUser.avatar ?? rawUser.Avatar,
  permissions: rawUser.permissions ?? rawUser.Permissions ?? []
});

export const authService = {
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', request);
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);

    const normalizedUser = normalizeUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    return { ...response.data, user: normalizedUser };
  },
  
  async register(request: RegisterRequest): Promise<User> {
    const response = await api.post<User>('/auth/register', request);
    return normalizeUser(response.data);
  },
  
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return normalizeUser(response.data);
  },
  
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthStorage();
    }
  },
  
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { oldPassword, newPassword });
    clearAuthStorage();
  },
  
  getStoredUser(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;

    try {
      return normalizeUser(JSON.parse(userJson));
    } catch {
      clearAuthStorage();
      return null;
    }
  },
  
  getUserRole():string |null{
    const user = this.getStoredUser();
    return user ? user.roleName || null : null;
  },
  hasRole(requiredRole: string): boolean {
    const userRole = this.getUserRole();
    return userRole === requiredRole;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken') && !!localStorage.getItem('user');
  }
};
