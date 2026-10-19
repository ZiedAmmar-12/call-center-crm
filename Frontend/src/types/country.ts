export interface Country {
  id: number;
  name: string;
  code: string;
}
export interface CreateCountryDto { name: string; code: string; }
export interface DeleteResponseDto { success: boolean; message: string; }
