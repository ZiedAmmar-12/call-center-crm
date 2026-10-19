import React, { useEffect, useState } from 'react';
import { Users, ChevronRight, Star } from 'lucide-react';
import AgentDetail from './AgentDetail';

interface Agent {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  actif: boolean;
  isElite: boolean;
}

export default function ListeAgents() {
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedAgent, setSelected]  = useState<Agent | null>(null);

  useEffect(() => {
    fetch('/api/technique/agents', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => { setAgents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (selectedAgent) {
    return <AgentDetail agent={selectedAgent} onBack={() => setSelected(null)} />;
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Liste des Agents</h1>
        <p className="text-gray-500 dark:text-gray-400">Cliquer sur un agent pour voir son historique</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Nom + Prénom', 'Email', 'Téléphone', 'Statut', ''].map(h => (
                <th key={h} className="p-3 text-left text-gray-700 dark:text-gray-300 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr
                key={a.id}
                onClick={() => setSelected(a)}
                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <td className="p-3 font-medium dark:text-white flex items-center gap-2">
                  {a.isElite && <Star size={14} className="text-yellow-500" />}
                  {a.prenom} {a.nom}
                </td>
                <td className="p-3 dark:text-gray-300">{a.email}</td>
                <td className="p-3 dark:text-gray-300">{a.telephone || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.actif
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {a.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <ChevronRight size={16} className="text-gray-400 inline" />
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  Aucun agent trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
