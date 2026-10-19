// ─────────────────────────────────────────────────────────────────────────────
// pages/leads/LeadsPage.tsx
//
// This is the ORCHESTRATOR. It does three things and nothing else:
//   1. Calls the hook to get all data and actions
//   2. Manages which tab is active
//   3. Passes the right slices of data to each tab
//
// It does NOT contain any UI logic itself (no buttons, no forms).
// Think of it as the "wiring diagram" of the feature.
//
// WHY THIS PATTERN?
// If a bug appears in the file tree, you go to TabFichiers.tsx.
// If a bug appears in batch size, you go to TabInjections.tsx.
// If the API changes, you go to useLeads.ts.
// Nothing bleeds into anything else.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { useLeads }           from '../../../hooks/useLeads'
import { TabFichiers }        from './tabs/TabFichiers'
import { TabInjections }      from './tabs/TabInjections'
import { TabRecyclage }       from './tabs/TabRecyclage'
import { TabQualifications }  from './tabs/TabsQualifications'
// The four tabs as a const array.
// `as const` makes TypeScript infer the exact string literals, not just string.
const TABS = ['Fichiers sources', 'Injections', 'Recyclage', 'Qualifications'] as const
type TabLabel = typeof TABS[number]  // = 'Fichiers sources' | 'Injections' | ...

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<TabLabel>('Fichiers sources')
  const leads = useLeads()

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-lg font-medium">Gestion des leads</h1>
          {/* Breadcrumb shows current tab */}
          <p className="text-xs text-muted-foreground mt-0.5">{activeTab}</p>
        </div>
        {/* Only show the upload button when on the Fichiers tab */}
        {activeTab === 'Fichiers sources' && (
          <button
            onClick={() => leads.setInlinePanel({ type: 'upload' })}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            + Uploader un fichier
          </button>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-border mb-5 mt-3">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2.5 text-sm border-b-2 transition-colors mr-1
              ${activeTab === tab
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {/* Only the active tab is rendered. If you need to preserve state across
          tab switches (e.g. scroll position), use display:none instead of
          conditional rendering. For now, conditional rendering is simpler. */}

      {activeTab === 'Fichiers sources' && (
        <TabFichiers
          tree={leads.tree}
          files={leads.files}
          inlinePanel={leads.inlinePanel}
          setInlinePanel={leads.setInlinePanel}
          renameFile={leads.renameFile}
          injectFile={leads.injectFile}
          campaigns={leads.campaigns}
          agents={leads.agents}
          assignLeadFile={leads.assignLeadFile}
        />
      )}

      {activeTab === 'Injections' && (
        <TabInjections
          campaigns={leads.campaigns}
          listsByCampaign={leads.listsByCampaign}
          toggleListActive={leads.toggleListActive}
          updateBatchSize={leads.updateBatchSize}
          updateCampaign={leads.updateCampaign}
        />
      )}

      {activeTab === 'Recyclage' && (
        <TabRecyclage
          recycleItems={leads.recycleItems}
          recycleFile={leads.recycleFile}
        />
      )}

      {activeTab === 'Qualifications' && (
        <TabQualifications
          campaigns={leads.campaigns}
          qualifications={leads.qualifications}
          getContactsForCampaign={leads.getContactsForCampaign}
        />
      )}
    </div>
  )
}