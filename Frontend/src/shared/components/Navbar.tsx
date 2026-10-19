import { Bell, LogOut, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels: Record<string, string> = {
    agent: 'Agent',
    confirmatrice1: 'Confirmatrice 1',
    confirmatrice2: 'Confirmatrice 2',
    admin: 'Administrateur',
    qualite: 'Service Qualité',
    technique: 'Service Technique',
    '1': 'Administrateur',
    '2': 'Agent',
    '3': 'Confirmatrice 1',
    '4': 'Confirmatrice 2',
    '5': 'Service Qualite',
    '7': 'Service Technique',
    '8': 'Super Administrateur'
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : '';
  const roleLabel = user ? user.roleName ?? roleLabels[String(user.roleId)] ?? roleLabels[String(user.role)] : '';

  return (
    <nav className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-foreground">Bienvenue, {displayName || 'Utilisateur'}</h1>
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
