import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, XCircle, Star, Search } from 'lucide-react';

interface AgentEvaluation {
  agentId: number;
  agentNom: string;
  brut: number;
  confirme: number;
  annule: number;
  porte: number;
  pasSigne: number;
  signe: number;
  r2: number;
  pasInteresse: number;
  scoreGlobal: number;
}

export default function EvaluationAgents() {
  const [agents, setAgents] = useState<AgentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentEvaluation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('scoreGlobal');

  useEffect(() => { fetchEvaluation(); }, []);

  const fetchEvaluation = async () => {
    try {
      const res = await fetch('/api/confirmation1/agents/evaluation', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAgents(await res.json());
    } catch (e) { console.error('Erreur:', e); }
    finally { setLoading(false); }
  };

  const filtered = agents
    .filter(a => a.agentNom.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'scoreGlobal') return b.scoreGlobal - a.scoreGlobal;
      if (sortBy === 'brut')        return b.brut - a.brut;
      if (sortBy === 'confirme')    return b.confirme - a.confirme;
      return 0;
    });

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : 'text-red-500';

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Évaluation des Agents</h1>
        <p className="text-gray-500 dark:text-gray-400">Performances et statistiques par agent</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users size={20}/>, color:'text-blue-500',   label:'Total Agents',     value: agents.length },
          { icon: <CheckCircle size={20}/>, color:'text-green-500', label:'Total Confirmés', value: agents.reduce((s,a)=>s+a.confirme,0) },
          { icon: <XCircle size={20}/>, color:'text-red-500',   label:'Total Annulés',   value: agents.reduce((s,a)=>s+a.annule,0) },
          { icon: <Star size={20}/>, color:'text-purple-500',label:'Score Moyen',
            value: agents.length ? Math.round(agents.reduce((s,a)=>s+a.scoreGlobal,0)/agents.length)+'/100' : '0/100' },
        ].map(({ icon, color, label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700">
            <div className={`flex items-center gap-2 ${color} mb-2`}>
              {icon}
              <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <div className="text-2xl font-bold dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Recherche / tri */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un agent..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary
                       dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary
                     dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="scoreGlobal">Trier par Score Global</option>
          <option value="brut">Trier par Brut</option>
          <option value="confirme">Trier par Confirmés</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                {['Agent','Brut','Confirmé','Annulé','Porte','Pas Signé','Signé','R2','Pas Intéressé','Score'].map(h => (
                  <th key={h} className="p-3 text-left first:text-left text-center first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr
                  key={a.agentId}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedAgent(a)}
                >
                  <td className="p-3 font-medium dark:text-white">{a.agentNom}</td>
                  <td className="p-3 text-center dark:text-gray-300">{a.brut}</td>
                  <td className="p-3 text-center text-green-600 dark:text-green-400 font-medium">{a.confirme}</td>
                  <td className="p-3 text-center text-red-600 dark:text-red-400 font-medium">{a.annule}</td>
                  <td className="p-3 text-center dark:text-gray-300">{a.porte}</td>
                  <td className="p-3 text-center text-orange-600 dark:text-orange-400">{a.pasSigne}</td>
                  <td className="p-3 text-center text-blue-600 dark:text-blue-400 font-medium">{a.signe}</td>
                  <td className="p-3 text-center dark:text-gray-300">{a.r2}</td>
                  <td className="p-3 text-center dark:text-gray-300">{a.pasInteresse}</td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${scoreColor(a.scoreGlobal)}`}>{a.scoreGlobal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun agent trouvé</div>
        )}
      </div>

      {/* Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">{selectedAgent.agentNom}</h3>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Brut',          value: selectedAgent.brut,    cls:'bg-gray-50 dark:bg-gray-700' },
                { label:'Taux Conversion', value: selectedAgent.brut ? Math.round(selectedAgent.confirme/selectedAgent.brut*100)+'%' : '0%', cls:'bg-gray-50 dark:bg-gray-700' },
                { label:'Confirmés',     value: selectedAgent.confirme, cls:'bg-green-50 dark:bg-green-900/30', vCls:'text-green-600 dark:text-green-400' },
                { label:'Signés',        value: selectedAgent.signe,   cls:'bg-blue-50  dark:bg-blue-900/30',  vCls:'text-blue-600  dark:text-blue-400'  },
                { label:'Annulés',       value: selectedAgent.annule,  cls:'bg-red-50   dark:bg-red-900/30',   vCls:'text-red-600   dark:text-red-400'   },
                { label:'Score Global',  value: selectedAgent.scoreGlobal, cls:'bg-purple-50 dark:bg-purple-900/30', vCls:`font-extrabold ${scoreColor(selectedAgent.scoreGlobal)}` },
              ].map(({ label, value, cls, vCls='' }) => (
                <div key={label} className={`${cls} p-3 rounded-lg`}>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${vCls} dark:text-white`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-end">
              <button onClick={() => setSelectedAgent(null)} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
