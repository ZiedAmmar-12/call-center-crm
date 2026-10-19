// types/leads.ts — updated
//
// KEY CHANGES vs previous version:
// 1. LeadFolder + LeadFile  → Leads sub-folder inside a Fournisseur
// 2. RecycleRecord now has qualificationCounts + selectedQualificationIds
//    The admin picks which qualifications to KEEP — the recycled list
//    only contains contacts whose qualificationId is in that array.
// 3. DirectAssignment → when a LeadFile is sent to specific agents
// 4. Agent → needed for the agent picker UI

export type Country = 'France' | 'Belgique' | 'Suisse'
export type LeadType = 'B2B' | 'B2C'

// ── Source tree ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: number
  name: string
  country: Country
  leadType: LeadType
}

export interface SourceFile {
  id: number
  supplierId: number
  name: string
  originalName: string
  contactCount: number
  fileSizeLabel: string
  uploadedAt: string
  format: 'csv' | 'xlsx'
  status: 'original' | 'injected' | 'processed' | 'recycled'
}

// NEW — a named Leads sub-folder inside a Supplier.
// Arborescence: Supplier → LeadFolder → LeadFile[]
// Same CSV format as SourceFile — different injection path (direct to agents).
export interface LeadFolder {
  id: number
  supplierId: number
  name: string      // e.g. "Leads Avril", "Prospects chauds"
  createdAt: string
}

export interface LeadFile {
  id: number
  leadFolderId: number
  supplierId: number
  name: string
  contactCount: number
  fileSizeLabel: string
  uploadedAt: string
  format: 'csv' | 'xlsx'
  status: 'pending' | 'assigned'
}

// Created when a LeadFile is injected directly to specific agents.
// Separate from the campaign batch system — goes on top of campaign leads.
export interface DirectAssignment {
  id: number
  leadFileId: number
  agentIds: number[]
  assignedAt: string
  contactCount: number
  leadFileName: string
  supplierName: string
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number
  name: string
    status : 'active' | 'en pause' | 'terminée'
  createdAt: string
  qualificationIds: number[]
  distributionMode: DistributionMode
  quotaPerAgent: number
  quotaUnit: QuotaUnit
  assignedAgentIds: number[]
}

export type DistributionMode = 'round-robin' | 'random' | 'performance'
export type QuotaUnit = 'per-day' | 'per-session' | 'total'

export interface CampaignList {
  id: number
  campaignId: number
  sourceFileId: number
  sourceFileName: string
  supplierName: string
  batchSize: number
  cursor: number
  totalContacts: number
  isActive: boolean
  progressPercent: number
}

export interface CampaignContact {
  id: number
  campaignId: number
  campaignListId: number
  sourceContactId: number
  companyName: string
  firstName: string
  lastName: string
  phone: string
  assignedAgentId: number | null
  qualificationId: number | null
  qualifiedAt: string | null
  qualifiedByAgentId: number | null
  batchId: number | null
}

// ── Qualifications ────────────────────────────────────────────────────────────

export interface QualificationType {
  id: number
  label: string
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray'
}

export interface QualificationLog {
  id: number
  campaignContactId: number
  agentId: number
  agentName: string
  previousQualificationId: number | null
  newQualificationId: number
  changedAt: string
}

// ── Recycling ─────────────────────────────────────────────────────────────────

export interface RecycleRecord {
  id: number
  originalSourceFileId: number
  originalFileName: string
  campaignName: string
  campaignId: number
  finishedAt: string
  totalContactCount: number

  // Breakdown of contacts by qualification in the original list.
  // Key = qualificationId, value = contact count.
  // Special key 0 = contacts with NO qualification (never called).
  // Example: { 0: 120, 3: 450, 4: 230, 6: 80 }
  qualificationCounts: Record<number, number>

  // Which qualificationIds the admin chose to KEEP.
  // null = not recycled yet.
  // Include 0 to keep contacts that were never called.
  selectedQualificationIds: number[] | null

  // Populated after recycling is confirmed
  newSourceFileId: number | null
  newFileName: string | null
  recycledAt: string | null
  recycledContactCount: number | null
}

// ── UI-only ───────────────────────────────────────────────────────────────────

export type UIInlinePanel =
  | { type: 'inject';      sourceFileId: number }
  | { type: 'rename';      sourceFileId: number }
  | { type: 'upload' }
  | { type: 'injectLeads'; leadFileId: number }
  | null

export interface UITreeNode {
  country: Country
  types: {
    leadType: LeadType
    suppliers: {
      supplier: Supplier
      files: SourceFile[]
      leadFolders: {
        folder: LeadFolder
        files: LeadFile[]
      }[]
    }[]
  }[]
}

// Minimal agent shape for the agent-picker in LeadFile injection
export interface Agent {
  id: number
  name: string
  teamId: number
}