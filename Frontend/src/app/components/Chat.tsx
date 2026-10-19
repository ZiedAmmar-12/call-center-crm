/**
 * Chat.tsx — Messagerie temps réel centre d'appels EBI
 * ─────────────────────────────────────────────────────
 * • Accès par rôle : les agents NE peuvent PAS se contacter entre eux
 * • Canal "Annonces" : lecture seule pour les agents
 * • Assistant IA intégré : tapez /ai + question
 * • Réponses rapides contextuelles (⚡)
 * • Messages urgents (/urgent + message)
 * • Indicateur de frappe en temps réel
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  channel: string;
  sentAt: string;
  msgType?: 'normal' | 'urgent' | 'info' | 'ai';
}

interface Channel {
  id: string;
  label: string;
  emoji: string;
  visibleTo: string[];
  writeableBy: string[];
  description: string;
}

// ─── Configuration des canaux ─────────────────────────────────────────────────
const ALL_ROLES = ['AGENT', 'ADMIN', 'SuperAdmin', 'QUALITE', 'TECHNIQUE', 'TECH', 'CONFIRMATRICE'];
const STAFF_ROLES = ['ADMIN', 'SuperAdmin', 'QUALITE', 'TECHNIQUE', 'TECH', 'CONFIRMATRICE'];

const CHANNELS: Channel[] = [
  {
    id: 'GENERAL', label: 'Général', emoji: '💬',
    visibleTo: ALL_ROLES, writeableBy: ALL_ROLES,
    description: 'Canal de communication général de l\'équipe',
  },
  {
    // Annonces de la direction aux agents — agents en lecture seule
    id: 'AGENTS', label: 'Annonces', emoji: '📢',
    visibleTo: ALL_ROLES, writeableBy: STAFF_ROLES,
    description: 'Annonces officielles des superviseurs aux agents',
  },
  {
    id: 'CONFIRMATRICES', label: 'Confirmatrices', emoji: '✅',
    visibleTo: ['ADMIN', 'SuperAdmin', 'CONFIRMATRICE'],
    writeableBy: ['ADMIN', 'SuperAdmin', 'CONFIRMATRICE'],
    description: 'Canal interne des confirmatrices',
  },
  {
    id: 'QUALITE', label: 'Qualité', emoji: '⭐',
    visibleTo: ['ADMIN', 'SuperAdmin', 'QUALITE'],
    writeableBy: ['ADMIN', 'SuperAdmin', 'QUALITE'],
    description: 'Suivi qualité et évaluations',
  },
  {
    id: 'TECHNIQUE', label: 'Technique', emoji: '🔧',
    visibleTo: ['ADMIN', 'SuperAdmin', 'TECHNIQUE', 'TECH'],
    writeableBy: ['ADMIN', 'SuperAdmin', 'TECHNIQUE', 'TECH'],
    description: 'Support et incidents techniques',
  },
  {
    id: 'ADMIN', label: 'Direction', emoji: '👑',
    visibleTo: ['ADMIN', 'SuperAdmin'],
    writeableBy: ['ADMIN', 'SuperAdmin'],
    description: 'Canal réservé à l\'administration',
  },
];

// ─── Réponses rapides par rôle ────────────────────────────────────────────────
const QUICK_REPLIES: Record<string, string[]> = {
  AGENT: [
    '✅ Je suis disponible',
    '⏸️ Je prends ma pause',
    '⏱️ Je reviens dans 5 min',
    '🆘 Besoin d\'aide sur un appel',
    '📞 Client difficile, besoin de soutien',
  ],
  ADMIN: [
    '🔔 Réunion équipe dans 10 min',
    '✅ Objectifs du jour atteints',
    '🍽️ Pause déjeuner de 12h à 13h',
    '⚠️ Point équipe dans 5 min',
    '📊 Voir les stats dans Analytics',
  ],
  SuperAdmin: [
    '📋 Rapport disponible',
    '🔔 Réunion direction',
    '⚠️ Alerte performance',
  ],
  QUALITE: [
    '📝 Évaluation en cours',
    '💬 Feedback disponible — vérifiez votre tableau',
    '📅 Session de coaching prévue',
    '🎯 Objectif qualité atteint ✅',
  ],
  TECHNIQUE: [
    '✅ Systèmes opérationnels',
    '⚠️ Maintenance en cours — perturbations possibles',
    '🔧 Incident en cours de résolution',
    '✅ Incident résolu — tout est normal',
  ],
  CONFIRMATRICE: [
    '📅 RDV confirmé',
    '❌ RDV annulé — contact client requis',
    '🔄 Rappel à planifier',
    '✅ Dossier complété',
  ],
  DEFAULT: ['✅ OK', '👍 Compris', '⏱️ Je reviens', '📞 En appel'],
};

// ─── Noms et couleurs par rôle ────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  AGENT: 'Agent Commercial',
  ADMIN: 'Administrateur',
  SuperAdmin: 'Super Administrateur',
  QUALITE: 'Service Qualité',
  TECHNIQUE: 'Service Technique',
  TECH: 'Technicien',
  CONFIRMATRICE: 'Confirmatrice',
  AI: 'Assistant IA',
};

const ROLE_COLORS: Record<string, string> = {
  AGENT: '#3b82f6',
  ADMIN: '#8b5cf6',
  SuperAdmin: '#ef4444',
  QUALITE: '#10b981',
  TECHNIQUE: '#f59e0b',
  TECH: '#f59e0b',
  CONFIRMATRICE: '#ec4899',
  AI: '#a78bfa',
};

// ─── Assistant IA local ───────────────────────────────────────────────────────
const AI_KB: [RegExp, string][] = [
  [/refus|objection/i,    '**Gérer un refus** : Écoutez activement, reformulez l\'objection sans la nier, proposez une alternative concrète, et planifiez un rappel si le client n\'est pas encore prêt.'],
  [/rdv|rendez.vous/i,   '**RDV manqué** : Recontactez le client dans les 2h, proposez 3 créneaux alternatifs sur 5 jours, et notez la raison dans le CRM.'],
  [/pause|temps/i,        '**Temps de pause** : 15 min en matinée, 1h pour le déjeuner (12h–13h), 15 min en après-midi. En dehors de ces créneaux, prévenez votre superviseur.'],
  [/client.difficile|ton agressif/i, '**Client difficile** : Gardez un ton calme et professionnel. Utilisez le prénom du client pour personnaliser. Si le ton monte, proposez de le rappeler. Ne raccrochez jamais sans accord.'],
  [/statut|status/i,      '**Statuts disponibles** : Disponible 🟢, En appel 📞, En pause ⏸️, Absent 🔴. Mettez à jour votre statut dans votre profil.'],
  [/salaire|prime|bonus/i,'**Questions salariales** : Consultez la page Salaires dans votre espace ou contactez l\'administration.'],
  [/script|argumentaire/i,'**Argumentaire** : Accueil → Identification → Présentation du projet → Traitement objections → Confirmation → Conclusion. Restez naturel, le script est un guide pas un texte à lire.'],
];

function askAI(query: string): string {
  for (const [pattern, response] of AI_KB) {
    if (pattern.test(query)) return response;
  }
  return 'Je n\'ai pas de réponse précise pour cette question. Consultez votre superviseur ou reformulez avec plus de détails. \n\n💡 Exemples : `/ai refus client`, `/ai rdv manqué`, `/ai client difficile`';
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
function getToken()  { return localStorage.getItem('token')    ?? ''; }
function getMyId()   { return Number(localStorage.getItem('userId') ?? 0); }
function getMyRole() { return (localStorage.getItem('role') ?? 'AGENT').toUpperCase(); }

// ─── Composant principal ──────────────────────────────────────────────────────
const Chat: React.FC = () => {
  const myRole = useMemo(() => getMyRole(), []);
  const myId   = useMemo(() => getMyId(),   []);

  const visibleChannels = useMemo(
    () => CHANNELS.filter(ch => ch.visibleTo.some(r => r === myRole || r === '*')),
    [myRole],
  );

  const [isOpen,          setIsOpen]          = useState(false);
  const [channel,         setChannel]         = useState(visibleChannels[0]?.id ?? 'GENERAL');
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [input,           setInput]           = useState('');
  const [connected,       setConnected]       = useState(false);
  const [unread,          setUnread]          = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [showQuickReplies,setShowQuickReplies]= useState(false);
  const [typingLabel,     setTypingLabel]     = useState('');

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const prevChannel   = useRef('');
  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCh = CHANNELS.find(c => c.id === channel) ?? CHANNELS[0];
  const canWrite  = currentCh.writeableBy.some(r => r === myRole);
  const quickReplies = QUICK_REPLIES[myRole] ?? QUICK_REPLIES.DEFAULT;

  // Auto-scroll
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // SignalR
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/chat?access_token=${token}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('ReceiveMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      if (!isOpen) setUnread(u => u + 1);
    });

    conn.on('UserTyping', (name: string) => {
      setTypingLabel(`${name} écrit…`);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingLabel(''), 2500);
    });

    conn.onreconnected(() => setConnected(true));
    conn.onclose(()     => setConnected(false));

    conn.start()
      .then(() => { setConnected(true); conn.invoke('JoinChannel', 'GENERAL'); })
      .catch(err => console.error('[Chat]', err));

    connectionRef.current = conn;
    return () => { conn.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de canal
  const switchChannel = useCallback(async (newCh: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;

    if (prevChannel.current && prevChannel.current !== newCh)
      await conn.invoke('LeaveChannel', prevChannel.current).catch(() => {});

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/${newCh}?limit=60`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch { /* silently ignore */ }
    setLoading(false);

    await conn.invoke('JoinChannel', newCh).catch(() => {});
    prevChannel.current = newCh;
    setChannel(newCh);
  }, []);

  useEffect(() => {
    if (isOpen && prevChannel.current !== channel) switchChannel(channel);
    if (isOpen) setUnread(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Envoi
  const sendMessage = async () => {
    const conn = connectionRef.current;
    const text = input.trim();
    if (!text) return;

    // Commande IA locale
    if (text.startsWith('/ai ') || text === '/ai') {
      const query = text.slice(4).trim();
      setMessages(prev => [...prev, {
        id: Date.now(), senderId: 0, senderName: 'Assistant IA', senderRole: 'AI',
        content: query ? askAI(query) : 'Posez une question après /ai. Ex: /ai refus client',
        channel, sentAt: new Date().toISOString(), msgType: 'ai',
      }]);
      setInput('');
      return;
    }

    // Commande urgent
    const isUrgent = text.startsWith('/urgent ');
    const finalText = isUrgent ? text.slice(8) : text;

    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    try {
      await conn.invoke('SendMessage', channel, finalText, isUrgent ? 'urgent' : 'normal');
      setInput('');
      setShowQuickReplies(false);
    } catch (err) { console.error('[Chat] Send:', err); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  const isAIMode   = input.startsWith('/ai');
  const isUrgMode  = input.startsWith('/urgent');

  return (
    <>
      {/* ── Bouton flottant ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1001,
          width: 56, height: 56, borderRadius: '50%',
          background: connected
            ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
            : '#6b7280',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: connected
            ? '0 4px 24px rgba(37,99,235,.5)'
            : '0 4px 12px rgba(0,0,0,.2)',
          transition: 'all .2s',
        }}
        title={connected ? 'Messagerie (en ligne)' : 'Messagerie (hors ligne)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff', borderRadius: '50%',
            fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
            lineHeight: '20px', textAlign: 'center', padding: '0 4px',
            border: '2px solid white',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* ── Fenêtre ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 1000,
          width: 390, height: 570, borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,.35)',
          background: '#0f172a', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif',
          border: '1px solid rgba(255,255,255,.08)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1e3a5f,#1e40af)',
            padding: '13px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>{currentCh.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {currentCh.label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                  background: connected ? '#34d399' : '#f87171',
                  boxShadow: connected ? '0 0 6px #34d399' : 'none',
                }} />
                {connected ? 'En ligne' : 'Reconnexion…'}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff',
                cursor: 'pointer', width: 28, height: 28, borderRadius: '50%',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Canaux */}
          <div style={{
            display: 'flex', overflowX: 'auto', gap: 6, padding: '9px 12px',
            background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,.07)',
            scrollbarWidth: 'none',
          }}>
            {visibleChannels.map(ch => (
              <button key={ch.id} onClick={() => switchChannel(ch.id)} style={{
                flexShrink: 0, padding: '4px 11px', borderRadius: 20,
                border: ch.id === channel
                  ? '1px solid #3b82f6'
                  : '1px solid rgba(255,255,255,.08)',
                cursor: 'pointer', fontSize: 12,
                background: ch.id === channel
                  ? 'rgba(59,130,246,.2)'
                  : 'rgba(255,255,255,.04)',
                color: ch.id === channel ? '#93c5fd' : 'rgba(255,255,255,.45)',
                fontWeight: ch.id === channel ? 700 : 400,
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}>
                {ch.emoji} {ch.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: '#0f172a',
          }}>
            {loading && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13, marginTop: 30 }}>
                Chargement des messages…
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{currentCh.emoji}</div>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, fontWeight: 600 }}>
                  Aucun message pour l'instant
                </div>
                <div style={{ color: 'rgba(255,255,255,.22)', fontSize: 11, marginTop: 4 }}>
                  {currentCh.description}
                </div>
              </div>
            )}
            {messages.map(m => (
              <MessageBubble key={m.id} msg={m} myId={myId} />
            ))}
            {typingLabel && (
              <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, fontStyle: 'italic', paddingLeft: 4 }}>
                {typingLabel}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Réponses rapides */}
          {showQuickReplies && canWrite && (
            <div style={{
              padding: '8px 12px', background: '#1e293b',
              borderTop: '1px solid rgba(255,255,255,.07)',
              display: 'flex', flexWrap: 'wrap', gap: 6,
            }}>
              {quickReplies.map(r => (
                <button key={r} onClick={() => { setInput(r); setShowQuickReplies(false); }} style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 12,
                  background: 'rgba(59,130,246,.13)',
                  border: '1px solid rgba(59,130,246,.25)',
                  color: '#93c5fd', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{r}</button>
              ))}
            </div>
          )}

          {/* Hint commandes */}
          {isAIMode && (
            <div style={{
              padding: '6px 14px', background: 'rgba(139,92,246,.12)',
              borderTop: '1px solid rgba(139,92,246,.2)',
              color: '#c4b5fd', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🤖 <span>Assistant IA — tapez votre question après <strong>/ai</strong></span>
            </div>
          )}
          {isUrgMode && (
            <div style={{
              padding: '6px 14px', background: 'rgba(239,68,68,.12)',
              borderTop: '1px solid rgba(239,68,68,.2)',
              color: '#fca5a5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ⚠️ <span>Message urgent — sera mis en évidence pour tous</span>
            </div>
          )}

          {/* Lecture seule */}
          {!canWrite && (
            <div style={{
              padding: '10px 14px', background: 'rgba(239,68,68,.08)',
              borderTop: '1px solid rgba(239,68,68,.15)',
              color: '#fca5a5', fontSize: 12, textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              📢 Canal en lecture seule — Annonces des superviseurs uniquement
            </div>
          )}

          {/* Zone de saisie */}
          {canWrite && (
            <div style={{
              padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)',
              background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button
                  onClick={() => setShowQuickReplies(s => !s)}
                  title="Réponses rapides"
                  style={{
                    background: showQuickReplies ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.07)',
                    border: 'none', borderRadius: 8, color: '#93c5fd',
                    cursor: 'pointer', width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, flexShrink: 0,
                  }}
                >⚡</button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={
                    connected
                      ? 'Message… ⚡ rapide · /ai question · /urgent texte'
                      : 'Connexion en cours…'
                  }
                  disabled={!connected}
                  rows={2}
                  style={{
                    flex: 1, resize: 'none',
                    border: `1px solid ${isAIMode ? 'rgba(139,92,246,.4)' : isUrgMode ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.1)'}`,
                    borderRadius: 10, padding: '8px 12px', fontSize: 13,
                    fontFamily: 'inherit', outline: 'none',
                    background: 'rgba(255,255,255,.06)',
                    color: '#f1f5f9', lineHeight: 1.5,
                    transition: 'border-color .2s',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: input.trim()
                      ? isUrgMode ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                        : isAIMode ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                        : 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                      : 'rgba(255,255,255,.07)',
                    border: 'none', color: '#fff',
                    cursor: input.trim() ? 'pointer' : 'default',
                    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: input.trim() ? '0 4px 12px rgba(37,99,235,.4)' : 'none',
                    transition: 'all .2s',
                  }}
                >➤</button>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', textAlign: 'center' }}>
                /ai &lt;question&gt; · /urgent &lt;message&gt; · Entrée pour envoyer
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ─── Bulle de message ─────────────────────────────────────────────────────────
interface BubbleProps { msg: ChatMessage; myId: number; }

const MessageBubble: React.FC<BubbleProps> = ({ msg, myId }) => {
  const isMe     = msg.senderId === myId;
  const isAI     = msg.senderRole === 'AI';
  const isUrgent = msg.msgType === 'urgent';
  const roleColor = ROLE_COLORS[msg.senderRole] ?? '#6b7280';

  // Bulle IA
  if (isAI) return (
    <div style={{
      padding: '10px 14px', borderRadius: 14,
      background: 'linear-gradient(135deg,rgba(139,92,246,.18),rgba(59,130,246,.12))',
      border: '1px solid rgba(139,92,246,.3)',
      color: '#e2e8f0', fontSize: 13, lineHeight: 1.65,
    }}>
      <div style={{ fontWeight: 700, color: '#c4b5fd', marginBottom: 5, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
        🤖 Assistant IA EBI
      </div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 6 }}>
        {formatTime(msg.sentAt)}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
    }}>
      {!isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>
            {msg.senderName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: roleColor, fontWeight: 700 }}>
            {msg.senderName}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
            {ROLE_LABELS[msg.senderRole] ?? msg.senderRole}
          </span>
        </div>
      )}

      <div style={{
        maxWidth: '82%', padding: '9px 14px',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isMe
          ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
          : isUrgent
            ? 'rgba(239,68,68,.18)'
            : 'rgba(255,255,255,.08)',
        color: '#f1f5f9', fontSize: 13, lineHeight: 1.55,
        wordBreak: 'break-word',
        border: isUrgent ? '1px solid rgba(239,68,68,.4)' : 'none',
        boxShadow: isMe ? '0 4px 12px rgba(37,99,235,.3)' : 'none',
      }}>
        {isUrgent && (
          <div style={{ color: '#fca5a5', fontSize: 11, marginBottom: 4, fontWeight: 700 }}>
            ⚠️ MESSAGE URGENT
          </div>
        )}
        {msg.content}
      </div>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
        {formatTime(msg.sentAt)}
        {isMe && <span style={{ color: 'rgba(255,255,255,.35)' }}>✓✓</span>}
      </div>
    </div>
  );
};

export default Chat;
