import React, { useState, useMemo } from 'react'
import type { LeadsHook } from '../../../../hooks/useLeads'
import type { CampaignContact, QualificationType } from '../../../../types/leads'
import { Badge, QualBadge, StatCard } from '../../../../components/ui'
 
type TabQualificationsProps = Pick<LeadsHook,
  | 'campaigns'
  | 'qualifications'
  | 'getContactsForCampaign'
>
 
// ── Qualification history panel ───────────────────────────────────────────────
// Mock history — in production comes from GET /api/contacts/{id}/qualification-logs
 
function QualHistory({ contact, qualifications, onClose }: {
  contact: CampaignContact
  qualifications: QualificationType[]
  onClose: () => void
}) {
  const find = (id: number | null) => qualifications.find(q => q.id === id)
 
  // Mock log entries — replace with real data from API
  const mockLogs = [
    { at: '10/04 14:32', from: 3, to: contact.qualificationId ?? 1, by: 'Ahmed B.' },
    { at: '10/04 09:15', from: null, to: 3, by: 'Ahmed B.' },
  ]
 
  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">Historique — {contact.companyName}</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      {mockLogs.map((log, i) => {
        const fromQual = find(log.from)
        const toQual   = find(log.to)
        return (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-border last:border-b-0 text-xs">
            <span className="text-muted-foreground min-w-[80px]">{log.at}</span>
            {fromQual && (
              <>
                <span className="line-through text-muted-foreground">{fromQual.label}</span>
                <span className="text-muted-foreground">→</span>
              </>
            )}
            {toQual && <QualBadge qual={toQual} />}
            <span className="text-muted-foreground ml-auto">par {log.by}</span>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground mt-2">Visible admin + superviseur uniquement</p>
    </div>
  )
}
 
// ── Contact row ───────────────────────────────────────────────────────────────
 
function ContactRow({ contact, qualifications }: {
  contact: CampaignContact
  qualifications: QualificationType[]
}) {
  const [showHistory, setShowHistory] = useState(false)
  const qual = qualifications.find(q => q.id === contact.qualificationId)
 
  return (
    <>
      <div
        className="grid items-center gap-2 px-3 py-2.5 border-b border-border text-xs hover:bg-muted/30 transition-colors"
        style={{ gridTemplateColumns: '1fr 120px 90px 110px 80px' }}
      >
        <div>
          <p className="font-medium">{contact.companyName}</p>
          <p className="font-mono text-muted-foreground mt-0.5">{contact.phone}</p>
        </div>
        {qual ? <QualBadge qual={qual} /> : <span className="text-muted-foreground">—</span>}
        {/* In production: map assignedAgentId to agent name */}
        <span className="text-muted-foreground">Ahmed B.</span>
        <span className="text-muted-foreground">
          {contact.qualifiedAt
            ? new Date(contact.qualifiedAt).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
            : '—'
          }
        </span>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
        >
          Historique
        </button>
      </div>
      {showHistory && (
        <div className="px-3 pb-2 border-b border-border">
          <QualHistory
            contact={contact}
            qualifications={qualifications}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}
    </>
  )
}
 
// ── Qual pills (campaign config) ──────────────────────────────────────────────
 
function QualPills({ all, active, onToggle }: {
  all: QualificationType[]
  active: number[]
  onToggle: (id: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {all.map(q => {
        const isActive = active.includes(q.id)
        return (
          <button
            key={q.id}
            onClick={() => onToggle(q.id)}
            className={`
              px-2.5 py-1 rounded-full text-xs border transition-colors
              ${isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
              }
            `}
          >
            {q.label}
          </button>
        )
      })}
    </div>
  )
}
 
// ── Main export ───────────────────────────────────────────────────────────────
 
export function TabQualifications({
  campaigns, qualifications, getContactsForCampaign,
}: TabQualificationsProps) {
  // Filter state — local, never goes into the hook
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(campaigns[0]?.id ?? 0)
  const [selectedQualId,     setSelectedQualId]     = useState<number | null>(null)
  const [selectedDate,       setSelectedDate]       = useState('')
 
  // Which qualifications are "active" for this campaign (used by the pills section)
  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId)
  const [activeQualIds, setActiveQualIds] = useState<number[]>(
    currentCampaign?.qualificationIds ?? []
  )
  const toggleQualActive = (id: number) => {
    setActiveQualIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
 
  // Filtered contacts
  const allContacts = getContactsForCampaign(selectedCampaignId)
  const filtered = useMemo(() => {
    return allContacts.filter(c => {
      if (selectedQualId && c.qualificationId !== selectedQualId) return false
      if (selectedDate && c.qualifiedAt && !c.qualifiedAt.startsWith(selectedDate)) return false
      return true
    })
  }, [allContacts, selectedQualId, selectedDate])
 
  // Stats
  const rdvCount    = allContacts.filter(c => c.qualificationId === 1 || c.qualificationId === 2).length
  const rappelCount = allContacts.filter(c => c.qualificationId === 3).length
  const refusCount  = allContacts.filter(c => c.qualificationId === 4).length
 
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 260px' }}>
 
      {/* ── Left: table ── */}
      <div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard value={rdvCount}    label="RDV pris"  valueColor="text-green-600" />
          <StatCard value={rappelCount} label="Rappels"   valueColor="text-amber-600" />
          <StatCard value={refusCount}  label="Refus"     valueColor="text-red-600"   />
        </div>
 
        <div className="border border-border rounded-xl overflow-hidden">
          <div
            className="grid gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/20 border-b border-border"
            style={{ gridTemplateColumns: '1fr 120px 90px 110px 80px' }}
          >
            <span>Contact</span>
            <span>Qualification</span>
            <span>Agent</span>
            <span>Date</span>
            <span></span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Aucun contact pour ces filtres.</p>
          ) : (
            filtered.map(c => (
              <ContactRow key={c.id} contact={c} qualifications={qualifications} />
            ))
          )}
        </div>
      </div>
 
      {/* ── Right: filters + qual management ── */}
      <div className="space-y-3">
        <div className="border border-border rounded-xl p-4">
          <p className="text-xs font-medium mb-3">Filtres</p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Campagne</label>
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs border border-input rounded bg-background"
              >
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Qualification</label>
              <select
                value={selectedQualId ?? ''}
                onChange={e => setSelectedQualId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-xs border border-input rounded bg-background"
              >
                <option value="">Toutes</option>
                {qualifications.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-input rounded bg-background"
              />
            </div>
            <button className="w-full py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">
              Filtrer
            </button>
            <button className="w-full py-1.5 text-xs border border-border rounded hover:bg-muted">
              Export CSV / Excel
            </button>
          </div>
        </div>
 
        <div className="border border-border rounded-xl p-4">
          <p className="text-xs font-medium mb-2">Qualifications actives — cette campagne</p>
          <QualPills
            all={qualifications}
            active={activeQualIds}
            onToggle={toggleQualActive}
          />
          <button className="w-full mt-3 py-1.5 text-xs border border-border rounded hover:bg-muted">
            Gérer les qualifications
          </button>
        </div>
      </div>
    </div>
  )
}