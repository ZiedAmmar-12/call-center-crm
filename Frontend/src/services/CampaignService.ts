// services/campaignService.ts
import api from "./api";
import type {
    CampaignResponseDto,
    CreateCampaignDto,
    UpdateCampaignDto,
    AssignAgentToCampaignDto,
    CampaignFileDto,
    CampaignAgentDto,
    AvailableAgentDto,
    RecycleCampaignFileRequestDto,
    RecycleCampaignFileResponseDto,
    RecycleOptionsResponseDto,
    CampaignHopperDto,
    UpdateCampaignFileStatusDto
} from "../types/campaign";

export const campaignService = {
    // ========== CRUD ==========
    async createCampaign(createDto: CreateCampaignDto): Promise<CampaignResponseDto> {
        const response = await api.post('/Campaigns', createDto);
        return response.data.data;
    },

    async getAllCampaigns(): Promise<CampaignResponseDto[]> {
        const response = await api.get('/Campaigns');
        return response.data.data;
    },

    async getCampaignById(campaignId: number): Promise<CampaignResponseDto> {
        const response = await api.get(`/Campaigns/${campaignId}`);
        return response.data.data;
    },
    async getAvailableAgents(campaignId = 0): Promise<AvailableAgentDto[]> {
        const response = await api.get(`/Campaigns/${campaignId}/AvailableAgents`);
        return response.data.data;
    },

    async updateCampaign(
        campaignId: number, 
        updateDto: UpdateCampaignDto
    ): Promise<CampaignResponseDto> {
        const response = await api.put(`/Campaigns/${campaignId}`, updateDto);
        return response.data.data;
    },

    async deleteCampaign(campaignId: number): Promise<void> {
        await api.delete(`/Campaigns/${campaignId}`);
    },

    // ========== STATUS ==========
    async updateCampaignStatus(
        campaignId: number, 
        isActive: boolean
    ): Promise<CampaignResponseDto> {
        const response = await api.patch(`/Campaigns/${campaignId}/status`, { isActive });
        return response.data.data;
    },

    // ========== FILES ==========
    async getCampaignFiles(campaignId: number): Promise<CampaignFileDto[]> {
        const response = await api.get(`/Campaigns/${campaignId}/files`);
        return response.data.data;
    },

    async getCampaignHopper(campaignId: number): Promise<CampaignHopperDto> {
        const response = await api.get(`/Campaigns/${campaignId}/hopper`);
        return response.data.data;
    },

    async removeFile(campaignId: number, fileId: number): Promise<void> {
        await api.delete(`/Campaigns/${campaignId}/files/${fileId}`);
    },

    async getRecycleOptions(
        campaignId: number,
        campaignFileId: number
    ): Promise<RecycleOptionsResponseDto> {
        const response = await api.get(
            `/Campaigns/${campaignId}/files/${campaignFileId}/recycle-options`
        );
        return response.data.data;
    },

    async recycleCampaignFile(
        campaignId: number,
        campaignFileId: number,
        dto: RecycleCampaignFileRequestDto
    ): Promise<RecycleCampaignFileResponseDto> {
        const response = await api.post(
            `/Campaigns/${campaignId}/files/${campaignFileId}/recycle`,
            dto
        );
        return response.data.data;
    },

    async updateFileStatus(
        campaignId: number, 
        fileId: number, 
        isActive: boolean
    ): Promise<CampaignFileDto> {
        const response = await api.patch(
            `/Campaigns/${campaignId}/files/${fileId}`,
            { isActive }
        );
        return response.data.data;
    },

    async updateFilePriority(
        campaignId: number,
        fileId: number,
        priority: number
    ): Promise<CampaignFileDto> {
        const response = await api.patch(
            `/Campaigns/${campaignId}/files/${fileId}`,
            { priority }
        );
        return response.data.data;
    },

    async updateFile(
        campaignId: number,
        fileId: number,
        updateDto: UpdateCampaignFileStatusDto
    ): Promise<CampaignFileDto> {
        const response = await api.patch(
            `/Campaigns/${campaignId}/files/${fileId}`,
            updateDto
        );
        return response.data.data;
    },

    // ========== AGENTS ==========
    async getAgentsInCampaign(campaignId: number): Promise<CampaignAgentDto[]> {
        const response = await api.get(`/Campaigns/${campaignId}/agents`);
        return response.data.data;
    },

    async addAgentToCampaign(
        campaignId: number, 
        assignDto: AssignAgentToCampaignDto
    ): Promise<CampaignAgentDto> {
        const agentId = assignDto.agentId || assignDto.userId;
        const response = await api.post(`/Campaigns/${campaignId}/agents`, {
            ...assignDto,
            agentId,
            userId: assignDto.userId ?? agentId,
        });
        return response.data.data;
    },

    async removeAgentFromCampaign(
        campaignId: number, 
        agentId: number
    ): Promise<void> {
        await api.delete(`/Campaigns/${campaignId}/agents/${agentId}`);
    }
};
