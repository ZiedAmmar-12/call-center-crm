import { api } from './api';

export interface ConfirmationDashboardDTO {
  totalRdv: number;
  rdvConfirmes: number;
  rdvAnnules: number;
  rdvReportes: number;
  nrp: number;
  rdvRecents: RdvConfirmationDTO[];
  statsParJour: StatutParJourDTO[];
}

export interface RdvConfirmationDTO {
  id: number;
  contactNom: string;
  contactPrenom: string;
  telephone: string;
  email: string;
  adresse: string;
  source: string;
  agentNom: string;
  dateCreation: string;
  dateRendezVous: string;
  statut: string;
  commentaire?: string;
  commentaireBanque?: string;
}

export interface StatutParJourDTO {
  date: string;
  confirme: number;
  annule: number;
  nrp: number;
}

export interface AgentEvaluationDTO {
  agentId: number;
  agentNom: string;
  totalAppels: number;
  rdvConfirmes: number;
  rdvAnnules: number;
  rdvSignes: number;
}

export interface CommercialDTO {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export const confirmationService = {
  // Confirmatrice 1
  getDashboard: () => api.get<ConfirmationDashboardDTO>('/confirmation1/dashboard'),
  updateRdvStatut: (id: number, statut: string, commentaire?: string) => 
    api.put(`/confirmation1/rdv/${id}/statut`, { statut, commentaire }),
  getAgentsEvaluation: () => api.get<AgentEvaluationDTO[]>('/confirmation1/agents/evaluation'),
  
  // Confirmatrice 2
  getAgenda: () => api.get<RdvConfirmationDTO[]>('/confirmation2/agenda'),
  getCommerciaux: () => api.get<CommercialDTO[]>('/confirmation2/commerciaux'),
  assignerCommercial: (rdvId: number, commercialId: number) => 
    api.post(`/confirmation2/rdv/${rdvId}/assigner`, { commercialId }),
  updateCommentaireBanque: (rdvId: number, commentaireBanque: string) => 
    api.put(`/confirmation2/rdv/${rdvId}/banque`, { commentaireBanque })
};