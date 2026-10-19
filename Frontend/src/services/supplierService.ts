import api from "./api";
import type {
    Supplier,
    CreateSupplierDto,
    DeleteResponseDto
} from "../types/Supplier";

export const supplierService = {

    async getAllSuppliers(): Promise<Supplier[]> {
        const response = await api.get<{ success: boolean; data: Supplier[] }>('/Suppliers');
        return response.data.data;
    },

    async getSupplierById(supplierId: number): Promise<Supplier> {
        const response = await api.get<{ success: boolean; data: Supplier }>(`/Suppliers/${supplierId}`);
        return response.data.data;
    },

    async createSupplier(createDto: CreateSupplierDto): Promise<Supplier> {
        const response = await api.post<{ success: boolean; data: Supplier }>('/Suppliers', createDto);
        return response.data.data;
    },
    async getSuppliersByFilters(countryId: number, leadTypeId: number) {
    const response = await api.get(`/Suppliers/filter`, {
        params: { countryId, leadTypeId }
    });
        console.log('suppliers response:', response.data);
    const data = response.data?.data ?? [];

    return Array.isArray(data) ? data : [];
    //                  ↑ depends on what your backend actually returns
},
    // In your supplier service
    async updateSupplier(id: number, newName: string): Promise<void> {
    // ID goes in the URL, Name goes in the body
    await api.put(`/Suppliers/${id}`, { 
        name: newName 
    });
},
    async deleteSupplier(supplierId: number): Promise<DeleteResponseDto> {
        const response = await api.delete<DeleteResponseDto>(`/Suppliers/${supplierId}`);
        return response.data;
    }

}
