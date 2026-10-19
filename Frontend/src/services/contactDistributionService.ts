import api from "./api";

export interface DistributionRequestDto {
  fileId: number;
  agentIds: number[];
  quota?: number;
}

export const contactDistributionService = {
  async distribute(dto: DistributionRequestDto): Promise<{ success: boolean }> {
    const response = await api.post('/ContactDistribution', dto);
    return response.data;
  },
  async getDistributions(campaignId: number): Promise<any[]> {
    const response = await api.get(`/ContactDistribution/campaign/${campaignId}`);
    return response.data?.data ?? [];
  }
};
