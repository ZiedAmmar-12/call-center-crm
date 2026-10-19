import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, X, Delete, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const API_BASE = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

const KEYPAD_ROWS = [
  [{ key: '1', sub: '' },  { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF'  }],
  [{ key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' }],
  [{ key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' }],
  [{ key: '*', sub: '' },  { key: '0', sub: '+' },   { key: '#', sub: ''    }],
];

type Phase = 'dialing' | 'in_call' | 'post_call' | 'saved';

export default function FloatingDialer() {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [phase, setPhase]     = useState<Phase>('dialing');
  const [number, setNumber]   = useState('');
  const [nom, setNom]         = useState('');
  const [duree, setDuree]     = useState(0);
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only render for agents
  const role = user?.role?.toLowerCase() || '';
  if (role !== 'agent') return null;

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'in_call') {
      timerRef.current = setInterval(() => setDuree(d => d + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Keypad ───────────────────────────────────────────────────────────────────
  const pressKey = (k: string) => {
    if (number.replace(/\D/g, '').length < 15) setNumber(prev => prev + k);
  };
  const backspace = () => setNumber(prev => prev.slice(0, -1));
  const clear     = () => setNumber('');

  // ── Call controls ─────────────────────────────────────────────────────────────
  const startCall = () => {
    const digits = number.replace(/\s/g, '');
    if (!digits) { toast.warning('Entrez un numéro à appeler'); return; }
    setPhase('in_call');
    setDuree(0);
    toast.info(`📞 Appel vers ${digits}`);
  };

  const hangUp = () => {
    setPhase('post_call');
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/agent/me/appels/externe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          numero: number.replace(/\s/g, ''),
          nom:    nom || undefined,
          dureeSecondes: duree,
          notes: notes || undefined,
        }),
      });
      toast.success('Appel externe enregistré');
      setPhase('saved');
      setTimeout(() => resetAndClose(), 1800);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setPhase('dialing');
    setNumber('');
    setNom('');
    setNotes('');
    setDuree(0);
  };

  const handleClose = () => {
    if (phase === 'in_call') hangUp();
    resetAndClose();
  };

  // ── Format display number ─────────────────────────────────────────────────────
  const displayNumber = number || '';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => open ? handleClose() : setOpen(true)}
        title="Composer un numéro externe"
        className={`fixed bottom-6 right-20 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
          phase === 'in_call'
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-green-500 hover:bg-green-600'
        } text-white`}
      >
        {open ? <X size={18}/> : <Phone size={18}/>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <Phone size={11} className="text-white"/>
              </div>
              <span className="font-semibold text-sm">Appel externe</span>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition">
              <X size={15}/>
            </button>
          </div>

          <div className="p-4 space-y-3">

            {/* ── DIALING phase ── */}
            {phase === 'dialing' && (
              <>
                {/* Name field */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-lg">
                  <User size={13} className="text-muted-foreground shrink-0"/>
                  <input
                    type="text"
                    placeholder="Nom / raison (optionnel)"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Number display */}
                <div className="relative bg-background border rounded-xl px-4 py-3 text-center min-h-[56px] flex items-center justify-center">
                  {displayNumber ? (
                    <span className="font-mono text-xl font-bold tracking-widest">{displayNumber}</span>
                  ) : (
                    <span className="text-muted-foreground/40 text-sm">Entrez un numéro</span>
                  )}
                  {displayNumber && (
                    <button onClick={backspace}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition">
                      <Delete size={14}/>
                    </button>
                  )}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-1.5">
                  {KEYPAD_ROWS.flat().map(({ key, sub }) => (
                    <button key={key} onClick={() => pressKey(key)}
                      className="h-12 rounded-xl bg-muted hover:bg-muted/60 active:bg-muted/40 text-foreground font-bold text-base transition flex flex-col items-center justify-center gap-0.5">
                      <span>{key}</span>
                      {sub && <span className="text-muted-foreground text-[9px] font-normal tracking-widest">{sub}</span>}
                    </button>
                  ))}
                </div>

                {/* Call button */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  {displayNumber && (
                    <button onClick={clear}
                      className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-muted">
                      Effacer
                    </button>
                  )}
                  <button onClick={startCall} disabled={!displayNumber}
                    className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white flex items-center justify-center shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <Phone size={22}/>
                  </button>
                </div>
              </>
            )}

            {/* ── IN_CALL phase ── */}
            {phase === 'in_call' && (
              <div className="space-y-4">
                {/* Contact info */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-2">
                    <Phone size={20} className="text-green-500"/>
                  </div>
                  <p className="font-semibold text-sm">{nom || 'Contact externe'}</p>
                  <p className="text-primary font-mono text-sm">{displayNumber}</p>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 py-2 bg-red-50 rounded-xl border border-red-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"/>
                  <span className="font-mono font-bold text-red-600 text-xl">{fmt(duree)}</span>
                  <span className="text-xs text-red-500">En ligne</span>
                </div>

                {/* Hang up */}
                <div className="flex justify-center">
                  <button onClick={hangUp}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition">
                    <PhoneOff size={22}/>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Appuyez pour raccrocher</p>
              </div>
            )}

            {/* ── POST_CALL phase ── */}
            {phase === 'post_call' && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-muted-foreground"/>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{nom || displayNumber}</p>
                    <p className="text-xs text-muted-foreground">Durée : {fmt(duree)}</p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notes de l'appel</label>
                  <textarea
                    placeholder="Ex : numéro confirmé, à rappeler…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 border rounded-lg bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Actions */}
                <button onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle size={14}/>
                  {saving ? 'Enregistrement…' : 'Enregistrer l\'appel'}
                </button>

                <button onClick={resetAndClose}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition">
                  Ignorer et fermer
                </button>
              </div>
            )}

            {/* ── SAVED phase ── */}
            {phase === 'saved' && (
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-600"/>
                </div>
                <p className="font-semibold text-sm text-green-600">Appel enregistré !</p>
                <p className="text-xs text-muted-foreground">Visible dans votre historique</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
