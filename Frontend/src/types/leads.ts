


export interface SourceFile {
  id: number
  supplierId: number
  name: string
  originalName: string
  contactCount: number
  fileSizeLabel: string
  uploadedAt: string
  isActive: boolean
  ListNumber?: number
  format: string
  statut : string

}
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
  agentsIds: number[]  // IDs des agents assignés à ce fichier
  name: string
  contactCount: number
  fileSizeLabel: string
  uploadedAt: string
  isActive: boolean
  format: string
  statut : string
}

export interface DirectAssignment {
  id: number
  leadFileId: number
  agentIds: number[]
  assignedAt: string
  contactCount: number
  leadFileName: string
  supplierName: string
}

export interface ContactSource {
    id : number
    FichierSourceId : number
    fournisseurId : number
    nom : string
    prenom : string
    email : string
    telephone : string
    entreprise : string
}

export interface Campaign {
  id: number
  name: string
  statut : 'active' | 'en pause' | 'terminée'
  createdAt: string
  qualificationIds: number[]
  distributionMode: DistributionMode
  quotaPerAgent: number
  quotaUnit: QuotaUnit
  assignedAgentIds: number[]
}

export type DistributionMode = 'round-robin' | 'random' | 'performance'
export type QuotaUnit = 'par jour' | 'par session' | 'total'

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

export interface Lot{
    id: number
    CampagneId : number
    TailleLot : number
    ContactsIds : number[]
    statut : 'actif' | 'terminé'
    declencheeAu : string
    CompleteAu : string
}

export interface CampaignContact {
  id: number
  campaignId: number
  campaignListId: number
  sourceContactId: number
  campaignName: string
  firstName: string
  lastName: string
  phone: string
  assignedAgentId: number | null
  qualificationId: number | null
  qualifiedAt: string | null
  qualifiedByAgentId: number | null
  batchId: number | null
}

export interface QualificationType {
  id: number
  label: string
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray'
  category?: 'positive' | 'neutral' | 'negative'  // optionnel
}

export interface Qualification {
    id : number
    label : string
    CampaignContactId : number
    agentId : number
    statut :QualificationStatus
    motifRefus?: MotifRefus 
    qualifiedAt : string
}
export type QualificationStatus = 'HC logement' |'HC langue' | 'Rappel' | 'Rdv annulé' | 'Repondeur' | 'Rdv client 1' | 'Rdv client 2' | 'Refus'
export type MotifRefus = 
  | 'Présence du couple'
  | 'Pas de projet'
  | 'Faible consommation'
  | 'Pas intéressé'

export interface RecycleRecord {
    id : number
    sourceFileId : number
    sourceFileName : string
    campaignId : number
    campaignName : string
    totalContacts : number
    selectedQualificationsIds : number[]
    dateRecyclage : string
    qualificationCounts : Record<number, number> // { qualificationId: count }
    newSourceFileId:number
    newFileName : string
    recycledAt: string
    recycleNumberContacts : number
    
}
export interface Agent {
  id: number
  name: string
  teamId: number
}


export type UIInlinePanel =
  | { type: 'injecter';      FichierSourceId: number }     // Panneau d'injection ouvert
  | { type: 'renommer';      FichierSourceId: number }     // Panneau de renommage ouvert
  | { type: 'upload' }                                // Panneau d'upload ouvert
  | { type: 'injectLeads'; FichierSourceId: number }       // Panneau d'injection de leads
  | null                                              
