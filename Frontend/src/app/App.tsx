import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import FirstLoginPage from './pages/FirstLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import LeadsPage from './pages/admin/leads/LeadsPage';
import AgentDashboard from './pages/agent/AgentDashboard';
import ContactPage from './pages/agent/ContactPage';
import DialerPage from './pages/agent/DialerPage';
import HistoryPage from './pages/agent/HistoryPage';
import PerformancePage from './pages/agent/PerformancePage';
import AgendaPage from './pages/agent/AgendaPage';
import ContactsListPage from './pages/agent/ContactsListPage';
import MonPointagePage from './pages/agent/MonPointagePage';
import CreateContactPage from './pages/CreateContactPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPointageHistoriquePage from './pages/admin/AdminPointageHistoriquePage';
import MonHistoriquePointagePage from './pages/shared/MonHistoriquePointagePage';
import ConfContactsListPage from './pages/shared/ConfContactsListPage';
import TeamChatPage from './pages/shared/TeamChatPage';
import ScorecardsPage from './pages/admin/ScorecardsPage';
import PointagePage from './pages/admin/PointagePage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import MapPage from './pages/admin/MapPage';
import PipelinePage from './pages/admin/PipelinePage';
import UsersPage from './pages/admin/UsersPage';
import AIConfigPage from './pages/admin/AIConfigPage';
import AIDashboardPage from './pages/admin/AIDashboardPage';
import IntegrationsPage from './pages/admin/IntegrationsPage';
import AgentStatsPage from './pages/admin/AgentStatsPage';
import GDPRPage from './pages/admin/GDPRPage';
import ReportsPage from './pages/admin/ReportsPage';
import ImportLeadsPage from './pages/admin/ImportLeadsPage';
import FichierAcharge from './pages/admin/leads/LeadsPage';
import ConfirmatricesAgendasPage from './pages/admin/ConfirmatricesAgendasPage';
// ── NEW from colleague ──────────────────────────────────────
import InjectionPage from './pages/admin/InjectionPage';
import PermissionPage from './pages/admin/PermissionPage';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
// ── SERVICE QUALITÉ ──────────────────────────────────────────
import QualiteDashboard from './pages/qualite/QualiteDashboard';
import AgendaRefusEquipe from './pages/qualite/AgendaRefusEquipe';
import StatsAppelsPage from './pages/qualite/StatsAppelsPage';
import ManualEvaluationPage from './pages/qualite/ManualEvaluationPage';
import QualityAnalyticsPage from './pages/qualite/QualityAnalyticsPage';
// ── MODULES KHALED (Admin) ────────────────────────────────────
import SalaryPage from './pages/admin/SalaryPage';
import AiScoringPage from './pages/admin/AiScoringPage';
import AnalyticsKhaledPage from './pages/admin/AnalyticsKhaledPage';
import AlertsManagePage from './pages/admin/AlertsManagePage';
import LeadsKhaledPage from './pages/admin/LeadsKhaledPage';
// ── COMMERCIAL ───────────────────────────────────────────────
import CommercialDashboard from './pages/commercial/CommercialDashboard';
import CommercialAgenda from './pages/commercial/CommercialAgenda';
// ── SERVICE TECHNIQUE ─────────────────────────────────────────
import TechniqueDashboard from './pages/technique/TechniqueDashboard';
import ListeAgents from './pages/technique/ListeAgents';
import FichierContacts from './pages/technique/FichierContacts';
import PointageTech from './pages/technique/Pointage';
import GererAcces from './pages/technique/GererAcces';
import CompteCalendrier from './pages/technique/CompteCalendrier';
import EvaluationTech from './pages/technique/EvaluationTech';
import MonPointageTech from './pages/technique/MonPointageTech';
// ─────────────────────────────────────────────────────────────

import Confirmation1Dashboard from './pages/confirmation/Confirmation1Dashboard copy';
import AgendaEBI from './pages/confirmation/confirmation1/AgendaEBI';
import AgendaClient1 from './pages/confirmation/confirmation1/AgendaClient1';
import AgendaClient2 from './pages/confirmation/confirmation1/AgendaClient2';
import AgendaRefus from './pages/confirmation/confirmation1/AgendaRefus';
import EvaluationAgents from './pages/confirmation/confirmation1/EvaluationAgents';
import StatistiquesGlobales from './pages/confirmation/confirmation1/StatistiquesGlobales';
import FichiersContacts from './pages/confirmation/confirmation1/FichiersContacts';

import Confirmation2Dashboard from './pages/confirmation/Confirmation2Dashboard';
import AgendaEBI2 from './pages/confirmation/confirmation2/AgendaEBI2';
import AgendaClient1_2 from './pages/confirmation/confirmation2/AgendaClient1';
import EvaluationAgents2 from './pages/confirmation/confirmation2/EvaluationAgents2';
import StatistiquesGlobales2 from './pages/confirmation/confirmation2/StatistiquesGlobales2';
import FichiersContacts2 from './pages/confirmation/confirmation2/FichiersContacts2';

import ConfirmationClientDashboard from './pages/confirmation/ConfirmationClientDashboard';
import AgendaClient from './pages/confirmation/confirmation-client/AgendaClient';
import AgendaClientDeux from './pages/confirmation/confirmation-client/AgendaClient2';
import AgendaRefusClient from './pages/confirmation/confirmation-client/AgendaRefusClient';
import AgendaEBIClient from './pages/confirmation/confirmation-client/AgendaEBIClient';
import SuiviCommerciaux from './pages/confirmation/confirmation-client/SuiviCommerciaux';
import AttributionRDV from './pages/confirmation/confirmation-client/AttributionRDV';
import CommentaireBanque from './pages/confirmation/confirmation-client/CommentaireBanque';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-login" element={<FirstLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* ==================== AGENT ==================== */}
      <Route path="/agent/dashboard" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
      <Route path="/agent/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
      <Route path="/agent/dialer" element={<ProtectedRoute><DialerPage /></ProtectedRoute>} />
      <Route path="/agent/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/agent/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
      <Route path="/agent/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
      <Route path="/agent/contacts" element={<ProtectedRoute><ContactsListPage /></ProtectedRoute>} />
      <Route path="/admin/contacts" element={<ProtectedRoute><ContactsListPage /></ProtectedRoute>} />
      <Route path="/superadmin/contacts" element={<ProtectedRoute><ContactsListPage /></ProtectedRoute>} />
      <Route path="/agent/pointage" element={<ProtectedRoute><MonPointagePage /></ProtectedRoute>} />

      {/* ==================== CONFIRMATRICE 1 ==================== */}
      <Route path="/confirmation1" element={<Layout><Outlet /></Layout>}>
        <Route path="dashboard" element={<Confirmation1Dashboard />} />
        <Route path="agenda-ebi" element={<AgendaEBI />} />
        <Route path="agenda-client1" element={<AgendaClient1 />} />
        <Route path="agenda-client2" element={<AgendaClient2 />} />
        <Route path="agenda-refus" element={<AgendaRefus />} />
        <Route path="evaluation" element={<EvaluationAgents />} />
        <Route path="statistiques" element={<StatistiquesGlobales />} />
        <Route path="fichiers" element={<FichiersContacts />} />
        <Route path="contacts" element={<ConfContactsListPage />} />
        <Route path="mon-historique-pointage" element={<MonHistoriquePointagePage />} />
      </Route>

      {/* ==================== CONFIRMATRICE 2 ==================== */}
      <Route path="/confirmation2" element={<Layout><Outlet /></Layout>}>
        <Route path="dashboard" element={<Confirmation2Dashboard />} />
        <Route path="agenda-ebi" element={<AgendaEBI2 />} />
        <Route path="agenda-client1" element={<AgendaClient1_2 />} />
        <Route path="evaluation" element={<EvaluationAgents2 />} />
        <Route path="statistiques" element={<StatistiquesGlobales2 />} />
        <Route path="fichiers" element={<FichiersContacts2 />} />
        <Route path="contacts" element={<ConfContactsListPage />} />
        <Route path="mon-historique-pointage" element={<MonHistoriquePointagePage />} />
      </Route>

      {/* ==================== CONFIRMATRICE CLIENT ==================== */}
      <Route path="/confirmation-client" element={<Layout><Outlet /></Layout>}>
        <Route path="dashboard" element={<ConfirmationClientDashboard />} />
        <Route path="agenda" element={<AgendaClient />} />
        <Route path="agenda-client2" element={<AgendaClientDeux />} />
        <Route path="agenda-refus" element={<AgendaRefusClient />} />
        <Route path="agenda-ebi" element={<AgendaEBIClient />} />
        <Route path="commerciaux" element={<SuiviCommerciaux />} />
        <Route path="attribution" element={<AttributionRDV />} />
        <Route path="banque" element={<CommentaireBanque />} />
        <Route path="contacts" element={<ConfContactsListPage />} />
        <Route path="mon-historique-pointage" element={<MonHistoriquePointagePage />} />
      </Route>

      {/* ==================== ADMIN ==================== */}
      <Route path="/admin/import-leads/FichierAcharge" element={<ProtectedRoute><FichierAcharge /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/pointage-historique" element={<ProtectedRoute><AdminPointageHistoriquePage /></ProtectedRoute>} />
      <Route path="/admin/scorecards" element={<ProtectedRoute><ScorecardsPage /></ProtectedRoute>} />
      <Route path="/admin/pointage" element={<ProtectedRoute><PointagePage /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/admin/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/admin/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/ai-config" element={<ProtectedRoute><AIConfigPage /></ProtectedRoute>} />
      <Route path="/admin/ai-dashboard" element={<ProtectedRoute><AIDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/admin/agent-stats" element={<ProtectedRoute><AgentStatsPage /></ProtectedRoute>} />
      <Route path="/admin/gdpr" element={<ProtectedRoute><GDPRPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/admin/import-leads" element={<ProtectedRoute><ImportLeadsPage /></ProtectedRoute>} />
      <Route path="/admin/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
      <Route path="/admin/confirmatrices-agendas" element={<ProtectedRoute><ConfirmatricesAgendasPage /></ProtectedRoute>} />
      {/* ── New routes from colleague ─────────────────────── */}
      <Route path="/admin/injection" element={<ProtectedRoute><InjectionPage /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute><PermissionPage /></ProtectedRoute>} />
      <Route path="/admin/mon-historique-pointage" element={<ProtectedRoute><Layout><MonHistoriquePointagePage /></Layout></ProtectedRoute>} />
      {/* ── SuperAdmin routes (toutes en /superadmin/...) ────── */}
      <Route path="/superadmin/dashboard"           element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/permissions"         element={<ProtectedRoute><PermissionPage /></ProtectedRoute>} />
      <Route path="/superadmin/pointage"            element={<ProtectedRoute><PointagePage /></ProtectedRoute>} />
      <Route path="/superadmin/pointage-historique" element={<ProtectedRoute><AdminPointageHistoriquePage /></ProtectedRoute>} />
      <Route path="/superadmin/mon-historique-pointage" element={<ProtectedRoute><Layout><MonHistoriquePointagePage /></Layout></ProtectedRoute>} />
      <Route path="/superadmin/scorecards"          element={<ProtectedRoute><ScorecardsPage /></ProtectedRoute>} />
      <Route path="/superadmin/analytics"           element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/superadmin/map"                 element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/superadmin/users"               element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/superadmin/injection"           element={<ProtectedRoute><InjectionPage /></ProtectedRoute>} />
      <Route path="/superadmin/ai-config"           element={<ProtectedRoute><AIConfigPage /></ProtectedRoute>} />
      <Route path="/superadmin/integrations"        element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/superadmin/agent-stats"         element={<ProtectedRoute><AgentStatsPage /></ProtectedRoute>} />
      <Route path="/superadmin/reports"             element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/superadmin/import-leads"        element={<ProtectedRoute><ImportLeadsPage /></ProtectedRoute>} />
      <Route path="/superadmin/leads"               element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
      {/* ─────────────────────────────────────────────────── */}
      <Route path="/create-contact" element={<ProtectedRoute><CreateContactPage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Layout><TeamChatPage /></Layout></ProtectedRoute>} />

      {/* ==================== MODULES KHALED — avec Layout sidebar ==================== */}
      <Route element={<ProtectedRoute><Layout><Outlet /></Layout></ProtectedRoute>}>
        {/* Admin */}
        <Route path="/admin/salary"                element={<SalaryPage />} />
        <Route path="/admin/ai-scoring"            element={<AiScoringPage />} />
        <Route path="/admin/analytics-advanced"    element={<AnalyticsKhaledPage />} />
        <Route path="/admin/alerts-manage"         element={<AlertsManagePage />} />
        <Route path="/admin/leads-khaled"          element={<LeadsKhaledPage />} />
        {/* SuperAdmin mirrors */}
        <Route path="/superadmin/salary"           element={<SalaryPage />} />
        <Route path="/superadmin/ai-scoring"       element={<AiScoringPage />} />
        <Route path="/superadmin/analytics-advanced" element={<AnalyticsKhaledPage />} />
        <Route path="/superadmin/alerts-manage"    element={<AlertsManagePage />} />
        <Route path="/superadmin/leads-khaled"     element={<LeadsKhaledPage />} />
      </Route>

      {/* ==================== SERVICE QUALITÉ ==================== */}
      <Route path="/qualite" element={<Layout><Outlet /></Layout>}>
        <Route path="dashboard" element={<QualiteDashboard />} />
        <Route path="agenda-refus" element={<AgendaRefusEquipe />} />
        <Route path="stats-appels" element={<StatsAppelsPage />} />
        <Route path="evaluation-manuelle" element={<ManualEvaluationPage />} />
        <Route path="analytics-qualite" element={<QualityAnalyticsPage />} />
        <Route path="mon-historique-pointage" element={<MonHistoriquePointagePage />} />
      </Route>

      {/* ==================== COMMERCIAL ==================== */}
      <Route path="/commercial" element={<Layout><Outlet /></Layout>}>
        <Route path="dashboard" element={<CommercialDashboard />} />
        <Route path="agenda" element={<CommercialAgenda />} />
        <Route path="mon-historique-pointage" element={<MonHistoriquePointagePage />} />
      </Route>

      {/* ==================== SERVICE TECHNIQUE ==================== */}
      <Route path="/technique" element={<Layout><Outlet /></Layout>}>
        <Route index element={<TechniqueDashboard />} />
        <Route path="dashboard" element={<TechniqueDashboard />} />
        <Route path="agents" element={<ListeAgents />} />
        <Route path="fichiers" element={<FichierContacts />} />
        <Route path="pointage" element={<PointageTech />} />
        <Route path="monpointage" element={<MonHistoriquePointagePage />} />
        <Route path="acces" element={<GererAcces />} />
        <Route path="calendrier" element={<CompteCalendrier />} />
        <Route path="evaluation" element={<EvaluationTech />} />
      </Route>

      {/* ==================== REDIRECTION PAR DÉFAUT ==================== */}
      <Route path="/" element={
        !user ? <Navigate to="/login" /> :
        user.role === 'superadmin' ? <Navigate to="/superadmin/dashboard" /> :
        user.role === 'admin' ? <Navigate to="/admin/dashboard" /> :
        user.role === 'conf1' ? <Navigate to="/confirmation1/dashboard" /> :
        user.role === 'conf2' ? <Navigate to="/confirmation2/dashboard" /> :
        user.role === 'confclient' ? <Navigate to="/confirmation-client/dashboard" /> :
        user.role === 'qualite' ? <Navigate to="/qualite/dashboard" /> :
        user.role === 'commercial' ? <Navigate to="/commercial/dashboard" /> :
        (user.role === 'tech' || user.role === 'technique') ? <Navigate to="/technique/dashboard" /> :
        user.role === 'agent' ? <Navigate to="/agent/dashboard" /> :
        <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
