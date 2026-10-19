import React, { useState, useEffect } from 'react';
import {
  Star, TrendingUp, Users, BarChart3, RefreshCw, Award, Target
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import api from '../../../services/api';

const tooltipStyle = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
};

export default function QualityAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, histRes, compRes] = await Promise.all([
        api.get('/quality/dashboard/global-stats'),
        api.get('/quality/dashboard/evaluation-history?page=1&pageSize=20'),
        api.get('/quality/dashboard/comparison'),
      ]);
      setStats(statsRes.data);
      setHistory(histRes.data?.evaluations || histRes.data || []);
      setComparison(compRes.data || []);
    } catch (err) {
      console.error('Quality analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      <span className="ml-3 text-muted-foreground">Chargement des données qualité...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-primary pl-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
            Analytique <span className="text-primary">Qualité</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 opacity-70">
            Tableaux de bord des évaluations et scores agents
          </p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-muted text-foreground text-[10px] font-black uppercase tracking-widest rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Évaluations', value: stats.totalEvaluations, icon: Star, color: 'primary' },
            { label: 'Score Moyen', value: `${stats.avgScore?.toFixed(1) || 0}/100`, icon: TrendingUp, color: 'success' },
            { label: 'Agents Évalués', value: stats.agentsEvaluated, icon: Users, color: 'info' },
            { label: 'Meilleur Score', value: `${stats.bestScore || 0}/100`, icon: Award, color: 'warning' },
          ].map((kpi, i) => (
            <KPICard key={i} title={kpi.label} value={kpi.value} icon={kpi.icon} color={kpi.color} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison chart */}
        {comparison.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Score Moyen par Agent
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparison.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="agentName" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avgScore" name="Score Moyen" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score distribution */}
        {stats && stats.scoreDistribution && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Distribution des Scores
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Excellent (80-100)', count: stats.scoreDistribution?.excellent || 0, color: 'bg-emerald-500' },
                { label: 'Bon (60-79)', count: stats.scoreDistribution?.bon || 0, color: 'bg-blue-500' },
                { label: 'Moyen (40-59)', count: stats.scoreDistribution?.moyen || 0, color: 'bg-amber-500' },
                { label: 'Insuffisant (<40)', count: stats.scoreDistribution?.insuffisant || 0, color: 'bg-red-500' },
              ].map((item, i) => {
                const total = stats.totalEvaluations || 1;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{item.label}</span>
                      <span className="text-xs font-black text-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${(item.count / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Evaluations history table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-black uppercase tracking-widest">Évaluations Récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                {['Agent', 'Évaluateur', 'Score', 'Décision', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">Aucune évaluation enregistrée</td></tr>
              ) : (
                history.map((ev: any, i: number) => (
                  <tr key={ev.id || i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold">{ev.agentName || `Agent #${ev.agentId}`}</td>
                    <td className="px-4 py-3 text-xs">{ev.evaluatorName || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`font-black ${ev.globalScore >= 70 ? 'text-emerald-500' : ev.globalScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {ev.globalScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{ev.decision || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(ev.evaluationDate).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-indigo-500/10 text-indigo-500',
    success: 'bg-emerald-500/10 text-emerald-500',
    info: 'bg-blue-500/10 text-blue-500',
    warning: 'bg-amber-500/10 text-amber-500',
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
