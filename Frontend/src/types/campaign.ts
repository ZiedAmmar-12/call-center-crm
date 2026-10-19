// ==================== ENUMS ====================
type User = { id: number; firstName: string; lastName: string; email: string };

export const CampaignStatus = {
  Draft: 0,
  Active: 1,
  Inactive: 2,
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
export interface CampaignAgent {
  id: number;
  campaignId: number;
  agentId: number;
  assignedAt: string;
  assignedByUserId: number;
  isActive: boolean;
  quota?: number;
}
// ==================== CAMPAIGN FILE ====================
export interface CampaignFile {
  id: number;
  campaignId: number;
  sourceFileId: number;
  sourceFileName: string;           // From joined SourceFile

  // Basic Status
  isActive: boolean;
  isRecycled: boolean;
  isRemoved: boolean;
  removedAt?: string;
  recycledAt?: string;

  // Injection Info
  isInjected: boolean;
  injectedAt?: string;
  injectedByUserId?: number;

  // Contact Counters
  contactsTotal: number;
  contactsCalled: number;
  contactsRemaining: number;

  // ==================== SCHEDULING ====================
  isScheduled: boolean;
  scheduledAt?: string;
  scheduledByUserId?: number;
  scheduleStatus: string;           // "none" | "pending" | "executed" | "cancelled"
}
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate?: string;      // ISO date string (DateTime?)
  createdAt: string;       // ISO date string (DateTime)
  updatedAt?: string;      // ISO date string (DateTime?)
  createdByUserId: number;
  createdByUser?: User;    // Navigation property
  isDeleted: boolean;
  deletedAt?: string;
  
  // Navigation properties
  campaignFiles: CampaignFile[];
  campaignAgents: CampaignAgent[];
}


// ==================== MAIN CAMPAIGN ====================
export interface CampaignResponseDto {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  status: CampaignStatus;
  createdByUserId: number;
  createdByUserName?: string;

  totalContacts: number;
  qualifiedContacts: number;
  remainingContacts: number;
  recycleCount: number;
  autoPoolSizing: boolean;
  activePoolTarget: number;
  lowContactsThreshold: number;
  contactsPerAgentPerHour: number;
  poolBufferHours: number;
  maxPoolTarget: number;
  minPoolTarget: number;
  lowPoolRatio: number;

  campaignFiles: CampaignFileDto[];
  campaignAgents: CampaignAgentDto[];
}

// ==================== CREATE / UPDATE ====================
export interface CreateCampaignDto {
  name: string;
  description?: string;
  startDate?: string;
  sourceFileIds?: number[];
  agentsIds?: number[];
  autoPoolSizing?: boolean;
  activePoolTarget?: number;
  lowContactsThreshold?: number;
  contactsPerAgentPerHour?: number;
  poolBufferHours?: number;
  maxPoolTarget?: number;
  minPoolTarget?: number;
  lowPoolRatio?: number;
}

export interface UpdateCampaignDto {
  name: string;
  description?: string;
  startDate?: string;
  status?: CampaignStatus;
  autoPoolSizing?: boolean;
  activePoolTarget?: number;
  lowContactsThreshold?: number;
  contactsPerAgentPerHour?: number;
  poolBufferHours?: number;
  maxPoolTarget?: number;
  minPoolTarget?: number;
  lowPoolRatio?: number;
}

// ==================== CAMPAIGN FILE ====================
export interface CampaignFileDto {
  id: number;
  campaignId: number;
  sourceFileId: number;
  sourceFileName: string;
  isActive: boolean;
  isRecycled: boolean;
  isInjected: boolean;
  priority: number;
  contactsTotal: number;
  contactsCalled: number;
  contactsRemaining: number;
  injectedAt?: string;
  recycledAt?: string;
}

// ==================== AGENT ====================
export interface CampaignAgentDto {
  id: number;
  campaignId: number;
  agentId: number;
  userId?: number;
  agentName: string;
  isActive: boolean;
  assignedAt: string;
  assignedByUserId: number;
  quota?: number;

  // Statistics
  contactsAssigned: number;
  contactsCalled: number;
  rdvCount: number;
}

export interface AssignAgentToCampaignDto {
  userId?: number;
  agentId: number;
  quota?: number;
  weight?: number;
  isActive?: boolean;
}

export interface AvailableAgentDto {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  isOnline: boolean;
}

// ==================== INJECTION ====================
export interface InjectFileResponseDto {
  campaignId: number;
  campaignFileId: number;
  sourceFileName: string;
  contactsTotal: number;
  contactsDistributed: number;
  agentsCount: number;
  distributionMode: string; // "Dynamic"
  injectedAt: string;
  message: string;
}

// ==================== CONTACT DISTRIBUTION ====================
export interface GetNextContactResponseDto {
  campaignFileContactId: number;
  contactId: number;

  lastName?: string;
  firstName?: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
  email?: string;

  attemptCount: number;
  previousQualification?: string;
  previousComment?: string;
}

export interface QualifyContactDto {
  qualificationStatus: string; // "nrp", "rdv_client1", "refus", etc.
  agentComment?: string;
  projet?: string;

  // Fiche fields
  proprietaireDepuis?: number;
  modeChauffage?: string;
  consommationChauffage?: string;
  ageChaudiere?: number;
  equipePV?: boolean;
  equipePAC?: boolean;
  etatToiture?: string;
  etatIsolation?: string;
  nbrePersonnes?: number;
  professionMr?: string;
  professionMme?: string;
  revenus?: string;
  credits?: boolean;
  fichage?: boolean;

  // RDV fields
  appointmentDate?: string;
  appointmentType?: string;

  // A Rappeler
  nextCallAt?: string;
}
// ==================== STATUS UPDATE ====================
export interface UpdateCampaignStatusDto {
  isActive: boolean;
}

export interface UpdateCampaignFileStatusDto {
  isActive?: boolean;
  priority?: number;
}

export interface CampaignHopperDto {
  campaignId: number;
  autoPoolSizing: boolean;
  activePoolTarget: number;
  lowContactsThreshold: number;
  contactsPerAgentPerHour: number;
  poolBufferHours: number;
  maxPoolTarget: number;
  minPoolTarget: number;
  lowPoolRatio: number;
  activeAgents: number;
  activeAssignableContacts: number;
  pendingBacklogContacts: number;
  totalPendingContacts: number;
  targetContacts: number;
  lowThresholdContacts: number;
  estimatedContactsPerAgentPerHour: number;
  completedLastTwoHours: number;
  status: 'healthy' | 'low' | 'empty' | string;
}

export interface RecycleQualificationCountDto {
  qualificationStatus: string;
  count: number;
}

export interface RecycleOptionsResponseDto {
  campaignId: number;
  campaignFileId: number;
  totalQualifiedContacts: number;
  qualificationCounts: RecycleQualificationCountDto[];
}

export interface RecycleCampaignFileRequestDto {
  qualificationStatuses: string[];
}

export interface RecycleCampaignFileResponseDto {
  campaignId: number;
  campaignName: string;
  campaignFileId: number;
  sourceFileId: number;
  sourceFileName: string;
  contactsRecycled: number;
  qualificationStatuses: string[];
  recycledAt: string;
}
