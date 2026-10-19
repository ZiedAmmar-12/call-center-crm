import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Send, Users, MessageSquare, Hash, AlertTriangle, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  channel: string;
  sentAt: string;
}

interface Channel {
  id: string;
  label: string;
  icon: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5287';

// ─── Role → accessible channels ──────────────────────────────────────────────
function getAllowedChannels(role: string): string[] {
  const r = role?.toLowerCase();
  if (r === 'admin' || r === 'superadmin') return ['GENERAL', 'AGENTS', 'CONFIRMATRICES', 'QUALITE', 'TECHNIQUE', 'ADMIN'];
  if (r === 'agent') return ['GENERAL', 'AGENTS'];
  if (r === 'confirmatrice') return ['GENERAL', 'CONFIRMATRICES'];
  if (r === 'qualite') return ['GENERAL', 'QUALITE'];
  if (r === 'tech') return ['GENERAL', 'TECHNIQUE'];
  if (r === 'commercial') return ['GENERAL'];
  return ['GENERAL'];
}

// ─── Couleur par rôle ────────────────────────────────────────────────────────
function roleColor(role: string): string {
  const r = role?.toUpperCase();
  if (r === 'ADMIN' || r === 'SUPERADMIN') return 'bg-red-100 text-red-700';
  if (r === 'AGENT') return 'bg-blue-100 text-blue-700';
  if (r === 'CONFIRMATRICE') return 'bg-purple-100 text-purple-700';
  if (r === 'QUALITE') return 'bg-yellow-100 text-yellow-700';
  if (r === 'TECH') return 'bg-green-100 text-green-700';
  return 'bg-muted text-muted-foreground';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TeamChatPage() {
  const { user } = useAuth();
  const token = localStorage.getItem('token') ?? '';

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState('GENERAL');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hubRef = useRef<signalR.HubConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const currentChannelRef = useRef(activeChannel);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allowedChannels = getAllowedChannels(user?.role ?? '');

  // Affiche un message d'erreur visible (auto-masqué après quelques secondes)
  // au lieu de laisser les échecs silencieux — évite un "il ne se passe rien"
  // à l'écran pendant une démo en direct.
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 6000);
  }, []);

  // ── 1. Fetch channels from backend ───────────────────────────────────────
  useEffect(() => {
    api.get('/chat').then(r => {
      const all: Channel[] = r.data;
      setChannels(all.filter(c => allowedChannels.includes(c.id)));
    }).catch(() => {
      showError("Impossible de charger la liste des canaux depuis le serveur — vérifie que le backend est démarré.");
      // fallback
      setChannels(
        allowedChannels.map(id => ({
          id,
          label: id === 'GENERAL' ? 'Général' : id.charAt(0) + id.slice(1).toLowerCase(),
          icon: '💬',
        }))
      );
    });
  }, []);

  // ── 2. Load history when channel changes ─────────────────────────────────
  const loadHistory = useCallback(async (channel: string) => {
    setLoadingHistory(true);
    try {
      const r = await api.get(`/chat/${channel}`);
      setMessages(r.data);
    } catch {
      setMessages([]);
      showError(`Impossible de charger l'historique du canal #${channel}.`);
    } finally {
      setLoadingHistory(false);
    }
  }, [showError]);

  // ── 3. SignalR connection ─────────────────────────────────────────────────
  useEffect(() => {
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${BACKEND_URL}/hubs/chat`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hub.on('ReceiveMessage', (msg: ChatMsg) => {
      if (msg.channel === currentChannelRef.current) {
        setMessages(prev => [...prev, msg]);
      }
    });

    // Ces callbacks tiennent le point vert/rouge à jour pendant toute la session
    // (pas seulement au premier chargement) et préviennent visiblement en cas de
    // coupure — important pendant une démo en direct.
    hub.onreconnecting(() => {
      setConnected(false);
      showError('Connexion au chat perdue — tentative de reconnexion…');
    });
    hub.onreconnected(() => {
      setConnected(true);
      hub.invoke('JoinChannel', currentChannelRef.current).catch(() => {});
    });
    hub.onclose(() => {
      setConnected(false);
      showError('Connexion au chat perdue. Recharge la page si elle ne revient pas.');
    });

    hub.start()
      .then(() => {
        setConnected(true);
        // Join initial channel
        hub.invoke('JoinChannel', currentChannelRef.current).catch(() =>
          showError("Impossible de rejoindre le canal — réessaie ou recharge la page.")
        );
      })
      .catch(() => {
        setConnected(false);
        showError("Connexion au chat impossible — vérifie que le backend (dotnet run) est démarré.");
      });

    hubRef.current = hub;
    return () => { hub.stop(); };
  }, [token, showError]);

  // ── 4. Switch channel ─────────────────────────────────────────────────────
  const switchChannel = async (channel: string) => {
    const hub = hubRef.current;
    if (hub && hub.state === signalR.HubConnectionState.Connected) {
      await hub.invoke('LeaveChannel', currentChannelRef.current).catch(() => {});
      await hub.invoke('JoinChannel', channel).catch(() =>
        showError(`Impossible de rejoindre le canal #${channel}.`)
      );
    } else {
      showError('Chat déconnecté — tu vois quand même l\'historique, mais pas les nouveaux messages en direct.');
    }
    currentChannelRef.current = channel;
    setActiveChannel(channel);
    await loadHistory(channel);
  };

  useEffect(() => { loadHistory(activeChannel); }, [activeChannel]);

  // ── 5. Auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 6. Send message ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const hub = hubRef.current;
    if (!hub || hub.state !== signalR.HubConnectionState.Connected) {
      showError("Chat déconnecté — le message n'a pas été envoyé.");
      return; // on garde le texte tapé pour pouvoir réessayer
    }
    try {
      await hub.invoke('SendMessage', activeChannel, text);
      setInput('');
    } catch {
      showError("Échec de l'envoi du message — réessaie.");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const activeInfo = channels.find(c => c.id === activeChannel);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-card rounded-xl border border-border overflow-hidden">

      {/* ── Sidebar canaux ─────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/30">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Chat équipe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-xs text-muted-foreground">{connected ? 'Connecté' : 'Déconnecté'}</span>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {channels.map(c => (
            <button
              key={c.id}
              onClick={() => switchChannel(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeChannel === c.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="text-base">{c.icon}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Current user */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{user?.name ?? 'Utilisateur'}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role ?? ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone messages ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header canal */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <span className="text-xl">{activeInfo?.icon ?? '💬'}</span>
          <div>
            <h2 className="font-semibold text-sm">{activeInfo?.label ?? activeChannel}</h2>
            <p className="text-xs text-muted-foreground">Canal {activeChannel}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Discussion en temps réel</span>
          </div>
        </div>

        {/* Bandeau d'erreur — visible et explicite au lieu d'un échec silencieux */}
        {errorMsg && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loadingHistory ? (
            <div className="flex justify-center pt-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 pt-8">
              <Hash className="w-10 h-10 opacity-20" />
              <p className="text-sm">Aucun message dans ce canal</p>
              <p className="text-xs opacity-60">Soyez le premier à écrire !</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === user?.id;
              const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {msg.senderName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {showAvatar && (
                      <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-xs font-semibold">{msg.senderName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColor(msg.senderRole)}`}>
                          {msg.senderRole}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.sentAt)}</span>
                      </div>
                    )}
                    <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message dans #${activeInfo?.label ?? activeChannel}…`}
              rows={1}
              className="flex-1 resize-none bg-muted/50 border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
        </div>
      </div>
    </div>
  );
}
