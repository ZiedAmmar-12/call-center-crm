import { api } from './api';

export interface DashboardData {
  agentsEnLigne: number;
  totalAgents: number;
  enAppel: number;
  appelsDuJour: number;
  tauxConversion: number;
  alertes: { agentNom: string; message: string; type: string }[];
  performanceHoraire: { heure: string; appels: number; conversions: number }[];
}

export interface AgentStatut {
  id: number;
  nom: string;
  prenom: string;
  statut: string;
  dureeAppel: string;
  appels: number;
  conversions: number;
  score: number;
}

// Types pour les agendas des confirmatrices
export interface ConfirmatriceAgenda {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  agendasAccess: string[];
}

export interface AssignAgendaDTO {
  agendaId: string;
  assigned: boolean;
}

export interface AgendaDisponible {
  id: string;
  nom: string;
  description: string;
  icon: string;
}

export const adminService = {
  // Dashboard
  getDashboard: () => api.get<DashboardData>('/admin/dashboard'),
  
  // Agents statut
  getAgentsStatut: () => api.get<AgentStatut[]>('/admin/agents/statut'),
  
  // Scorecards
  getScorecards: () => api.get('/admin/scorecards'),
  
  // Agents à suivre
  getAgentsSuivi: () => api.get('/admin/agents/suivi'),
  
  // Pointage
  getPointage: (date?: string) => api.get(`/admin/pointage${date ? `?date=${date}` : ''}`),
  
  
  // Carte géographique
  getCarteGeographique: (pays?: string) => api.get(`/admin/carte-geographique${pays ? `?pays=${pays}` : ''}`),
  
  // IA Configuration
  getIAConfig: () => api.get('/admin/ia/config'),
  updateIAConfig: (config: any) => api.put('/admin/ia/config', config),
  
  // Utilisateurs
  getUtilisateurs: () => api.get('/admin/utilisateurs'),
  createUtilisateur: (data: any) => api.post('/admin/utilisateurs', data),
  deleteUtilisateur: (id: number) => api.delete(`/admin/utilisateurs/${id}`),

  // Ajouter dans adminService
  getConfirmatricesAgendas: () => api.get<ConfirmatriceAgenda[]>('/admin/confirmatrices/agendas'),
  getAgendasDisponibles: () => api.get<AgendaDisponible[]>('/admin/agendas/disponibles'),
  assignAgendaToConfirmatrice: (id: number, data: AssignAgendaDTO) => 
  api.put<ConfirmatriceAgenda>(`/admin/confirmatrices/${id}/assign-agenda`, data),

  
};