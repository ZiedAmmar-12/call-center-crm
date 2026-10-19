import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  Star, Save, RefreshCw, Search, Trash2, CheckCircle2, X, AlertCircle, ClipboardCheck
} from 'lucide-react';
import api from '../../../services/api';

interface Agent {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

interface Evaluation {
  id: number;
  agentId: number;
  evaluatorId: number;
  callRef?: string;
  globalScore: number;
  decision?: string;
  commentaires?: string;
  evaluationDate: string;
}

const CRITERIA = [
  { key: 'accueil', label: 'Accueil & Identification', max: 10 },
  { key: 'energie', label: 'Énergie & Dynamisme', max: 10 },
  { key: 'ecoute', label: 'Écoute active & Reformulation', max: 15 },
  { key: 'client', label: 'Orientation Client & Empathie', max: 15 },
  { key: 'argumentaire', label: 'Argumentaire & Persuasion', max: 20 },
  { key: 'gestion_objections', label: 'Gestion des objections', max: 15 },
  { key: 'conclusion', label: 'Rebond & Conclusion', max: 15 },
];

export default function ManualEvaluationPage() {
  const [searchParams] = useSearchParams();
  const preselectedAgentId = Number(searchParams.get('agentId') ?? 0);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchAgent, setSearchAgent] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  const [form, setForm] = useState({
    agentId: preselectedAgentId,
    callRef: '',
    scores: Object.fromEntries(CRITERIA.map(c => [c.key, 0])),
    decision: '',
    commentaires: '',
  });

  const globalScore = Math.round(
    CRITERIA.reduce((sum, c) => sum + (form.scores[c.key] || 0), 0)
  );

  useEffect(() => { fetchData(); }, []);

  // Pré-sélectionner l'agent une fois la liste chargée
  useEffect(() => {
    if (preselectedAgentId && agents.length > 0) {
      const agent = agents.find(a => a.id === preselectedAgentId);
      if (agent) {
        setForm(f => ({ ...f, agentId: preselectedAgentId }));
        setSearchAgent(`${agent.prenom} ${agent.nom}`);
      }
    }
  }, [preselectedAgentId, agents]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, evalsRes] = await Promise.all([
        api.get('/qualite/agents'),
        api.get('/quality/evaluations'),
      ]);
      setAgents(agentsRes.data || []);
      setEvaluations(evalsRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.agentId) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.post('/quality/evaluate', {
        agentId: form.agentId,
        callRef: form.callRef || null,
        globalScore,
        decision: form.decision || null,
        commentaires: form.commentaires || null,
        scoresJson: JSON.stringify(form.scores),
      });
      setSaved(true);
      setForm({ agentId: 0, callRef: '', scores: Object.fromEntries(CRITERIA.map(c => [c.key, 0])), decision: '', commentaires: '' });
      fetchData();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evalId: number) => {
    if (!confirm('Supprimer cette évaluation ?')) return;
    await api.delete(`/quality/evaluations/${evalId}`);
    fetchData();
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const filteredAgents = agents.filter(a =>
    `${a.prenom} ${a.nom}`.toLowerCase().includes(searchAgent.toLowerCase()) ||
    a.email.toLowerCase().includes(searchAgent.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-primary pl-6">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
          Évaluation <span className="text-primary">Manuelle</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
          Grilles d'évaluation qualité des appels agents
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {[
          { key: 'form' as const, label: 'Nouvelle Évaluation', icon: ClipboardCheck },
          { key: 'history' as const, label: 'Historique', icon: Star },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${
              activeTab === tab.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* FORM TAB */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Selection */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="text-sm font-black uppercase tracking-widest">Sélectionner l'Agent</h3>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Rechercher..." value={searchAgent} onChange={e => setSearchAgent(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs w-full" />
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredAgents.map(agent => (
                  <button key={agent.id} onClick={() => setForm({ ...form, agentId: agent.id })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      form.agentId === agent.id ? 'bg-primary text-white' : 'hover:bg-muted text-foreground'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                      form.agentId === agent.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {agent.prenom[0]}{agent.nom[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{agent.prenom} {agent.nom}</p>
                      <p className={`text-[10px] truncate ${form.agentId === agent.id ? 'text-white/70' : 'text-muted-foreground'}`}>{agent.email}</p>
                    </div>
                    {form.agentId === agent.id && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                ))}
                {filteredAgents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucun agent trouvé</p>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation Criteria */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Grille d'Évaluation</h3>
              <div className={`text-2xl font-black ${scoreColor(globalScore)}`}>
                {globalScore} <span className="text-sm text-muted-foreground font-normal">/ 100</span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Call Ref */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Référence Appel (optionnel)</label>
                <input value={form.callRef} onChange={e => setForm({ ...form, callRef: e.target.value })}
                  placeholder="ex: CALL-2024-001"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              {/* Criteria scores */}
              <div className="space-y-4">
                {CRITERIA.map(c => (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-foreground">{c.label}</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={c.max} value={form.scores[c.key] || 0}
                          onChange={e => setForm({ ...form, scores: { ...form.scores, [c.key]: Math.min(c.max, Math.max(0, parseInt(e.target.value) || 0)) } })}
                          className="w-14 px-2 py-1 bg-muted border border-border rounded-lg text-center text-sm font-black outline-none" />
                        <span className="text-xs text-muted-foreground">/ {c.max}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        (form.scores[c.key] || 0) / c.max >= 0.7 ? 'bg-emerald-500' :
                        (form.scores[c.key] || 0) / c.max >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${((form.scores[c.key] || 0) / c.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Decision */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Décision</label>
                <select value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none">
                  <option value="">Choisir...</option>
                  <option value="Satisfaisant">Satisfaisant</option>
                  <option value="À améliorer">À améliorer</option>
                  <option value="Formation requise">Formation requise</option>
                  <option value="Excellent">Excellent</option>
                </select>
              </div>

              {/* Commentaires */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Commentaires</label>
                <textarea rows={3} value={form.commentaires} onChange={e => setForm({ ...form, commentaires: e.target.value })}
                  placeholder="Observations sur l'appel, points forts et axes d'amélioration..."
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>

              {/* Submit */}
              {saved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-500">Évaluation sauvegardée avec succès !</span>
                </div>
              )}
              {!form.agentId && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">Sélectionnez un agent pour évaluer</span>
                </div>
              )}
              <button onClick={handleSubmit} disabled={saving || !form.agentId}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder l\'Évaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-black uppercase tracking-widest">Historique des Évaluations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  {['Agent ID', 'Réf. Appel', 'Score', 'Décision', 'Commentaires', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-xs animate-pulse">Chargement...</td></tr>
                ) : evaluations.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">Aucune évaluation enregistrée</td></tr>
                ) : (
                  evaluations.map((ev) => {
                    const agent = agents.find(a => a.id === ev.agentId);
                    return (
                      <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-semibold">{agent ? `${agent.prenom} ${agent.nom}` : `Agent #${ev.agentId}`}</td>
                        <td className="px-4 py-3 text-xs font-mono">{ev.callRef || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`font-black ${scoreColor(ev.globalScore)}`}>{ev.globalScore}/100</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{ev.decision || '—'}</td>
                        <td className="px-4 py-3 text-xs max-w-48 truncate">{ev.commentaires || '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(ev.evaluationDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
