import React from 'react';
import { Layout } from '../../components/Layout';
import { FunnelIcon, Plus } from 'lucide-react';

const pipelineStages = [
  { id: 1, name: 'Nouveau', leads: [
    { id: 1, company: 'Société ABC', contact: 'Jean Dupont', value: '5000€' },
    { id: 2, company: 'Tech Pro', contact: 'Marie Martin', value: '3500€' }
  ]},
  { id: 2, name: 'Qualifié', leads: [
    { id: 3, company: 'Digital Services', contact: 'Pierre Leroy', value: '8000€' },
    { id: 4, company: 'Solutions Alpha', contact: 'Sophie Bernard', value: '4500€' }
  ]},
  { id: 3, name: 'Proposition', leads: [
    { id: 5, company: 'Innovate Corp', contact: 'Luc Moreau', value: '12000€' }
  ]},
  { id: 4, name: 'Négociation', leads: [
    { id: 6, company: 'Commerce Plus', contact: 'Emma Dubois', value: '7500€' }
  ]},
  { id: 5, name: 'Converti', leads: [
    { id: 7, company: 'Industries Beta', contact: 'Thomas Petit', value: '15000€' },
    { id: 8, company: 'Startup Gamma', contact: 'Julie Roux', value: '6000€' }
  ]}
];

export default function PipelinePage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2>Pipeline CRM</h2>
            <p className="text-muted-foreground mt-1">Suivi du parcours des prospects</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
            Nouveau lead
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {pipelineStages.map((stage) => (
            <div key={stage.id} className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{stage.name}</h3>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {stage.leads.length}
                </span>
              </div>
              <div className="space-y-2">
                {stage.leads.map((lead) => (
                  <div key={lead.id} className="bg-card rounded-lg border border-border p-3 hover:shadow-md transition-shadow cursor-pointer">
                    <p className="font-medium text-foreground text-sm">{lead.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">{lead.contact}</p>
                    <p className="text-sm font-medium text-primary mt-2">{lead.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
