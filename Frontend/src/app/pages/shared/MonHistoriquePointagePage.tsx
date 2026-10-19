import React, { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, Calendar, AlertTriangle, CheckCircle, Coffee } from 'lucide-react';
import api from '../../../services/api';
import SessionAttendanceWidget from '../../components/SessionAttendanceWidget';

interface BreakRecord {
  id: number;
  type: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
}

interface SessionDay {
  id: number;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  tempsProductif: string;
  totalBreakMinutes: number;
  retardMinutes: number;
  estEnRetard: boolean;
  penaliteSalaire?: number;
  breaks: BreakRecord[];
}

const statusLabel = (s: string) => {
  if (s === 'active')    return { label: 'En cours',  cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'completed') return { label: 'Terminé',   cls: 'bg-slate-100 text-slate-600' };
  return { label: s, cls: 'bg-slate-100 text-slate-500' };
};

const BREAK_LABEL: Record<string, string> = {
  cafe: '☕ Café', dejeuner: '🍽️ Déjeuner', priere: '🕌 Prière',
  technique: '🔧 Technique', personnelle: '💭 Permission',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export default function MonHistoriquePointagePage() {
  const [sessions, setSessions] = useState<SessionDay[]>([]);
  const [loading, setLoading]   = useState(true);
  const [days, setDays]         = useState(30);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/attendance/me/history?days=${days}`);
      setSessions(r.data ?? []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const totalSessions   = sessions.length;
  const totalLate       = sessions.filter(s => s.estEnRetard).length;
  const totalCompleted  = sessions.filter(s => s.status === 'completed').length;
  const totalBreakMins  = sessions.reduce((acc, s) => acc + (s.totalBreakMinutes ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Mon Historique de Pointage
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pointage en direct et historique de vos sessions</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card"
        >
          <option value={7}>7 derniers jours</option>
          <option value={14}>14 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={60}>60 derniers jours</option>
        </select>
      </div>

      {/* Live clock-in/out widget */}
      <div className="max-w-sm">
        <SessionAttendanceWidget label="Pointage du jour" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sessions total</p>
          <p className="text-3xl font-bold">{totalSessions}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Terminées</p>
          <p className="text-3xl font-bold text-emerald-500">{totalCompleted}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${totalLate > 0 ? 'border-amber-400' : 'border-border'}`}>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${totalLate > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}/>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Retards</p>
          </div>
          <p className={`text-3xl font-bold ${totalLate > 0 ? 'text-amber-500' : ''}`}>{totalLate}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1 mb-1">
            <Coffee className="w-3.5 h-3.5 text-muted-foreground"/>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pauses</p>
          </div>
          <p className="text-3xl font-bold">{totalBreakMins}<span className="text-base font-normal text-muted-foreground ml-1">min</span></p>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{totalSessions} session{totalSessions !== 1 ? 's' : ''} affichée{totalSessions !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={load} className="text-xs text-primary hover:underline">Actualiser</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Chargement…
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune session enregistrée</p>
            <p className="text-xs mt-1">Cliquez sur "Pointer la connexion" ci-dessus pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map(s => {
              const { label, cls } = statusLabel(s.status);
              const hasBreaks = s.breaks && s.breaks.length > 0;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => hasBreaks ? setExpanded(expanded === s.id ? null : s.id) : undefined}
                    className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${hasBreaks ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Date */}
                    <div className="w-36 shrink-0">
                      <p className="font-medium text-sm capitalize">{fmtDate(s.date)}</p>
                    </div>
                    {/* Clock in/out */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><LogIn className="w-3 h-3 text-emerald-500"/>Arrivée</p>
                        <p className="font-mono text-sm font-bold text-emerald-600">{s.clockIn}</p>
                      </div>
                      <div className="h-px w-4 bg-border"/>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><LogOut className="w-3 h-3 text-red-500"/>Départ</p>
                        <p className={`font-mono text-sm font-bold ${s.clockOut === '--' ? 'text-muted-foreground italic' : 'text-red-500'}`}>
                          {s.clockOut === '--' ? 'En cours…' : s.clockOut}
                        </p>
                      </div>
                    </div>
                    {/* Duration */}
                    <div className="hidden sm:block text-center w-20 shrink-0">
                      <p className="text-[10px] text-muted-foreground">Durée</p>
                      <p className="text-sm font-bold text-blue-600">{s.tempsProductif}</p>
                    </div>
                    {/* Pauses */}
                    <div className="hidden sm:block text-center w-20 shrink-0">
                      <p className="text-[10px] text-muted-foreground">Pauses</p>
                      <p className="text-sm font-bold text-amber-600">{s.totalBreakMinutes ?? 0}min</p>
                    </div>
                    {/* Status */}
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                      {s.status === 'active'
                        ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>
                        : <CheckCircle className="w-3 h-3"/>}
                      {label}
                    </span>
                    {/* Retard */}
                    {s.estEnRetard && (
                      <span className="shrink-0 flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5"/>+{s.retardMinutes}min
                        {s.penaliteSalaire && s.penaliteSalaire > 0 && (
                          <span className="text-[10px] text-orange-500">(-{s.penaliteSalaire.toFixed(0)} TND)</span>
                        )}
                      </span>
                    )}
                    {/* Expand indicator */}
                    {hasBreaks && (
                      <span className="text-muted-foreground text-xs shrink-0">
                        {expanded === s.id ? '▲' : '▼'} {s.breaks.length} pause{s.breaks.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  {/* Expanded breaks */}
                  {expanded === s.id && hasBreaks && (
                    <div className="bg-muted/20 px-8 py-3 space-y-2 border-t border-dashed border-border">
                      {s.breaks.map(b => (
                        <div key={b.id} className="flex items-center gap-3 text-sm">
                          <span className="w-32 font-medium">{BREAK_LABEL[b.type] ?? b.type}</span>
                          <span className="text-muted-foreground font-mono text-xs">
                            {new Date(b.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {b.endTime && ` → ${new Date(b.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          <span className="ml-auto text-amber-600 text-xs font-medium">{b.durationMinutes}min</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
