import api from './api';

export const AgentPresenceStatus = {
  Offline: 0,
  Available: 1,
  Break: 2,
  OnCall: 3,
  WrapUp: 4,
} as const;

export type AgentPresenceStatus =
  (typeof AgentPresenceStatus)[keyof typeof AgentPresenceStatus];

export interface AgentPresenceDto {
  userId: number;
  isOnline: boolean;
  status: AgentPresenceStatus;
  presenceChangedAt?: string | null;
  lastHeartbeatAt?: string | null;
  canTakeContacts: boolean;
}

export const agentPresenceService = {
  async getPresence(): Promise<AgentPresenceDto> {
    const response = await api.get('/Agents/me/presence');
    return response.data.data;
  },

  async updatePresence(status: AgentPresenceStatus): Promise<AgentPresenceDto> {
    const response = await api.patch('/Agents/me/presence', { status });
    return response.data.data;
  },

  async heartbeat(): Promise<void> {
    await api.post('/Agents/me/heartbeat');
  },
};
