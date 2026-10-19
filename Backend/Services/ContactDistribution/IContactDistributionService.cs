using Backend.DTOs;
using Backend.DTOs.Tree;
using Microsoft.AspNetCore.Mvc;
using System;
using Backend.DTOs.Campaign;
using System.Collections.Generic;
namespace Backend.Services.ContactDistribution
{
	public interface IContactDistributionService
	{
		Task<InjectFileResponseDto> InjectFileAsync(int campaignId, int campaignFileId, int injectedByUserId);
		Task<InjectFileResponseDto> InjectSourceFileAsync(int campaignId, int sourceFileId, int injectedByUserId);
		Task<GetNextContactResponseDto?> GetNextContactAsync(int campaignId, int agentId);
		Task QualifyContactAsync(int campaignId, int campaignFileContactId, QualifyContactDto dto, int agentId);
	}

}
