import { useState } from "react";
import { sourceFileService } from "../services/SourceFileService";
import type { Country } from "../types/country";
import type { LeadType } from "../types/leadType";

interface UploadOptions {
    onProgress?: (progress: number) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useFileUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        if (!file) {
            return { valid: false, error: "No file selected." };
        }

        const allowedExtensions = [".csv", ".xlsx", ".xls"];
        const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
            };
        }

        const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSizeInBytes) {
            return {
                valid: false,
                error: `File size exceeds 10 MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            };
        }

        return { valid: true };
    };

    const uploadFile = async (
        file: File, 
        supplierId: number, 
        country: Country,
        leadType: LeadType,
        options?: UploadOptions
    ): Promise<boolean> => {
        const validation = validateFile(file);
        if (!validation.valid) {
            const errorMessage = validation.error || "Invalid file.";
            const validationError = new Error(errorMessage);
            setError(validationError);
            options?.onError?.(validationError);
            return false;
        }

        // Validate country data
        if (!country || !country.id || country.id <= 0) {
            const error = new Error("Please select a valid country");
            setError(error);
            options?.onError?.(error);
            return false;
}

        // Validate lead type data
        if (!leadType || !leadType.id || leadType.id <= 0) {
            const error = new Error("Please select a valid lead type");
            setError(error);
            options?.onError?.(error);
            return false;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        setSuccess(false);
        options?.onProgress?.(0);

        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                const newProgress = Math.min(prev + 10, 90);
                options?.onProgress?.(newProgress);
                return newProgress;
            });
        }, 200);

        try {
            const response = await sourceFileService.uploadFile({
                file,
                supplierId,
                countryId : country.id,     
                leadTypeId : leadType.id,
            });

            clearInterval(progressInterval);
            setUploadProgress(35);
            options?.onProgress?.(35);

            if (!response.success) {
                throw new Error(response.message || "Upload failed.");
            }

            const jobId = response.jobId || response.job?.id;
            if (jobId) {
                await sourceFileService.waitForJobCompletion(jobId, (job) => {
                    if (job.totalRows > 0) {
                        const progress = Math.min(99, Math.round((job.processedRows / job.totalRows) * 100));
                        setUploadProgress(progress);
                        options?.onProgress?.(progress);
                    }
                });
            }

            setSuccess(true);
            setUploadProgress(100);
            options?.onProgress?.(100);
            options?.onSuccess?.();
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Upload failed";
            const uploadError = new Error(message);
            setError(uploadError);
            options?.onError?.(uploadError);
            return false;
        } finally {
            clearInterval(progressInterval);
            setIsUploading(false);
        }
    };

    const reset = () => {
        setIsUploading(false);
        setUploadProgress(0);
        setError(null);
        setSuccess(false);
    };

    const clearError = () => setError(null);

    return {
        isUploading,
        uploadProgress,
        error,
        success,
        uploadFile,
        reset,
        clearError,
        isError: !!error,
        isSuccess: success,
    };
};
