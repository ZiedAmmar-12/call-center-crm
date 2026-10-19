/**
 * Pointage — Service Technique
 * Affiche le pointage des agents via l'endpoint admin (réutilise la même logique).
 */
import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Clock, Coffee, LogIn, AlertCircle } from 'lucide-react';

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

const statutBadge = (statut: string) => {
  switch (statut) {
    case 'En activité': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'En pause':    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:            return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

const statutDot = (statut: string) => {
  switch (statut) {
    case 'En activité': return 'bg-emerald-500 animate-pulse';
    case 'En pause':    return 'bg-amber-500 animate-pulse';
    default:            return 'bg-slate-400';
  }
};

export default function Pointage() {
  const [pointage, setPointage] = useState<PointageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/technique/pointage?date=${date}`)
      .then(r => { setPointage(r.data); setLoading(false); })
      .catch(e => { setError(e.message || 'Erreur de chargement'); setLoading(false); });
  }, [date]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Pointage EBI</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Suivi des heures d'activité des agents</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Date :</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      ) : pointage && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: LogIn,  label: 'Présents',    value: `${pointage.presents}/${pointage.totalAgents}`, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
              { icon: Clock,  label: 'Retards',     value: pointage.retards,        color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
              { icon: Clock,  label: 'Temps moyen', value: pointage.tempsMoyen,     color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
              { icon: Coffee, label: 'Pauses moy.', value: pointage.pausesMoyennes, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <span className={`p-1.5 rounded-lg ${s.color}`}><s.icon size={14} /></span>
                </div>
                <p className="text-xl font-bold dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table détail */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Détail par agent
              <span className="ml-auto text-xs text-gray-400 font-normal">
                Début: {pointage.heureDebutTravail} — Fin: {pointage.heureFinTravail} — Tolérance: {pointage.toleranceMinutes} min
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    {['Agent', 'Statut', 'Arrivée', 'Départ', 'Pauses', 'Temps productif', 'Retard'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {pointage.details.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun pointage pour cette date</td></tr>
                  ) : (
                    pointage.details.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3 font-medium dark:text-white">{d.agentNom}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statutBadge(d.statut)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statutDot(d.statut)}`} />
                            {d.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3 dark:text-gray-300">{d.arrivee}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{d.depart}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{d.pauses}</td>
                        <td className="px-4 py-3 dark:text-gray-300">{d.tempsProductif}</td>
                        <td className="px-4 py-3">
                          {d.estEnRetard ? (
                            <span className="text-red-500 font-medium">{d.retardMinutes} min</span>
                          ) : (
                            <span className="text-emerald-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
