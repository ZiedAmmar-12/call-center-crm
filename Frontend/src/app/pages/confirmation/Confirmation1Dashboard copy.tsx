import SessionAttendanceWidget from '../../components/SessionAttendanceWidget';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Lock, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

interface Rdv {
  id: number;
  contactNom: string;
  contactPrenom: string;
  telephone: string;
  source: string;
  agentNom: string;
  dateCreation: string;
  dateRendezVous: string;
  statut: string;
  commentaire?: string;
}

interface DashboardData {
  totalRdv: number;
  rdvConfirmes: number;
  rdvAnnules: number;
  rdvReportes: number;
  rdvRecents: Rdv[];
}

const AGENDA_TABS = [
  { id: 'EBI',     label: 'Agenda EBI',      icon: '🏢', endpoint: 'agenda-ebi'     },
  { id: 'CLIENT1', label: 'Agenda Client 1',  icon: '👤', endpoint: 'agenda-client1' },
  { id: 'CLIENT2', label: 'Agenda Client 2',  icon: '👥', endpoint: 'agenda-client2' },
  { id: 'REFUS',   label: 'Agenda Refus',     icon: '❌', endpoint: 'agenda-refus'   },
];

export default function Confirmation1Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Agenda tabs state
  const [myAgendas, setMyAgendas] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [agendaRdvs, setAgendaRdvs] = useState<Rdv[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchMyAgendas();
  }, []);

  useEffect(() => {
    if (activeTab) fetchAgendaRdvs(activeTab);
  }, [activeTab]);

  const token = () => localStorage.getItem('token');

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/confirmation1/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (response.status === 401) { setError('Session expirée.'); return; }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(await response.json());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAgendas = async () => {
    try {
      const res = await fetch(`${API_URL}/confirmatrice/my-agendas`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) return;
      const list: string[] = await res.json();
      setMyAgendas(list);
      // Activate first accessible tab
      const first = AGENDA_TABS.find(t => list.includes(t.id));
      if (first) setActiveTab(first.id);
    } catch {
      // No access configured — show all by default
      setMyAgendas(AGENDA_TABS.map(t => t.id));
      setActiveTab(AGENDA_TABS[0].id);
    }
  };

  const fetchAgendaRdvs = async (tabId: string) => {
    const tab = AGENDA_TABS.find(t => t.id === tabId);
    if (!tab) return;
    setAgendaLoading(true);
    try {
      const res = await fetch(`${API_URL}/confirmation1/${tab.endpoint}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) setAgendaRdvs(await res.json());
    } catch {
      setAgendaRdvs([]);
    } finally {
      setAgendaLoading(false);
    }
  };

  const handleQualifier = (rdv: Rdv) => {
    const AGENDA_PATHS: Record<string, string> = {
      EBI:     '/confirmation1/agenda-ebi',
      CLIENT1: '/confirmation1/agenda-client1',
      CLIENT2: '/confirmation1/agenda-client2',
      REFUS:   '/confirmation1/agenda-refus',
    };
    const path = activeTab ? (AGENDA_PATHS[activeTab] || '/confirmation1/agenda-ebi') : '/confirmation1/agenda-ebi';
    // Pass the clicked RDV's id so the agenda page can auto-select it (and jump
    // to its month) instead of landing on the current month with nothing found.
    navigate(`${path}?calledRdvId=${rdv.id}`);
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'CONFIRME': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">✅ Confirmé</span>;
      case 'ANNULE':   return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">❌ Annulé</span>;
      case 'REPORTER': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">⏰ Reporté</span>;
      default:         return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">📝 Brut</span>;
    }
  };

  const visibleTabs = AGENDA_TABS.filter(t => myAgendas.length === 0 || myAgendas.includes(t.id));

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="mb-4">
        <SessionAttendanceWidget />
      </div>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center text-red-500">
        <p>Erreur: {error}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Réessayer</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Confirmation</h1>
        <p className="text-gray-500">Bienvenue, {user?.name || 'Confirmatrice'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="w-5 h-5 text-blue-500" />, label: 'Total RDV',  value: data?.totalRdv   ?? 0 },
          { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Confirmés', value: data?.rdvConfirmes ?? 0 },
          { icon: <XCircle className="w-5 h-5 text-red-500" />,   label: 'Annulés',   value: data?.rdvAnnules  ?? 0 },
          { icon: <Clock className="w-5 h-5 text-yellow-500" />,  label: 'Reportés',  value: data?.rdvReportes ?? 0 },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center gap-3">
            {icon}
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agenda Tabs */}
      {visibleTabs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b dark:border-gray-700 overflow-x-auto">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-0">
            {agendaLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="p-3 text-left text-sm text-gray-500">Contact</th>
                      <th className="p-3 text-left text-sm text-gray-500">Téléphone</th>
                      <th className="p-3 text-left text-sm text-gray-500">Agent</th>
                      <th className="p-3 text-left text-sm text-gray-500">Date RDV</th>
                      <th className="p-3 text-left text-sm text-gray-500">Statut</th>
                      <th className="p-3 text-left text-sm text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendaRdvs.length > 0 ? agendaRdvs.map(rdv => (
                      <tr key={rdv.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-3">{rdv.contactPrenom} {rdv.contactNom}</td>
                        <td className="p-3">{rdv.telephone}</td>
                        <td className="p-3">{rdv.agentNom}</td>
                        <td className="p-3">{new Date(rdv.dateRendezVous).toLocaleString()}</td>
                        <td className="p-3">{getStatutBadge(rdv.statut)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleQualifier(rdv)}
                            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            <Lock size={12} /> Qualifier
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">Aucun rendez-vous</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bandeau info qualification */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5">
        <Lock size={13} />
        La qualification est disponible uniquement après avoir appelé le contact depuis la fiche de l'agenda.
      </div>
    </div>
  );
}
