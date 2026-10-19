// Full client — admin only
export interface Client {
    id: number;
    code: string;       // "client1", "client2", "client3"
    nom: string;        // real company name
    email?: string;
    telephone?: string;
    adresse?: string;
    isActive: boolean;
}

// Public client — agents and other roles (no real name exposed)
export interface ClientPublic {
    id: number;
    code: string;       // "client1", "client2", "client3"
}

export interface CreateClientDto {
    code: string;
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    isActive: boolean;
}

export interface UpdateClientDto {
    nom?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    isActive?: boolean;
}
