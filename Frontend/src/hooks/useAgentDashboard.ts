import { useState, useEffect } from 'react';
import { agentService } from '../services/agentService';
import type { DashboardAgent } from '../types/agent';

export function useAgentDashboard(agentId: number) {
  const [dashboard, setDashboard] = useState<DashboardAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!agentId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await agentService.getDashboard(agentId);
        setDashboard(data);
      } catch (err: any) {
        console.error('Erreur chargement dashboard:', err);
        setError(err.response?.data?.message || 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [agentId]);

  return { dashboard, loading, error };
}