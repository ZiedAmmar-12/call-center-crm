import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { Permission } from '../types/permissions';
import { permissionService } from '../services/permissionService';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  typeConfirmatrice?: string; // 'CONF1' | 'CONF2' | 'CONFCLIENT' | undefined
  permissions?: Permission[];
}

export type LoginResult = 'success' | 'pending_first_login' | 'must_change_password' | 'error';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  switchTestRole: (role: 'conf1' | 'conf2' | 'admin' | 'agent') => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  getUserPermissions: () => Permission[];
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_TOKENS = {
  conf1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkiLCJlbWFpbCI6ImNvbmYxQGViaS5jb20iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJDT05GMSIsIm5vbSI6IlRlc3QiLCJwcmVub20iOiJDb25maXJtYXRyaWNlIiwianRpIjoiMjU0OTQ2ODAtYzA4NC00Zjc0LWIyMDQtZmU5YzI1ZGFhYzE3IiwiZXhwIjoyNTI0NjA4MDAwfQ.test',
  conf2: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwIiwiZW1haWwiOiJjb25mMkBlYmkuY29tIn0.test',
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6IkFETUlOIn0.test',
  agent: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwicm9sZSI6IkFHRU5UIn0.test'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        motDePasse: password,
        identifiantMachine: null,
      });
      const data = res.data;
      const token = data.token || data.accessToken;
      const userData: User = {
        id: data.userId || data.id || 0,
        name: `${data.prenom || ''} ${data.nom || ''}`.trim() || email,
        email: data.email || email,
        role: (data.role || 'agent').toLowerCase(),
        typeConfirmatrice: data.typeConfirmatrice || undefined,
        permissions: data.permissions || [],
      };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return 'success';
    } catch (err: any) {
      const message: string = err.response?.data?.message || err.response?.data || err.message || '';
      if (message.includes('COMPTE_EN_ATTENTE')) {
        return 'pending_first_login';
      }
      if (message.includes('MUST_CHANGE_PASSWORD')) {
        return 'must_change_password';
      }
      console.error('Login error:', message);
      return 'error';
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await axios.post(`${API_URL}/auth/forgot-password`, { email });
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    await axios.post(`${API_URL}/auth/reset-password`, { token, newPassword });
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.post(
      `${API_URL}/auth/change-password`,
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const switchTestRole = (role: 'conf1' | 'conf2' | 'admin' | 'agent') => {
    const testUsers = {
      conf1: { id: 999, name: 'Confirmatrice 1', email: 'conf1@ebi.com', role: 'conf1' },
      conf2: { id: 1000, name: 'Confirmatrice 2', email: 'conf2@ebi.com', role: 'conf2' },
      admin: { id: 1, name: 'Admin Principal', email: 'admin@ebi.com', role: 'admin' },
      agent: { id: 2, name: 'Agent Commercial', email: 'agent@ebi.com', role: 'agent' }
    };
    const newUser = testUsers[role];
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('token', TEST_TOKENS[role]);
    const paths = { conf1: '/confirmation1/dashboard', conf2: '/confirmation2/dashboard', admin: '/admin/dashboard', agent: '/agent/dashboard' };
    window.location.href = paths[role];
  };

  // ── Permission methods ─────────────────────────────────────
  const hasPermission = (permission: Permission): boolean =>
    permissionService.hasPermission(user?.permissions, permission);

  const hasAnyPermission = (permissions: Permission[]): boolean =>
    permissionService.hasAnyPermission(user?.permissions, permissions);

  const hasAllPermissions = (permissions: Permission[]): boolean =>
    permissionService.hasAllPermissions(user?.permissions, permissions);

  const getUserPermissions = (): Permission[] => user?.permissions || [];

  const refreshPermissions = async (): Promise<void> => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/auth/me/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const perms = res.data as Permission[];
      const updated = { ...user, permissions: perms };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (e) {
      console.error('refreshPermissions failed:', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      loading,
      switchTestRole,
      forgotPassword,
      resetPassword,
      changePassword,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissions,
      refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
