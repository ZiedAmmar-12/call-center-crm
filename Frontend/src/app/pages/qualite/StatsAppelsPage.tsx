import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, AlertCircle } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5241';

interface StatRow {
  agentId: number;
  date: string;
  totalAppels: number;
  nRP: number;
  pasInteresse: number;
  refusPresenceCouple: number;
  refusHCConso: number;
  rdvClient1: number;
  hCLangue: number;
  hCLogement: number;
}

interface Agent { id: number; nom: string; prenom: string; }

export default function StatsAppelsPage() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [debutFilter, setDebutFilter] = useState('2026-01-01');
  const [finFilter, setFinFilter] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/api/qualite/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAgents(res.data));
  }, []);

  const fetchStats = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params: any = { debut: debutFilter, fin: finFilter };
    if (agentFilter) params.agentId = agentFilter;
    axios.get(`${API_URL}/api/qualite/stats-appels`, {
      headers: { Authorization: `Bearer ${token}` }, params
    })
      .then(res => setStats(res.data))
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  // Agrégé par agent (pour le chart)
  const byAgent = stats.reduce<Record<number, StatRow & { agentLabel: string }>>((acc, row) => {
    const agent = agents.find(a => a.id === row.agentId);
    if (!acc[row.agentId]) {
      acc[row.agentId] = {
        ...row,
        agentLabel: agent ? `${agent.prenom} ${agent.nom}` : `Agent ${row.agentId}`
      };
    } else {
      const a = acc[row.agentId];
      a.totalAppels += row.totalAppels;
      a.nRP += row.nRP;
      a.pasInteresse += row.pasInteresse;
      a.rdvClient1 += row.rdvClient1;
      a.refusHCConso += row.refusHCConso;
      a.hCLogement += row.hCLogement;
    }
    return acc;
  }, {});

  const chartData = Object.values(byAgent);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Statistiques Appels
          </h1>
          <p className="text-muted-foreground">Analyse des qualifications par agent</p>
        </div>

        {/* Filtres */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Agent</label>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Tous les agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Début</label>
            <input type="date" value={debutFilter} onChange={e => setDebutFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Fin</label>
            <input type="date" value={finFilter} onChange={e => setFinFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={fetchStats}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Appliquer
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : (
          <>
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="font-semibold text-sm mb-4">Comparaison agents</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="agentLabel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rdvClient1" name="RDV" fill="#22c55e" radius={[3,3,0,0]} />
                    <Bar dataKey="nRP" name="NRP" fill="#f59e0b" radius={[3,3,0,0]} />
                    <Bar dataKey="pasInteresse" name="Pas intéressé" fill="#ef4444" radius={[3,3,0,0]} />
                    <Bar dataKey="refusHCConso" name="HC Conso" fill="#8b5cf6" radius={[3,3,0,0]} />
                    <Bar dataKey="hCLogement" name="HC Logement" fill="#6b7280" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Détail par agent</h2>
              </div>
              {chartData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Aucune donnée pour cette période</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-center font-medium text-green-600">RDV</th>
                      <th className="px-4 py-3 text-center font-medium text-yellow-600">NRP</th>
                      <th className="px-4 py-3 text-center font-medium text-red-600">Pas intéressé</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">HC Conso</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">HC Log.</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tx RDV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map(row => (
                      <tr key={row.agentId} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{row.agentLabel}</td>
                        <td className="px-4 py-3 text-center">{row.totalAppels}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-medium">{row.rdvClient1}</td>
                        <td className="px-4 py-3 text-center text-yellow-600">{row.nRP}</td>
                        <td className="px-4 py-3 text-center text-red-600">{row.pasInteresse}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.refusHCConso}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{row.hCLogement}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">
                            {row.totalAppels > 0 ? ((row.rdvClient1 / row.totalAppels) * 100).toFixed(1) : '0'}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
    </div>
  );
}
