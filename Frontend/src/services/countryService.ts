import api from "./api";
import type {
    Country,
    CreateCountryDto,
    DeleteResponseDto
} from "../types/country";

export const countryService = {

    async getAllCountries(): Promise<Country[]> {
        const response = await api.get<Country[]>('/Countries');
        return response.data;
    },

    async getCountryById(countryId: number): Promise<Country> {
        const response = await api.get<Country>(`/Countries/${countryId}`);
        return response.data;
    },

    async createCountry(createDto: CreateCountryDto): Promise<Country> {
        await api.post('/Countries', createDto);
        const countries = await this.getAllCountries();
        const createdCountry = countries.find(
            country => country.code === createDto.code || country.name.toLowerCase() === createDto.name.toLowerCase()
        );

        if (!createdCountry) {
            throw new Error('Country created but could not be loaded.');
        }

        return createdCountry;
    },

    async deleteCountry(countryId: number): Promise<DeleteResponseDto> {
        const response = await api.delete<DeleteResponseDto>(`/Countries/${countryId}`);
        return response.data;
    }

}
