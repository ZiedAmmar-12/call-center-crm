import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Coffee, Pause, Play, Clock, Ban } from 'lucide-react';
import { agentService } from '../../services/agentService';
import api from '../../services/api';
import { toast } from 'react-toastify';

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'offline' | 'active' | 'break';

interface StatusData {
  status: AttendanceStatus;
  clockIn?: string;
  breakType?: string;
  startTime?: string;
}

interface WorkSchedule {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  lateToleranceMinutes: number;
}

const BREAK_OPTIONS = [
  { id: 'cafe',        label: '☕ Café',       color: 'amber'   },
  { id: 'dejeuner',   label: '🍽️ Déjeuner',   color: 'orange'  },
  { id: 'priere',     label: '🕌 Prière',      color: 'emerald' },
  { id: 'technique',  label: '🔧 Technique',   color: 'blue'    },
  { id: 'personnelle', label: '💭 Permission', color: 'rose'    },
] as const;

type BreakId    = typeof BREAK_OPTIONS[number]['id'];
type BreakColor = typeof BREAK_OPTIONS[number]['color'];

const COLOR_MAP: Record<BreakColor, { bg: string; text: string; border: string }> = {
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-300'   },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-600',  border: 'border-orange-300'  },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-300' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-600',    border: 'border-blue-300'    },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600',    border: 'border-rose-300'    },
};

const BREAK_LABEL: Record<string, string> = {
  cafe: '☕ Café', dejeuner: '🍽️ Déjeuner', priere: '🕌 Prière',
  technique: '🔧 Technique', personnelle: '💭 Permission',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtElapsed = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const elapsed = (since?: string): number =>
  since ? Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000)) : 0;

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** Returns true if the current local time is within [start, end) */
const isWithinWorkHours = (schedule: WorkSchedule | null): boolean => {
  if (!schedule) return true; // default: allow while loading
  const now     = new Date();
  const total   = now.getHours() * 60 + now.getMinutes();
  const start   = schedule.startHour * 60 + schedule.startMinute;
  const end     = schedule.endHour * 60 + schedule.endMinute;
  return total >= start && total < end;
};

/** How many minutes until next work-start (0 if within or past) */
const minutesUntilStart = (schedule: WorkSchedule | null): number => {
  if (!schedule) return 0;
  const now   = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  const start = schedule.startHour * 60 + schedule.startMinute;
  return total < start ? start - total : 0;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AttendanceWidget() {
  const [statusData, setStatusData]   = useState<StatusData>({ status: 'offline' });
  const [schedule, setSchedule]       = useState<WorkSchedule | null>(null);
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState(false);
  const [workSecs, setWorkSecs]       = useState(0);
  const [pauseSecs, setPauseSecs]     = useState(0);
  const [showBreaks, setShowBreaks]   = useState(false);
  const [nowInWork, setNowInWork]     = useState(true);

  const workTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load schedule once ────────────────────────────────────────────────────

  useEffect(() => {
    api.get('/attendance/schedule')
      .then(r => {
        const s: WorkSchedule = r.data;
        setSchedule(s);
        setNowInWork(isWithinWorkHours(s));
      })
      .catch(() => { /* keep default */ });
  }, []);

  // ── Re-check work hours every minute ─────────────────────────────────────

  useEffect(() => {
    clockRef.current = setInterval(() => {
      setNowInWork(isWithinWorkHours(schedule));
    }, 30_000); // every 30 s is enough
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [schedule]);

  // ── Timers ────────────────────────────────────────────────────────────────

  const stopAll = () => {
    [workTimer, pauseTimer].forEach(r => {
      if (r.current) { clearInterval(r.current); r.current = null; }
    });
  };

  const applyStatus = (data: StatusData) => {
    stopAll();
    setStatusData(data);

    if (data.status === 'active' && data.clockIn) {
      setWorkSecs(elapsed(data.clockIn));
      workTimer.current = setInterval(() => setWorkSecs(s => s + 1), 1000);
      setPauseSecs(0);
    } else if (data.status === 'break' && data.startTime) {
      setPauseSecs(elapsed(data.startTime));
      pauseTimer.current = setInterval(() => setPauseSecs(s => s + 1), 1000);
    } else {
      setWorkSecs(0);
      setPauseSecs(0);
    }
  };

  // ── Polling ───────────────────────────────────────────────────────────────

  const fetchStatus = async () => {
    try {
      const data = await agentService.getAttendanceStatus();
      applyStatus(data as StatusData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 10_000);
    return () => {
      stopAll();
      if (pollRef.current) clearInterval(pollRef.current);
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await fetchStatus(); }
    finally { setBusy(false); }
  };

  const handleClockIn = () => withBusy(async () => {
    const res = await agentService.clockIn();
    if (res.success) toast.success('Pointage entrée ✓');
    else toast.error(res.message || 'Erreur');
  });

  const handleClockOut = () => withBusy(async () => {
    const res = await agentService.clockOut();
    if (res.success) toast.success('Pointage sortie ✓');
    else toast.error(res.message || 'Erreur');
  });

  const handleStartBreak = (type: BreakId) => withBusy(async () => {
    const res = await agentService.startBreak(type);
    if (res.success) { toast.success('Pause démarrée'); setShowBreaks(false); }
    else toast.error(res.message || 'Erreur');
  });

  const handleEndBreak = () => withBusy(async () => {
    const res = await agentService.endBreak();
    if (res.success) toast.success('Pause terminée ✓');
    else toast.error(res.message || 'Erreur');
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement pointage…</span>
      </div>
    );
  }

  const { status, clockIn, breakType } = statusData;

  const statusInfo = {
    offline: { dot: 'bg-slate-400',                     label: 'Non pointé',  badge: 'bg-slate-100 text-slate-600'   },
    active:  { dot: 'bg-emerald-500 animate-pulse',      label: 'En activité', badge: 'bg-emerald-100 text-emerald-700' },
    break:   { dot: 'bg-amber-500 animate-pulse',        label: 'En pause',    badge: 'bg-amber-100 text-amber-700'   },
  }[status];

  // Outside-work-hours banner (only shown when offline, not mid-session)
  const showOutsideHours = !nowInWork && status === 'offline';
  const untilStart       = minutesUntilStart(schedule);
  const scheduleLabel    = schedule
    ? `${pad2(schedule.startHour)}:${pad2(schedule.startMinute)} – ${pad2(schedule.endHour)}:${pad2(schedule.endMinute)}`
    : '08:00 – 20:00';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Pointage</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
          {statusInfo.label}
        </span>
      </div>

      <div className="p-4 space-y-3">

        {/* ── Timers row ── */}
        {status !== 'offline' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Depuis</p>
              <p className="font-mono text-sm font-bold text-emerald-600">
                {clockIn ? new Date(clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </p>
            </div>
            {status === 'active' ? (
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Actif</p>
                <p className="font-mono text-sm font-bold text-emerald-600">{fmtElapsed(workSecs)}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5">
                  {breakType ? BREAK_LABEL[breakType] ?? breakType : 'Pause'}
                </p>
                <p className="font-mono text-sm font-bold text-amber-600">{fmtElapsed(pauseSecs)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Outside work hours notice ── */}
        {showOutsideHours && (
          <div className="flex flex-col items-center gap-2 py-3 px-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
            <Ban className="w-5 h-5 text-slate-400" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Pointage disponible uniquement de <strong>{scheduleLabel}</strong>
            </p>
            {untilStart > 0 && (
              <p className="text-[11px] text-slate-500">
                Ouverture dans {untilStart >= 60 ? `${Math.floor(untilStart / 60)}h ${untilStart % 60}min` : `${untilStart}min`}
              </p>
            )}
          </div>
        )}

        {/* ── Clock-in button (only during work hours) ── */}
        {status === 'offline' && (
          <button
            onClick={handleClockIn}
            disabled={busy || showOutsideHours}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition
              ${showOutsideHours
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50'
              }`}
          >
            <LogIn className="w-4 h-4" />
            Pointer l'arrivée
          </button>
        )}

        {/* ── Active ── */}
        {status === 'active' && (
          <>
            {showBreaks ? (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium mb-2">Choisissez le type de pause :</p>
                {BREAK_OPTIONS.map(opt => {
                  const c = COLOR_MAP[opt.color as BreakColor];
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleStartBreak(opt.id)}
                      disabled={busy}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${c.bg} ${c.text} ${c.border} hover:opacity-80 disabled:opacity-40`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowBreaks(false)}
                  className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowBreaks(true)}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sortie
                </button>
              </div>
            )}
          </>
        )}

        {/* ── On break ── */}
        {status === 'break' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-700">
                  {breakType ? BREAK_LABEL[breakType] ?? breakType : 'Pause en cours'}
                </p>
                <p className="text-xs text-amber-600">Durée : {fmtElapsed(pauseSecs)}</p>
              </div>
            </div>
            <button
              onClick={handleEndBreak}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Reprendre le travail
            </button>
          </div>
        )}

        {/* Schedule reminder (always visible, small) */}
        {status !== 'break' && schedule && (
          <p className="text-center text-[10px] text-muted-foreground">
            Horaires : {scheduleLabel} · Tolérance {schedule.lateToleranceMinutes}min
          </p>
        )}

      </div>
    </div>
  );
}
