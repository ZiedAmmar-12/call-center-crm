import SessionAttendanceWidget from '../../components/SessionAttendanceWidget';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, CheckCircle, XCircle, Clock, PhoneCall, Lock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';

interface Rdv {
  id: number;
  contactId: number;
  contactNom: string;
  contactPrenom: string;
  telephone: string;
  source: string;
  agentNom: string;
  dateRendezVous: string;
  statut: string;
}

interface DashboardData {
  totalRdv: number;
  rdvConfirmes: number;
  rdvAnnules: number;
  rdvReportes: number;
  rdvRecents: Rdv[];
}

const AGENDA_TABS = [
  { id: 'EBI',     label: 'Agenda EBI',     endpoint: 'agenda-ebi'    },
  { id: 'CLIENT1', label: 'Agenda Client 1', endpoint: 'agenda-client1' },
];

const STATUT_BADGE: Record<string, string> = {
  CONFIRME:   'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  ANNULE:     'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  REPORTER:   'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  BRUT:       'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
};

export default function Confirmation2Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('EBI');
  const [agendaRdvs, setAgendaRdvs] = useState<Rdv[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/confirmation2/dashboard');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgendaRdvs = useCallback(async (tabId: string) => {
    const tab = AGENDA_TABS.find(t => t.id === tabId);
    if (!tab) return;
    setAgendaLoading(true);
    try {
      const res = await api.get(`/confirmation2/${tab.endpoint}`);
      setAgendaRdvs(res.data || []);
    } catch {
      setAgendaRdvs([]);
    } finally {
      setAgendaLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchAgendaRdvs(activeTab); }, [activeTab, fetchAgendaRdvs]);

  // Navigate to the dedicated agenda page which has FicheContactPanel + call gating
  const handleQualifier = (rdv: Rdv) => {
    const path = activeTab === 'EBI' ? '/confirmation2/agenda-ebi' : '/confirmation2/agenda-client1';
    // Pass the clicked RDV's id so the agenda page can auto-select it (and jump
    // to its month) instead of landing on the current month with nothing found.
    navigate(`${path}?calledRdvId=${rdv.id}`);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="mb-4">
        <SessionAttendanceWidget />
      </div>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center text-red-500">
        <p>Erreur: {error}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-primary text-white rounded">Réessayer</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Confirmation</h1>
        <p className="text-gray-500 dark:text-gray-400">Bienvenue, {user?.name || 'Confirmatrice'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="w-5 h-5 text-blue-500" />,   label: 'Total RDV',  value: data?.totalRdv || 0,       cls: 'bg-blue-50   dark:bg-blue-900/20  text-blue-600   dark:text-blue-300'  },
          { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Confirmés',  value: data?.rdvConfirmes || 0,   cls: 'bg-green-50  dark:bg-green-900/20 text-green-600  dark:text-green-300' },
          { icon: <XCircle className="w-5 h-5 text-red-500" />,      label: 'Annulés',    value: data?.rdvAnnules || 0,     cls: 'bg-red-50    dark:bg-red-900/20   text-red-600    dark:text-red-300'   },
          { icon: <Clock className="w-5 h-5 text-yellow-500" />,     label: 'Reportés',   value: data?.rdvReportes || 0,    cls: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-300' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 text-center border ${k.cls} border-transparent`}>
            <div className="flex items-center justify-center gap-2 mb-2">{k.icon}</div>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-sm opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs agenda */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {AGENDA_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {agendaLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Contact', 'Téléphone', 'Agent', 'Date RDV', 'Statut', 'Action'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {agendaRdvs.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500">Aucun rendez-vous</td></tr>
                ) : agendaRdvs.map(rdv => (
                  <tr key={rdv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{rdv.contactPrenom} {rdv.contactNom}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{rdv.telephone}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{rdv.agentNom}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(rdv.dateRendezVous).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_BADGE[rdv.statut] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {rdv.statut}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleQualifier(rdv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition">
                        <PhoneCall size={12} />
                        Qualifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info gating */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <Lock size={14} />
        <span>La qualification est disponible uniquement après avoir appelé le contact depuis la fiche de l'agenda.</span>
      </div>
    </div>
  );
}
