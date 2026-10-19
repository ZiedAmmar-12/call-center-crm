import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Statistiques {
  totalRdv: number;
  rdvConfirmes: number;
  rdvAnnules: number;
  rdvNonSignes: number;
  rdvSignes: number;
  r2: number;
  okFinancement: number;
  rdvAReporter: number;
  pose: number;
  statistiquesParJour: { date: string; confirmes: number; annules: number }[];
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function StatistiquesGlobales() {
  const [stats, setStats]           = useState<Statistiques | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selectedPeriod, setPeriod] = useState('mois');

  useEffect(() => { fetchStats(); }, [selectedPeriod]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/confirmation1/statistiques?periode=${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(await res.json());
    } catch (e) { console.error('Erreur:', e); }
    finally { setLoading(false); }
  };

  const pieData = stats ? [
    { name: 'Confirmés',  value: stats.rdvConfirmes  },
    { name: 'Annulés',    value: stats.rdvAnnules    },
    { name: 'Non Signés', value: stats.rdvNonSignes  },
    { name: 'Signés',     value: stats.rdvSignes     },
    { name: 'Reportés',   value: stats.rdvAReporter  },
  ] : [];

  const PERIODS = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois',    label: 'Mois'    },
    { key: 'trimestre', label: 'Trimestre' },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Statistiques Globales</h1>
          <p className="text-gray-500 dark:text-gray-400">Analyse des performances globales</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedPeriod === p.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Calendar size={18}/>, color:'text-blue-500',   label:'Total RDV',
            value: stats?.totalRdv || 0 },
          { icon: <CheckCircle size={18}/>, color:'text-green-500', label:'Taux Conversion',
            value: stats?.totalRdv ? Math.round(stats.rdvConfirmes/stats.totalRdv*100)+'%' : '0%' },
          { icon: <DollarSign size={18}/>, color:'text-purple-500', label:'Taux Signature',
            value: stats?.rdvConfirmes ? Math.round(stats.rdvSignes/stats.rdvConfirmes*100)+'%' : '0%' },
          { icon: <Clock size={18}/>, color:'text-yellow-500', label:'Taux Report',
            value: stats?.totalRdv ? Math.round((stats.rdvAReporter||0)/stats.totalRdv*100)+'%' : '0%' },
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

      {/* Graphiques */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold mb-4 dark:text-white">Évolution des RDV</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.statistiquesParJour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="confirmes" name="Confirmés" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="annules"   name="Annulés"   stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold mb-4 dark:text-white">Répartition des RDV</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => percent > 0 ? `${name}: ${(percent*100).toFixed(0)}%` : ''}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white">Détail par statut</div>
        <table className="w-full text-sm">
          <tbody>
            {[
              { label: 'Rendez-vous confirmés',   val: stats?.rdvConfirmes, cls: 'text-green-600  dark:text-green-400'  },
              { label: 'Rendez-vous annulés',     val: stats?.rdvAnnules,   cls: 'text-red-600    dark:text-red-400'    },
              { label: 'Rendez-vous non signés',  val: stats?.rdvNonSignes, cls: 'text-orange-600 dark:text-orange-400' },
              { label: 'Rendez-vous signés',      val: stats?.rdvSignes,    cls: 'text-blue-600   dark:text-blue-400'   },
              { label: 'Rendez-vous R2',          val: stats?.r2,           cls: 'text-purple-600 dark:text-purple-400' },
              { label: 'OK Financement',          val: stats?.okFinancement,cls: 'text-green-600  dark:text-green-400'  },
              { label: 'Rendez-vous à reporter',  val: stats?.rdvAReporter, cls: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Pose',                    val: stats?.pose,         cls: 'text-gray-600   dark:text-gray-400'   },
            ].map(({ label, val, cls }) => (
              <tr key={label} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="p-3 font-medium dark:text-gray-200">{label}</td>
                <td className={`p-3 text-right font-bold ${cls}`}>{val ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
