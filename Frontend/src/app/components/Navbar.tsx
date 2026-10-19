import React from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels: Record<string, string> = {
    agent: 'Agent Commercial',
    conf1: 'Confirmatrice Niveau 1',
    confirmatrice1: 'Confirmatrice Niveau 1',
    conf2: 'Confirmatrice Niveau 2',
    confirmatrice2: 'Confirmatrice Niveau 2',
    admin: 'Administrateur',
    qualite: 'Service Qualité',
    technique: 'Service Technique'
  };

  // Récupérer le rôle correctement (en minuscules)
  const userRole = user?.role?.toLowerCase() || '';
  const roleLabel = roleLabels[userRole] || user?.role || 'Utilisateur';

  return (
    <nav className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-foreground">Bienvenue, {user?.name || 'Utilisateur'}</h1>
        <p className="text-sm text-muted-foreground">{roleLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card hover:bg-accent transition-colors">
          <Bell className="w-4 h-4 text-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}