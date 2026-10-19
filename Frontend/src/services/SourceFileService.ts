import api from "./api";
import type {
    SourceFileUploadDto,
    SourceFileResponseDto,
    UploadResponseDto,
    RenameFileDto,
    DeleteResponseDto,
    FileSearchResponseDto,
    FileValidationReportDto,
    ImportJobResponseDto,
    InvalidRowDto
} from "../types/sourceFiles";
import type { TreeCountryDto } from "../types/sourceFiles";

const appendColumnMapping = (formData: FormData, columnMapping?: Record<string, string>) => {
    if (!columnMapping) return;

    Object.entries(columnMapping).forEach(([fileColumn, targetField]) => {
        if (fileColumn.trim() && targetField.trim()) {
            formData.append(`ColumnMapping[${fileColumn}]`, targetField);
        }
    });
};

export const sourceFileService = {
    //upload a file 
    async uploadFile(uploadDto: SourceFileUploadDto): Promise<UploadResponseDto> {
        const formData = new FormData();
        formData.append('File', uploadDto.file);
        formData.append('CountryId', uploadDto.countryId.toString());
        formData.append('LeadTypeId', uploadDto.leadTypeId.toString());

        if (uploadDto.supplierId !== undefined && uploadDto.supplierId !== null) 
            {
        formData.append('SupplierId', uploadDto.supplierId.toString());
    }
        if (uploadDto.name) {
            formData.append('Name', uploadDto.name);
        }
        
        if (uploadDto.newSupplierName) {
            formData.append('NewSupplierName', uploadDto.newSupplierName);
        }
        appendColumnMapping(formData, uploadDto.columnMapping);
        // Add user ID
        const response = await api.post<UploadResponseDto>('/SourceFiles/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    //get all files for a supplier
    async getFilesBySupplier(supplierId: number): Promise<SourceFileResponseDto[]> {
        const response = await api.get<{ success: boolean; files: SourceFileResponseDto[] }>(`/SourceFiles/supplier/${supplierId}`);
        return response.data.files;
    },
    //get a file by id
    async getFileById(fileId: number): Promise<SourceFileResponseDto> {
        const response = await api.get<SourceFileResponseDto>(`/SourceFiles/${fileId}`);
        return response.data;
    },
    //delete a file by id
    async deleteFile(fileId: number): Promise<DeleteResponseDto> {
        const response = await api.delete<DeleteResponseDto>(`/SourceFiles/${fileId}`);
        return response.data;
    },
    async renameFile(fileId: number, newName: string): Promise<UploadResponseDto> {
        const renameDto: RenameFileDto = { newName };
        const response = await api.put<UploadResponseDto>(
            `SourceFiles/${fileId}/rename`,
            renameDto
        );
        return response.data;
    },
async getJobStatus(jobId: string | number): Promise<{ success: boolean; state: string; job: ImportJobResponseDto }> {
    const response = await api.get(`/SourceFiles/job-status/${jobId}`);
    return response.data;
},

async getJobInvalidRows(jobId: string | number): Promise<InvalidRowDto[]> {
    const response = await api.get<{ success: boolean; rows: InvalidRowDto[] }>(
        `/SourceFiles/job-status/${jobId}/invalid-rows`
    );
    return response.data.rows;
},

async waitForJobCompletion(
    jobId: string | number,
    onProgress?: (job: ImportJobResponseDto) => void
): Promise<ImportJobResponseDto> {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await this.getJobStatus(jobId);
        const job = status.job;
        onProgress?.(job);

        if (job.status === 'Completed') return job;
        if (job.status === 'Failed') {
            throw new Error(job.errorMessage || 'Import failed.');
        }
    }
},

async validateFile(uploadDto: SourceFileUploadDto): Promise<FileValidationReportDto> {
    const formData = new FormData();
    formData.append('File', uploadDto.file);
    formData.append('CountryId', uploadDto.countryId.toString());
    formData.append('LeadTypeId', uploadDto.leadTypeId.toString());
    if (uploadDto.supplierId !== undefined && uploadDto.supplierId !== null) 
            {
        formData.append('SupplierId', uploadDto.supplierId.toString());
    }
        if (uploadDto.name) {
            formData.append('Name', uploadDto.name);
        }
        
        if (uploadDto.newSupplierName) {
            formData.append('NewSupplierName', uploadDto.newSupplierName);
        }
        appendColumnMapping(formData, uploadDto.columnMapping);
        // Add user ID
        const response = await api.post< { success: boolean; report: FileValidationReportDto } >('/SourceFiles/validate', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.report;
    },
// In SourceFileService.ts
async searchFiles(searchTerm: string): Promise<FileSearchResponseDto[]> {
    try {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }
        
        const response = await api.get('/SourceFiles/search', { 
            params: { 
                searchTerm: searchTerm 
            } 
        });
        
        console.log('API Response:', response.data); 
        
        if (response.data?.success && response.data?.files) {
            // Extract the array from the value property
            if (response.data.files.value && Array.isArray(response.data.files.value)) {
                return response.data.files.value;
            }
            // If files is directly an array
            if (Array.isArray(response.data.files)) {
                return response.data.files;
            }
        }
        return [];
    } catch (error) {
        console.error('Search API error:', error);
        return [];
    }
},
  //download a file
    async downloadFile(fileId: number): Promise<Blob> {
        const response = await api.get(`/SourceFiles/${fileId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
    async getTree(): Promise<TreeCountryDto[]> {
    const response = await api.get<{ success: boolean; tree: TreeCountryDto[] }>('/SourceFiles/tree');
    return response.data.tree;  // ← Extract the tree array
},
    async processFile(fileId: number): Promise<void> {
        await api.post(`/SourceFiles/process/${fileId}`);
    },
    //helper : download a file and save it to disk
      async downloadFileAs(fileId: number, fileName: string): Promise<void> {
    const blob = await this.downloadFile(fileId);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  //helper : format file size
   formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};
