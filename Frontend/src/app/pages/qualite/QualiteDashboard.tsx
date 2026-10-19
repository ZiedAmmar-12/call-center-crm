import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Star, Users, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

interface Agent {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface ManualEval {
  id: number;
  agentId: number;
  agentName: string | null;
  globalScore: number;
  decision: string | null;
  evaluationDate: string;
}

interface AgentWithScore extends Agent {
  derniereNote: number | null;
  derniereDecision: string | null;
}

export default function QualiteDashboard() {
  const [agents, setAgents] = useState<AgentWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, evalsRes] = await Promise.all([
        api.get('/qualite/agents'),
        api.get('/quality/evaluations'),
      ]);

      const rawAgents: Agent[] = agentsRes.data || [];
      const evals: ManualEval[] = evalsRes.data || [];

      // Build map: agentId → latest ManualEvaluation
      const latestByAgent = new Map<number, ManualEval>();
      for (const e of evals) {
        const existing = latestByAgent.get(e.agentId);
        if (!existing || new Date(e.evaluationDate) > new Date(existing.evaluationDate)) {
          latestByAgent.set(e.agentId, e);
        }
      }

      const enriched: AgentWithScore[] = rawAgents.map(a => ({
        ...a,
        derniereNote: latestByAgent.get(a.id)?.globalScore ?? null,
        derniereDecision: latestByAgent.get(a.id)?.decision ?? null,
      }));

      setAgents(enriched);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const evalues = agents.filter(a => a.derniereNote !== null);
  const avgNote = evalues.length > 0
    ? (evalues.reduce((s, a) => s + (a.derniereNote ?? 0), 0) / evalues.length).toFixed(1)
    : '—';

  const noteColor = (n: number) =>
    n >= 70 ? 'bg-green-100 text-green-700' : n >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Qualité</h1>
        <p className="text-muted-foreground">Supervision et évaluation des agents</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg"><Users className="w-6 h-6 text-primary" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Agents suivis</p>
            <p className="text-2xl font-bold">{agents.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg"><Star className="w-6 h-6 text-yellow-500" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Score moyen équipe</p>
            <p className="text-2xl font-bold">{avgNote}{evalues.length > 0 ? '/100' : ''}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg"><TrendingUp className="w-6 h-6 text-green-500" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Agents évalués</p>
            <p className="text-2xl font-bold">{evalues.length}</p>
          </div>
        </div>
      </div>

      {/* Tableau agents */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Agents de l'équipe
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucun agent trouvé</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prénom</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dernière évaluation</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Décision</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{agent.nom}</td>
                  <td className="px-4 py-3">{agent.prenom}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{agent.email}</td>
                  <td className="px-4 py-3">
                    {agent.derniereNote !== null ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${noteColor(agent.derniereNote)}`}>
                        <Star className="w-3 h-3" /> {agent.derniereNote}/100
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Non évalué</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {agent.derniereDecision || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/qualite/evaluation-manuelle?agentId=${agent.id}`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Évaluer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
