// ─────────────────────────────────────────────────────────────────────────────
// pages/leads/tabs/TabFichiers.tsx
//
// This is a "smart" component — it receives the full hook and destructures
// only what it needs. It then passes small slices down to child components.
//
// PROPS IN TSX:
// Instead of writing { tree, inlinePanel, setInlinePanel, renameFile, injectFile }
// separately, we import LeadsHook and pick from it. This way if the hook
// changes, TypeScript shows you exactly which component broke and why.
//
// COMPONENT DECOMPOSITION RULE (senior pattern):
//   If a JSX block is > ~40 lines or has its own local state, extract it.
//   If it's just rendering props with no logic, keep it inline.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import type { LeadsHook } from '../../../../hooks/useLeads'
import type { SourceFile, UITreeNode, Country } from '../../../../types/leads'
import { Badge, InlinePanel, SummaryTable, StatusDot } from '../../../../components/ui'

// ── Types local to this file ──────────────────────────────────────────────────
// Only exported if another file needs them (none do here, so no export).

type TabFichiersProps = Pick<LeadsHook,
  | 'tree'
  | 'files'
  | 'inlinePanel'
  | 'setInlinePanel'
  | 'renameFile'
  | 'injectFile'
  | 'campaigns'
  | 'agents'
  | 'assignLeadFile'
>

// ── Global stats bar ──────────────────────────────────────────────────────────

function FileStats({ files }: { files: SourceFile[] }) {
  const total      = files.length
  const contacts   = files.reduce((s, f) => s + f.contactCount, 0)
  const injected   = files.filter(f => f.status === 'injected').length
  const processed  = files.filter(f => f.status === 'processed').length

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[
        { val: total,                             lbl: 'Fichiers sources' },
        { val: contacts.toLocaleString(),          lbl: 'Contacts total'   },
        { val: injected,                           lbl: 'Injectés'         },
        { val: processed,                          lbl: '100% traités'     },
      ].map(({ val, lbl }) => (
        <div key={lbl} className="bg-muted/50 rounded-lg p-3">
          <p className="text-xl font-medium leading-tight">{val}</p>
          <p className="text-xs text-muted-foreground mt-1">{lbl}</p>
        </div>
      ))}
    </div>
  )
}

// ── Inject inline panel ───────────────────────────────────────────────────────

interface InjectPanelProps {
  file: SourceFile
  campaigns: TabFichiersProps['campaigns']
  onConfirm: (campaignId: number, batchSize: number) => void
  onClose: () => void
}

function InjectFilePanel({ file, campaigns, onConfirm, onClose }: InjectPanelProps) {
  // Local state lives here — only relevant while this panel is open.
  // When the panel unmounts, this state is gone. Perfect.
  const [campaignId, setCampaignId] = useState<number | ''>(
    campaigns[0]?.id ?? ''
  )
  const [batchSize, setBatchSize] = useState(100)

  const estimatedBatches = batchSize > 0
    ? Math.ceil(file.contactCount / batchSize)
    : 0

  const handleConfirm = () => {
    if (!campaignId) return
    onConfirm(Number(campaignId), batchSize)
  }

  return (
    <InlinePanel title={`Injecter en campagne — ${file.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Campagne cible</label>
          <select
            value={campaignId}
            onChange={e => setCampaignId(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">— Sélectionner —</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Taille du lot X</label>
          <input
            type="number"
            min={1}
            value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <SummaryTable rows={[
        { label: 'Contacts à injecter',    value: file.contactCount.toLocaleString() },
        { label: `Lots (X = ${batchSize})`, value: `~${estimatedBatches.toLocaleString()} lots` },
        { label: 'Fichier original',        value: <Badge color="green">Intact — copie logique</Badge> },
      ]} />
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!campaignId}
          className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Confirmer l'injection
        </button>
      </div>
    </InlinePanel>
  )
}

// ── Rename inline panel ───────────────────────────────────────────────────────

function RenameFilePanel({ file, onConfirm, onClose }: {
  file: SourceFile
  onConfirm: (newName: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(file.name)
  return (
    <InlinePanel title={`Renommer — ${file.name}`} onClose={onClose}>
      <div className="flex gap-2 items-center">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => onConfirm(name)}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 transition-colors"
        >
          Enregistrer
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          Annuler
        </button>
      </div>
    </InlinePanel>
  )
}

// ── File row ──────────────────────────────────────────────────────────────────

// A single file row + any inline panel it might be showing.
// Keeping this as its own component makes the supplier block much cleaner.

interface FileRowProps {
  file: SourceFile
  inlinePanel: TabFichiersProps['inlinePanel']
  campaigns: TabFichiersProps['campaigns']
  onInject: (fileId: number) => void
  onRename: (fileId: number) => void
  onInjectConfirm: (campaignId: number, batchSize: number) => void
  onRenameConfirm: (newName: string) => void
  onClosePanel: () => void
  onGoRecycle: () => void
}

const STATUS_BADGE_COLOR: Record<SourceFile['status'], string> = {
  original:  'gray',
  injected:  'blue',
  processed: 'amber',
  recycled:  'green',
}
const STATUS_LABEL: Record<SourceFile['status'], string> = {
  original:  'Original',
  injected:  'Injecté',
  processed: '100% traité',
  recycled:  'Recyclé',
}

function FileRow({
  file, inlinePanel, campaigns,
  onInject, onRename, onInjectConfirm, onRenameConfirm, onClosePanel, onGoRecycle,
}: FileRowProps) {
  const isInjectOpen = inlinePanel?.type === 'inject' && inlinePanel.sourceFileId === file.id
  const isRenameOpen = inlinePanel?.type === 'rename' && inlinePanel.sourceFileId === file.id

  return (
    <>
      <div className="grid gap-2 px-3 py-2 border-t border-border text-xs items-center hover:bg-muted/30 transition-colors"
        style={{ gridTemplateColumns: '1fr 80px 68px 90px auto', paddingLeft: '3.5rem' }}
      >
        {/* File name */}
        <div>
          <span className="font-mono text-muted-foreground">{file.name}</span>
          <p className="text-muted-foreground/70 mt-0.5">
            Uploadé {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span>{file.contactCount.toLocaleString()}</span>
        <span className="text-muted-foreground">{file.fileSizeLabel}</span>
        <Badge color={STATUS_BADGE_COLOR[file.status]}>
          {STATUS_LABEL[file.status]}
        </Badge>
        {/* Actions — change based on status */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onRename(file.id)}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-muted transition-colors"
          >
            Renommer
          </button>
          {file.status === 'processed' ? (
            <button
              onClick={onGoRecycle}
              className="px-2 py-1 border border-border rounded text-xs hover:bg-muted transition-colors"
            >
              Recycler →
            </button>
          ) : (
            <button
              onClick={() => onInject(file.id)}
              className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-800 transition-colors"
            >
              Injecter
            </button>
          )}
        </div>
      </div>
      
      {isRenameOpen && (
        <RenameFilePanel
          file={file}
          onConfirm={onRenameConfirm}
          onClose={onClosePanel}
        />
      )}
    </>
  )
}

// ── Supplier accordion ────────────────────────────────────────────────────────

function SupplierBlock({ node, inlinePanel, campaigns, onInject, onRename, onInjectConfirm, onRenameConfirm, onClosePanel, onGoRecycle, agents, onAssign }: {
  node: UITreeNode['types'][0]['suppliers'][0]
  inlinePanel: TabFichiersProps['inlinePanel']
  campaigns: TabFichiersProps['campaigns']
  agents: TabFichiersProps['agents']
  onInject: (fileId: number) => void
  onRename: (fileId: number) => void
  onInjectConfirm: (campaignId: number, batchSize: number) => void
  onRenameConfirm: (newName: string) => void
  onClosePanel: () => void
  onGoRecycle: () => void
  onAssign: (leadFileId: number, agentIds: number[]) => void
}) {
  const [open, setOpen] = useState(true)
  const hasProcessed = node.files.some(f => f.status === 'processed')

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
        style={{ paddingLeft: '2.5rem' }}
      >
        <div className="flex items-center gap-2">
          <StatusDot color={hasProcessed ? 'amber' : 'green'} />
          <span className="text-sm font-medium">{node.supplier.name}</span>
          <span className="text-xs text-muted-foreground">
            {node.files.length} fichier{node.files.length > 1 ? 's' : ''} · {node.files.reduce((s, f) => s + f.contactCount, 0).toLocaleString()} contacts
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          {/* Normal files section — only show if there are files */}
          {node.files.length > 0 && (
            <>
              <div
                className="grid gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/20 border-t border-border"
                style={{ gridTemplateColumns: '1fr 80px 68px 90px auto', paddingLeft: '3.5rem' }}
              >
                <span>Fichier</span>
                <span>Contacts</span>
                <span>Taille</span>
                <span>Statut</span>
                <span>Actions</span>
              </div>
              {node.files.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  inlinePanel={inlinePanel}
                  campaigns={campaigns}
                  onInject={onInject}
                  onRename={onRename}
                  onInjectConfirm={onInjectConfirm}
                  onRenameConfirm={onRenameConfirm}
                  onClosePanel={onClosePanel}
                  onGoRecycle={onGoRecycle}
                />
              ))}
            </>
          )}

         
        </>
      )}
    </div>
  )
}

// ── Type block (B2B / B2C) ────────────────────────────────────────────────────

function TypeBlock({ typeNode, ...rest }: {
  typeNode: UITreeNode['types'][0]
} & Omit<Parameters<typeof SupplierBlock>[0], 'node'>) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
        style={{ paddingLeft: '1.75rem' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{open ? '▾' : '▸'}</span>
          <span>{typeNode.leadType}</span>
          <span className="text-xs font-normal">{typeNode.suppliers.length} fournisseur{typeNode.suppliers.length > 1 ? 's' : ''}</span>
        </div>
      </button>
      {open && typeNode.suppliers.map(s => (
        <SupplierBlock key={s.supplier.id} node={s} {...rest} />
      ))}
    </div>
  )
}

// ── Country block ─────────────────────────────────────────────────────────────

const COUNTRY_FLAG: Record<Country, string> = {
  France:   '🇫🇷',
  Belgique: '🇧🇪',
  Suisse:   '🇨🇭',
}

function CountryBlock({ countryNode, ...rest }: {
  countryNode: UITreeNode
} & Omit<Parameters<typeof TypeBlock>[0], 'typeNode'>) {
  const [open, setOpen] = useState(countryNode.country === 'France')
  const totalFiles = countryNode.types.flatMap(t => t.suppliers.flatMap(s => s.files)).length
  return (
    <div className="border border-border rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>{COUNTRY_FLAG[countryNode.country]}</span>
          <span>{countryNode.country}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{totalFiles} fichiers</span>
          <span className="text-xs text-muted-foreground">{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open && countryNode.types.map(t => (
        <TypeBlock key={t.leadType} typeNode={t} {...rest} />
      ))}
    </div>
  )
}

// ── Upload panel ──────────────────────────────────────────────────────────────

function UploadPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="border border-border rounded-xl p-4 mb-4 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Uploader un fichier</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {['Pays', 'Type', 'Fournisseur'].map(label => (
          <div key={label}>
            <label className="block text-xs text-muted-foreground mb-1">{label}</label>
            <select className="w-full px-2 py-1.5 text-sm border border-input rounded-md bg-background">
              {label === 'Pays'        && <><option>France</option><option>Belgique</option><option>Suisse</option></>}
              {label === 'Type'        && <><option>B2B</option><option>B2C</option></>}
              {label === 'Fournisseur' && <><option>Orange Telecom</option><option>SFR Business</option><option>+ Nouveau</option></>}
            </select>
          </div>
        ))}
      </div>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-3 cursor-pointer hover:border-primary transition-colors">
        <p className="text-sm font-medium">Glisser-déposer ou cliquer</p>
        <p className="text-xs text-muted-foreground mt-1">CSV, XLSX — max 200 MB</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Nom :</label>
          <input placeholder="Auto-généré" className="px-2 py-1 text-xs border border-input rounded bg-background w-44" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted">Annuler</button>
          <button className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">Uploader</button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
// This is what LeadsPage.tsx renders for tab 0.
// It only wires up the callbacks and passes data down. No direct UI rendering here.

export function TabFichiers({
  tree, files, inlinePanel, setInlinePanel, renameFile, injectFile, campaigns, agents, assignLeadFile,
}: TabFichiersProps) {
  // Which file we're currently acting on — stored here, not in the hook,
  // because it's purely a UI concern (which panel is open for which file).
  // setInlinePanel in the hook handles the global state.

  const handleInjectClick  = (fileId: number) => setInlinePanel({ type: 'inject', sourceFileId: fileId })
  const handleRenameClick  = (fileId: number) => setInlinePanel({ type: 'rename', sourceFileId: fileId })
  const handleClosePanel   = ()               => setInlinePanel(null)
  const handleShowUpload   = ()               => setInlinePanel({ type: 'upload' })

  // injectFile is in the hook — we wrap it to also close the panel
  const handleInjectConfirm = (campaignId: number, batchSize: number) => {
    if (inlinePanel?.type !== 'inject') return
    injectFile(inlinePanel.sourceFileId, campaignId, batchSize)
  }

  // renameFile is in the hook
  const handleRenameConfirm = (newName: string) => {
    if (inlinePanel?.type !== 'rename') return
    renameFile(inlinePanel.sourceFileId, newName)
  }

  // "Recycler" button just switches tab — passed as a callback from LeadsPage
  // For now we navigate there by calling setInlinePanel(null) — the page
  // handles the tab switch. This prop will be wired in LeadsPage.tsx.
  const handleGoRecycle = () => {
    // Will be overridden by LeadsPage — placeholder
    setInlinePanel(null)
  }

  const sharedProps = {
    inlinePanel, campaigns, agents,
    onInject: handleInjectClick,
    onRename: handleRenameClick,
    onInjectConfirm: handleInjectConfirm,
    onRenameConfirm: handleRenameConfirm,
    onClosePanel: handleClosePanel,
    onGoRecycle: handleGoRecycle,
    onAssign: assignLeadFile,
  }

  return (
    <div>
      

      {inlinePanel?.type === 'upload' && (
        <UploadPanel onClose={handleClosePanel} />
      )}


      {tree.map(countryNode => (
        <CountryBlock key={countryNode.country} countryNode={countryNode} {...sharedProps} />
      ))}
    </div>
  )
}