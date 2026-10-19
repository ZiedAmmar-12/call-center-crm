import api from "./api";
import type {
    LeadType,
    CreateLeadTypeDto,
    DeleteResponseDto
} from "../types/leadType";

export const leadTypeService = {

    async getAllLeadTypes(): Promise<LeadType[]> {
        const response = await api.get<LeadType[]>('/LeadTypes');
        return response.data;
    },
async getLeadTypesByCountry(countryId: number): Promise<LeadType[]> {
    const response = await api.get<LeadType[]>(`/LeadTypes/by-country/${countryId}`);
    return response.data;
},
    async getLeadTypeById(leadTypeId: number): Promise<LeadType> {
        const response = await api.get<LeadType>(`/LeadTypes/${leadTypeId    }`);
        return response.data;
    },

    async createLeadType(createDto: CreateLeadTypeDto): Promise<LeadType> {
        const response = await api.post<LeadType>('/LeadTypes', createDto);
        return response.data;
    },

    async deleteLeadType(leadTypeId: number): Promise<DeleteResponseDto> {
        const response = await api.delete<DeleteResponseDto>(`/LeadTypes/${leadTypeId}`);
        return response.data;
    }

}