import SessionAttendanceWidget from '../../components/SessionAttendanceWidget';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

interface Stats {
  mois: number; annee: number; totalRdv: number;
  signes: number; nonSignes: number; installes: number;
  r2: number; nRP: number; portes: number; annules: number; reportes: number;
  tauxSignature: number;
}
interface StatMois { mois: number; total: number; signes: number; nonSignes: number; installes: number; r2: number; }

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function CommercialDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [historique, setHistorique] = useState<StatMois[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/commercial/stats'),
      api.get('/commercial/stats/historique'),
    ])
      .then(([sRes, hRes]) => { setStats(sRes.data); setHistorique(hRes.data); })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="mb-4">
        <SessionAttendanceWidget />
      </div>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (error || !stats) return (
    <div className="flex items-center gap-2 text-destructive p-4">
      <AlertCircle className="w-5 h-5" /> {error || 'Erreur'}
    </div>
  );

  const chartData = historique.map(h => ({
    name: MONTH_NAMES[h.mois - 1],
    Signés: h.signes, 'Non signés': h.nonSignes, Installés: h.installes, R2: h.r2
  }));

  const statCards = [
    { label: 'RDV ce mois', value: stats.totalRdv, color: 'text-primary', bg: 'bg-primary/10', icon: <RefreshCw className="w-5 h-5 text-primary" /> },
    { label: 'Signés', value: stats.signes, color: 'text-green-600', bg: 'bg-green-500/10', icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    { label: 'Non signés', value: stats.nonSignes, color: 'text-red-600', bg: 'bg-red-500/10', icon: <XCircle className="w-5 h-5 text-red-600" /> },
    { label: 'Installés', value: stats.installes, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: <TrendingUp className="w-5 h-5 text-blue-600" /> },
    { label: 'Taux signature', value: `${stats.tauxSignature}%`, color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: <TrendingUp className="w-5 h-5 text-yellow-600" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-primary pl-6">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
          Bonjour, <span className="text-primary">{user?.prenom} {user?.nom}</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
          Tableau de bord commercial — {MONTH_NAMES[(stats.mois || 1) - 1]} {stats.annee}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className={`p-2 rounded-xl ${c.bg}`}>{c.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Détail statuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'R2', value: stats.r2 },
          { label: 'NRP', value: stats.nRP },
          { label: 'Porte', value: stats.portes },
          { label: 'Annulés', value: stats.annules },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-foreground">{c.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Historique graphe */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4">Évolution annuelle</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
              <Bar dataKey="Signés" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Non signés" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="Installés" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="R2" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
