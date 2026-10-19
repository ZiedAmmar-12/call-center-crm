import React from 'react';
import { Layout } from '../../components/Layout';
import { Download, FileText, Calendar } from 'lucide-react';

export default function ReportsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>Rapports & Exports</h2>
          <p className="text-muted-foreground mt-1">Générez et téléchargez vos rapports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: 'Rapport quotidien', desc: 'Activité du jour', icon: FileText },
            { title: 'Rapport hebdomadaire', desc: 'Synthèse de la semaine', icon: Calendar },
            { title: 'Rapport mensuel', desc: 'Performance du mois', icon: Calendar }
          ].map((report, index) => (
            <div key={index} className="bg-card rounded-lg border border-border p-6">
              <report.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="mb-2">{report.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{report.desc}</p>
              <button
                disabled
                title="Fonctionnalité en cours de finalisation"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed opacity-60"
              >
                <Download className="w-4 h-4" />
                Bientôt disponible
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
