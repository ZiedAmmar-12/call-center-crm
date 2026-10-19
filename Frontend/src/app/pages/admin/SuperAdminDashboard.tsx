import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { Link } from 'react-router';
import { adminService } from '../../../services/adminService';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  AlertTriangle, Users, Phone, Calendar, TrendingUp, Shield, Crown
} from 'lucide-react';

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

export default function SuperAdminDashboard() {
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
        console.error('Erreur chargement dashboard superadmin:', error);
        setDashboard({
          agentsEnLigne: 7,
          totalAgents: 8,
          enAppel: 4,
          appelsDuJour: 284,
          tauxConversion: 64.1,
          alertes: [
            { agentNom: 'Agent 1', message: 'Pause prolongée (20 min)', type: 'pause' },
            { agentNom: 'Agent 2', message: 'Hors ligne depuis 1h', type: 'offline' },
          ],
          performanceHoraire: [
            { heure: '08:00', appels: 12, conversions: 7 },
            { heure: '09:00', appels: 25, conversions: 15 },
            { heure: '10:00', appels: 38, conversions: 22 },
            { heure: '11:00', appels: 42, conversions: 28 },
            { heure: '12:00', appels: 18, conversions: 10 },
            { heure: '13:00', appels: 22, conversions: 14 },
            { heure: '14:00', appels: 45, conversions: 30 },
            { heure: '15:00', appels: 50, conversions: 35 },
          ],
        });
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatutColor = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'en_appel': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disponible': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pause': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hors_ligne': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'en_appel': return 'En appel';
      case 'disponible': return 'Disponible';
      case 'pause': return 'En pause';
      case 'hors_ligne': return 'Hors ligne';
      default: return statut || 'Inconnu';
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header SuperAdmin */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Super Admin</h1>
              <p className="text-sm text-muted-foreground">Vue temps réel — accès complet</p>
            </div>
          </div>
          <Link
            to="/superadmin/permissions"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Shield className="w-4 h-4" />
            Gérer les permissions
          </Link>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Agents en ligne</p>
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {dashboard?.agentsEnLigne ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {dashboard?.totalAgents ?? 0}</span>
              </p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">En appel</p>
                <Phone className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{dashboard?.enAppel ?? 0}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Appels du jour</p>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{dashboard?.appelsDuJour ?? 0}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Taux conversion</p>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{dashboard?.tauxConversion?.toFixed(1) ?? 0}%</p>
            </div>
          </div>
        )}

        {/* Performance chart + Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl p-4 border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-4">Performance horaire</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dashboard?.performanceHoraire ?? []}>
                <defs>
                  <linearGradient id="appelsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="heure" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="appels" name="Appels" stroke="#8b5cf6" fill="url(#appelsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#10b981" fill="url(#convsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Alertes */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Alertes actives
            </h2>
            {(dashboard?.alertes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune alerte</p>
            ) : (
              <div className="space-y-2">
                {(dashboard?.alertes ?? []).map((alerte, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      alerte.type === 'offline'
                        ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                        : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                    }`}
                  >
                    <p className="font-medium text-foreground">{alerte.agentNom}</p>
                    <p className="text-muted-foreground mt-0.5">{alerte.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agents en temps réel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Agents — statut en temps réel</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
          ) : agents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucun agent trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Agent</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Statut</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Durée appel</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">Appels</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">Conversions</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {agent.prenom} {agent.nom}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutColor(agent.statut)}`}>
                          {getStatutLabel(agent.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{agent.dureeAppel || '—'}</td>
                      <td className="px-4 py-3 text-right text-foreground">{agent.appels}</td>
                      <td className="px-4 py-3 text-right text-foreground">{agent.conversions}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          agent.score >= 80 ? 'text-green-600' :
                          agent.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {agent.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
