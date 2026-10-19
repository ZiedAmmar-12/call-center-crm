using Backend.DTOs;
using Backend.DTOs.Tree;
using Microsoft.AspNetCore.Mvc;
using System;
using Backend.DTOs.Campaign;
using System.Collections.Generic;
namespace Backend.Services.Campaigns
{
    public interface ICampaignService
    {

        Task<CampaignResponseDto> CreateAsync(CreateCampaignDto dto);
        Task<List<CampaignResponseDto>> GetAllAsync();
        Task<CampaignResponseDto> GetByIdAsync(int id);
        Task<CampaignResponseDto> UpdateAsync(int id, UpdateCampaignDto dto);
        Task<CampaignHopperDto?> GetCampaignHopperAsync(int campaignId);
        //Task<CampaignResponseDto?> PatchStatusAsync(int id, bool isActive);
        Task<bool> DeleteAsync(int id);
        Task<List<CampaignFileDto>> GetCampaignFilesAsync(int campaignId);
        //Task<CampaignFileDto> AddFileToCampaignAsync(int campaignId, AddFileToCampaignDto dto, int userId); 
        Task<bool> RemoveFileFromCampaignAsync(int campaignId, int campaignFileId);
        Task<List<AvailableAgentDto>> GetAvailableAgentsAsync(int campaignId);
        Task<CampaignAgentDto?> GetAgentInCampaignByIdAsync(int campaignId, int agentId);
        Task<List<CampaignAgentDto>> GetAgentsInCampaignAsync(int campaignId);
        Task<CampaignFileDto?> UpdateFileInCampaignAsync(int campaignId, int campaignFileId, UpdateCampaignFileStatusDto dto);
        Task<CampaignAgentDto> AssignAgentAsync(int campaignId, AssignAgentToCampaignDto dto, int assignedByUserId);
        Task<CampaignAgentDto> RemoveAgentAsync(int campaignId, int agentId);
        Task<RecycleOptionsResponseDto> GetRecycleOptionsAsync(int campaignId, int campaignFileId);
        Task<RecycleCampaignFileResponseDto> RecycleCampaignFileAsync(int campaignId, int campaignFileId, RecycleCampaignFileRequestDto dto);
        Task<CampaignResponseDto?> PatchCampaignStatusAsync(int id, bool isActive);
    }

}
