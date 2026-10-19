import api from './api';
import type { Client, ClientPublic, CreateClientDto, UpdateClientDto } from '../types/client';

export const clientService = {

    // Admin: full info including real company name
    async getAll(): Promise<Client[]> {
        const response = await api.get<{ success: boolean; data: Client[] }>('/Clients');
        return response.data.data;
    },

    // Any authenticated user: only code + id (safe for agents)
    async getAllPublic(): Promise<ClientPublic[]> {
        const response = await api.get<{ success: boolean; data: ClientPublic[] }>('/Clients/public');
        return response.data.data;
    },

    async getById(id: number): Promise<Client> {
        const response = await api.get<{ success: boolean; data: Client }>(`/Clients/${id}`);
        return response.data.data;
    },

    async create(dto: CreateClientDto): Promise<Client> {
        const response = await api.post<{ success: boolean; data: Client }>('/Clients', dto);
        return response.data.data;
    },

    async update(id: number, dto: UpdateClientDto): Promise<Client> {
        const response = await api.put<{ success: boolean; data: Client }>(`/Clients/${id}`, dto);
        return response.data.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/Clients/${id}`);
    },
};
