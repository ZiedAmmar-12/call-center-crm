import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/Layout';
import { agentService, type CreateAppelDTO } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play,
  Coffee, UtensilsCrossed, BookOpen, User, Clock,
  ChevronRight, CheckCircle, XCircle, RotateCcw,
  MapPin, Mail, Home, Zap, BarChart2,
  AlertTriangle, WifiOff, ArrowLeft, Send,
  MessageSquare, ChevronDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DialerContact {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  numGSM?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  source?: string;
  statut: string;
  statutAgent?: string;
  nombreNRP?: number;
  scoreIA?: number;
  typeRendezVous?: string;
  modeChauffage?: string;
  ageChaudiere?: number;
  surface?: number;
  projet?: string;
  dateRappelPlanifie?: string;
  dateDernierAppel?: string;
}

interface AiAnalysis {
  sentiment: string;
  sentiment_score: number;
  score_percentage: number;
  performance: string;
  summary: string;
  keywords: string[];
  score_ecoute: number;
  score_persuasion: number;
  score_empathie: number;
  score_argumentation: number;
  score_refus: number;
  score_vente: number;
  agent_talk_ratio: number;
  client_talk_ratio: number;
  labeled_transcript: string;
  script_respected: boolean;
  objections_handled: boolean;
  customer_intent: string | null;
  next_steps: string | null;
  refusal_detected: boolean;
  refusal_motive: string;
  refusal_keywords: string[];
  suggested_response: string;
  inactivity_detected: boolean;
  appointment_detected: boolean;
  qualification_coherent: boolean;
  qualification_details: string;
  postal_code: string | null;
  postal_region: string | null;
}

interface TranscriptLine {
  role: 'agent' | 'client';
  text: string;
  ts: number; // seconds since call start
}

type DialerState = 'idle' | 'calling' | 'qualification' | 'done';
type PauseType = 'inter_appel' | 'coaching' | 'cafe' | 'dejeuner' | 'wc';

interface PauseOption {
  id: PauseType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

const PAUSE_OPTIONS: PauseOption[] = [
  { id: 'inter_appel', label: 'Entre appels',  icon: <Clock size={14} />,           color: '#6366F1', bg: '#EEF2FF' },
  { id: 'coaching',   label: 'Coaching',       icon: <BookOpen size={14} />,         color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'cafe',       label: 'Café',           icon: <Coffee size={14} />,           color: '#D97706', bg: '#FEF3C7' },
  { id: 'dejeuner',   label: 'Déjeuner',       icon: <UtensilsCrossed size={14} />,  color: '#16A34A', bg: '#DCFCE7' },
  { id: 'wc',         label: 'WC',             icon: <User size={14} />,             color: '#9333EA', bg: '#F3E8FF' },
];

const DIALER_INDEX_KEY = (agentId: number) => `crm_dialer_index_${agentId}`;

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

async function analyzeTranscript(
  transcript: string,
  callDuration: number,
  qualification?: string,
): Promise<AiAnalysis> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/analyze/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transcript, callDuration, qualification }),
  });
  if (!res.ok) throw new Error('Analyse échouée');
  return res.json();
}

// ── CircleScore ────────────────────────────────────────────────────────────────
const CircleScore: React.FC<{ value: number; label: string; color?: string; size?: number }> = ({
  value, label, color = '#6366F1', size = 58,
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
          style={{ fontSize: size*0.22, fontWeight: 700, fill: '#0F172A' }}>
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number; max?: number; color?: string }> = ({
  label, value, max = 10, color = '#6366F1',
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
export default function DialerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Queue ──────────────────────────────────────────────────────────────────
  const [contacts, setContacts]         = useState<DialerContact[]>([]);
  const [total, setTotal]               = useState(0);
  const [calledToday, setCalledToday]   = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);

  // ── Dialer state ───────────────────────────────────────────────────────────
  const [dialerState, setDialerState] = useState<DialerState>('idle');

  // ── Call ───────────────────────────────────────────────────────────────────
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted]           = useState(false);
  const [isOnHold, setIsOnHold]         = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number>(0);

  // ── Transcript ─────────────────────────────────────────────────────────────
  const [transcript, setTranscript]         = useState<TranscriptLine[]>([]);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [inputRole, setInputRole]           = useState<'agent' | 'client'>('client');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ── Pause ──────────────────────────────────────────────────────────────────
  const [activePause, setActivePause]       = useState<PauseType | null>(null);
  const [pauseSeconds, setPauseSeconds]     = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Qualification ──────────────────────────────────────────────────────────
  const [qualifAction, setQualifAction] = useState<'rdv' | 'rappel' | 'refuse' | 'nrp' | null>(null);
  const [notes, setNotes]               = useState('');
  const [dateRappel, setDateRappel]     = useState('');
  const [besoin, setBesoin]             = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiTab, setAiTab]           = useState<'scores' | 'analysis' | 'transcript' | 'refusal'>('scores');

  const contact = contacts[currentIndex] ?? null;

  // ── Load contacts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/agent/me/dialer/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContacts(data.contacts);
        setTotal(data.total);
        setCalledToday(data.calledToday);
        const saved = localStorage.getItem(DIALER_INDEX_KEY(user?.id ?? 0));
        const idx = saved ? Math.min(parseInt(saved), Math.max(0, data.contacts.length - 1)) : 0;
        setCurrentIndex(idx);
      } catch {
        toast.error('Impossible de charger les contacts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // Persist index
  useEffect(() => {
    if (!loading) localStorage.setItem(DIALER_INDEX_KEY(user?.id ?? 0), String(currentIndex));
  }, [currentIndex, loading, user?.id]);

  // ── Call timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dialerState === 'calling' && !isOnHold) {
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [dialerState, isOnHold]);

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
    const duree = Math.round((fin.getTime() - debut.getTime()) / 1000);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/agent/me/dialer/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ debut: debut.toISOString(), fin: fin.toISOString(), dureeSecondes: duree, type: activePause }),
      });
    } catch { /* non-blocking */ }
    setActivePause(null);
    setPauseSeconds(0);
    setPauseStartTime(null);
  }, [activePause, pauseStartTime]);

  // ── Call actions ───────────────────────────────────────────────────────────
  const handleStartCall = () => {
    setDialerState('calling');
    setCallDuration(0);
    setTranscript([]);
    setTranscriptInput('');
    setIsMuted(false);
    setIsOnHold(false);
    setAiAnalysis(null);
    callStartRef.current = Date.now();
    toast.info('Appel démarré');
  };

  const handleEndCall = async () => {
    setDialerState('qualification');
    if (callDuration > 3 && transcript.length > 0) {
      const rawTranscript = transcript
        .map(l => `${l.role === 'agent' ? 'Agent' : 'Client'}: ${l.text}`)
        .join('\n');
      setAiLoading(true);
      try {
        const result = await analyzeTranscript(rawTranscript, callDuration, besoin || 'PAC');
        setAiAnalysis(result);
        setAiTab('scores');
        toast.success('Analyse IA terminée');
      } catch {
        toast.warning('Analyse IA non disponible');
      } finally {
        setAiLoading(false);
      }
    }
    toast.info('Appel terminé — qualification requise');
  };

  // ── Add transcript line ────────────────────────────────────────────────────
  const addTranscriptLine = () => {
    const text = transcriptInput.trim();
    if (!text) return;
    setTranscript(prev => [...prev, { role: inputRole, text, ts: callDuration }]);
    setTranscriptInput('');
  };

  const handleTranscriptKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTranscriptLine(); }
  };

  // ── Qualification submit ───────────────────────────────────────────────────
  const handleSubmitQualif = async () => {
    if (!contact || !qualifAction) return;
    setSubmitting(true);
    try {
      let qualification = '';
      let dateRappelPlanifie: string | undefined;
      switch (qualifAction) {
        case 'rdv':    qualification = 'RENDEZ_VOUS'; break;
        case 'rappel': qualification = 'RAPPEL'; dateRappelPlanifie = dateRappel || new Date().toISOString(); break;
        case 'refuse': qualification = 'REFUS_PAS_INTERESSE'; break;
        case 'nrp':   qualification = 'NRP'; break;
      }
      const payload: CreateAppelDTO = {
        agentId: user?.id || 1,
        contactId: contact.id,
        dureeSecondes: callDuration,
        qualification,
        dateRappelPlanifie,
      };
      await agentService.enregistrerAppel(payload);
      setCalledToday(c => c + 1);

      if (qualifAction === 'rdv')    toast.success('RDV enregistré !');
      else if (qualifAction === 'rappel') toast.success('Rappel planifié !');
      else toast.info('Qualification enregistrée');

      advanceToNext();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceToNext = () => {
    const next = currentIndex + 1;
    if (next >= contacts.length) {
      setDialerState('done');
    } else {
      setCurrentIndex(next);
      setDialerState('idle');
      setQualifAction(null);
      setNotes('');
      setDateRappel('');
      setBesoin('');
      setCallDuration(0);
      setTranscript([]);
      setAiAnalysis(null);
    }
  };

  const handleSkip = () => {
    toast.info('Contact ignoré');
    advanceToNext();
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const pauseOption = PAUSE_OPTIONS.find(p => p.id === activePause);
  const progress    = total > 0 ? Math.round(((currentIndex) / total) * 100) : 0;

  const transcriptFormatted = transcript
    .map(l => `${l.role === 'agent' ? 'Agent' : 'Client'}: ${l.text}`)
    .join('\n');

  // ── Loading / Empty ────────────────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"/>
      </div>
    </Layout>
  );

  if (total === 0) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <WifiOff className="w-12 h-12 text-muted-foreground"/>
        <p className="text-xl font-semibold">Aucun contact à appeler</p>
        <p className="text-muted-foreground text-sm">Vos contacts seront assignés par l'administrateur.</p>
        <button onClick={() => navigate('/agent/contacts')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
          Voir tous les contacts
        </button>
      </div>
    </Layout>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <style>{`
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.1);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        .calling-dot { animation: pulse-ring 1.3s ease-in-out infinite; }
        .pause-blink { animation: blink 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-3">

        {/* Title row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {/* Back to list */}
            <button onClick={() => navigate('/agent/contacts')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-muted">
              <ArrowLeft size={15}/> Liste contacts
            </button>
            <div className="w-px h-5 bg-border"/>
            <div>
              <h2 className="text-lg font-bold leading-tight">Appel en direct</h2>
              <p className="text-xs text-muted-foreground">
                Contact {currentIndex + 1} / {total} &nbsp;·&nbsp; {calledToday} appelé{calledToday > 1 ? 's' : ''} aujourd'hui
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {dialerState === 'calling' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 calling-dot inline-block"/>
                En appel — {fmt(callDuration)}
              </span>
            )}
            {activePause && pauseOption && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium pause-blink"
                style={{ background: pauseOption.bg, color: pauseOption.color, border: `1px solid ${pauseOption.color}40` }}>
                {pauseOption.icon}&nbsp;{pauseOption.label} — {fmt(pauseSeconds)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
        </div>

        {/* Pause buttons — shown in idle / qualification */}
        {(dialerState === 'idle' || dialerState === 'qualification') && (
          <div className="flex flex-wrap gap-2">
            {PAUSE_OPTIONS.map(p => (
              <button key={p.id}
                onClick={() => activePause === p.id ? handleEndPause() : handleStartPause(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={activePause === p.id
                  ? { background: p.color, color: 'white', borderColor: p.color }
                  : { background: p.bg, color: p.color, borderColor: `${p.color}50` }}>
                {p.icon}
                {activePause === p.id ? `Terminer (${fmt(pauseSeconds)})` : p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── DONE ─────────────────────────────────────────────────────────────── */}
      {dialerState === 'done' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500"/>
          </div>
          <h3 className="text-2xl font-bold">Session terminée !</h3>
          <p className="text-muted-foreground">{calledToday} contacts appelés aujourd'hui</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => { setCurrentIndex(0); setDialerState('idle'); }}
              className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition text-sm">
              Recommencer
            </button>
            <button onClick={() => navigate('/agent/contacts')}
              className="px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition text-sm">
              Retour à la liste
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN GRID ────────────────────────────────────────────────────────── */}
      {dialerState !== 'done' && contact && (
        <div className={`grid gap-4 ${dialerState === 'calling' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 xl:grid-cols-3'}`}>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* COL A : Contact info + call controls                              */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Contact card */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {(contact.prenom?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">
                      {contact.prenom} {contact.nom}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {contact.statut}
                    </span>
                  </div>
                </div>
                {contact.scoreIA != null && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Score IA</div>
                    <div className="font-bold text-primary">{Math.round(contact.scoreIA)}%</div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                <a href={`tel:${contact.telephone}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline">
                  <Phone size={14}/> {contact.telephone}
                </a>
                {contact.numGSM && (
                  <a href={`tel:${contact.numGSM}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary text-xs">
                    <Phone size={13}/> {contact.numGSM} <span>(GSM)</span>
                  </a>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Mail size={13}/> {contact.email}
                  </div>
                )}
                {(contact.ville || contact.codePostal) && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <MapPin size={13}/> {contact.codePostal} {contact.ville}
                  </div>
                )}
                {contact.adresse && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Home size={13}/> {contact.adresse}
                  </div>
                )}
              </div>

              {(contact.modeChauffage || contact.ageChaudiere || contact.surface || contact.projet) && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                  {contact.modeChauffage && (
                    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <div className="text-xs text-muted-foreground">Chauffage</div>
                      <div className="text-xs font-medium">{contact.modeChauffage}</div>
                    </div>
                  )}
                  {contact.ageChaudiere && (
                    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <div className="text-xs text-muted-foreground">Âge chaudière</div>
                      <div className="text-xs font-medium">{contact.ageChaudiere} ans</div>
                    </div>
                  )}
                  {contact.surface && (
                    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <div className="text-xs text-muted-foreground">Surface</div>
                      <div className="text-xs font-medium">{contact.surface} m²</div>
                    </div>
                  )}
                  {contact.projet && (
                    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <div className="text-xs text-muted-foreground">Projet</div>
                      <div className="text-xs font-medium">{contact.projet}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">

              {/* IDLE state */}
              {dialerState === 'idle' && (
                <div className="flex flex-col items-center gap-4 py-2">
                  {contact.nombreNRP != null && contact.nombreNRP > 0 && (
                    <div className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs">
                      <AlertTriangle size={13}/> {contact.nombreNRP} NRP précédent{contact.nombreNRP > 1 ? 's' : ''}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    {activePause ? `En pause — terminez la pause pour démarrer` : 'Prêt pour le prochain appel'}
                  </p>
                  <button onClick={handleStartCall} disabled={!!activePause}
                    className="w-18 h-18 w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <Phone size={30}/>
                  </button>
                  <button onClick={handleSkip} className="text-xs text-muted-foreground underline hover:text-foreground">
                    Passer ce contact
                  </button>
                </div>
              )}

              {/* CALLING state */}
              {dialerState === 'calling' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-primary">{fmt(callDuration)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Durée de l'appel</div>
                  </div>

                  {/* Projet selector (compact) */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Projet détecté</label>
                    <select value={besoin} onChange={e => setBesoin(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">— Sélectionner —</option>
                      <option value="PAC">PAC Air/Air</option>
                      <option value="PAC_EAU">PAC Air/Eau</option>
                      <option value="PV">Panneaux solaires</option>
                      <option value="ISOLATION">Isolation</option>
                      <option value="CHAUDIERE">Chaudière</option>
                    </select>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button onClick={() => setIsMuted(!isMuted)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
                        isMuted ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {isMuted ? <MicOff size={17}/> : <Mic size={17}/>}
                    </button>
                    <button onClick={() => setIsOnHold(!isOnHold)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
                        isOnHold ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {isOnHold ? <Play size={17}/> : <Pause size={17}/>}
                    </button>
                  </div>

                  <button onClick={handleEndCall}
                    className="w-full py-3 rounded-xl bg-red-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition text-sm">
                    <PhoneOff size={16}/> Terminer l'appel
                  </button>
                </div>
              )}

              {/* QUALIFICATION state — summary */}
              {dialerState === 'qualification' && (
                <div className="space-y-3">
                  <div className="text-center text-sm">
                    Durée : <span className="font-semibold text-foreground">{fmt(callDuration)}</span>
                    &nbsp;·&nbsp; {transcript.length} ligne{transcript.length !== 1 ? 's' : ''} de transcription
                  </div>
                  {/* Back to calling option */}
                  <button onClick={() => { setDialerState('calling'); }}
                    className="w-full py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition flex items-center justify-center gap-1.5">
                    <Phone size={14}/> Reprendre l'appel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* COL B : Live Transcript (calling) OR Qualification form           */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* CALLING → Live Transcript */}
            {dialerState === 'calling' && (
              <div className="rounded-2xl border bg-card shadow-sm flex flex-col" style={{ height: '480px' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <MessageSquare size={15} className="text-primary"/>
                  <span className="font-semibold text-sm">Transcription en direct</span>
                  <span className="ml-auto text-xs text-muted-foreground">{transcript.length} ligne{transcript.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Lines */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {transcript.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 opacity-60">
                      <MessageSquare size={24}/>
                      <p>Saisissez ce que dit l'agent ou le client</p>
                    </div>
                  )}
                  {transcript.map((line, i) => (
                    <div key={i} className={`flex gap-2 ${line.role === 'agent' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        line.role === 'agent' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        {line.role === 'agent' ? 'A' : 'C'}
                      </div>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-snug ${
                        line.role === 'agent'
                          ? 'bg-primary/10 text-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'}`}>
                        <p>{line.text}</p>
                        <span className="text-xs text-muted-foreground mt-0.5 block">{fmt(line.ts)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef}/>
                </div>

                {/* Input */}
                <div className="p-3 border-t space-y-2">
                  {/* Role toggle */}
                  <div className="flex rounded-lg overflow-hidden border text-xs font-medium">
                    <button onClick={() => setInputRole('agent')}
                      className={`flex-1 py-1.5 transition ${inputRole === 'agent' ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                      Agent
                    </button>
                    <button onClick={() => setInputRole('client')}
                      className={`flex-1 py-1.5 transition ${inputRole === 'client' ? 'bg-muted-foreground text-white' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                      Client
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transcriptInput}
                      onChange={e => setTranscriptInput(e.target.value)}
                      onKeyDown={handleTranscriptKey}
                      placeholder={inputRole === 'agent' ? "Ce que vous dites…" : "Ce que le client dit…"}
                      className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={addTranscriptLine}
                      disabled={!transcriptInput.trim()}
                      className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition">
                      <Send size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IDLE → Contact history / fiche */}
            {dialerState === 'idle' && (
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h4 className="font-semibold mb-3 text-sm">Fiche contact</h4>
                <div className="space-y-2 text-sm">
                  {contact.nombreNRP != null && contact.nombreNRP > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs">
                      <AlertTriangle size={13}/> {contact.nombreNRP} tentative{contact.nombreNRP > 1 ? 's' : ''} NRP
                    </div>
                  )}
                  {contact.dateDernierAppel && (
                    <div className="text-muted-foreground text-xs">
                      Dernier appel : {new Date(contact.dateDernierAppel).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  {contact.dateRappelPlanifie && (
                    <div className="text-muted-foreground text-xs">
                      Rappel planifié : {new Date(contact.dateRappelPlanifie).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  {contact.statutAgent && (
                    <div className="text-muted-foreground text-xs">Statut : {contact.statutAgent}</div>
                  )}
                  {contact.source && (
                    <div className="text-muted-foreground text-xs">Source : {contact.source}</div>
                  )}
                </div>
              </div>
            )}

            {/* QUALIFICATION → form */}
            {dialerState === 'qualification' && (
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h4 className="font-semibold mb-4 text-sm">Qualification de l'appel</h4>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: 'rdv',    label: 'RDV Pris',  icon: <CheckCircle size={14}/>, cls: 'bg-green-500 text-white hover:bg-green-600' },
                    { id: 'rappel', label: 'Rappel',    icon: <RotateCcw size={14}/>,  cls: 'bg-blue-500 text-white hover:bg-blue-600' },
                    { id: 'refuse', label: 'Refus',     icon: <XCircle size={14}/>,    cls: 'bg-red-500 text-white hover:bg-red-600' },
                    { id: 'nrp',   label: 'NRP',        icon: <Phone size={14}/>,      cls: 'bg-amber-500 text-white hover:bg-amber-600' },
                  ].map(({ id, label, icon, cls }) => (
                    <button key={id}
                      onClick={() => setQualifAction(id as typeof qualifAction)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${cls}${qualifAction === id ? ' ring-2 ring-offset-1 ring-current' : ' opacity-80'}`}>
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {qualifAction === 'rappel' && (
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Date de rappel</label>
                    <input type="datetime-local" value={dateRappel} onChange={e => setDateRappel(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Commentaire sur l'appel…"
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"/>
                </div>

                <button onClick={handleSubmitQualif} disabled={!qualifAction || submitting}
                  className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 text-sm">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <><ChevronRight size={16}/> Valider &amp; contact suivant</>}
                </button>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* COL C : AI panel (hidden during calling — transcript takes the space) */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {dialerState !== 'calling' && (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={15} className="text-primary"/>
                <h4 className="font-semibold text-sm">Analyse IA</h4>
                {aiLoading && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin inline-block"/>
                    Analyse…
                  </span>
                )}
              </div>

              {!aiAnalysis && !aiLoading && (
                <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-2">
                  <BarChart2 size={28} className="opacity-30"/>
                  <p className="text-xs">L'analyse IA apparaît après chaque appel</p>
                </div>
              )}

              {aiAnalysis && (
                <>
                  {/* Tab bar */}
                  <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
                    {(['scores', 'analysis', 'transcript', 'refusal'] as const).map(tab => (
                      <button key={tab} onClick={() => setAiTab(tab)}
                        className={`flex-1 py-1 text-xs font-medium rounded-md transition ${
                          aiTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab === 'scores' ? 'Scores' : tab === 'analysis' ? 'Analyse' : tab === 'transcript' ? 'Transcript' : 'Refus'}
                      </button>
                    ))}
                  </div>

                  {/* Scores */}
                  {aiTab === 'scores' && (
                    <div className="space-y-4">
                      <div className="flex justify-around">
                        <CircleScore value={aiAnalysis.score_percentage} label="Global" color="#6366F1"/>
                        <CircleScore value={aiAnalysis.agent_talk_ratio} label="Ratio agent" color="#10B981"/>
                        <CircleScore value={aiAnalysis.client_talk_ratio} label="Ratio client" color="#F59E0B"/>
                      </div>
                      <div className="pt-2 border-t">
                        <ScoreBar label="Écoute"          value={aiAnalysis.score_ecoute}        color="#6366F1"/>
                        <ScoreBar label="Persuasion"      value={aiAnalysis.score_persuasion}    color="#8B5CF6"/>
                        <ScoreBar label="Empathie"        value={aiAnalysis.score_empathie}      color="#EC4899"/>
                        <ScoreBar label="Argumentation"   value={aiAnalysis.score_argumentation} color="#3B82F6"/>
                        <ScoreBar label="Gestion refus"   value={aiAnalysis.score_refus}         color="#F59E0B"/>
                        <ScoreBar label="Technique vente" value={aiAnalysis.score_vente}         color="#10B981"/>
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {aiTab === 'analysis' && (
                    <div className="space-y-3 text-sm">
                      <div className="px-3 py-2 rounded-lg bg-muted/60">
                        <div className="text-xs text-muted-foreground mb-1">Résumé</div>
                        <p className="text-xs leading-relaxed">{aiAnalysis.summary}</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {aiAnalysis.keywords.map(k => (
                          <span key={k} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{k}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { ok: aiAnalysis.script_respected, yes: '✓ Script OK', no: '✗ Script' },
                          { ok: aiAnalysis.objections_handled, yes: '✓ Objections', no: '⚠ Objections' },
                          { ok: aiAnalysis.appointment_detected, yes: '✓ RDV détecté', no: '— RDV' },
                          { ok: aiAnalysis.qualification_coherent, yes: '✓ Qualif OK', no: '✗ Qualif' },
                        ].map(({ ok, yes, no }) => (
                          <div key={yes} className={`px-2.5 py-1.5 rounded-lg text-xs ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {ok ? yes : no}
                          </div>
                        ))}
                      </div>
                      {aiAnalysis.next_steps && (
                        <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs">
                          <span className="font-medium">Prochaine étape :</span> {aiAnalysis.next_steps}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript tab — show full transcript used for analysis */}
                  {aiTab === 'transcript' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {transcript.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Pas de transcription enregistrée</p>
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
                            <span className="block text-muted-foreground mt-0.5 text-xs">{fmt(line.ts)}</span>
                          </div>
                        </div>
                      ))}
                      {aiAnalysis.labeled_transcript && transcript.length === 0 && (
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {aiAnalysis.labeled_transcript}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Refusal */}
                  {aiTab === 'refusal' && (
                    <div className="space-y-3 text-sm">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        aiAnalysis.refusal_detected ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {aiAnalysis.refusal_detected ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                        {aiAnalysis.refusal_detected ? 'Refus détecté' : 'Pas de refus détecté'}
                      </div>
                      {aiAnalysis.refusal_detected && (
                        <>
                          <div className="px-3 py-2 rounded-lg bg-muted/60">
                            <div className="text-xs text-muted-foreground mb-1">Motif</div>
                            <p className="text-xs">{aiAnalysis.refusal_motive || '—'}</p>
                          </div>
                          {aiAnalysis.refusal_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {aiAnalysis.refusal_keywords.map(k => (
                                <span key={k} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">{k}</span>
                              ))}
                            </div>
                          )}
                          {aiAnalysis.suggested_response && (
                            <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs">
                              <span className="font-medium">Réponse suggérée :</span> {aiAnalysis.suggested_response}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
