import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import api from '../../../services/api';
import { Clock, Coffee, LogIn, Calendar, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PointageDetail {
  agentNom: string;
  arrivee: string;
  depart: string;
  pauses: string;
  tempsProductif: string;
  statut: string;
  retardMinutes: number;
  estEnRetard: boolean;
  penaliteSalaire: number;
}

interface PointageData {
  presents: number;
  totalAgents: number;
  retards: number;
  tempsMoyen: string;
  pausesMoyennes: string;
  heureDebutTravail: string;
  heureFinTravail: string;
  toleranceMinutes: number;
  details: PointageDetail[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusBadge = (statut: string) => {
  switch (statut) {
    case 'En activité': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'En pause':    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:            return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

const statusDot = (statut: string) => {
  switch (statut) {
    case 'En activité': return 'bg-emerald-500 animate-pulse';
    case 'En pause':    return 'bg-amber-500 animate-pulse';
    default:            return 'bg-slate-400';
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PointagePage() {
  const [pointage, setPointage] = useState<PointageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/attendance/admin/daily?date=${selectedDate}`);
        const d = response.data;
        setPointage({
          presents: d.presents,
          totalAgents: d.totalAgents,
          retards: d.retards,
          tempsMoyen: d.tempsMoyen,
          pausesMoyennes: d.pausesMoyennes,
          heureDebutTravail: d.heureDebutTravail ?? '08:00',
          heureFinTravail: d.heureFinTravail ?? '20:00',
          toleranceMinutes: d.toleranceMinutes ?? 10,
          details: (d.details ?? []).map((x: any) => ({
            agentNom: x.agentNom,
            arrivee: x.arrivee,
            depart: x.depart,
            pauses: x.pauses,
            tempsProductif: x.tempsProductif,
            statut: x.statut,
            retardMinutes: x.retardMinutes ?? 0,
            estEnRetard: x.estEnRetard ?? false,
            penaliteSalaire: x.penaliteSalaire ?? 0,
          })),
        });
      } catch (err) {
        console.error('Erreur chargement pointage:', err);
        setError('Impossible de charger les données de pointage. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    </Layout>
  );

  const retardAgents = pointage?.details.filter(d => d.estEnRetard) ?? [];
  const totalPenalites = retardAgents.reduce((s, d) => s + d.penaliteSalaire, 0);

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapport de Pointage</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Suivi de la présence et du temps de travail</p>
          </div>
          {pointage && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-sm">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-blue-700 dark:text-blue-300">
                Horaires : <strong>{pointage.heureDebutTravail}</strong> → <strong>{pointage.heureFinTravail}</strong>
                <span className="ml-2 text-blue-500">(tolérance {pointage.toleranceMinutes}min)</span>
              </span>
            </div>
          )}
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Présents</h3>
              <LogIn className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {pointage?.presents ?? 0}
              <span className="text-sm font-normal text-gray-400">/{pointage?.totalAgents ?? 0}</span>
            </p>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 ${(pointage?.retards ?? 0) > 0 ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Retards</h3>
              <AlertTriangle className={`w-4 h-4 ${(pointage?.retards ?? 0) > 0 ? 'text-red-500' : 'text-gray-300'}`} />
            </div>
            <p className={`text-2xl font-bold ${(pointage?.retards ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {pointage?.retards ?? 0}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Temps moyen</h3>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pointage?.tempsMoyen ?? '--'}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pauses moy.</h3>
              <Coffee className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pointage?.pausesMoyennes ?? '--'}</p>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 ${totalPenalites > 0 ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pénalités</h3>
              <AlertTriangle className={`w-4 h-4 ${totalPenalites > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            </div>
            <p className={`text-2xl font-bold ${totalPenalites > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
              {totalPenalites > 0 ? `${totalPenalites.toFixed(0)} TND` : '--'}
            </p>
          </div>

        </div>

        {/* Retard alert banner */}
        {retardAgents.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-red-700 dark:text-red-400 text-sm">
                {retardAgents.length} agent{retardAgents.length > 1 ? 's' : ''} en retard · pénalités cumulées : {totalPenalites.toFixed(0)} TND
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {retardAgents.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-3 py-1 text-xs font-medium">
                  {d.agentNom}
                  <span className="bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">+{d.retardMinutes}min</span>
                  <span className="text-red-500 text-[10px]">-{d.penaliteSalaire.toFixed(0)} TND</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Detail table */}
        {!pointage || pointage.details.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
            Aucun pointage enregistré pour cette date
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Détail du {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Agent', 'Arrivée', 'Retard', 'Départ', 'Pauses', 'Productif', 'Pénalité', 'Statut'].map(h => (
                      <th key={h} className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pointage.details.map((detail, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${detail.estEnRetard ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>

                      {/* Agent */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 dark:text-white">{detail.agentNom}</span>
                          {detail.estEnRetard && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        </div>
                      </td>

                      {/* Arrivée */}
                      <td className="p-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                        {detail.arrivee}
                      </td>

                      {/* Retard */}
                      <td className="p-4">
                        {detail.estEnRetard
                          ? <span className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2 py-0.5 text-xs font-bold">+{detail.retardMinutes}min</span>
                          : <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">✓ À l'heure</span>
                        }
                      </td>

                      {/* Départ */}
                      <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-400">{detail.depart}</td>

                      {/* Pauses */}
                      <td className="p-4 text-amber-600 dark:text-amber-400 text-sm max-w-[180px] truncate" title={detail.pauses}>
                        {detail.pauses}
                      </td>

                      {/* Productif */}
                      <td className="p-4 text-blue-600 dark:text-blue-400 font-medium text-sm">{detail.tempsProductif}</td>

                      {/* Pénalité */}
                      <td className="p-4">
                        {detail.penaliteSalaire > 0
                          ? <span className="inline-flex items-center bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full px-2 py-0.5 text-xs font-bold">-{detail.penaliteSalaire.toFixed(0)} TND</span>
                          : <span className="text-gray-400 text-xs">--</span>
                        }
                      </td>

                      {/* Statut */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge(detail.statut)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(detail.statut)}`} />
                          {detail.statut}
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
