import React, { useState, useEffect } from 'react';
import {
  Phone, TrendingUp, Users, MapPin, AlertTriangle, RefreshCw,
  Activity, Calendar, BarChart3, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../../services/api';

type TabId = 'overview' | 'performance' | 'supervision' | 'geo';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const tooltipStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
};

export default function AnalyticsKhaledPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [supervision, setSupervision] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [ovRes, agRes, supRes, geoRes] = await Promise.allSettled([
      api.get('/analytics/overview'),
      api.get('/analytics/agents-performance'),
      api.get('/analytics/supervision'),
      api.get('/analytics/geo'),
    ]);
    if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data);
    else console.error('overview error:', (ovRes as PromiseRejectedResult).reason?.response?.data ?? (ovRes as PromiseRejectedResult).reason);
    if (agRes.status === 'fulfilled') setAgents(agRes.value.data);
    else console.error('agents-performance error:', (agRes as PromiseRejectedResult).reason?.response?.data ?? (agRes as PromiseRejectedResult).reason);
    if (supRes.status === 'fulfilled') setSupervision(supRes.value.data);
    else console.error('supervision error:', (supRes as PromiseRejectedResult).reason?.response?.data ?? (supRes as PromiseRejectedResult).reason);
    if (geoRes.status === 'fulfilled') setGeo(geoRes.value.data);
    else console.error('geo error:', (geoRes as PromiseRejectedResult).reason?.response?.data ?? (geoRes as PromiseRejectedResult).reason);
    setLoading(false);
  };

  const tabs = [
    { id: 'overview' as TabId, label: 'Vue Globale', icon: TrendingUp },
    { id: 'performance' as TabId, label: 'Performance Agents', icon: Users },
    { id: 'supervision' as TabId, label: 'Supervision', icon: AlertTriangle },
    { id: 'geo' as TabId, label: 'Géo-Analyse', icon: MapPin },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      <span className="ml-3 text-muted-foreground">Chargement des analytics...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-primary pl-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
            Intelligence <span className="text-primary">Analytique</span>
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
            Rapports de performance en temps réel
          </p>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-muted text-foreground text-[10px] font-black uppercase tracking-widest rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: Vue Globale */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Agents" value={overview.totalAgents} icon={Users} color="primary" />
            <KPICard title="Total Appels" value={overview.totalAppels} icon={Phone} color="info" />
            <KPICard title="RDV Aujourd'hui" value={overview.rdvToday} icon={Calendar} color="success" />
            <KPICard title="Taux Conversion" value={`${overview.conversionRate}%`} icon={TrendingUp} color="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Statuts RDV
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Confirmés', value: overview.rdvConfirmes },
                      { name: 'Signés', value: overview.rdvSignes },
                      { name: 'Annulés', value: overview.rdvAnnules },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {['#6366f1', '#10b981', '#ef4444'].map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Métriques Clés
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Total RDV', value: overview.totalRdv, icon: Calendar },
                  { label: 'Appels Aujourd\'hui', value: overview.appelsToday, icon: Phone },
                  { label: 'Score Qualité Moyen', value: `${overview.avgQualityScore}/100`, icon: TrendingUp },
                  { label: 'RDV Confirmés', value: overview.rdvConfirmes, icon: Activity },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Performance Agents */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Score Moyen par Agent</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agents.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avgScore" name="Score Qualité" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">RDV par Agent</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agents.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="rdvConfirme" name="Confirmés" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rdvSigne" name="Signés" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rdvAnnule" name="Annulés" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-black uppercase tracking-widest">Classement Agents</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border">
                    {['Agent', 'Appels', 'Total RDV', 'Confirmés', 'Signés', 'Score Qual.', 'Salaire Mois', 'Conversion'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agents.map((a: any) => (
                    <tr key={a.agentId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-semibold text-xs">{a.nom}</td>
                      <td className="px-3 py-3 text-xs">{a.totalAppels}</td>
                      <td className="px-3 py-3 text-xs">{a.totalRdv}</td>
                      <td className="px-3 py-3 text-xs text-emerald-400 font-bold">{a.rdvConfirme}</td>
                      <td className="px-3 py-3 text-xs text-blue-400 font-bold">{a.rdvSigne}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.avgScore >= 70 ? 'bg-emerald-500/10 text-emerald-500' : a.avgScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                          {a.avgScore}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-mono">{a.salaireMois?.toFixed(2) || '0.00'} €</td>
                      <td className="px-3 py-3 text-xs">{a.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Supervision */}
      {activeTab === 'supervision' && supervision && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Agents" value={supervision.totalAgents} icon={Users} color="primary" />
            <KPICard title="Agents Actifs" value={supervision.agentsActifs} icon={Activity} color="success" />
            <KPICard title="RDV Aujourd'hui" value={supervision.rdvJour} icon={Calendar} color="info" />
            <KPICard title="Appels Aujourd'hui" value={supervision.appelsJour} icon={Phone} color="warning" />
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-black uppercase tracking-widest">État Temps Réel des Agents</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border">
                    {['Agent', 'RDV Aujourd\'hui', 'Appels Aujourd\'hui', 'RDV Confirmés', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supervision.agents?.map((a: any) => (
                    <tr key={a.agentId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-xs">{a.nom}</td>
                      <td className="px-4 py-3 text-xs">{a.rdvAujourdhui}</td>
                      <td className="px-4 py-3 text-xs">{a.appelsAujourdhui}</td>
                      <td className="px-4 py-3 text-xs text-emerald-400 font-bold">{a.rdvConfirmesToday}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                          a.status === 'actif' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                        }`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Géo */}
      {activeTab === 'geo' && geo && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Top Villes
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geo.byVille?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="ville" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Contacts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Top Départements
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geo.byDepartement?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="departement" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Contacts" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-indigo-500/10 text-indigo-500',
    success: 'bg-emerald-500/10 text-emerald-500',
    info: 'bg-blue-500/10 text-blue-500',
    warning: 'bg-amber-500/10 text-amber-500',
    destructive: 'bg-red-500/10 text-red-500',
  };
  const cc = colors[color] || colors.primary;
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</span>
        <div className={`p-2 rounded-xl ${cc}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-3xl font-black tracking-tighter text-foreground">{value}</p>
    </div>
  );
}
