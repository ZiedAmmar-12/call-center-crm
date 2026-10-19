import React, { useState } from 'react';
import {
  Brain, Target, TrendingUp, AlertTriangle, CheckCircle2,
  Sliders, Zap, RefreshCw, Info, BarChart3, Shield
} from 'lucide-react';
import api from '../../../services/api';

interface EligibilityForm {
  revenus: number;
  chauffage: string;
  toiture: string;
  isolation: string;
  consommation: string;
  creditScore: string;
  situationBancaire: string;
  projectType: string;
}

interface EligibilityResult {
  score: number;
  label: string;
  color: string;
  details: Array<{ criterion: string; score: number; maxScore: number; comment: string }>;
  aides: { cee: number; coupDePouce: number; tvaReduite: number; ecoPtz: number };
}

const defaultForm: EligibilityForm = {
  revenus: 25000,
  chauffage: 'fioul',
  toiture: 'bon',
  isolation: 'partielle',
  consommation: 'moyenne',
  creditScore: 'bon',
  situationBancaire: 'stable',
  projectType: 'pac',
};

const CHAUFFAGE_OPTIONS = [
  { value: 'fioul', label: 'Fioul' },
  { value: 'gaz', label: 'Gaz' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'bois', label: 'Bois' },
  { value: 'autre', label: 'Autre' },
];

const ETAT_OPTIONS = [
  { value: 'mauvais', label: 'Mauvais' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'bon', label: 'Bon' },
  { value: 'excellent', label: 'Excellent' },
];

const ISOLATION_OPTIONS = [
  { value: 'nulle', label: 'Nulle' },
  { value: 'partielle', label: 'Partielle' },
  { value: 'bonne', label: 'Bonne' },
  { value: 'excellente', label: 'Excellente' },
];

const CONSO_OPTIONS = [
  { value: 'tres_haute', label: 'Très haute (>500 kWh/m²)' },
  { value: 'haute', label: 'Haute (200-500 kWh/m²)' },
  { value: 'moyenne', label: 'Moyenne (100-200 kWh/m²)' },
  { value: 'basse', label: 'Basse (<100 kWh/m²)' },
];

const CREDIT_OPTIONS = [
  { value: 'mauvais', label: 'Mauvais' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'bon', label: 'Bon' },
  { value: 'excellent', label: 'Excellent' },
];

const BANCAIRE_OPTIONS = [
  { value: 'difficile', label: 'Difficile' },
  { value: 'instable', label: 'Instable' },
  { value: 'stable', label: 'Stable' },
  { value: 'tres_stable', label: 'Très stable' },
];

const PROJECT_OPTIONS = [
  { value: 'pac', label: 'Pompe à chaleur' },
  { value: 'isolation', label: 'Isolation thermique' },
  { value: 'solaire', label: 'Panneaux solaires' },
  { value: 'chaudiere', label: 'Chaudière à granulés' },
];

export default function AiScoringPage() {
  const [form, setForm] = useState<EligibilityForm>(defaultForm);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeMode, setActiveMode] = useState<'score' | 'analyze'>('score');

  const handleCalculate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const endpoint = activeMode === 'analyze' ? '/ai/analyze-eligibility' : '/ai/score';
      const res = await api.post(endpoint, form);
      setResult(res.data);
      if (activeMode === 'analyze') setSaved(true);
    } catch (err) {
      console.error('Scoring error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">{label}</label>
      {children}
    </div>
  );

  const Select = ({ value, options, onChange }: { value: string; options: {value:string;label:string}[]; onChange:(v:string)=>void }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-primary pl-6">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
          Scoring <span className="text-primary">IA</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
          Calcul d'éligibilité aux aides énergétiques — moteur de règles IA
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
        {[
          { key: 'score' as const, label: 'Score rapide', icon: Zap },
          { key: 'analyze' as const, label: 'Analyser & Sauvegarder', icon: Brain },
        ].map(m => (
          <button key={m.key} onClick={() => setActiveMode(m.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeMode === m.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <m.icon className="w-3.5 h-3.5" />{m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Profil du Client</h3>
          </div>
          <div className="p-6 space-y-5">
            <Field label="Revenus annuels (€)">
              <input type="number" value={form.revenus} min={0} step={1000}
                onChange={e => setForm({ ...form, revenus: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </Field>

            <Field label="Type de chauffage actuel">
              <Select value={form.chauffage} options={CHAUFFAGE_OPTIONS} onChange={v => setForm({ ...form, chauffage: v })} />
            </Field>

            <Field label="État de la toiture">
              <Select value={form.toiture} options={ETAT_OPTIONS} onChange={v => setForm({ ...form, toiture: v })} />
            </Field>

            <Field label="Niveau d'isolation">
              <Select value={form.isolation} options={ISOLATION_OPTIONS} onChange={v => setForm({ ...form, isolation: v })} />
            </Field>

            <Field label="Consommation énergétique">
              <Select value={form.consommation} options={CONSO_OPTIONS} onChange={v => setForm({ ...form, consommation: v })} />
            </Field>

            <Field label="Score crédit">
              <Select value={form.creditScore} options={CREDIT_OPTIONS} onChange={v => setForm({ ...form, creditScore: v })} />
            </Field>

            <Field label="Situation bancaire">
              <Select value={form.situationBancaire} options={BANCAIRE_OPTIONS} onChange={v => setForm({ ...form, situationBancaire: v })} />
            </Field>

            <Field label="Type de projet">
              <Select value={form.projectType} options={PROJECT_OPTIONS} onChange={v => setForm({ ...form, projectType: v })} />
            </Field>

            <button onClick={handleCalculate} disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {loading ? 'Calcul en cours...' : activeMode === 'analyze' ? 'Analyser & Sauvegarder' : 'Calculer le score'}
            </button>

            {saved && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500">Analyse sauvegardée dans les logs</span>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Remplissez le formulaire et calculez le score
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">Le moteur IA évaluera l'éligibilité du client</p>
            </div>
          )}

          {loading && (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm font-bold text-muted-foreground">Analyse en cours...</p>
            </div>
          )}

          {result && (
            <>
              {/* Score principal */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Score d'Éligibilité</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    result.score >= 70 ? 'bg-emerald-500/10 text-emerald-500' :
                    result.score >= 40 ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>{result.label}</span>
                </div>

                <div className="flex items-center gap-6 mb-6">
                  <div className={`text-6xl font-black ${getScoreColor(result.score)}`}>{result.score}</div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-widest">Score / 100</div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${getScoreBg(result.score)} transition-all duration-1000`} style={{ width: `${result.score}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] font-bold text-muted-foreground">
                      <span>0</span><span className="text-amber-500">40</span><span className="text-emerald-500">70</span><span>100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aides estimées */}
              {result.aides && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Aides Estimées</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'CEE', value: result.aides.cee, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { label: 'Coup de Pouce', value: result.aides.coupDePouce, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { label: 'TVA Réduite', value: result.aides.tvaReduite, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                      { label: 'Éco-PTZ', value: result.aides.ecoPtz, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    ].map((aide, i) => (
                      <div key={i} className={`${aide.bg} rounded-xl p-3`}>
                        <div className="text-[9px] font-black uppercase text-muted-foreground">{aide.label}</div>
                        <div className={`text-lg font-black ${aide.color}`}>{aide.value.toLocaleString()} €</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Détails par critère */}
              {result.details && result.details.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Détail par Critère</h3>
                  </div>
                  <div className="space-y-3">
                    {result.details.map((d, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-foreground">{d.criterion}</span>
                          <span className={`text-xs font-black ${d.score >= d.maxScore * 0.7 ? 'text-emerald-400' : d.score >= d.maxScore * 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                            {d.score} / {d.maxScore}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${d.score >= d.maxScore * 0.7 ? 'bg-emerald-500' : d.score >= d.maxScore * 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${(d.score / d.maxScore) * 100}%` }} />
                        </div>
                        {d.comment && <p className="text-[10px] text-muted-foreground mt-0.5">{d.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
