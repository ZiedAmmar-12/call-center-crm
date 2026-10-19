// ─────────────────────────────────────────────────────────────────────────────
// pages/leads/tabs/TabInjections.tsx
//
// PATTERN: "controlled inputs"
// When you have an input whose value comes from state (not from the DOM),
// you must provide both value={...} and onChange={...}.
// If you only provide value, React makes the input read-only.
// This is called a "controlled component" and is the React way.
//
// PATTERN: "lifting state up"
// The batch size input lives here, not in the hook, because only this tab
// needs it. If another tab needed it, we'd lift it into the hook.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import type { LeadsHook } from '../../../../hooks/useLeads'
import type { Campaign, CampaignList } from '../../../../types/leads'
import {
  Badge, StatCard, Toggle, ProgressBar,
} from '../../../../components/ui'

type TabInjectionsProps = Pick<LeadsHook,
  | 'campaigns'
  | 'listsByCampaign'
  | 'toggleListActive'
  | 'updateBatchSize'
  | 'updateCampaign'
>

// ── Campaign card header ──────────────────────────────────────────────────────

function CampaignHeader({
  campaign,
  lists,
  open,
  onToggle,
  onPause,
}: {
  campaign: Campaign
  lists: CampaignList[]
  open: boolean
  onToggle: () => void
  onPause: () => void
}) {
  const activeLists   = lists.filter(l => l.isActive)
  const avgProgress   = activeLists.length > 0
    ? Math.round(activeLists.reduce((s, l) => s + l.progressPercent, 0) / activeLists.length)
    : 0
  const totalContacts = lists.reduce((s, l) => s + l.batchSize, 0)

  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${campaign.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
        <div>
          <p className="text-sm font-medium">{campaign.name}</p>
          <p className="text-xs text-muted-foreground">
            {activeLists.length} liste{activeLists.length > 1 ? 's' : ''} active{activeLists.length > 1 ? 's' : ''} · lot en cours : {totalContacts.toLocaleString()} contacts
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-medium">{avgProgress}%</p>
          <ProgressBar percent={avgProgress} />
        </div>
        <Badge color={campaign.status === 'active' ? 'green' : 'amber'}>
          {campaign.status === 'active' ? 'Active' : 'Pausée'}
        </Badge>
        {/* Stop propagation so clicking pause doesn't also toggle the accordion */}
        <button
          onClick={e => { e.stopPropagation(); onPause() }}
          className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors text-destructive border-destructive/40"
        >
          {campaign.status === 'active' ? 'Mettre en pause' : 'Reprendre'}
        </button>
        <span className="text-xs text-muted-foreground">{open ? '▾' : '▸'}</span>
      </div>
    </div>
  )
}

// ── Distribution settings bar ─────────────────────────────────────────────────

function DistributionBar({ campaign, onUpdate }: {
  campaign: Campaign
  onUpdate: (patch: Partial<Campaign>) => void
}) {
  return (
    <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-border bg-muted/10">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Mode distribution</label>
        <select
          value={campaign.distributionMode}
          onChange={e => onUpdate({ distributionMode: e.target.value as Campaign['distributionMode'] })}
          className="px-2 py-1 text-xs border border-input rounded bg-background w-36"
        >
          <option value="round-robin">Round-robin</option>
          <option value="random">Aléatoire</option>
          <option value="performance">Performance</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Quota / agent</label>
        <div className="flex gap-1">
          <input
            type="number"
            min={1}
            value={campaign.quotaPerAgent}
            onChange={e => onUpdate({ quotaPerAgent: Number(e.target.value) })}
            className="px-2 py-1 text-xs border border-input rounded bg-background w-14"
          />
          <select
            value={campaign.quotaUnit}
            onChange={e => onUpdate({ quotaUnit: e.target.value as Campaign['quotaUnit'] })}
            className="px-2 py-1 text-xs border border-input rounded bg-background w-24"
          >
            <option value="per-day">/ jour</option>
            <option value="per-session">/ session</option>
            <option value="total">total</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Agents assignés</label>
        <div className="flex flex-wrap gap-1">
          {/* In production: map assignedAgentIds to agent names from an agents list */}
          <Badge color="blue">Ahmed</Badge>
          <Badge color="blue">Sara</Badge>
          <Badge color="blue">Karim</Badge>
          <button className="text-xs text-muted-foreground hover:text-foreground px-1">
            +{Math.max(0, campaign.assignedAgentIds.length - 3)} agents
          </button>
        </div>
      </div>
    </div>
  )
}

// ── List row ──────────────────────────────────────────────────────────────────

function ListRow({
  list,
  onToggle,
  onBatchSizeChange,
}: {
  list: CampaignList
  onToggle: () => void
  onBatchSizeChange: (size: number) => void
}) {
  // Local state for the batch size input.
  // We keep a local copy so the input feels responsive while typing.
  // On blur, we push the value up to the hook.
  const [localSize, setLocalSize] = useState(list.batchSize)

  return (
    <div
      className={`
        grid items-center gap-2 px-4 py-2.5 border-b border-border text-xs transition-opacity
        ${list.isActive ? '' : 'opacity-60'}
      `}
      style={{ gridTemplateColumns: '28px 1fr 70px 130px 90px 80px' }}
    >
      <Toggle checked={list.isActive} onChange={onToggle} />

      <div>
        <p className={`font-medium ${list.isActive ? '' : 'text-muted-foreground'}`}>
          {list.sourceFileName}
        </p>
        <p className="text-muted-foreground">{list.supplierName}</p>
      </div>

      <span>{list.totalContacts.toLocaleString()}</span>

      <div>
        <ProgressBar
          percent={list.progressPercent}
          color={list.progressPercent > 80 ? 'amber' : 'green'}
        />
        <p className="text-muted-foreground mt-1">
          {list.progressPercent}% · curseur {list.cursor.toLocaleString()}
        </p>
      </div>

      {/* Controlled input: value from state, onChange updates local state,
          onBlur pushes to hook so the hook can recalculate batches */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">X =</span>
        <input
          type="number"
          min={1}
          value={localSize}
          onChange={e => setLocalSize(Number(e.target.value))}
          onBlur={() => onBatchSizeChange(localSize)}
          className="w-16 px-2 py-1 border border-input rounded bg-background text-xs"
        />
      </div>

      <Badge color={list.isActive ? 'green' : 'gray'}>
        {list.isActive ? 'Active' : 'Pausée'}
      </Badge>
    </div>
  )
}

// ── Campaign accordion ────────────────────────────────────────────────────────

function CampaignAccordion({
  campaign,
  lists,
  toggleListActive,
  updateBatchSize,
  updateCampaign,
}: {
  campaign: Campaign
  lists: CampaignList[]
  toggleListActive: TabInjectionsProps['toggleListActive']
  updateBatchSize: TabInjectionsProps['updateBatchSize']
  updateCampaign: TabInjectionsProps['updateCampaign']
}) {
  const [open, setOpen] = useState(campaign.status === 'active')

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3">
      <CampaignHeader
        campaign={campaign}
        lists={lists}
        open={open}
        onToggle={() => setOpen(o => !o)}
        onPause={() => updateCampaign(campaign.id, {
          status: campaign.status === 'active' ? 'paused' : 'active',
        })}
      />

      {open && (
        <>
          <DistributionBar
            campaign={campaign}
            onUpdate={patch => updateCampaign(campaign.id, patch)}
          />

          {/* Table header */}
          <div
            className="grid gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/10 border-b border-border"
            style={{ gridTemplateColumns: '28px 1fr 70px 130px 90px 80px' }}
          >
            <span></span>
            <span>Liste</span>
            <span>Total</span>
            <span>Progression</span>
            <span>Lot X</span>
            <span>Statut</span>
          </div>

          {lists.map(list => (
            <ListRow
              key={list.id}
              list={list}
              onToggle={() => toggleListActive(list.id)}
              onBatchSizeChange={size => updateBatchSize(list.id, size)}
            />
          ))}

          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Lot suivant déclenché automatiquement à 100% du lot en cours
            </p>
            <button className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">
              + Ajouter une liste
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TabInjections({
  campaigns, listsByCampaign, toggleListActive, updateBatchSize, updateCampaign,
}: TabInjectionsProps) {
  const allLists = [...listsByCampaign.values()].flat()
  const totalContacts = allLists.reduce((s, l) => s + l.batchSize, 0)
  const avgProgress = allLists.length > 0
    ? Math.round(allLists.reduce((s, l) => s + l.progressPercent, 0) / allLists.length)
    : 0

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard value={campaigns.filter(c => c.status === 'active').length} label="Campagnes actives" />
        <StatCard value={totalContacts.toLocaleString()} label="Contacts lot en cours" />
        <StatCard value={`${avgProgress}%`} label="Avancement moyen" />
        <StatCard value={allLists.length} label="Listes injectées" />
      </div>

      {campaigns.map(campaign => (
        <CampaignAccordion
          key={campaign.id}
          campaign={campaign}
          lists={listsByCampaign.get(campaign.id) ?? []}
          toggleListActive={toggleListActive}
          updateBatchSize={updateBatchSize}
          updateCampaign={updateCampaign}
        />
      ))}

      <button className="w-full py-2 text-sm border border-dashed border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground">
        + Nouvelle campagne
      </button>
    </div>
  )
}