import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { Clock, Users, Wifi, AlertTriangle, RefreshCw, Filter } from 'lucide-react';
import api from '../../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionRow {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: string;          // active | completed
  durationMinutes: number | null;
  isLate: boolean;
  lateMinutes: number;
}

interface HistoryResult {
  sessions: SessionRow[];
  totalPresent: number;
  totalActive: number;
  countByRole: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  AGENT:          'Agent',
  CONFIRMATRICE:  'Confirmatrice',
  QUALITE:        'Qualité',
  COMMERCIAL:     'Commercial',
  TECH:           'Technique',
  ADMIN:          'Admin',
  SuperAdmin:     'SuperAdmin',
};
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

const ROLE_COLORS: Record<string, string> = {
  AGENT:         'bg-blue-100 text-blue-700',
  CONFIRMATRICE: 'bg-purple-100 text-purple-700',
  QUALITE:       'bg-orange-100 text-orange-700',
  COMMERCIAL:    'bg-green-100 text-green-700',
  TECH:          'bg-cyan-100 text-cyan-700',
  ADMIN:         'bg-red-100 text-red-700',
  SuperAdmin:    'bg-slate-100 text-slate-700',
};
const roleColor = (r: string) => ROLE_COLORS[r] ?? 'bg-gray-100 text-gray-600';

const fmtDuration = (min: number | null): string => {
  if (min === null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2,'0')}min` : `${m}min`;
};

const today = () => new Date().toISOString().slice(0,10);

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPointageHistoriquePage() {
  const [data, setData]       = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState(today());
  const [roleFilter, setRole] = useState('');
  const [search, setSearch]   = useState('');
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string,string> = { date };
      if (roleFilter) params.role = roleFilter;
      const r = await api.get('/attendance/admin/all-history', { params });
      setData(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [date, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const sessions = (data?.sessions ?? []).filter(s =>
    !search || s.userName.toLowerCase().includes(search.toLowerCase())
  );

  const allRoles = Object.keys(ROLE_LABELS);

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Historique de Pointage — Tous Rôles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sessions de connexion/déconnexion de tous les utilisateurs
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* Stat cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5 text-blue-500"/>} label="Présents aujourd'hui" value={data.totalPresent} color="blue"/>
            <StatCard icon={<Wifi className="w-5 h-5 text-emerald-500"/>} label="Sessions actives" value={data.totalActive} color="emerald"/>
            {Object.entries(data.countByRole).slice(0,2).map(([r,c]) => (
              <StatCard key={r} icon={<Clock className="w-5 h-5 text-purple-500"/>} label={roleLabel(r)} value={c} color="purple"/>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Rôle</label>
            <select
              value={roleFilter}
              onChange={e => setRole(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Tous les rôles</option>
              {allRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground font-medium">Recherche</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <input
                placeholder="Nom d'utilisateur…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              <span className="text-muted-foreground">Chargement…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5"/> {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Clock className="w-8 h-8 opacity-30"/>
              <p>Aucune session pour cette date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Utilisateur</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rôle</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Connexion</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Déconnexion</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Durée</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{s.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(s.userRole)}`}>
                          {roleLabel(s.userRole)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-600 font-medium">{s.clockIn}</td>
                      <td className="px-4 py-3 text-center font-mono text-red-500 font-medium">
                        {s.clockOut ?? <span className="text-muted-foreground text-xs">En cours</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{fmtDuration(s.durationMinutes)}</td>
                      <td className="px-4 py-3 text-center">
                        {s.status === 'active' ? (
                          <span className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>
                            Actif
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Terminé</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.isLate ? (
                          <span className="flex items-center justify-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5"/> +{s.lateMinutes}min
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">À l'heure</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && !error && sessions.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              {sessions.length} session{sessions.length > 1 ? 's' : ''} affichée{sessions.length > 1 ? 's' : ''}
              {search && ` (filtré par "${search}")`}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

// ── Mini stat card ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const bg: Record<string,string> = {
    blue:    'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    purple:  'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color] ?? 'bg-card border-border'}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
