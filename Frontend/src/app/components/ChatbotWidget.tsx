/**
 * ChatbotWidget — Assistant IA EBI Énergie
 * Interface style "AI Assistant" (pas chat d'équipe)
 * Propulsé par Groq / Llama 3.3 70B
 */
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, RotateCcw, ChevronDown, User } from 'lucide-react';
import api from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Bonjour ! Je suis **EBI Assistant**, votre IA spécialisée en centre d'appels.\n\nJe peux vous aider avec :\n- 📞 Qualification des prospects & scripts d'appel\n- 💡 Objections clients et techniques de vente\n- ☀️ Produits énergétiques (solaire, PAC, isolation)\n- 💰 Aides financières (MaPrimeRénov', CEE, TVA réduite)\n- 📊 Analyse de performance et KPIs\n\nQue puis-je faire pour vous ?",
  ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
};

/* ── Markdown renderer (basic) ─────────────────────────────────────── */
function renderMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<p class="md-h3">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="md-h2">$1</p>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/* ── Typing dots ───────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span className="typing-dots">
      <span/><span/><span/>
    </span>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  /* open via sidebar event */
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener('openChatbot', h);
    return () => window.removeEventListener('openChatbot', h);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { role: 'user', content: text, ts };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const r = await api.post('/ai-chat/message', {
        messages: history.map(m => ({ role: m.role, content: m.content })),
      });
      const replyTs = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setMessages([...history, { role: 'assistant', content: r.data.reply, ts: replyTs }]);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Impossible de contacter l\'assistant. Vérifiez que le backend est démarré.';
      setError(msg);
      setMessages(messages); // revert optimistic
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clear = () => { setMessages([WELCOME]); setError(null); };

  const SUGGESTIONS = [
    'Comment qualifier un prospect solaire ?',
    'Traiter l\'objection "c\'est trop cher"',
    'Quelles aides financières en 2025 ?',
    'Script pour prise de RDV',
  ];

  return (
    <>
      <style>{`
        .chatbot-panel { font-family: system-ui, -apple-system, sans-serif; }
        .typing-dots span { display:inline-block; width:6px; height:6px; border-radius:50%; background:currentColor; margin:0 2px; animation:bounce 1.2s infinite; }
        .typing-dots span:nth-child(2){animation-delay:.2s}
        .typing-dots span:nth-child(3){animation-delay:.4s}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        .ai-msg ul { list-style:disc; padding-left:1.25rem; margin:0.25rem 0; }
        .ai-msg li { margin:0.15rem 0; }
        .ai-msg p { margin:0.25rem 0; }
        .ai-msg .md-h2 { font-weight:700; font-size:0.9rem; margin:0.4rem 0 0.1rem; }
        .ai-msg .md-h3 { font-weight:600; font-size:0.85rem; margin:0.3rem 0 0.1rem; }
        .ai-msg .inline-code { background:rgba(0,0,0,.08); padding:1px 5px; border-radius:4px; font-size:0.8rem; font-family:monospace; }
      `}</style>

      {/* ── Toggle button ────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Assistant IA EBI"
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 focus:outline-none bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
        style={{ width: 52, height: 52 }}
      >
        {open ? <ChevronDown className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
        {!open && <span className="absolute inset-0 rounded-full bg-violet-500 opacity-25 animate-ping pointer-events-none"/>}
      </button>

      {/* ── Chat panel ───────────────────────────────────────────── */}
      {open && (
        <div
          className="chatbot-panel fixed bottom-20 right-6 z-50 flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 420, maxWidth: 'calc(100vw - 24px)', height: 580, maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">EBI Assistant</p>
              <p className="text-[11px] text-white/70 truncate">Llama 3.3 · Expert centre d'appels</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={clear} title="Nouvelle conversation"
                className="p-1.5 rounded-lg hover:bg-white/15 transition" >
                <RotateCcw className="w-4 h-4"/>
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition">
                <X className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-muted/20">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5
                  ${m.role === 'assistant'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white'
                    : 'bg-primary text-primary-foreground'}`}>
                  {m.role === 'assistant'
                    ? <Bot className="w-3.5 h-3.5"/>
                    : <User className="w-3.5 h-3.5"/>}
                </div>
                {/* Bubble */}
                <div className={`flex flex-col gap-0.5 max-w-[82%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'ai-msg bg-card border border-border text-foreground rounded-tl-sm shadow-sm'}`}
                    dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? renderMd(m.content) : m.content.replace(/\n/g,'<br/>') }}
                  />
                  {m.ts && <span className="text-[10px] text-muted-foreground px-1">{m.ts}</span>}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2.5 flex-row">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-500 text-white mt-0.5">
                  <Bot className="w-3.5 h-3.5"/>
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <TypingDots/>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-1 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                <span className="text-base leading-none">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Quick suggestions (only at start) */}
            {messages.length === 1 && !loading && (
              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground mb-2 px-1">Suggestions rapides :</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="text-left text-xs px-2.5 py-2 bg-card border border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-xl transition-colors leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-3 border-t border-border bg-card">
            <div className="flex items-end gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Posez votre question à l'assistant…"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground disabled:opacity-50"
                style={{ maxHeight: 96 }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 96) + 'px';
                }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 disabled:opacity-30 hover:opacity-90 transition">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Entrée pour envoyer · Shift+Entrée pour saut de ligne
            </p>
          </div>
        </div>
      )}
    </>
  );
}
