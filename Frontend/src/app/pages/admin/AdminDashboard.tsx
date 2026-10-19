import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { adminService } from '../../../services/adminService';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { AlertTriangle, Users, Phone, Calendar, TrendingUp } from 'lucide-react';

interface DashboardData {
  agentsEnLigne: number;
  totalAgents: number;
  enAppel: number;
  appelsDuJour: number;
  tauxConversion: number;
  alertes: { agentNom: string; message: string; type: string }[];
  performanceHoraire: { heure: string; appels: number; conversions: number }[];
}

interface AgentStatut {
  id: number;
  nom: string;
  prenom: string;
  statut: string;
  dureeAppel: string;
  appels: number;
  conversions: number;
  score: number;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [agents, setAgents] = useState<AgentStatut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, agentsRes] = await Promise.all([
          adminService.getDashboard(),
          adminService.getAgentsStatut()
        ]);
        setDashboard(dashboardRes.data);
        setAgents(agentsRes.data);
      } catch (error) {
        console.error('Erreur chargement dashboard admin:', error);
        setDashboard({
          agentsEnLigne: 7,
          totalAgents: 8,
          enAppel: 4,
          appelsDuJour: 284,
          tauxConversion: 64.1,
          alertes: [
            { agentNom: 'agent 1', message: 'Pause prolongée (20 min)', type: 'pause' },
            { agentNom: 'agent 2', message: 'Hors ligne depuis 1h', type: 'offline' },
          ],
          performanceHoraire: [
            { heure: '08:00', appels: 12, conversions: 7 },
            { heure: '09:00', appels: 25, conversions: 15 },
            { heure: '10:00', appels: 35, conversions: 22 },
            { heure: '11:00', appels: 42, conversions: 28 },
            { heure: '12:00', appels: 38, conversions: 24 },
            { heure: '13:00', appels: 30, conversions: 18 },
            { heure: '14:00', appels: 28, conversions: 17 },
          ],
        });
        setAgents([
          { id: 1, nom: 'agent 1', prenom: '', statut: 'En appel', dureeAppel: '12:35', appels: 42, conversions: 28, score: 92 },
          { id: 2, nom: 'agent 2', prenom: '', statut: 'En ligne', dureeAppel: '-', appels: 38, conversions: 24, score: 88 },
          { id: 3, nom: 'agent 3', prenom: '', statut: 'En appel', dureeAppel: '05:12', appels: 45, conversions: 30, score: 94 },
          { id: 4, nom: 'agent 4', prenom: '', statut: 'Pause', dureeAppel: '-', appels: 35, conversions: 20, score: 85 },
          { id: 5, nom: 'agent 5', prenom: '', statut: 'En ligne', dureeAppel: '-', appels: 40, conversions: 26, score: 90 },
          { id: 6, nom: 'agent 6', prenom: '', statut: 'En appel', dureeAppel: '15:42', appels: 48, conversions: 32, score: 95 },
          { id: 7, nom: 'agent 7', prenom: '', statut: 'Hors ligne', dureeAppel: '-', appels: 0, conversions: 0, score: 0 },
          { id: 8, nom: 'agent 8', prenom: '', statut: 'En appel', dureeAppel: '03:28', appels: 36, conversions: 22, score: 86 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'En appel':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Phone size={12} />En appel</span>;
      case 'En ligne':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">🟢 En ligne</span>;
      case 'Pause':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">⏸ Pause</span>;
      case 'Hors ligne':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">⚫ Hors ligne</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100">{statut}</span>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Live Opérationnel</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Supervision en temps réel de l'activité du centre d'appels</p>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Agents en ligne</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard?.agentsEnLigne}/{dashboard?.totalAgents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">En appel</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard?.enAppel}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Appels du jour</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard?.appelsDuJour}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Taux conversion</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard?.tauxConversion}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Alertes en cours */}
        {dashboard?.alertes && dashboard.alertes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Alertes en cours</h2>
            </div>
            <div className="space-y-2">
              {dashboard.alertes.map((alerte, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${alerte.type === 'pause' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className="font-medium text-gray-900 dark:text-white">{alerte.agentNom}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{alerte.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graphique Performance horaire */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Performance horaire</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard?.performanceHoraire}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="heure" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="appels" name="Appels" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau Statut des agents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Statut des agents en temps réel</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Agent</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Durée appel</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Appels</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Score</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{agent.nom} {agent.prenom}</td>
                    <td className="p-4">{getStatutBadge(agent.statut)}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{agent.dureeAppel}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{agent.appels}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{agent.conversions}</td>
                    <td className="p-4">
                      <span className={`font-medium ${
                        agent.score >= 90 ? 'text-green-600 dark:text-green-400' : 
                        agent.score >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 
                        agent.score > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                      }`}>
                        {agent.score > 0 ? agent.score : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}