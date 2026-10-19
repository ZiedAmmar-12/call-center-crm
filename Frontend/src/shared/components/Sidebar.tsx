import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Phone,
  History,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  Upload,
  Shield,
  Handshake,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from "../../assets/logo (2).png"
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const agentMenuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/agent/dashboard' },
    { icon: Phone, label: 'Appel en direct', path: '/agent/contact' },
    { icon: Users, label: 'Liste contacts', path: '/agent/contacts' },
    { icon: History, label: 'Historique', path: '/agent/history' },
    { icon: TrendingUp, label: 'Performance', path: '/agent/performance' },
    { icon: Calendar, label: 'Agenda', path: '/agent/agenda' },
    { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' }
  ];

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Live', path: '/admin/dashboard' },
    //{ icon: ClipboardCheck, label: 'Scorecards Agents', path: '/admin/scorecards' },
    { icon: Clock, label: 'Pointage', path: '/admin/pointage' },
    { icon: Shield, label: 'Permissions', path: '/admin/permissions' },
    //{ icon: BarChart3, label: 'Analytique Appels', path: '/admin/analytics' },
    //{ icon: Map, label: 'Carte Géographique', path: '/admin/map' },
    //{ icon: FunnelIcon, label: 'Pipeline CRM', path: '/admin/pipeline' },
    //{ icon: Users, label: 'Utilisateurs', path: '/admin/users' },
    //{ icon: Settings, label: 'Configuration IA', path: '/admin/ai-config' },
    //{ icon: Plug, label: 'Intégrations', path: '/admin/integrations' },
    //{ icon: FileText, label: 'Stats Agents', path: '/admin/agent-stats' },
    //{ icon: Shield, label: 'RGPD & Audit', path: '/admin/gdpr' },
    //{ icon: Download, label: 'Rapports', path: '/admin/reports' },
    { icon: Upload, label: 'Import Leads', path: '/admin/injection' },
    { icon: Upload, label: 'Sources de leads', path: '/admin/leads' },
    { icon: Handshake, label: 'Clients partenaires', path: '/admin/clients' }
    //{ icon: Upload, label: 'Import File', path: '/admin/import-leads/importfile' }
  ];

  const menuItems = user?.roleId === 8 ? adminMenuItems : agentMenuItems;

  return (
    <div
      className={`h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <img
            src={logo}
            alt="EBI Call Center"
            className="h-15 align-center"
          />
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-sidebar-foreground" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
