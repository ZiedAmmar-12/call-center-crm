import React from 'react';
import { Layout } from '../../components/Layout';
import { Plug, Check, X } from 'lucide-react';

const integrations = [
  { id: 1, name: 'Telnyx', description: 'Plateforme de téléphonie cloud', status: 'connected', lastSync: '2026-04-01 14:30' },
  { id: 2, name: 'onOff', description: 'Solution de téléphonie d\'entreprise', status: 'connected', lastSync: '2026-04-01 14:25' },
  { id: 3, name: 'Salesforce', description: 'CRM', status: 'disconnected', lastSync: '-' },
  { id: 4, name: 'HubSpot', description: 'Marketing automation', status: 'disconnected', lastSync: '-' }
];

export default function IntegrationsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>Intégrations</h2>
          <p className="text-muted-foreground mt-1">Connectez vos services externes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <div key={integration.id} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plug className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <X className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Statut</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    integration.status === 'connected' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {integration.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dernière sync</span>
                  <span className="text-foreground">{integration.lastSync}</span>
                </div>
              </div>

              <button className={`w-full px-4 py-2 rounded-lg transition-opacity ${
                integration.status === 'connected'
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}>
                {integration.status === 'connected' ? 'Déconnecter' : 'Connecter'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
