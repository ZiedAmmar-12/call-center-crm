export interface Supplier {
  id: number;
  name: string;
  countryId: number;
  leadTypeId: number;
}
export interface CreateSupplierDto { name: string; countryId: number; leadTypeId: number; }
export interface DeleteResponseDto { success: boolean; message: string; }
