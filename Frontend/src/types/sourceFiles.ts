type User = { id: number; firstName: string; lastName: string; email: string };
import type { Campaign } from "./leads";
import type { Country } from "./country";
import type { LeadType } from "./leadType";

export const SourceFileType = {
    Original: 0,
    Injecte: 1,
    Recycle: 2,
} as const;

export type SourceFileType = (typeof SourceFileType)[keyof typeof SourceFileType];
export interface ContactSource {
    id: number;
    sourceFileId: number;
    sourceFile: SourceFile;
    lineNumber: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    address ?: string;
    city ?: string;
    postalCode ?: string;
    country ?: string;
    isValid: boolean;
    validationErrors?: string[];
    isDuplicate: boolean;
    RawData: string; // the original line data from the file, useful for debugging
    statut : string; // "valid", "invalid", "empty", "duplicate"
    //public ContactQualification? CurrentQualification { get; set; }
    //public ICollection<ContactQualificationHistory> QualificationHistory { get; set; }

    uploadedAt: string;  // DateTime from backend
    createdAt : string;  // DateTime from backend
}

export interface CampaignList {
    id: number;
    campaignId: number;
    campaign: Campaign;
    sourceFileId: number;
    sourceFile: SourceFile;
    batchsize: number;
    cursor : number;
    totalContacts: number;
    isActive: boolean;
    createdAt: string; // DateTime from backend
    //public ICollection<Batch> Batches { get; set; }
//public ICollection<ContactSource> Contacts { get; set; }
}
export interface Supplier {
    id: number;
    name: string;
    countryId: number;
    leadTypeId: number;
    country: Country;
    leadType: LeadType;
    createdAt: Date;
    createdByUserId: number;
    createdByUser: User;
    sourceFiles: SourceFile[]; // collection de fichiers sources associée à ce fournisseur
}



// Types for frontend (matching backend DTOs)
export interface TreeCountryDto {
    id: number;
    name: string;
    code: string;
    leadTypes: TreeLeadTypeDto[];
}

export interface TreeLeadTypeDto {
    id: number;
    code: string;
    name: string;
    suppliers: TreeSupplierDto[];
}

export interface TreeSupplierDto {
    id: number;
    name: string;
    sourceFiles: TreeFileDto[];
}

export interface TreeFileDto {
    id: number;
    name: string;
    originalName: string;
    fileSizeLabel: string;
    fileSizeBytes: number;
    format: string;
    statut: string;
    contactCount: number;
    listNumber: number;
    uploadedAt: string;
    isActive: boolean;
}
export interface SourceFile {
    id: number;
    supplierId: number;
    supplier: Supplier;
    //file metadata
    name: string;
    originalFileName: string;
    fileSizeLabel : string;
    fileSizeBytes: number;
    filePath : string;
    format : string;
    //status
    type: SourceFileType;     // Enum/number from backend
    statut: string;
    //stats
    validContacts: number;
    contactCount: number;
    emptyRows: number;
    invalidPhones: number;
    totalLines: number;
    duplicates : number;
    //recyeling info 
    recycledFromCampaignListId?: number;
    //split info 
    parentSourceFileId?: number;
    parentSourceFile?: SourceFile;
    splitPartNumber?: number;  // 1, 2, 3
    splitTotalParts?: number;  

    // List number (auto-increment per supplier)
    listNumber: number; 
     // Timestamps
    uploadedAt: string;  // DateTime from backend
    validatedAt?: string;
    parsedAt?: string;
    
    // User info
    uploadedByUserId: number;
    uploadedByUser?: User;
    
    // Navigation collections
    contacts?: ContactSource[];
    campaignLists?: CampaignList[];
}

export interface UploadResponseDto {
    id?: number;
    success: boolean;
    message: string;
    file?: SourceFileResponseDto | null;
    invalidPhones?: number;
    jobId?: string;
    job?: ImportJobResponseDto;
}

export interface ImportJobResponseDto {
    id: number;
    status: 'Queued' | 'Processing' | 'Completed' | 'Failed' | string;
    sourceFileId?: number | null;
    fileName: string;
    totalRows: number;
    processedRows: number;
    lastHeartbeatAt?: string | null;
    workerId?: string | null;
    attempts: number;
    maxAttempts: number;
    rawFileDeletedAt?: string | null;
    validContacts: number;
    emptyRows: number;
    invalidPhones: number;
    duplicates: number;
    invalidContacts: number;
    errorMessage?: string | null;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
}
export interface RenameFileDto {
    newName: string;
}
export interface FileSearchResponseDto {
    id: number;
    name : string;
    fileHash : string;
    supplierName : string;
    supplierId : number;
    createdAt?: Date;
    uploadedAt : Date;
    totalContacts : number;
}
export interface FileValidationReportDto {
    totalLines: number;
    validContacts: number;
    invalidPhones: number;
    emptyRows: number;
    duplicates: number;
    invalidContacts?: number;
    invalidRows: InvalidRowDto[];
}
export interface InvalidRowDto {
    rowNumber: number;
    phone: string | null;
    name: string | null;
    reason: string;
}
export interface SourceFileResponseDto {
    id: number;
    name: string;
    invalidPhones: number;
    emptyRows: number;
    validContacts: number;
    totalLines: number;
    originalName: string;
    fileSizeLabel: string;
    fileSizeBytes: number;
    format: string;
    statut: string;
    uploadedAt: string;  // DateTime becomes string in JSON
    isActive: boolean;
    listNumber: number;
    contactCount: number;
    supplierId: number ;
}

export interface SourceFileUploadDto {
    supplierId?: number 
    name?: string ;
    file: File;  // IFormFile in C# becomes File in TypeScript
    newSupplierName?: string ;
    countryId: number; 
    leadTypeId: number; 
    columnMapping?: Record<string, string>;
}
export interface GetFilesResponseDto {
    success: boolean;
    files: SourceFileResponseDto[];
}

// For delete response
export interface DeleteResponseDto {
    success: boolean;
    message: string;
}

// For rename response
export interface RenameResponseDto extends UploadResponseDto {
    file?: SourceFileResponseDto;
}
