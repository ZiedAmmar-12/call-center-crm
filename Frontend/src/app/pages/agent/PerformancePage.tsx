import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { agentService } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  TrendingUp, TrendingDown, Star, Award, 
  Target, Phone, BarChart3, Brain, 
  CheckCircle, AlertCircle, Lightbulb 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface PerformanceData {
  scoreGlobal: number;
  evolutionScore: number;
  tauxConversion: number;
  evolutionConversion: number;
  appelsQualite: number;
  evolutionQualite: number;
  classement: number;
  totalAgents: number;
  evolutionHebdo: { jour: string; appels: number; conversions: number }[];
  competences: { name: string; value: number; fullMark: number }[];
  feedbackIA: { type: string; message: string; suggestion: string }[];
}

export default function PerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceData | null>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        // Récupérer les performances du mois en cours
        const now = new Date();
        const annee = now.getFullYear();
        const mois = now.getMonth() + 1;
        const perf = await agentService.getPerformance(user?.id || 1, annee, mois);
        
        // Données mockées pour l'exemple (à remplacer par les vraies données)
        setData({
          scoreGlobal: 92,
          evolutionScore: 5,
          tauxConversion: 68.5,
          evolutionConversion: 3.2,
          appelsQualite: 87,
          evolutionQualite: 1.5,
          classement: 3,
          totalAgents: 24,
          evolutionHebdo: [
            { jour: 'Lun', appels: 42, conversions: 28 },
            { jour: 'Mar', appels: 48, conversions: 32 },
            { jour: 'Mer', appels: 45, conversions: 30 },
            { jour: 'Jeu', appels: 52, conversions: 35 },
            { jour: 'Ven', appels: 38, conversions: 24 },
          ],
          competences: [
            { name: 'Écoute active', value: 92, fullMark: 100 },
            { name: 'Closing', value: 88, fullMark: 100 },
            { name: 'Persuasion', value: 85, fullMark: 100 },
            { name: 'Gestion objections', value: 78, fullMark: 100 },
            { name: 'Empathie', value: 90, fullMark: 100 },
            { name: 'Argumentation', value: 86, fullMark: 100 },
          ],
          feedbackIA: [
            {
              type: 'success',
              message: 'Excellent travail sur l\'écoute active',
              suggestion: 'Vos temps de silence et vos reformulations sont très bien maîtrisés.'
            },
            {
              type: 'warning',
              message: 'Améliorer la gestion des objections',
              suggestion: 'Prenez plus de temps pour comprendre la vraie raison derrière l\'objection avant de répondre.'
            },
            {
              type: 'info',
              message: 'Astuce : Technique du silence',
              suggestion: 'Après avoir posé une question importante, laissez un silence de 3-5 secondes pour que le client réfléchisse.'
            }
          ]
        });
      } catch (error) {
        console.error('Erreur chargement performance:', error);
        // Données de secours en cas d'erreur
        setData({
          scoreGlobal: 85,
          evolutionScore: 2,
          tauxConversion: 55,
          evolutionConversion: 1,
          appelsQualite: 80,
          evolutionQualite: 0.5,
          classement: 5,
          totalAgents: 24,
          evolutionHebdo: [
            { jour: 'Lun', appels: 35, conversions: 20 },
            { jour: 'Mar', appels: 40, conversions: 25 },
            { jour: 'Mer', appels: 38, conversions: 22 },
            { jour: 'Jeu', appels: 42, conversions: 28 },
            { jour: 'Ven', appels: 36, conversions: 24 },
          ],
          competences: [
            { name: 'Écoute active', value: 85, fullMark: 100 },
            { name: 'Closing', value: 80, fullMark: 100 },
            { name: 'Persuasion', value: 82, fullMark: 100 },
            { name: 'Gestion objections', value: 75, fullMark: 100 },
            { name: 'Empathie', value: 88, fullMark: 100 },
            { name: 'Argumentation', value: 83, fullMark: 100 },
          ],
          feedbackIA: [
            {
              type: 'info',
              message: 'Continuez vos efforts',
              suggestion: 'Consultez les ressources d\'apprentissage pour améliorer vos compétences.'
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchPerformance();
    }
  }, [user]);

  const getEvolutionColor = (evolution: number | undefined) => {
    if (evolution === undefined) return 'text-green-600';
    return evolution >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getEvolutionIcon = (evolution: number | undefined) => {
    if (evolution === undefined) return <TrendingUp className="w-4 h-4" />;
    return evolution >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Ma Performance</h2>
          <p className="text-muted-foreground mt-1">Analyse détaillée de votre performance et suggestions d'amélioration</p>
        </div>

        {/* Cartes KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Score Global</h3>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-medium text-foreground">{data?.scoreGlobal}/100</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${getEvolutionColor(data?.evolutionScore)}`}>
              {getEvolutionIcon(data?.evolutionScore)}
              <span>{(data?.evolutionScore || 0) >= 0 ? '+' : ''}{data?.evolutionScore || 0} vs semaine dernière</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Taux conversion</h3>
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-medium text-foreground">{data?.tauxConversion}%</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${getEvolutionColor(data?.evolutionConversion || 0)}`}>
              {getEvolutionIcon(data?.evolutionConversion || 0)}
              <span>{(data?.evolutionConversion || 0) >= 0 ? '+' : ''}{data?.evolutionConversion || 0}%</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Appels qualité</h3>
              <Phone className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-medium text-foreground">{data?.appelsQualite}%</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${getEvolutionColor(data?.evolutionQualite || 0)}`}>
              {getEvolutionIcon(data?.evolutionQualite || 0)}
              <span>{(data?.evolutionQualite || 0) >= 0 ? '+' : ''}{data?.evolutionQualite || 0}%</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Classement</h3>
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-medium text-foreground">{data?.classement}e</p>
            <p className="text-sm text-muted-foreground mt-2">Sur {data?.totalAgents} agents</p>
          </div>
        </div>

        {/* Évolution du score hebdomadaire */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="mb-4">Évolution du score hebdomadaire</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.evolutionHebdo}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="jour" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="appels" name="Appels" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="conversions" name="Conversions" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Compétences évaluées - Radar Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="mb-4">Compétences évaluées</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data?.competences}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" stroke="var(--color-muted-foreground)" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-muted-foreground)" />
              <Radar name="Score" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback IA & Suggestions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-primary" />
            <h3>Feedback IA & Suggestions</h3>
          </div>
          <div className="space-y-4">
            {data?.feedbackIA.map((feedback, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                feedback.type === 'success' ? 'bg-green-500/10 border-green-500' :
                feedback.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-blue-500/10 border-blue-500'
              }`}>
                <div className="flex items-start gap-3">
                  {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                  {feedback.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                  {feedback.type === 'info' && <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />}
                  <div>
                    <p className="font-medium text-foreground">{feedback.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">{feedback.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}