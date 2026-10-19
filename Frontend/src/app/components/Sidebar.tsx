import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Phone, History, TrendingUp, Calendar, Users,
  ClipboardCheck, Clock, BarChart3, Map, Settings, Plug, FileText,
  Download, Upload, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CheckSquare, XCircle, Star, Building2, UserCheck, Briefcase,
  Banknote, Database, Shield, Brain, Bell, ContactRound, LineChart, Bot,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  isSubmenu?: boolean;
  children?: MenuItem[];
  agendaId?: string;
  onClick?: () => void;
}
interface MenuSection {
  sectionLabel: string;
  items: MenuItem[];
}
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const confType = user?.typeConfirmatrice?.toUpperCase();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [myAgendas, setMyAgendas] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'confirmatrice') {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/confirmatrice/my-agendas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : [])
        .then((list: string[]) => setMyAgendas(list))
        .catch(() => setMyAgendas([]));
    }
  }, [user]);

  const toggleSubmenu = (menu: string) => setOpenSubmenu(openSubmenu === menu ? null : menu);
  const userRole = user?.role?.toLowerCase() || 'agent';

  const chatbotItem: MenuItem = { icon: Bot, label: 'Chat Équipe', path: '/chat' };

  // ── SUPERADMIN ─────────────────────────────────────────────────────────────
  const superAdminSections: MenuSection[] = [
    { sectionLabel: 'PRINCIPAL', items: [
      { icon: LayoutDashboard, label: 'Dashboard Live',    path: '/superadmin/dashboard' },
      { icon: ClipboardCheck,  label: 'Scorecards Agents', path: '/superadmin/scorecards' },
      { icon: Shield,          label: 'Permissions',       path: '/superadmin/permissions' },
    ]},
    { sectionLabel: 'UTILISATEURS', items: [
      { icon: Users,   label: 'Utilisateurs',        path: '/superadmin/users' },
      { icon: Clock,   label: 'Mon Pointage',        path: '/superadmin/mon-historique-pointage' },
      { icon: History, label: 'Historique Pointage', path: '/superadmin/pointage-historique' },
    ]},
    { sectionLabel: 'DONNÉES & LEADS', items: [
      { icon: Database,     label: 'Gestion Fichiers', path: '/superadmin/injection' },
      { icon: Upload,       label: 'Import Leads',     path: '/superadmin/import-leads' },
      { icon: ContactRound, label: 'Contacts',         path: '/superadmin/contacts' },
    ]},
    { sectionLabel: 'ANALYTIQUE', items: [
      { icon: BarChart3, label: 'Analytique Appels',  path: '/superadmin/analytics' },
      { icon: LineChart, label: 'Analytics Avancé',   path: '/superadmin/analytics-advanced' },
      { icon: Map,       label: 'Carte Géographique', path: '/superadmin/map' },
    ]},
    { sectionLabel: 'IA & AUTOMATISATION', items: [
      { icon: Settings, label: 'Configuration IA', path: '/superadmin/ai-config' },
      { icon: Brain,    label: 'Scoring IA',       path: '/superadmin/ai-scoring' },
      { icon: Bell,     label: 'Alertes',          path: '/superadmin/alerts-manage' },
      chatbotItem,
    ]},
    { sectionLabel: 'FINANCE & RAPPORTS', items: [
      { icon: Banknote, label: 'Salaires',     path: '/superadmin/salary' },
      { icon: FileText, label: 'Stats Agents', path: '/superadmin/agent-stats' },
    ]},
    { sectionLabel: 'CRM', items: [
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
    ]},
  ];

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  const adminSections: MenuSection[] = [
    { sectionLabel: 'PRINCIPAL', items: [
      { icon: LayoutDashboard, label: 'Dashboard Live',    path: '/admin/dashboard' },
      { icon: ClipboardCheck,  label: 'Scorecards Agents', path: '/admin/scorecards' },
    ]},
    { sectionLabel: 'UTILISATEURS', items: [
      { icon: Users,   label: 'Utilisateurs',        path: '/admin/users' },
      { icon: Clock,   label: 'Mon Pointage',        path: '/admin/mon-historique-pointage' },
      { icon: History, label: 'Historique Pointage', path: '/admin/pointage-historique' },
    ]},
    { sectionLabel: 'DONNÉES & LEADS', items: [
      { icon: Database,     label: 'Gestion Fichiers', path: '/admin/injection' },
      { icon: Upload,       label: 'Import Leads',     path: '/admin/import-leads' },
      { icon: ContactRound, label: 'Contacts',         path: '/admin/contacts' },
    ]},
    { sectionLabel: 'ANALYTIQUE', items: [
      { icon: BarChart3, label: 'Analytique Appels',  path: '/admin/analytics' },
      { icon: LineChart, label: 'Analytics Avancé',   path: '/admin/analytics-advanced' },
      { icon: Map,       label: 'Carte Géographique', path: '/admin/map' },
    ]},
    { sectionLabel: 'IA & AUTOMATISATION', items: [
      { icon: Settings, label: 'Configuration IA', path: '/admin/ai-config' },
      { icon: Brain,    label: 'Scoring IA',       path: '/admin/ai-scoring' },
      { icon: Bell,     label: 'Alertes',          path: '/admin/alerts-manage' },
      chatbotItem,
    ]},
    { sectionLabel: 'FINANCE & RAPPORTS', items: [
      { icon: Banknote, label: 'Salaires',     path: '/admin/salary' },
      { icon: FileText, label: 'Stats Agents', path: '/admin/agent-stats' },
    ]},
    { sectionLabel: 'CRM', items: [
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
    ]},
  ];

  // ── AGENT ──────────────────────────────────────────────────────────────────
  const agentSections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord', path: '/agent/dashboard' },
      { icon: Clock,           label: 'Mon Pointage',    path: '/agent/pointage' },
    ]},
    { sectionLabel: 'APPELS', items: [
      { icon: Phone,   label: 'Appel en direct', path: '/agent/contact' },
      { icon: History, label: 'Historique',       path: '/agent/history' },
    ]},
    { sectionLabel: 'MES CONTACTS', items: [
      { icon: Users,    label: 'Liste contacts',          path: '/agent/contacts' },
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
      chatbotItem,
    ]},
    { sectionLabel: 'PERFORMANCE', items: [
      { icon: TrendingUp, label: 'Performance', path: '/agent/performance' },
      { icon: Calendar,   label: 'Agenda',      path: '/agent/agenda' },
    ]},
  ];

  // ── CONFIRMATRICE 1 ────────────────────────────────────────────────────────
  const confirmation1Sections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord',        path: '/confirmation1/dashboard' },
      { icon: History,         label: 'Mon Historique Pointage', path: '/confirmation1/mon-historique-pointage' },
    ]},
    { sectionLabel: 'AGENDAS', items: [
      { icon: Building2, label: 'Agenda EBI', path: '/confirmation1/agenda-ebi', agendaId: 'EBI' },
      { icon: Calendar, label: 'Agenda Client', isSubmenu: true, children: [
        { icon: UserCheck, label: 'Agenda Client 1', path: '/confirmation1/agenda-client1', agendaId: 'CLIENT1' },
        { icon: Users,     label: 'Agenda Client 2', path: '/confirmation1/agenda-client2', agendaId: 'CLIENT2' },
      ]},
      { icon: XCircle, label: 'Agenda Refus', path: '/confirmation1/agenda-refus', agendaId: 'REFUS' },
    ]},
    { sectionLabel: 'ÉVALUATION', items: [
      { icon: Star,      label: 'Évaluation Agents',    path: '/confirmation1/evaluation' },
      { icon: BarChart3, label: 'Statistiques Globales', path: '/confirmation1/statistiques' },
    ]},
    { sectionLabel: 'CRM', items: [
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
      { icon: Users,    label: 'Mes Contacts',            path: '/confirmation1/contacts' },
      chatbotItem,
    ]},
  ];

  // ── CONFIRMATRICE 2 ────────────────────────────────────────────────────────
  const confirmation2Sections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord',        path: '/confirmation2/dashboard' },
      { icon: History,         label: 'Mon Historique Pointage', path: '/confirmation2/mon-historique-pointage' },
    ]},
    { sectionLabel: 'AGENDAS', items: [
      { icon: Building2, label: 'Agenda EBI',      path: '/confirmation2/agenda-ebi',    agendaId: 'EBI' },
      { icon: UserCheck, label: 'Agenda Client 1', path: '/confirmation2/agenda-client1', agendaId: 'CLIENT1' },
    ]},
    { sectionLabel: 'ÉVALUATION', items: [
      { icon: Star,      label: 'Évaluation Agents',    path: '/confirmation2/evaluation' },
      { icon: BarChart3, label: 'Statistiques Globales', path: '/confirmation2/statistiques' },
    ]},
    { sectionLabel: 'CRM', items: [
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
      { icon: Users,    label: 'Mes Contacts',            path: '/confirmation2/contacts' },
      chatbotItem,
    ]},
  ];

  // ── CONFIRMATRICE CLIENT ───────────────────────────────────────────────────
  const confirmationClientSections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord',        path: '/confirmation-client/dashboard' },
      { icon: History,         label: 'Mon Historique Pointage', path: '/confirmation-client/mon-historique-pointage' },
    ]},
    { sectionLabel: 'AGENDAS', items: [
      { icon: Calendar,  label: 'Agenda Client 1', path: '/confirmation-client/agenda',         agendaId: 'CLIENT1' },
      { icon: Users,     label: 'Agenda Client 2', path: '/confirmation-client/agenda-client2', agendaId: 'CLIENT2' },
      { icon: XCircle,   label: 'Agenda Refus',    path: '/confirmation-client/agenda-refus',   agendaId: 'REFUS' },
      { icon: Building2, label: 'Agenda EBI',      path: '/confirmation-client/agenda-ebi',     agendaId: 'EBI' },
    ]},
    { sectionLabel: 'GESTION', items: [
      { icon: Briefcase,   label: 'Suivi Commerciaux', path: '/confirmation-client/commerciaux' },
      { icon: CheckSquare, label: 'Attribution RDV',   path: '/confirmation-client/attribution' },
    ]},
    { sectionLabel: 'CRM', items: [
      { icon: FileText, label: 'Créer une fiche contact', path: '/create-contact' },
      { icon: Users,    label: 'Mes Contacts',            path: '/confirmation-client/contacts' },
      chatbotItem,
    ]},
  ];

  // ── SERVICE QUALITÉ ────────────────────────────────────────────────────────
  const qualiteSections: MenuSection[] = [
    { sectionLabel: 'TABLEAU DE BORD', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord', path: '/qualite/dashboard' },
    ]},
    { sectionLabel: 'GESTION', items: [
      { icon: XCircle,        label: 'Agenda Refus Équipe', path: '/qualite/agenda-refus' },
      { icon: ClipboardCheck, label: 'Éval. Manuelle',      path: '/qualite/evaluation-manuelle' },
    ]},
    { sectionLabel: 'ANALYSE', items: [
      { icon: BarChart3,  label: 'Stats Appels',       path: '/qualite/stats-appels' },
      { icon: TrendingUp, label: 'Analytique Qualité', path: '/qualite/analytics-qualite' },
    ]},
    { sectionLabel: 'PRÉSENCE', items: [
      { icon: History, label: 'Mon Historique Pointage', path: '/qualite/mon-historique-pointage' },
    ]},
    { sectionLabel: 'IA & AUTOMATISATION', items: [
      chatbotItem,
    ]},
  ];

  // ── SERVICE COMMERCIAL ─────────────────────────────────────────────────────
  const commercialSections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Tableau de bord', path: '/commercial/dashboard' },
      { icon: Calendar,        label: 'Mon Agenda',      path: '/commercial/agenda' },
    ]},
    { sectionLabel: 'PRÉSENCE', items: [
      { icon: History, label: 'Mon Historique Pointage', path: '/commercial/mon-historique-pointage' },
    ]},
  ];

  // ── SERVICE TECHNIQUE ──────────────────────────────────────────────────────
  const techniqueSections: MenuSection[] = [
    { sectionLabel: 'MON TRAVAIL', items: [
      { icon: LayoutDashboard, label: 'Dashboard',    path: '/technique/dashboard' },
      { icon: History,         label: 'Mon Historique Pointage', path: '/technique/monpointage' },
    ]},
    { sectionLabel: 'GESTION', items: [
      { icon: Users,    label: 'Liste des Agents',    path: '/technique/agents' },
      { icon: FileText, label: 'Fichier des contacts', path: '/technique/fichiers' },
      { icon: Clock,    label: 'Pointage équipe',     path: '/technique/pointage' },
    ]},
    { sectionLabel: 'ACCÈS & OUTILS', items: [
      { icon: Shield,   label: 'Gérer accès',       path: '/technique/acces' },
      { icon: Calendar, label: 'Compte calendrier', path: '/technique/calendrier' },
      { icon: Star,     label: 'Évaluation',        path: '/technique/evaluation' },
      chatbotItem,
    ]},
  ];

  // ── Filtre agendas ─────────────────────────────────────────────────────────
  const filterSectionsByAgenda = (secs: MenuSection[]): MenuSection[] => {
    if (myAgendas.length === 0) return secs;
    return secs.map(sec => ({
      ...sec,
      items: sec.items.map(item => {
        if (item.isSubmenu) {
          const fc = (item.children || []).filter(c => !c.agendaId || myAgendas.includes(c.agendaId));
          return fc.length ? { ...item, children: fc } : null;
        }
        if (item.agendaId && !myAgendas.includes(item.agendaId)) return null;
        return item;
      }).filter(Boolean) as MenuItem[],
    })).filter(s => s.items.length > 0);
  };

  // ── Sélection ──────────────────────────────────────────────────────────────
  let sections: MenuSection[];
  if (userRole === 'superadmin')        sections = superAdminSections;
  else if (userRole === 'admin')        sections = adminSections;
  else if (userRole === 'confirmatrice') {
    if (confType === 'CONF1')           sections = filterSectionsByAgenda(confirmation1Sections);
    else if (confType === 'CONF2')      sections = filterSectionsByAgenda(confirmation2Sections);
    else if (confType === 'CONFCLIENT') sections = filterSectionsByAgenda(confirmationClientSections);
    else                                sections = filterSectionsByAgenda(confirmation1Sections);
  }
  else if (userRole === 'qualite')      sections = qualiteSections;
  else if (userRole === 'commercial')   sections = commercialSections;
  else if (userRole === 'tech')         sections = techniqueSections;
  else                                  sections = agentSections;

  // ── Render item ────────────────────────────────────────────────────────────
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = item.path && location.pathname === item.path;

    if (item.isSubmenu) {
      const isOpen = openSubmenu === item.label;
      if (collapsed) return (
        <div className="relative group">
          <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sidebar-foreground">
            <Icon className="w-5 h-5" />
          </div>
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
            {item.label}
          </span>
        </div>
      );
      return (
        <div>
          <button onClick={() => toggleSubmenu(item.label)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {isOpen && (
            <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-2">
              {(item.children || []).map((child) => {
                const CI = child.icon;
                const ca = location.pathname === child.path;
                return (
                  <Link key={child.path} to={child.path!}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${ca ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                    <CI className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (item.onClick) {
      return (
        <button onClick={item.onClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent">
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
      );
    }

    return (
      <Link to={item.path!}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const getServiceLabel = () => {
    if (userRole === 'superadmin') return 'Super Administration';
    if (userRole === 'admin') return 'Administration';
    if (userRole === 'confirmatrice') {
      if (confType === 'CONF1') return 'Call Client Niveau 1';
      if (confType === 'CONF2') return 'Call Client Niveau 2';
      if (confType === 'CONFCLIENT') return 'Confirmation Client';
    }
    if (userRole === 'agent') return 'Téléprospection';
    if (userRole === 'qualite') return 'Service Qualité';
    if (userRole === 'commercial') return 'Commercial';
    if (userRole === 'tech') return 'Service Technique';
    return '';
  };

  return (
    <div className={`h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">EBI</span>
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground leading-tight">EBI Call</p>
              <p className="text-xs text-sidebar-foreground/60 leading-tight">Center CRM</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xs">EBI</span>
          </div>
        )}
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          {collapsed ? <ChevronRight className="w-5 h-5 text-sidebar-foreground" /> : <ChevronLeft className="w-5 h-5 text-sidebar-foreground" />}
        </button>
      </div>

      {/* Service label */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 uppercase font-semibold">Service</p>
          <p className="text-sm font-medium text-sidebar-foreground">{getServiceLabel()}</p>
        </div>
      )}

      {/* Nav avec sections */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-1">
            {!collapsed ? (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 select-none">
                {section.sectionLabel}
              </p>
            ) : (
              sIdx > 0 && <div className="my-2 mx-2 border-t border-sidebar-border/40" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item, iIdx) => (
                <li key={item.path || item.label || iIdx} className={collapsed ? 'relative group' : ''}>
                  {renderMenuItem(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
