
// ─────────────────────────────────────────────────────────────────────────────
// pages/leads/tabs/TabRecyclage.tsx
// ─────────────────────────────────────────────────────────────────────────────
 
import React, { useState } from 'react'
import type { LeadsHook } from '../../../../hooks/useLeads'
import type { RecycleRecord } from '../../../../types/leads'
import { Badge, SummaryTable } from '../../../../components/ui'
 
type TabRecyclageProps = Pick<LeadsHook, 'recycleItems' | 'recycleFile'>
 
// ── Recycle card ──────────────────────────────────────────────────────────────
// Each card handles its own "open/closed" state for the inline confirm form.
// This is fine because there's no reason for parent to know about it.
 
function RecycleCard({ item, onRecycle }: {
  item: RecycleRecord
  onRecycle: (id: number, name: string, selectedQualificationIds: number[]) => void
}) {
  const isDone = item.recycledAt !== null
  const defaultName = `${item.originalFileName.replace(/\.[^.]+$/, '')} - recyclée (${new Date().toISOString().slice(0, 10)})`
  const [open, setOpen]   = useState(false)
  const [name, setName]   = useState(defaultName)
  const selectedQualificationIds = item.selectedQualificationIds ?? Object.keys(item.qualificationCounts).map(Number)
 
  return (
    <div className={`border border-border rounded-xl overflow-hidden mb-3 ${isDone ? 'opacity-70' : ''}`}>
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{item.originalFileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.campaignName} · Terminée {item.finishedAt}
            </p>
            <div className="flex gap-2 mt-2">
              {isDone ? (
                <>
                  <Badge color="green">Recyclé le {item.recycledAt}</Badge>
                  <span className="text-xs text-muted-foreground">→ {item.newFileName}</span>
                </>
              ) : (
                <>
                  <Badge color="amber">100% traité</Badge>
                  <span className="text-xs text-muted-foreground">{item.totalContactCount.toLocaleString()} contacts</span>
                </>
              )}
            </div>
          </div>
 
          {isDone ? (
            // Already recycled — just a link back to the tree
            <button className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors">
              Voir dans arborescence
            </button>
          ) : (
            <button
              onClick={() => setOpen(o => !o)}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
            >
              {open ? 'Annuler' : 'Recycler cette liste'}
            </button>
          )}
        </div>
 
        {/* Inline confirm form */}
        {open && !isDone && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="block text-xs text-muted-foreground mb-1">Nom de la liste recyclée</label>
            <div className="flex gap-2 items-center mb-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">auto-généré · modifiable</span>
            </div>
            <SummaryTable rows={[
              { label: 'Nouvelle entrée dans', value: 'Arborescence d\'origine' },
              { label: 'Fichier original',     value: 'Intact — non modifié' },
              { label: 'Prêt pour injection',  value: <Badge color="green">Oui</Badge> },
            ]} />
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={() => { onRecycle(item.id, name, selectedQualificationIds); setOpen(false) }}
                className="px-3 py-1.5 text-xs bg-green-700 text-white rounded hover:bg-green-800"
              >
                Confirmer le recyclage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
 
export function TabRecyclage({ recycleItems, recycleFile }: TabRecyclageProps) {
  const pending = recycleItems.filter(r => !r.recycledAt)
  const done    = recycleItems.filter(r =>  r.recycledAt)
 
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        Les listes à 100% qualifiées peuvent être recyclées et réinjectées dans une nouvelle campagne.
      </p>
 
      {pending.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            En attente de recyclage
          </p>
          {pending.map(item => (
            <RecycleCard key={item.id} item={item} onRecycle={recycleFile} />
          ))}
        </>
      )}
 
      {done.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4">
            Déjà recyclées
          </p>
          {done.map(item => (
            <RecycleCard key={item.id} item={item} onRecycle={recycleFile} />
          ))}
        </>
      )}
    </div>
  )
}