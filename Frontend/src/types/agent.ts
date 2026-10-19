export interface DashboardAgent {
  appelsDuJour: number;
  conversionsDuJour: number;
  tauxConversion: number;
  tempsProductif: string;
  scoreQualite: number;
  evolutionAppels: number;
  evolutionConversions: number;
  statistiquesParHeure: HoraireStat[];
  appelsRecents: AppelRecent[];
}

export interface HoraireStat {
  heure: string;
  appels: number;
  conversions: number;
}

export interface AppelRecent {
  id: number;
  contact: string;
  societe: string;
  duree: string;
  resultat: string;
  score: number;
  dateHeure: string;
}