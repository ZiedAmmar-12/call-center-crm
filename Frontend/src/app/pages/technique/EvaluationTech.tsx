import React, { useEffect, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface EvalItem {
  id: number;
  agentId: number;
  agentNom: string;
  date: string;
  noteGlobale: number;
  notePitch: number;
  commentaire?: string;
}

export default function EvaluationTech() {
  const [evals,   setEvals]   = useState<EvalItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const size = 20;

  const token = () => localStorage.getItem('token');

  useEffect(() => { fetchEvals(); }, [page]);

  const fetchEvals = () => {
    setLoading(true);
    fetch(`/api/technique/evaluations?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        setEvals(d.evaluations || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const totalPages = Math.ceil(total / size);

  const noteColor = (n: number) =>
    n >= 8 ? 'text-green-600 dark:text-green-400'
    : n >= 6 ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Évaluation</h1>
        <p className="text-gray-500 dark:text-gray-400">Historique des évaluations agents</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold dark:text-white">
            <Star size={16} className="text-yellow-500" />
            {total} évaluation{total !== 1 ? 's' : ''} au total
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Agent', 'Date', 'Note globale', 'Pitch', 'Commentaire'].map(h => (
                    <th key={h} className="p-3 text-left text-gray-600 dark:text-gray-300 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evals.map(e => (
                  <tr key={e.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="p-3 font-medium dark:text-white">{e.agentNom}</td>
                    <td className="p-3 dark:text-gray-300">{e.date}</td>
                    <td className="p-3">
                      <span className={`font-bold ${noteColor(e.noteGlobale)}`}>{e.noteGlobale}/10</span>
                    </td>
                    <td className="p-3 dark:text-gray-300">{e.notePitch}/10</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400 italic text-xs">{e.commentaire || '—'}</td>
                  </tr>
                ))}
                {evals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Aucune évaluation disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={16} className="dark:text-white" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight size={16} className="dark:text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
