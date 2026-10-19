import React from 'react';
import { Layout } from '../../components/Layout';
import { User, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const performanceData = [
  { date: '01/04', score: 85 },
  { date: '02/04', score: 87 },
  { date: '03/04', score: 89 },
  { date: '04/04', score: 92 }
];

export default function AgentStatsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>Statistiques Agents</h2>
          <p className="text-muted-foreground mt-1">Vue détaillée des performances individuelles</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="mb-4">Évolution du score - Sarah Martin</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
