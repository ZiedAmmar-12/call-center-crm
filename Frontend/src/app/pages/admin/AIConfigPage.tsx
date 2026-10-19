import React from 'react';
import { Layout } from '../../components/Layout';
import { Settings, Save } from 'lucide-react';

export default function AIConfigPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>Configuration IA</h2>
          <p className="text-muted-foreground mt-1">Paramètres d'analyse et de scoring IA</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4">Pondération du score</h3>
            <div className="space-y-4">
              {[
                { label: 'Écoute active', value: 20 },
                { label: 'Persuasion', value: 20 },
                { label: 'Empathie', value: 15 },
                { label: 'Argumentation', value: 15 },
                { label: 'Gestion objections', value: 15 },
                { label: 'Closing', value: 15 }
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-foreground">{item.label}</label>
                    <span className="text-sm font-medium text-primary">{item.value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={item.value}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="mb-4">Seuils d'alerte</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-foreground">Score minimum acceptable</label>
                  <input type="number" defaultValue={70} className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-foreground">Durée d'inactivité max (min)</label>
                  <input type="number" defaultValue={15} className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-foreground">Taux de conversion minimum (%)</label>
                  <input type="number" defaultValue={40} className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="mb-4">Analyse de sentiment</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-foreground">Activer l'analyse en temps réel</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-foreground">Alertes sentiment négatif</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-foreground">Suggestions automatiques</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Save className="w-5 h-5" />
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </Layout>
  );
}
