import React from 'react';
import { Layout } from '../../components/Layout';
import { Phone, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const volumeData = [
  { hour: '08:00', appels: 24 },
  { hour: '09:00', appels: 48 },
  { hour: '10:00', appels: 56 },
  { hour: '11:00', appels: 52 },
  { hour: '12:00', appels: 28 },
  { hour: '13:00', appels: 32 },
  { hour: '14:00', appels: 60 },
  { hour: '15:00', appels: 54 },
  { hour: '16:00', appels: 48 },
  { hour: '17:00', appels: 36 }
];

const resultatData = [
  { name: 'Converti', value: 245, color: 'var(--color-success)' },
  { name: 'Rappel', value: 89, color: 'var(--color-warning)' },
  { name: 'Refusé', value: 126, color: 'var(--color-destructive)' }
];

const conversionTrend = [
  { semaine: 'S1', taux: 52.3 },
  { semaine: 'S2', taux: 54.8 },
  { semaine: 'S3', taux: 56.2 },
  { semaine: 'S4', taux: 58.9 }
];

export default function AnalyticsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>Analytique des Appels</h2>
          <p className="text-muted-foreground mt-1">Analyse approfondie des données d'appels</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Total appels</h3>
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-medium text-foreground">460</p>
            <p className="text-sm text-success mt-1">+12% vs hier</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Durée moyenne</h3>
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <p className="text-3xl font-medium text-foreground">5:42</p>
            <p className="text-sm text-muted-foreground mt-1">minutes</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-muted-foreground">Taux conversion</h3>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <p className="text-3xl font-medium text-foreground">58.9%</p>
            <p className="text-sm text-success mt-1">+2.7% ce mois</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4">Volume d'appels par heure</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="appels" fill="var(--color-primary)" name="Appels" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4">Répartition des résultats</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resultatData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2">
            <h3 className="mb-4">Tendance du taux de conversion</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="semaine" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="taux" stroke="var(--color-success)" strokeWidth={3} name="Taux de conversion (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
