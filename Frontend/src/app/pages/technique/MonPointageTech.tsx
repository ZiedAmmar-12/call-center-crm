/**
 * Mon Pointage — Service Technique
 * Permet au technicien de pointer son arrivée/départ/pauses et voir son historique.
 * Réutilise le même système AdvancedAttendances que les agents (endpoint /api/attendance/*).
 */
import React, { useEffect, useState } from 'react';
import AttendanceWidget from '../../components/AttendanceWidget';
import api from '../../../services/api';
import { Calendar, Clock, Coffee, AlertCircle, AlertTriangle } from 'lucide-react';

interface BreakRecord {
  id: number;
  type: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
}

interface DayRecord {
  id: number;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  tempsProductif: string;
  totalBreakMinutes: number;
  retardMinutes: number;
  estEnRetard: boolean;
  penaliteSalaire: number;
  breaks: BreakRecord[];
}

const BREAK_LABEL: Record<string, string> = {
  cafe: '☕ Café', dejeuner: '🍽️ Déjeuner', priere: '🕌 Prière',
  technique: '🔧 Technique', personnelle: '💭 Permission',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

const statusBadge = (status: string) => {
  switch (status) {
    case 'active':    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'break':     return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'completed': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    default:          return 'bg-slate-100 text-slate-500';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active':    return 'En activité';
    case 'break':     return 'En pause';
    case 'completed': return 'Terminé';
    default:          return status;
  }
};

export default function MonPointageTech() {
  const [history, setHistory] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/attendance/me/history?days=30')
      .then(r => setHistory(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completedDays   = history.filter(d => d.status === 'completed').length;
  const totalBreakMins  = history.reduce((s, d) => s + d.totalBreakMinutes, 0);
  const avgBreak        = completedDays > 0 ? Math.round(totalBreakMins / completedDays) : 0;
  const totalRetards    = history.filter(d => d.estEnRetard).length;
  const totalPenalites  = history.reduce((s, d) => s + (d.penaliteSalaire ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white">Mon Pointage</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Suivi de votre présence et de vos pauses</p>
      </div>

      {/* Widget + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AttendanceWidget />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Calendar,      label: 'Jours',       value: completedDays,  sub: '30 derniers jours', color: 'text-primary' },
            { icon: Coffee,        label: 'Pause moy.',  value: `${avgBreak}min`, sub: 'Par journée', color: 'text-amber-500' },
            { icon: AlertTriangle, label: 'Retards',     value: totalRetards,   sub: 'Ce mois', color: totalRetards > 0 ? 'text-red-500' : 'text-gray-400' },
            { icon: AlertCircle,   label: 'Pénalités',   value: totalPenalites > 0 ? `${totalPenalites.toFixed(0)} TND` : '--', sub: 'Retards cumulés', color: totalPenalites > 0 ? 'text-orange-500' : 'text-gray-400' },
          ].map(s => (
            <div
              key={s.label}
              className={`bg-white dark:bg-gray-800 border rounded-xl p-4 ${
                s.label === 'Retards' && totalRetards > 0 ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' :
                s.label === 'Pénalités' && totalPenalites > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20' :
                'border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-2xl font-bold dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-sm dark:text-white">Historique des 30 derniers jours</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune session enregistrée</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {history.map(day => (
              <div key={day.id}>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors flex items-center gap-4"
                  onClick={() => setExpanded(expanded === day.id ? null : day.id)}
                >
                  {/* Date */}
                  <div className="w-28 shrink-0">
                    <p className="font-medium text-sm dark:text-white capitalize">{fmtDate(day.date)}</p>
                    <p className="text-xs text-gray-400">{new Date(day.date).toLocaleDateString('fr-FR')}</p>
                  </div>

                  {/* Arrivée / Départ */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400">Arrivée</p>
                      <p className="font-mono text-sm font-bold text-emerald-600">{day.clockIn}</p>
                    </div>
                    <div className="h-px w-6 bg-gray-200 dark:bg-gray-600" />
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400">Départ</p>
                      <p className={`font-mono text-sm font-bold ${day.clockOut === '--' ? 'text-gray-400' : 'text-red-500'}`}>
                        {day.clockOut}
                      </p>
                    </div>
                  </div>

                  {/* Productif */}
                  <div className="hidden sm:block text-center w-20">
                    <p className="text-[10px] text-gray-400">Productif</p>
                    <p className="text-sm font-bold text-blue-600">{day.tempsProductif}</p>
                  </div>

                  {/* Pauses */}
                  <div className="hidden sm:block text-center w-20">
                    <p className="text-[10px] text-gray-400">Pauses</p>
                    <p className="text-sm font-bold text-amber-600">{day.totalBreakMinutes}min</p>
                  </div>

                  {/* Statut */}
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(day.status)}`}>
                    {statusLabel(day.status)}
                  </span>

                  {/* Retard */}
                  {day.estEnRetard && (
                    <span className="shrink-0 inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2 py-0.5 text-xs font-bold">
                      <AlertTriangle className="w-3 h-3" />+{day.retardMinutes}min
                      {day.penaliteSalaire > 0 && <span className="text-[10px]">(-{day.penaliteSalaire.toFixed(0)} TND)</span>}
                    </span>
                  )}

                  {day.breaks.length > 0 && (
                    <span className="text-gray-400 text-xs shrink-0">
                      {expanded === day.id ? '▲' : '▼'} {day.breaks.length} pause{day.breaks.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {expanded === day.id && day.breaks.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-3 space-y-2">
                    {day.breaks.map(b => (
                      <div key={b.id} className="flex items-center gap-3 text-sm">
                        <span className="w-32 font-medium dark:text-white">
                          {BREAK_LABEL[b.type] ?? b.type}
                        </span>
                        <span className="text-gray-400 font-mono text-xs">
                          {new Date(b.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {b.endTime && ` → ${new Date(b.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                        <span className="ml-auto text-amber-600 text-xs font-medium">{b.durationMinutes}min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
