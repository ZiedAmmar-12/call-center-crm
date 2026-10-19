import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/Layout';
import { agentService, type Contact, type CreateAppelDTO } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play,
  ArrowLeft, Send, CheckCircle, XCircle, RotateCcw,
  MapPin, Mail, Home, Zap, BarChart2,
  Clock, Coffee, UtensilsCrossed, BookOpen, User,
  AlertTriangle, MessageSquare, ChevronRight, CheckSquare,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AiAnalysis {
  sentiment: string; sentiment_score: number; score_percentage: number;
  performance: string; summary: string; keywords: string[];
  score_ecoute: number; score_persuasion: number; score_empathie: number;
  score_argumentation: number; score_refus: number; score_vente: number;
  agent_talk_ratio: number; client_talk_ratio: number; labeled_transcript: string;
  script_respected: boolean; objections_handled: boolean;
  customer_intent: string | null; next_steps: string | null;
  refusal_detected: boolean; refusal_motive: string; refusal_keywords: string[];
  suggested_response: string; inactivity_detected: boolean;
  appointment_detected: boolean; qualification_coherent: boolean;
  qualification_details: string; postal_code: string | null; postal_region: string | null;
}

interface TranscriptLine { role: 'agent' | 'client'; text: string; ts: number; }

type PauseType = 'inter_appel' | 'coaching' | 'cafe' | 'dejeuner' | 'wc';
type AppPhase = 'calling' | 'inter_call';
interface PauseOption { id: PauseType; label: string; icon: React.ReactNode; color: string; bg: string; }

// ── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

const PAUSE_OPTIONS: PauseOption[] = [
  { id: 'inter_appel', label: 'Entre appels',  icon: <Clock size={14}/>,           color: '#6366F1', bg: '#EEF2FF' },
  { id: 'coaching',   label: 'Coaching',       icon: <BookOpen size={14}/>,         color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'cafe',       label: 'Café',           icon: <Coffee size={14}/>,           color: '#D97706', bg: '#FEF3C7' },
  { id: 'dejeuner',   label: 'Déjeuner',       icon: <UtensilsCrossed size={14}/>,  color: '#16A34A', bg: '#DCFCE7' },
  { id: 'wc',         label: 'WC',             icon: <User size={14}/>,             color: '#9333EA', bg: '#F3E8FF' },
];

const ACTION_LABELS: Record<string, string> = {
  converti: 'RDV Pris', rappel: 'Rappel planifié', refuse: 'Refus', nrp: 'NRP',
};
const ACTION_COLORS: Record<string, string> = {
  converti: 'text-green-600 bg-green-50 border-green-200',
  rappel:   'text-blue-600 bg-blue-50 border-blue-200',
  refuse:   'text-red-600 bg-red-50 border-red-200',
  nrp:      'text-amber-600 bg-amber-50 border-amber-200',
};

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

async function runAiAnalysis(transcript: string, callDuration: number, qualification?: string): Promise<AiAnalysis> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/analyze/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transcript, callDuration, qualification }),
  });
  if (!res.ok) throw new Error();
  return res.json();
}

// ── CircleScore ────────────────────────────────────────────────────────────────
const CircleScore: React.FC<{ value: number; label: string; color?: string; size?: number }> = ({
  value, label, color = '#8B7EF5', size = 60,
}) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(value, 100)) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2+5} textAnchor="middle"
          style={{ fontSize: size*0.22, fontWeight: 700, fill: 'currentColor' }}
          className="fill-foreground">{Math.round(value)}%</text>
      </svg>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number; max?: number; color?: string }> = ({
  label, value, max = 10, color = '#8B7EF5',
}) => (
  <div className="flex items-center gap-2 mb-1.5">
    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${(value/max)*100}%`, background: color }}/>
    </div>
    <span className="text-xs font-medium w-5 text-right">{value}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ContactPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Mode & list state ──────────────────────────────────────────────────────
  const [isDirectMode, setIsDirectMode] = useState(false);
  const [allContacts, setAllContacts]   = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [calledToday, setCalledToday]   = useState(0);   // from backend (daily, resets at midnight)
  const [phase, setPhase]               = useState<AppPhase>('calling');
  const [lastAction, setLastAction]     = useState<string>('');

  // ── Contact ────────────────────────────────────────────────────────────────
  const [contact, setContact]     = useState<Contact | null>(null);
  const [loading, setLoading]     = useState(true);
  const [contactId, setContactId] = useState<string | null>(null);
  const [returnTo, setReturnTo]   = useState<string | null>(null);
  const [rdvId, setRdvId]         = useState<string | null>(null);
  const [appelDone, setAppelDone] = useState(false);

  // ── Call ───────────────────────────────────────────────────────────────────
  const [enAppel, setEnAppel]   = useState(false);
  const [duree, setDuree]       = useState(0);
  const [isMuted, setIsMuted]   = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Pause ──────────────────────────────────────────────────────────────────
  const [activePause, setActivePause]       = useState<PauseType | null>(null);
  const [pauseSeconds, setPauseSeconds]     = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live transcript ────────────────────────────────────────────────────────
  const [transcript, setTranscript]           = useState<TranscriptLine[]>([]);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [inputRole, setInputRole]             = useState<'agent' | 'client'>('client');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ── Qualification ──────────────────────────────────────────────────────────
  const [besoin, setBesoin]               = useState('');
  const [budget, setBudget]               = useState('');
  const [niveauInteret, setNiveauInteret] = useState('');
  const [notes, setNotes]                 = useState('');
  const [dateRappel, setDateRappel]       = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiTab, setAiTab]           = useState<'scores' | 'analysis' | 'transcript' | 'refusal'>('scores');

  // ── Load contacts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id  = params.get('id');
    const rt  = params.get('returnTo');
    const rid = params.get('rdvId');
    setReturnTo(rt);
    setRdvId(rid);

    if (id) {
      // Mode liste : contact spécifique
      setIsDirectMode(false);
      setContactId(id);
      agentService.getContactById(parseInt(id))
        .then(data => setContact(data))
        .catch(() => toast.error('Impossible de charger le contact'))
        .finally(() => setLoading(false));
    } else {
      // Mode "Appel en direct" : charge toute la liste via l'endpoint dialer
      setIsDirectMode(true);
      agentService.getDialerContacts()
        .then(({ contacts, calledToday: ct }) => {
          setAllContacts(contacts);
          setCalledToday(ct);
          const idx = contacts.findIndex(c => c.statut === 'A_APPELER' || c.statut === 'EN_COURS');
          const startIdx = idx >= 0 ? idx : 0;
          setCurrentIndex(0);  // always start from first remaining contact
          const premier = contacts[startIdx] ?? contacts[0];
          if (premier) { setContactId(String(premier.id)); setContact(premier); }
        })
        .catch(() => toast.error('Impossible de charger les contacts'))
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  // ── Call timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (enAppel && !isOnHold) {
      callTimerRef.current = setInterval(() => setDuree(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [enAppel, isOnHold]);

  // ── Pause timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activePause) {
      pauseTimerRef.current = setInterval(() => setPauseSeconds(s => s + 1), 1000);
    } else {
      if (pauseTimerRef.current) { clearInterval(pauseTimerRef.current); pauseTimerRef.current = null; }
    }
    return () => { if (pauseTimerRef.current) clearInterval(pauseTimerRef.current); };
  }, [activePause]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ── Pause actions ──────────────────────────────────────────────────────────
  const handleStartPause = (type: PauseType) => {
    setActivePause(type);
    setPauseSeconds(0);
    setPauseStartTime(new Date());
  };

  const handleEndPause = useCallback(async () => {
    if (!activePause || !pauseStartTime) return;
    const debut = pauseStartTime;
    const fin   = new Date();
    const dur   = Math.round((fin.getTime() - debut.getTime()) / 1000);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/agent/me/dialer/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ debut: debut.toISOString(), fin: fin.toISOString(), dureeSecondes: dur, type: activePause }),
      });
    } catch { /* non-blocking */ }
    setActivePause(null);
    setPauseSeconds(0);
    setPauseStartTime(null);
  }, [activePause, pauseStartTime]);

  // ── Call controls ──────────────────────────────────────────────────────────
  const handleStartCall = () => {
    setEnAppel(true);
    setDuree(0);
    setTranscript([]);
    setAiAnalysis(null);
    setIsMuted(false);
    setIsOnHold(false);
    toast.info('Appel démarré');
  };

  const handleStopCall = async () => {
    setEnAppel(false);
    setIsOnHold(false);
    if (duree > 3 && transcript.length > 0) await triggerAiAnalysis();
    toast.info('Appel terminé');
  };

  const triggerAiAnalysis = async () => {
    const rawTranscript = transcript.length > 0
      ? transcript.map(l => `${l.role === 'agent' ? 'Agent' : 'Client'}: ${l.text}`).join('\n')
      : 'Agent: Bonjour je suis de EBI.\nClient: Oui bonjour.';
    setAiLoading(true);
    try {
      const result = await runAiAnalysis(rawTranscript, duree, besoin || 'PAC');
      setAiAnalysis(result);
      setAiTab('scores');
      toast.success('Analyse IA terminée');
    } catch {
      toast.warning('Analyse IA non disponible');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Transcript input ───────────────────────────────────────────────────────
  const addLine = () => {
    const text = transcriptInput.trim();
    if (!text) return;
    setTranscript(prev => [...prev, { role: inputRole, text, ts: duree }]);
    setTranscriptInput('');
  };

  const handleTranscriptKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addLine(); }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const getValidationError = (action: 'converti' | 'rappel' | 'refuse' | 'nrp'): string | null => {
    if (action === 'converti') {
      if (!besoin) return 'Sélectionnez un besoin identifié avant de valider le RDV';
      if (!niveauInteret) return 'Sélectionnez le niveau d\'intérêt du prospect';
    }
    if (action === 'rappel') {
      if (!besoin) return 'Sélectionnez un besoin identifié avant de planifier un rappel';
      if (!dateRappel) return 'Choisissez une date de rappel';
    }
    return null;
  };

  // ── Qualification ──────────────────────────────────────────────────────────
  const handleQualification = async (action: 'converti' | 'rappel' | 'refuse' | 'nrp') => {
    if (!contact) return;

    // Validate before submitting
    const err = getValidationError(action);
    if (err) { toast.warning(err); return; }

    setSubmitting(true);
    const isConf = !!(returnTo && rdvId);
    try {
      if (isConf) {
        const prefix = returnTo!.split('/').filter(Boolean)[0];
        const rdvStatut = action === 'converti' ? 'CONFIRME' : action === 'rappel' ? 'REPORTER' : 'ANNULE';
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/${prefix}/rdv/${rdvId}/statut`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ statut: rdvStatut, commentaire: notes }),
        });
        toast.success(ACTION_LABELS[action]);
        setAppelDone(true);
      } else {
        const qualifMap: Record<string, string> = {
          converti: 'RENDEZ_VOUS', rappel: 'RAPPEL', refuse: 'REFUS_PAS_INTERESSE', nrp: 'NRP',
        };
        const appelData: CreateAppelDTO = {
          agentId: user?.id || 1,
          contactId: contact.id,
          dureeSecondes: duree,
          qualification: qualifMap[action],
          dateRappelPlanifie: action === 'rappel' ? (dateRappel || new Date().toISOString()) : undefined,
        };
        await agentService.enregistrerAppel(appelData);
        toast.success(ACTION_LABELS[action]);

        if (isDirectMode) {
          // Switch to inter-call phase instead of navigating away
          setLastAction(action);
          setAppelDone(true);
          setPhase('inter_call');
          setCalledToday(c => c + 1); // live update of the daily counter
        } else {
          // List mode: go back to contacts
          setAppelDone(true);
          setTimeout(() => navigate('/agent/contacts'), 1500);
        }
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Next contact ───────────────────────────────────────────────────────────
  const handleNextContact = async () => {
    // End active pause first
    if (activePause) await handleEndPause();

    const nextIdx = currentIndex + 1;
    if (nextIdx >= allContacts.length) {
      toast.success('Tous les contacts ont été appelés !');
      navigate('/agent/contacts');
      return;
    }
    const next = allContacts[nextIdx];
    setCurrentIndex(nextIdx);
    setContactId(String(next.id));
    setContact(next);
    // Reset for new call
    setPhase('calling');
    setLastAction('');
    setAppelDone(false);
    setEnAppel(false);
    setDuree(0);
    setTranscript([]);
    setAiAnalysis(null);
    setBesoin('');
    setBudget('');
    setNiveauInteret('');
    setNotes('');
    setDateRappel('');
  };

  const handleRetourAgenda = () => {
    if (returnTo && rdvId) navigate(`${returnTo}?calledRdvId=${rdvId}`);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"/>
      </div>
    </Layout>
  );

  if (!contact) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">
          {!contactId ? 'Aucun contact à appeler pour le moment' : 'Contact introuvable'}
        </p>
        <button onClick={() => navigate('/agent/contacts')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
          ← Retour à la liste
        </button>
      </div>
    </Layout>
  );

  const pauseOption = PAUSE_OPTIONS.find(p => p.id === activePause);

  // Daily progress: calledToday (from DB, resets at midnight) + calls done in current session
  const sessionDone  = currentIndex + (phase === 'inter_call' ? 1 : 0);
  const totalDoneToday = calledToday + sessionDone;           // total calls today (DB + this session)
  const totalForDay    = calledToday + allContacts.length;    // all work for the day
  const donePct = totalForDay > 0 ? Math.round((totalDoneToday / totalForDay) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <style>{`
        @keyframes pulse-ring { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes blink-anim { 0%,100%{opacity:1} 50%{opacity:.35} }
        .calling-dot { animation: pulse-ring 1.3s ease-in-out infinite; }
        .pause-blink { animation: blink-anim 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Confirmatrice banner ───────────────────────────────────────────── */}
      {returnTo && rdvId && (
        <div className={`mb-4 flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
          appelDone ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          <span>{appelDone ? 'Appel enregistré — retournez à l\'agenda' : 'Appel depuis agenda confirmatrice'}</span>
          {appelDone && (
            <button onClick={handleRetourAgenda}
              className="ml-4 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">
              Retourner à l'agenda
            </button>
          )}
        </div>
      )}

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/agent/contacts')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-muted">
              <ArrowLeft size={15}/> Liste contacts
            </button>
            <div className="w-px h-5 bg-border"/>
            <h2 className="text-lg font-bold">Appel en direct</h2>
          </div>

          <div className="flex items-center gap-2">
            {enAppel && !isOnHold && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 calling-dot inline-block"/>
                En appel — {fmt(duree)}
              </span>
            )}
            {enAppel && isOnHold && (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-medium">
                En attente — {fmt(duree)}
              </span>
            )}
            {activePause && pauseOption && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium pause-blink"
                style={{ background: pauseOption.bg, color: pauseOption.color, border: `1px solid ${pauseOption.color}44` }}>
                {pauseOption.icon}&nbsp;{pauseOption.label} — {fmt(pauseSeconds)}
              </span>
            )}
          </div>
        </div>

        {/* Pause buttons */}
        <div className="flex flex-wrap gap-2">
          {PAUSE_OPTIONS.map(p => (
            <button key={p.id}
              onClick={() => activePause === p.id ? handleEndPause() : handleStartPause(p.id)}
              disabled={enAppel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
              style={activePause === p.id
                ? { background: p.color, color: 'white', borderColor: p.color }
                : { background: p.bg, color: p.color, borderColor: `${p.color}50` }}>
              {p.icon}
              {activePause === p.id ? `Terminer (${fmt(pauseSeconds)})` : p.label}
            </button>
          ))}
        </div>

        {/* Progress bar (direct mode only) — resets automatically each day */}
        {isDirectMode && totalForDay > 0 && (
          <div className="bg-card rounded-xl border px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-medium text-foreground">Progression du jour</span>
                <span>
                  <span className="font-bold text-primary">{totalDoneToday}</span>
                  <span> / {totalForDay} appelés</span>
                  {calledToday > 0 && (
                    <span className="ml-2 text-green-600">({calledToday} avant cette session)</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${donePct}%` }}/>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-primary">{donePct}%</div>
              <div className="text-xs text-muted-foreground">du jour</div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* INTER-CALL PHASE                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {phase === 'inter_call' ? (
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Result card */}
          <div className="bg-card rounded-2xl border p-6 shadow-sm text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckSquare size={24} className="text-green-600"/>
            </div>
            <div>
              <h3 className="font-bold text-lg">Appel terminé</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {contact.prenom} {contact.nom}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${ACTION_COLORS[lastAction] || 'text-foreground bg-muted border-border'}`}>
              {lastAction === 'converti' && <CheckCircle size={14}/>}
              {lastAction === 'rappel'   && <RotateCcw size={14}/>}
              {lastAction === 'refuse'   && <XCircle size={14}/>}
              {lastAction === 'nrp'      && <Phone size={14}/>}
              {ACTION_LABELS[lastAction]}
            </div>
            <p className="text-xs text-muted-foreground">Durée : {fmt(duree)}</p>
          </div>

          {/* Pause section */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-1">Prendre une pause</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionnez votre type de pause. Cliquez à nouveau pour la terminer.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAUSE_OPTIONS.map(p => (
                <button key={p.id}
                  onClick={() => activePause === p.id ? handleEndPause() : handleStartPause(p.id)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all"
                  style={activePause === p.id
                    ? { background: p.color, color: 'white', borderColor: p.color }
                    : { background: p.bg, color: p.color, borderColor: `${p.color}50` }}>
                  <span className="text-lg">{p.icon}</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold">{p.label}</div>
                    {activePause === p.id && (
                      <div className="text-xs opacity-80">{fmt(pauseSeconds)}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Next contact */}
          <div className="flex flex-col sm:flex-row gap-3">
            {currentIndex + 1 < allContacts.length ? (
              <>
                <div className="flex-1 bg-card rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">Prochain contact</p>
                  <p className="font-semibold">
                    {allContacts[currentIndex + 1]?.prenom} {allContacts[currentIndex + 1]?.nom}
                  </p>
                  <p className="text-xs text-primary">{allContacts[currentIndex + 1]?.telephone}</p>
                </div>
                <button onClick={handleNextContact}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition sm:w-48 shrink-0">
                  Contact suivant <ChevronRight size={16}/>
                </button>
              </>
            ) : (
              <button onClick={handleNextContact}
                className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-semibold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2">
                <CheckCircle size={16}/> Terminer la session
              </button>
            )}
          </div>

          <button onClick={() => navigate('/agent/contacts')}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition py-2">
            ← Retour à la liste des contacts
          </button>
        </div>

      ) : (

      // ══════════════════════════════════════════════════════════════════════
      // CALLING PHASE — 3-column layout
      // ══════════════════════════════════════════════════════════════════════
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* COL 1 : Call console + Fiche prospect                            */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Call console */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <div className="text-center mb-4">
              <div className="text-4xl font-mono font-bold mb-1">{fmt(duree)}</div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                enAppel && !isOnHold ? 'bg-green-100 text-green-700' :
                enAppel ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                {enAppel && !isOnHold ? 'En ligne' : enAppel ? 'En attente' : 'Inactif'}
              </span>
            </div>

            {/* Contact mini-card */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/40 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {(contact.prenom?.[0] || '?').toUpperCase()}{(contact.nom?.[0] || '').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{contact.prenom} {contact.nom}</div>
                <a href={`tel:${contact.telephone}`} className="text-xs text-primary hover:underline">
                  {contact.telephone}
                </a>
              </div>
            </div>

            {/* Call buttons */}
            {!enAppel ? (
              <button onClick={handleStartCall} disabled={!!activePause}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                <Phone size={16}/> Démarrer l'appel
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setIsMuted(!isMuted)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                      isMuted ? 'bg-red-100 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}>
                    {isMuted ? <MicOff size={14}/> : <Mic size={14}/>}
                    {isMuted ? 'Muet' : 'Micro'}
                  </button>
                  <button onClick={() => setIsOnHold(!isOnHold)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                      isOnHold ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}>
                    {isOnHold ? <Play size={14}/> : <Pause size={14}/>}
                    {isOnHold ? 'Reprendre' : 'Attente'}
                  </button>
                </div>
                <button onClick={handleStopCall}
                  className="w-full py-2.5 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition text-sm">
                  <PhoneOff size={15}/> Raccrocher
                </button>
              </div>
            )}

            {/* Manual AI trigger after call */}
            {!enAppel && duree > 0 && !aiAnalysis && (
              <button onClick={triggerAiAnalysis} disabled={aiLoading}
                className="mt-3 w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Zap size={13}/>
                {aiLoading ? 'Analyse en cours…' : 'Analyser avec l\'IA'}
              </button>
            )}
          </div>
        </div>{/* end COL 1 */}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* COL 2 : Transcript + Qualification                               */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Live transcript */}
          <div className="bg-card rounded-2xl border shadow-sm flex flex-col" style={{ height: enAppel ? '380px' : '260px' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2 shrink-0">
              <MessageSquare size={14} className="text-primary"/>
              <span className="font-semibold text-sm">Transcription en direct</span>
              <span className="ml-auto text-xs text-muted-foreground">{transcript.length} ligne{transcript.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {transcript.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1.5">
                  <MessageSquare size={22} className="opacity-30"/>
                  <p className="text-xs opacity-60">{enAppel ? 'Tapez ce que dit l\'agent ou le client' : 'La transcription apparaît pendant l\'appel'}</p>
                </div>
              )}
              {transcript.map((line, i) => (
                <div key={i} className={`flex gap-2 ${line.role === 'agent' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    line.role === 'agent' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    {line.role === 'agent' ? 'A' : 'C'}
                  </div>
                  <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs leading-snug ${
                    line.role === 'agent' ? 'bg-primary/10 text-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                    <p>{line.text}</p>
                    <span className="text-muted-foreground mt-0.5 block">{fmt(line.ts)}</span>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef}/>
            </div>

            {enAppel && (
              <div className="p-3 border-t space-y-2 shrink-0">
                <div className="flex rounded-lg overflow-hidden border text-xs font-medium">
                  <button onClick={() => setInputRole('agent')}
                    className={`flex-1 py-1.5 transition ${inputRole === 'agent' ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                    Agent
                  </button>
                  <button onClick={() => setInputRole('client')}
                    className={`flex-1 py-1.5 transition ${inputRole === 'client' ? 'bg-slate-600 text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                    Client
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={transcriptInput}
                    onChange={e => setTranscriptInput(e.target.value)}
                    onKeyDown={handleTranscriptKey}
                    placeholder={inputRole === 'agent' ? 'Ce que vous dites…' : 'Ce que le client dit…'}
                    className="flex-1 px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"/>
                  <button onClick={addLine} disabled={!transcriptInput.trim()}
                    className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition">
                    <Send size={13}/>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Qualification form */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-4">Qualification</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Besoin identifié <span className="text-red-500">*</span>
                </label>
                <select value={besoin} onChange={e => setBesoin(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sélectionner…</option>
                  <option value="PAC">PAC — Pompe à chaleur</option>
                  <option value="PAC_EAU">PAC Air/Eau</option>
                  <option value="PV">PV — Panneaux solaires</option>
                  <option value="ISOLATION">Isolation thermique</option>
                  <option value="CHAUDIERE">Chaudière</option>
                  <option value="CCE">Chauffe-eau</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Budget estimé</label>
                <input type="text" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="Ex : 15 000 €"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Niveau d'intérêt <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1 flex-wrap">
                  {['Faible', 'Moyen', 'Élevé', 'Très élevé'].map(n => (
                    <button key={n} onClick={() => setNiveauInteret(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition ${
                        niveauInteret === n ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Notes sur l'appel…"
                  className="w-full px-3 py-2 bg-background border rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Date de rappel <span className="text-red-500">*</span> <span className="text-muted-foreground font-normal">(requis si Rappel)</span>
                </label>
                <input type="datetime-local" value={dateRappel} onChange={e => setDateRappel(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Action</h3>

            {enAppel && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs text-center">
                Raccrochez d'abord pour qualifier l'appel
              </div>
            )}

            {!enAppel && duree === 0 && (
              <div className="mb-3 px-3 py-2 bg-muted/60 rounded-lg text-xs text-muted-foreground text-center">
                Démarrez et terminez un appel avant de qualifier
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'converti', label: 'RDV Pris',  icon: <CheckCircle size={14}/>, cls: 'bg-green-500 hover:bg-green-600', hint: 'Besoin + Intérêt requis' },
                { id: 'rappel',  label: 'Rappel',     icon: <RotateCcw size={14}/>,   cls: 'bg-blue-500 hover:bg-blue-600',   hint: 'Besoin + Date requis' },
                { id: 'refuse',  label: 'Refus',      icon: <XCircle size={14}/>,     cls: 'bg-red-500 hover:bg-red-600',     hint: '' },
                { id: 'nrp',     label: 'NRP',        icon: <Phone size={14}/>,       cls: 'bg-amber-500 hover:bg-amber-600', hint: '' },
              ].map(({ id, label, icon, cls, hint }) => (
                <button key={id}
                  onClick={() => handleQualification(id as 'converti' | 'rappel' | 'refuse' | 'nrp')}
                  disabled={submitting || enAppel || duree === 0}
                  title={hint}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-white rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* COL 3 : AI Analysis                                              */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-primary"/>
              <h3 className="font-semibold text-sm">Analyse IA</h3>
              {aiLoading && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin inline-block"/>
                  Analyse…
                </span>
              )}
              {aiAnalysis && !aiLoading && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  aiAnalysis.performance === 'Excellent' ? 'bg-green-100 text-green-700' :
                  aiAnalysis.performance === 'Bon' ? 'bg-blue-100 text-blue-700' :
                  aiAnalysis.performance === 'Moyen' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {aiAnalysis.performance}
                </span>
              )}
            </div>

            {!aiAnalysis && !aiLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-2">
                <BarChart2 size={28} className="opacity-30"/>
                <p className="text-xs">Démarrez et terminez un appel<br/>pour l'analyse IA automatique</p>
              </div>
            )}

            {aiLoading && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="animate-spin rounded-full w-8 h-8 border-2 border-primary/20 border-t-primary"/>
                <p className="text-xs text-muted-foreground">Diarisation · Sentiment · Refus…</p>
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <>
                <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
                  {(['scores', 'analysis', 'transcript', 'refusal'] as const).map(tab => (
                    <button key={tab} onClick={() => setAiTab(tab)}
                      className={`flex-1 py-1 text-xs font-medium rounded-md transition ${
                        aiTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {tab === 'scores' ? 'Scores' : tab === 'analysis' ? 'Analyse' : tab === 'transcript' ? 'Transcript' : 'Refus'}
                    </button>
                  ))}
                </div>

                {aiTab === 'scores' && (
                  <div className="space-y-4">
                    <div className="flex justify-around">
                      <CircleScore value={aiAnalysis.score_percentage} label="Global" color="#8B7EF5"/>
                      <CircleScore value={aiAnalysis.agent_talk_ratio} label="Parole agent" color="#2DCF7F"/>
                      <CircleScore value={aiAnalysis.client_talk_ratio} label="Parole client" color="#5D9BFF"/>
                    </div>
                    <div className="pt-2 border-t">
                      <ScoreBar label="Écoute"          value={aiAnalysis.score_ecoute}        color="#8B7EF5"/>
                      <ScoreBar label="Persuasion"      value={aiAnalysis.score_persuasion}    color="#5D9BFF"/>
                      <ScoreBar label="Empathie"        value={aiAnalysis.score_empathie}      color="#2DCF7F"/>
                      <ScoreBar label="Argumentation"   value={aiAnalysis.score_argumentation} color="#F0B34B"/>
                      <ScoreBar label="Gestion refus"   value={aiAnalysis.score_refus}         color="#FB923C"/>
                      <ScoreBar label="Technique vente" value={aiAnalysis.score_vente}         color="#F87171"/>
                    </div>
                  </div>
                )}

                {aiTab === 'analysis' && (
                  <div className="space-y-3 text-xs">
                    {aiAnalysis.summary && (
                      <div className="px-3 py-2.5 bg-muted/60 rounded-lg leading-relaxed">{aiAnalysis.summary}</div>
                    )}
                    {aiAnalysis.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {aiAnalysis.keywords.map(k => (
                          <span key={k} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{k}</span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { ok: aiAnalysis.script_respected,     yes: '✓ Script OK',    no: '✗ Script' },
                        { ok: aiAnalysis.objections_handled,   yes: '✓ Objections',   no: '⚠ Objections' },
                        { ok: aiAnalysis.appointment_detected, yes: '✓ RDV détecté',  no: '— RDV' },
                        { ok: aiAnalysis.qualification_coherent, yes: '✓ Qualif OK',  no: '✗ Qualif' },
                      ].map(({ ok, yes, no }) => (
                        <div key={yes} className={`px-2 py-1.5 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {ok ? yes : no}
                        </div>
                      ))}
                    </div>
                    {aiAnalysis.next_steps && (
                      <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                        <span className="font-medium">Prochaine étape :</span> {aiAnalysis.next_steps}
                      </div>
                    )}
                  </div>
                )}

                {aiTab === 'transcript' && (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {transcript.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Aucune transcription enregistrée</p>
                    )}
                    {transcript.map((line, i) => (
                      <div key={i} className={`flex gap-2 ${line.role === 'agent' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          line.role === 'agent' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          {line.role === 'agent' ? 'A' : 'C'}
                        </div>
                        <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-xs ${
                          line.role === 'agent' ? 'bg-primary/10 rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                          {line.text}
                          <span className="block text-muted-foreground">{fmt(line.ts)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {aiTab === 'refusal' && (
                  <div className="space-y-3 text-xs">
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium ${
                      aiAnalysis.refusal_detected ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {aiAnalysis.refusal_detected ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                      {aiAnalysis.refusal_detected ? 'Refus détecté' : 'Aucun refus détecté'}
                    </div>
                    {aiAnalysis.refusal_detected && (
                      <>
                        {aiAnalysis.refusal_motive && (
                          <div className="px-3 py-2 bg-muted/60 rounded-lg">{aiAnalysis.refusal_motive}</div>
                        )}
                        {aiAnalysis.refusal_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {aiAnalysis.refusal_keywords.map(k => (
                              <span key={k} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{k}</span>
                            ))}
                          </div>
                        )}
                        {aiAnalysis.suggested_response && (
                          <div className="px-3 py-2 bg-amber-50 text-amber-800 rounded-lg">
                            <span className="font-medium">Réponse suggérée :</span> {aiAnalysis.suggested_response}
                          </div>
                        )}
                      </>
                    )}
                    {aiAnalysis.inactivity_detected && (
                      <div className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg">
                        Inactivité détectée — appel trop court
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
      )}
    </Layout>
  );
}
