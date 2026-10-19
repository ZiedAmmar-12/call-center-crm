import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Clock, Ban } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

type SessionStatus = 'offline' | 'active';
interface StatusData { status: SessionStatus; clockIn?: string; }
interface WorkSchedule { startHour: number; startMinute: number; lateToleranceMinutes: number; }

const OTHER_END = { hour: 16, minute: 0 };

const fmtElapsed = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2,'0')}m` : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
};
const elapsed = (since?: string) => since ? Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000)) : 0;
const pad2 = (n: number) => n.toString().padStart(2,'0');

const isInWork = (sch: WorkSchedule | null) => {
  if (!sch) return true;
  const now = new Date(), tot = now.getHours()*60+now.getMinutes();
  return tot >= sch.startHour*60+sch.startMinute && tot < OTHER_END.hour*60+OTHER_END.minute;
};
const minsUntil = (sch: WorkSchedule | null) => {
  if (!sch) return 0;
  const tot = new Date().getHours()*60+new Date().getMinutes(), s = sch.startHour*60+sch.startMinute;
  return tot < s ? s - tot : 0;
};

export default function SessionAttendanceWidget({ label = 'Pointage de session' }: { label?: string }) {
  const [sd, setSd]         = useState<StatusData>({ status: 'offline' });
  const [sch, setSch]       = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState(false);
  const [secs, setSecs]     = useState(0);
  const [inWork, setInWork] = useState(false); // conservative default: disabled until schedule confirmed
  const timerRef = useRef<any>(null);
  const pollRef  = useRef<any>(null);
  const schRef   = useRef<WorkSchedule | null>(null); // stable ref to avoid stale closure in interval

  useEffect(() => {
    api.get('/attendance/schedule').then(r => {
      setSch(r.data);
      schRef.current = r.data;
      setInWork(isInWork(r.data));
    }).catch(() => { setInWork(true); }); // if schedule fails to load, allow clock-in
    const c = setInterval(() => setInWork(isInWork(schRef.current)), 30000);
    return () => clearInterval(c);
  }, []);

  const apply = (d: StatusData) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSd(d);
    if (d.status === 'active' && d.clockIn) {
      setSecs(elapsed(d.clockIn));
      timerRef.current = setInterval(() => setSecs(s => s+1), 1000);
    } else { setSecs(0); }
  };

  const fetch_ = async () => {
    try {
      const r = await api.get('/attendance/status');
      apply({ status: r.data.status === 'offline' ? 'offline' : 'active', clockIn: r.data.clockIn });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetch_();
    pollRef.current = setInterval(fetch_, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const act = async (fn: ()=>Promise<void>) => { setBusy(true); try { await fn(); await fetch_(); } finally { setBusy(false); } };

  const clockIn  = () => act(async () => { const r = await api.post('/attendance/clock-in');  r.data?.success ? toast.success('Connexion pointée ✓') : toast.error(r.data?.message||'Erreur'); });
  const clockOut = () => act(async () => { const r = await api.post('/attendance/clock-out'); r.data?.success ? toast.success('Déconnexion pointée ✓') : toast.error(r.data?.message||'Erreur'); });

  if (loading) return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
      <span className="text-sm text-muted-foreground">Chargement…</span>
    </div>
  );

  const { status, clockIn: ci } = sd;
  const outside = !inWork && status === 'offline';
  const until   = minsUntil(sch);
  const schLabel = sch ? `${pad2(sch.startHour)}:${pad2(sch.startMinute)} – ${pad2(OTHER_END.hour)}:${pad2(OTHER_END.minute)}` : '08:00 – 16:00';
  const badge = status === 'active'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-600';
  const dot = status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground"/>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`}/>
          {status === 'active' ? 'Connecté' : 'Déconnecté'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {status === 'active' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Connexion</p>
              <p className="font-mono text-sm font-bold text-emerald-600">
                {ci ? new Date(ci).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--:--'}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Durée</p>
              <p className="font-mono text-sm font-bold text-emerald-600">{fmtElapsed(secs)}</p>
            </div>
          </div>
        )}

        {outside && (
          <div className="flex flex-col items-center gap-2 py-3 px-3 bg-slate-100 border border-slate-200 rounded-lg text-center">
            <Ban className="w-5 h-5 text-slate-400"/>
            <p className="text-xs font-medium text-slate-600">Pointage disponible de <strong>{schLabel}</strong></p>
            {until > 0 && (
              <p className="text-[11px] text-slate-500">
                Ouverture dans {until >= 60 ? `${Math.floor(until/60)}h ${until%60}min` : `${until}min`}
              </p>
            )}
          </div>
        )}

        {status === 'offline' && (
          <button onClick={clockIn} disabled={busy || outside}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition
              ${outside ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50'}`}>
            <LogIn className="w-4 h-4"/> Pointer la connexion
          </button>
        )}

        {status === 'active' && (
          <button onClick={clockOut} disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-300 rounded-lg text-sm font-medium transition disabled:opacity-50">
            <LogOut className="w-4 h-4"/> Pointer la déconnexion
          </button>
        )}

        {sch && <p className="text-center text-[10px] text-muted-foreground">Horaires : {schLabel}</p>}
      </div>
    </div>
  );
}
