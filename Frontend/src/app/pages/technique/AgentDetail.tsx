import React, { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, Star } from 'lucide-react';

interface Agent { id: number; nom: string; prenom: string; }

interface MoisProduction {
  mois: string;
  brut: number;
  annule: number;
  confirme: number;
  signatures: number;
  pose: number;
  couleur: 'green' | 'yellow' | 'red';
}

interface Evaluation {
  id: number;
  date: string;
  noteGlobale: number;
  notePitch: number;
  noteObjections: number;
  noteQualite: number;
  noteScript: number;
  noteEcoute: number;
  commentaire?: string;
}

interface Props {
  agent: Agent;
  onBack: () => void;
}

const rowColor = (couleur: string) => {
  if (couleur === 'green')  return 'bg-white dark:bg-gray-800';
  if (couleur === 'yellow') return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200';
};

export default function AgentDetail({ agent, onBack }: Props) {
  const [production,   setProduction]   = useState<MoisProduction[]>([]);
  const [evaluations,  setEvaluations]  = useState<Evaluation[]>([]);
  const [loadingProd,  setLoadingProd]  = useState(true);
  const [loadingEval,  setLoadingEval]  = useState(true);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    fetch(`/api/technique/agents/${agent.id}/production`, { headers })
      .then(r => r.json())
      .then(d => { setProduction(d.production || []); setLoadingProd(false); })
      .catch(() => setLoadingProd(false));

    fetch(`/api/technique/agents/${agent.id}/evaluations`, { headers })
      .then(r => r.json())
      .then(d => { setEvaluations(d || []); setLoadingEval(false); })
      .catch(() => setLoadingEval(false));
  }, [agent.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={20} className="dark:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{agent.prenom} {agent.nom}</h1>
          <p className="text-gray-500 dark:text-gray-400">Fiche agent — historique complet</p>
        </div>
      </div>

      {/* Historique de Production */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <span className="font-semibold dark:text-white">Historique de Production</span>
        </div>

        {loadingProd ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Mois', 'RDV', 'Annulés', 'Confirmés', 'Signatures', 'Pose'].map(h => (
                    <th key={h} className="p-3 text-left text-gray-600 dark:text-gray-300 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {production.map((m, i) => (
                  <tr key={i} className={`border-t dark:border-gray-700 ${rowColor(m.couleur)}`}>
                    <td className="p-3 font-medium">{m.mois}</td>
                    <td className="p-3">{m.brut}</td>
                    <td className="p-3">{m.annule}</td>
                    <td className="p-3">{m.confirme}</td>
                    <td className="p-3 font-semibold">{m.signatures}</td>
                    <td className="p-3">{m.pose}</td>
                  </tr>
                ))}
                {production.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                      Aucune donnée de production disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Légende */}
        <div className="p-3 border-t dark:border-gray-700 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-white border border-gray-300 inline-block" /> Bon mois</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-200 inline-block" /> Mois moyen</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Mois faible</span>
        </div>
      </div>

      {/* Historique d'Évaluation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <Star size={18} className="text-yellow-500" />
          <span className="font-semibold dark:text-white">Historique d'Évaluation</span>
        </div>

        {loadingEval ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
        ) : evaluations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune évaluation enregistrée pour cet agent
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Date', 'Note globale', 'Pitch', 'Objections', 'Qualité', 'Script', 'Écoute', 'Commentaire'].map(h => (
                    <th key={h} className="p-3 text-left text-gray-600 dark:text-gray-300 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluations.map(e => (
                  <tr key={e.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="p-3 dark:text-gray-300">{e.date}</td>
                    <td className="p-3">
                      <span className={`font-bold ${e.noteGlobale >= 8 ? 'text-green-600 dark:text-green-400' : e.noteGlobale >= 6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {e.noteGlobale}/10
                      </span>
                    </td>
                    <td className="p-3 dark:text-gray-300">{e.notePitch}/10</td>
                    <td className="p-3 dark:text-gray-300">{e.noteObjections}/10</td>
                    <td className="p-3 dark:text-gray-300">{e.noteQualite}/10</td>
                    <td className="p-3 dark:text-gray-300">{e.noteScript}/10</td>
                    <td className="p-3 dark:text-gray-300">{e.noteEcoute}/10</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400 italic text-xs">{e.commentaire || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
