import React from 'react';
import { Layout } from '../../components/Layout';
import { Shield, FileText } from 'lucide-react';

export default function GDPRPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2>RGPD & Journal d'Audit</h2>
          <p className="text-muted-foreground mt-1">Conformité et traçabilité</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h3>Gestion des données</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium text-foreground mb-1">Rétention des données</p>
                <p className="text-sm text-muted-foreground">Durée: 2 ans après le dernier contact</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium text-foreground mb-1">Anonymisation automatique</p>
                <p className="text-sm text-success">✓ Activée</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-primary" />
              <h3>Logs d'audit récents</h3>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {[
                { action: 'Export données', user: 'Admin', date: '2026-04-01 14:30' },
                { action: 'Modification config', user: 'Admin', date: '2026-04-01 12:15' },
                { action: 'Suppression lead', user: 'Agent', date: '2026-04-01 10:05' }
              ].map((log, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-foreground text-sm">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{log.user} - {log.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
