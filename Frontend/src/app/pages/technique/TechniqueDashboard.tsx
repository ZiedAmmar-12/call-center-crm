import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Users, FileText, ClipboardCheck, Clock,
  Shield, Calendar, Star, TrendingUp, AlertCircle
} from 'lucide-react';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

interface DashboardData {
  agentsTotal: number;
  fichiersTotal: number;
  evalTotal: number;
  pointagesAujourd: number;
  evalsRecentes: { agentNom: string; noteGlobale: number; date: string }[];
}

const noteColor = (n: number) =>
  n >= 8 ? 'text-emerald-500' : n >= 6 ? 'text-amber-500' : 'text-red-500';

const quickLinks = [
  { to: '/technique/agents',     icon: Users,         label: 'Liste des Agents',   color: 'bg-blue-500' },
  { to: '/technique/fichiers',   icon: FileText,      label: 'Fichier des contacts', color: 'bg-purple-500' },
  { to: '/technique/pointage',   icon: Clock,         label: 'Pointage',           color: 'bg-orange-500' },
  { to: '/technique/acces',      icon: Shield,        label: 'Gérer accès',        color: 'bg-red-500' },
  { to: '/technique/calendrier', icon: Calendar,      label: 'Compte calendrier',  color: 'bg-teal-500' },
  { to: '/technique/evaluation', icon: Star,          label: 'Évaluation',         color: 'bg-yellow-500' },
];

export default function TechniqueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/technique/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Service Technique</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Vue d'ensemble — infrastructure & supervision
        </p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 animate-pulse h-24 border border-gray-100 dark:border-gray-700" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
          <AlertCircle size={18} />
          <span className="text-sm">Erreur de chargement : {error}</span>
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Agents actifs',     value: data.agentsTotal,      icon: Users,          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'Fichiers importés', value: data.fichiersTotal,    icon: FileText,       color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Évaluations',       value: data.evalTotal,        icon: ClipboardCheck, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
            { label: "Pointages aujourd'hui", value: data.pointagesAujourd, icon: Clock,      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <span className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon size={16} />
                </span>
              </div>
              <p className="text-3xl font-bold dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Accès rapide */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Accès rapide
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {quickLinks.map(q => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group"
              >
                <span className={`${q.color} p-2 rounded-lg text-white flex-shrink-0`}>
                  <q.icon size={14} />
                </span>
                <span className="text-sm font-medium dark:text-white group-hover:text-primary transition-colors truncate">
                  {q.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Évaluations récentes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            Évaluations récentes
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Chargement...</div>
          ) : !data?.evalsRecentes?.length ? (
            <div className="p-6 text-center text-gray-400 text-sm">Aucune évaluation</div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {data.evalsRecentes.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm dark:text-white">{e.agentNom}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.date}</p>
                  </div>
                  <span className={`text-lg font-bold ${noteColor(e.noteGlobale)}`}>
                    {e.noteGlobale}/10
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t dark:border-gray-700">
            <Link
              to="/technique/evaluation"
              className="text-xs text-primary hover:underline"
            >
              Voir toutes les évaluations →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
