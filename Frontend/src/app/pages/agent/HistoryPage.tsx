import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { agentService } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import { Search, Phone, TrendingUp, Clock, Calendar } from 'lucide-react';

interface HistoriqueAppel {
  id: number;
  dateHeure: string;
  societe: string;
  contact: string;
  duree: string;
  resultat: string;
  score: number;
  qualification: string;
}

interface HistoriqueStats {
  totalAppels: number;
  dureeMoyenne: string;
  scoreMoyen: number;
  appels: HistoriqueAppel[];
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HistoriqueStats | null>(null);
  const [filtre, setFiltre] = useState('Tous les résultats');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    const fetchHistorique = async () => {
      try {
        setLoading(true);
        const data = await agentService.getHistorique(user?.id || 1, filtre, recherche);
        console.log('Historique chargé:', data);
        setStats(data);
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchHistorique();
    }
  }, [user, filtre, recherche]);

  const getResultatBadge = (resultat: string) => {
    switch (resultat) {
      case 'Converti':
      case 'RENDEZ_VOUS':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-600/10 text-green-600">Converti</span>;
      case 'Rappel':
      case 'RAPPEL':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-600/10 text-yellow-600">Rappel</span>;
      case 'Refusé':
      case 'REFUS_PAS_INTERESSE':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-600/10 text-red-600">Refusé</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-600/10 text-gray-600">{resultat}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterOptions = ['Tous les résultats', 'Converti', 'Rappel', 'Refusé', 'NRP'];

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
          <h2 className="text-2xl font-bold">Historique de mes appels</h2>
          <p className="text-muted-foreground mt-1">Consultez tous vos appels passés et leurs résultats</p>
        </div>

        {/* Cartes KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Total appels</h3>
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-medium text-foreground">{stats?.totalAppels || 0}</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Durée moyenne</h3>
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-medium text-foreground">{stats?.dureeMoyenne || '0:00'}</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Score moyen</h3>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-medium text-foreground">{stats?.scoreMoyen || 0}</p>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par société ou contact..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {filterOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Tableau des appels */}
        {!stats?.appels || stats.appels.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Aucun appel trouvé</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Société</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Contact</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Durée</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Résultat</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.appels.map((appel) => (
                    <tr key={appel.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(appel.dateHeure)}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-foreground">{appel.societe}</td>
                      <td className="p-4 text-foreground">{appel.contact}</td>
                      <td className="p-4 text-foreground">{appel.duree}</td>
                      <td className="p-4">{getResultatBadge(appel.resultat)}</td>
                      <td className="p-4">
                        <span className={`font-medium ${
                          appel.score >= 80 ? 'text-green-600' :
                          appel.score >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {appel.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}