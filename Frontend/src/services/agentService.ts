import { api } from './api';
import type { DashboardAgent } from '../types/agent';

// Types pour les contacts
export interface Contact {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  numGSM?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  source: string;
  statut: string;
  statutAgent?: string;
  commentaire?: string;
  projet?: string;
  typeRendezVous?: string;
  modeChauffage?: string;
  ageChaudiere?: number;
  surface?: number;
  etatToiture?: string;
  etatIsolation?: string;
  etudePV?: boolean;
  equipePV?: boolean;
  equipePAC?: boolean;
  situationPro?: string;
  revenusMensuels?: number;
  nombrePersonnes?: number;
  proprietaireDepuis?: string;
  nombreNRP?: number;
  scoreIA?: number;
  creneauOptimalIA?: string;
  dateDernierAppel?: string;
  agentId?: number;
  agentNom?: string;
  dateRappelPlanifie?: string;
}

// Type pour l'enregistrement d'appel
export interface CreateAppelDTO {
  agentId: number;
  contactId: number;
  dureeSecondes: number;
  qualification: string;
  dateRappelPlanifie?: string;
}

export const agentService = {
  // Dashboard principal
  getDashboard: async (agentId: number): Promise<DashboardAgent> => {
    const response = await api.get(`/agent/${agentId}/dashboard`);
    return response.data;
  },
  
  // Historique des appels
  getHistorique: async (agentId: number, filtre?: string, recherche?: string) => {
    const params = new URLSearchParams();
    if (filtre) params.append('filtre', filtre);
    if (recherche) params.append('recherche', recherche);
    const response = await api.get(`/agent/${agentId}/historique?${params.toString()}`);
    return response.data;
  },
  
  // Agenda
  getAgenda: async (agentId: number) => {
    const response = await api.get(`/agent/${agentId}/agenda`);
    return response.data;
  },
  
  // Performance
  getPerformance: async (agentId: number, annee: number, mois: number) => {
    const response = await api.get(`/agent/${agentId}/performance`, {
      params: { annee, mois }
    });
    return response.data;
  },
  
  // Rémunération
  getRemuneration: async (agentId: number, annee: number, mois: number) => {
    const response = await api.get(`/agent/${agentId}/remuneration`, {
      params: { annee, mois }
    });
    return response.data;
  },
  
  // ─── Appel en direct ─────────────────────────────────────────────────────
  
  // Enregistrer un appel
  enregistrerAppel: async (data: CreateAppelDTO): Promise<any> => {
    const response = await api.post('/agent/appels', data);
    return response.data;
  },
  
  // Récupérer TOUS les contacts (vue admin/superadmin — pas filtrée par agent)
  getAllContacts: async (): Promise<Contact[]> => {
    const response = await api.get(`/contact`);
    return response.data;
  },

  // Récupérer les contacts à appeler pour un agent
  getContactsAApeler: async (agentId: number): Promise<Contact[]> => {
    const response = await api.get(`/contact/agent/${agentId}/a-appeler`);
    return response.data;
  },
  
  // Récupérer un contact par son ID
  getContactById: async (contactId: number): Promise<Contact> => {
    const response = await api.get(`/contact/${contactId}`);
    return response.data;
  },
  
  // Mettre à jour un contact (statut, etc.)
  updateContact: async (contactId: number, data: Partial<Contact>): Promise<Contact> => {
    const response = await api.put(`/contact/${contactId}`, data);
    return response.data;
  },
  
  // Récupérer tous les contacts
  getAllContacts: async (): Promise<Contact[]> => {
    const response = await api.get('/contact');
    return response.data;
  },

  // Dialer : contacts ordonnés + progression du jour
  getDialerContacts: async (): Promise<{ contacts: Contact[]; total: number; calledToday: number }> => {
    const response = await api.get('/agent/me/dialer/contacts');
    return response.data;
  },

  // ─── Attendance / Pointage ──────────────────────────────────────────────

  getAttendanceStatus: async (): Promise<{
    status: 'offline' | 'active' | 'break';
    clockIn?: string;
    breakType?: string;
    startTime?: string;
  }> => {
    const response = await api.get('/attendance/status');
    return response.data;
  },

  clockIn: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/attendance/clock-in');
    return response.data;
  },

  clockOut: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/attendance/clock-out');
    return response.data;
  },

  startBreak: async (type: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/attendance/break/start', { type });
    return response.data;
  },

  endBreak: async (): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/attendance/break/end');
    return response.data;
  },
};