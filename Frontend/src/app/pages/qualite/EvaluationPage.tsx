import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Star, AlertCircle, Save, ChevronDown, ChevronUp } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5241';

interface Agent { id: number; nom: string; prenom: string; derniereNote?: number; }
interface Evaluation {
  id: number; dateEvaluation: string; noteGlobale: number;
  notePitchCommercial: number; noteTraitementObjections: number;
  noteQualiteAppel: number; noteRespectScript: number; noteEcoute: number;
  commentaire?: string;
}

const CRITERES = [
  { key: 'notePitchCommercial', label: 'Pitch commercial' },
  { key: 'noteTraitementObjections', label: 'Traitement des objections' },
  { key: 'noteQualiteAppel', label: 'Qualité de l\'appel' },
  { key: 'noteRespectScript', label: 'Respect du script' },
  { key: 'noteEcoute', label: 'Écoute active' },
];

function NoteInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[...Array(11)].map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
            i === value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

export default function EvaluationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    notePitchCommercial: 5,
    noteTraitementObjections: 5,
    noteQualiteAppel: 5,
    noteRespectScript: 5,
    noteEcoute: 5,
    commentaire: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/api/qualite/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAgents(res.data));
  }, []);

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowForm(false);
    setEvals([]);
    setLoadingEvals(true);
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/api/qualite/evaluations/${agent.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setEvals(res.data))
      .finally(() => setLoadingEvals(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setSaving(true); setError(''); setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/qualite/evaluations`, {
        agentId: selectedAgent.id, ...form
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Évaluation enregistrée !');
      setShowForm(false);
      selectAgent(selectedAgent);
    } catch {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const noteColor = (n: number) =>
    n >= 8 ? 'text-green-600' : n >= 6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" /> Évaluation des agents
          </h1>
          <p className="text-muted-foreground">Grille d'évaluation qualité (5 critères /10)</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Liste agents */}
          <div className="col-span-4 bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">Agents</h2>
            </div>
            <ul className="divide-y divide-border">
              {agents.map(agent => (
                <li key={agent.id}>
                  <button
                    onClick={() => selectAgent(agent)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${
                      selectedAgent?.id === agent.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="text-sm font-medium">{agent.prenom} {agent.nom}</span>
                    {agent.derniereNote !== undefined && (
                      <span className={`text-xs font-bold ${noteColor(agent.derniereNote)}`}>
                        {agent.derniereNote}/10
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Détail évaluations */}
          <div className="col-span-8 space-y-4">
            {selectedAgent ? (
              <>
                <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedAgent.prenom} {selectedAgent.nom}</h2>
                    <p className="text-sm text-muted-foreground">{evals.length} évaluation(s)</p>
                  </div>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Nouvelle évaluation
                    {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Formulaire */}
                {showForm && (
                  <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <h3 className="font-semibold text-sm">Grille d'évaluation</h3>
                    {CRITERES.map(c => (
                      <div key={c.key}>
                        <label className="block text-sm font-medium mb-1">{c.label}</label>
                        <NoteInput
                          value={(form as any)[c.key]}
                          onChange={v => setForm(f => ({ ...f, [c.key]: v }))}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium mb-1">Commentaire</label>
                      <textarea
                        value={form.commentaire}
                        onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                        rows={3}
                        placeholder="Observations, axes d'amélioration…"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm">
                        Note globale estimée:{' '}
                        <strong className={noteColor(
                          (form.notePitchCommercial + form.noteTraitementObjections +
                           form.noteQualiteAppel + form.noteRespectScript + form.noteEcoute) / 5
                        )}>
                          {((form.notePitchCommercial + form.noteTraitementObjections +
                            form.noteQualiteAppel + form.noteRespectScript + form.noteEcoute) / 5).toFixed(1)}/10
                        </strong>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                    {success && <p className="text-sm text-green-600">{success}</p>}
                    {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
                  </form>
                )}

                {/* Historique */}
                {loadingEvals ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : evals.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                    Aucune évaluation pour cet agent
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evals.map(ev => (
                      <div key={ev.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">
                            {new Date(ev.dateEvaluation).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`text-lg font-bold ${noteColor(ev.noteGlobale)}`}>
                            {ev.noteGlobale.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {CRITERES.map(c => (
                            <div key={c.key} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1 leading-tight">{c.label}</p>
                              <p className={`text-sm font-bold ${noteColor((ev as any)[c.key])}`}>
                                {(ev as any)[c.key]}/10
                              </p>
                            </div>
                          ))}
                        </div>
                        {ev.commentaire && (
                          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
                            {ev.commentaire}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Sélectionnez un agent pour voir ses évaluations</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
