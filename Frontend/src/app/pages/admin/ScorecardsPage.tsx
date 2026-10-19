import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { adminService } from '../../../services/adminService';
import { 
  Trophy, TrendingUp, TrendingDown, AlertCircle, 
  Play, Award, ChevronUp, ChevronDown, Search
} from 'lucide-react';

interface ScorecardAgent {
  rang: number;
  agentId: number;
  agentNom: string;
  scoreGlobal: number;
  appels: number;
  conversions: number;
  qualite: number;
  aRevoir: number;
  tendance: string;
}

interface AgentSuivi {
  agentId: number;
  agentNom: string;
  score: number;
  appelsAVerifier: number;
  tendance: string;
}

export default function ScorecardsPage() {
  const [agents, setAgents] = useState<ScorecardAgent[]>([]);
  const [agentsSuivi, setAgentsSuivi] = useState<AgentSuivi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [scorecardsRes, suiviRes] = await Promise.all([
          adminService.getScorecards(),
          adminService.getAgentsSuivi()
        ]);
        setAgents(scorecardsRes.data);
        setAgentsSuivi(suiviRes.data);
      } catch (error) {
        console.error('Erreur chargement scorecards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTendanceIcon = (tendance: string) => {
    if (tendance === 'up') return <ChevronUp className="w-4 h-4 text-green-500" />;
    if (tendance === 'down') return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const getTendanceText = (tendance: string) => {
    if (tendance === 'up') return 'En hausse';
    if (tendance === 'down') return 'En baisse';
    return 'Stable';
  };

  const getMedal = (rang: number) => {
    if (rang === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rang === 2) return <Award className="w-6 h-6 text-gray-400" />;
    if (rang === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-500">#{rang}</span>;
  };

  const filteredAgents = agents.filter(agent =>
    agent.agentNom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const top3 = filteredAgents.slice(0, 3);
  const rest = filteredAgents.slice(3);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scorecards Agents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Classement et évaluation des performances</p>
        </div>

        {/* Top 3 Agents */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((agent) => (
              <div
                key={agent.agentId}
                className={`rounded-xl p-6 text-center text-white ${
                  agent.rang === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  agent.rang === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                  'bg-gradient-to-r from-amber-600 to-amber-700'
                }`}
              >
                <div className="flex justify-center mb-3">{getMedal(agent.rang)}</div>
                <h3 className="text-xl font-semibold">{agent.agentNom}</h3>
                <p className="text-3xl font-bold mt-2">{agent.scoreGlobal}/100</p>
                <div className="flex justify-center items-center gap-1 mt-2">
                  {getTendanceIcon(agent.tendance)}
                  <span className="text-sm opacity-90">{getTendanceText(agent.tendance)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Classement détaillé */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Classement détaillé</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Rang</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Agent</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Score</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Appels</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Qualité</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">À revoir</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">Tendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.agentId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getMedal(agent.rang)}
                        <span className="text-gray-900 dark:text-white">#{agent.rang}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{agent.agentNom}</td>
                    <td className="p-4">
                      <span className="text-lg font-bold text-primary">{agent.scoreGlobal}</span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{agent.appels}</td>
                    <td className="p-4 text-green-600 dark:text-green-400">{agent.conversions}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${agent.qualite}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{agent.qualite}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {agent.aRevoir > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="w-3 h-3" />
                          {agent.aRevoir}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {getTendanceIcon(agent.tendance)}
                        <span className={`text-sm ${
                          agent.tendance === 'up' ? 'text-green-600' : 
                          agent.tendance === 'down' ? 'text-red-600' : 
                          'text-gray-500'
                        }`}>
                          {getTendanceText(agent.tendance)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agents nécessitant un suivi */}
        {agentsSuivi.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Agents nécessitant un suivi</h2>
            </div>
            <div className="p-6 space-y-4">
              {agentsSuivi.map((agent) => (
                <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{agent.agentNom}</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Score: {agent.score}
                      </span>
                    </div>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Vérifier {agent.appelsAVerifier} appel(s) récent(s)</li>
                      <li>• Suivre la tendance: {agent.tendance === 'down' ? 'à la baisse' : 'stable'}</li>
                    </ul>
                  </div>
                  <button className="ml-4 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Écouter les appels
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}