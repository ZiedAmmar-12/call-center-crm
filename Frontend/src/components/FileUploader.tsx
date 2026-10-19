import React, { useState, useEffect, useRef } from 'react';
import { sourceFileService } from '../services/SourceFileService';
import type { SourceFileResponseDto, SourceFileUploadDto } from '../types/sourceFiles';
import type { Supplier } from '../types/Supplier';
import { supplierService } from '../services/supplierService';
import type { Country } from '../types/country';
import type { LeadType } from '../types/leadType';
import { countryService } from '../services/countryService';
import { leadTypeService } from '../services/leadTypeService';
import countryPrefix from "../config/countryPrefixes.json";
import type { FileValidationReportDto, InvalidRowDto } from '../types/sourceFiles';
import { AlertTriangle, CheckCircle2, Download, FileCheck2, FileText, FileWarning, ListChecks, RefreshCw, UploadCloud, X, XCircle } from 'lucide-react';
import { ColumnMapping, type ColumnMappingStatus } from './ColumnMapping';
import { DataPreview } from './DataPreview';
interface FileUploaderProps {
    onUploadSuccess?: (file: SourceFileResponseDto | null) => void;
    onUploadError?: (error: Error) => void;
    onClose?: () => void;
    className?: string;
}

interface UploadProgress {
    percentage: number;
    message: string;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    step: 'validating' | 'counting' | 'processing_contacts' | 'saving' | 'done';
}

const defaultColumnMappingStatus: ColumnMappingStatus = {
    isCsv: false,
    isLoading: false,
    hasDetectedColumns: false,
    hasPhoneMapping: true,
};

const workflowSteps = [
    { id: 1, label: 'Details', caption: 'Pays et fournisseur' },
    { id: 2, label: 'Mapping', caption: 'Colonnes du fichier' },
    { id: 3, label: 'Validation', caption: 'Controle des contacts' },
    { id: 4, label: 'Import', caption: 'Creation de la source' },
] as const;

export const FileUploader: React.FC<FileUploaderProps> = ({
    onUploadSuccess,
    onUploadError,
    onClose,
    className = ''
}) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [selectedLeadType, setSelectedLeadType] = useState<LeadType | null>(null);
    const [supplierId, setSupplierId] = useState<string>('');
    const [newSupplierName, setNewSupplierName] = useState<string>('');
    const [isNewSupplier, setIsNewSupplier] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [countries, setCountries] = useState<Country[]>([]);
    const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
    const [loadingLeadTypes, setLoadingLeadTypes] = useState(false);
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [isAddingCountry, setIsAddingCountry] = useState(false);
    const [showAddCountryModal, setShowAddCountryModal] = useState(false);
    const [newCountryName, setNewCountryName] = useState('');
    const [isAddingLeadType, setIsAddingLeadType] = useState(false);
    const [showAddLeadTypeModal, setShowAddLeadTypeModal] = useState(false);
    const [newLeadTypeName, setNewLeadTypeName] = useState('');
    const [newLeadTypeCode, setNewLeadTypeCode] = useState('');
    const [warning, setWarning] = useState<string | null>(null);
    
    const [progress, setProgress] = useState<UploadProgress>({
        percentage: 0,
        message: '',
        status: 'uploading',
        step: 'validating'
    });
    const [validationReport, setValidationReport] = useState<FileValidationReportDto | null>(null);
    const [showValidationReport, setShowValidationReport] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [columnMappingStatus, setColumnMappingStatus] = useState<ColumnMappingStatus>(defaultColumnMappingStatus);

    
    // Reference for abort controller to cancel upload if needed
    const abortControllerRef = useRef<AbortController | null>(null);

    // ── Load countries on mount ──────────────────────────────────────────────
    useEffect(() => {
        const loadCountries = async () => {
            setLoadingCountries(true);
            try {
                const data = await countryService.getAllCountries();
                setCountries(data);
                if (data.length > 0) setSelectedCountry(data[0]);
            } catch (err) {
                console.error('Failed to load countries:', err);
                setError('Failed to load countries');
            } finally {
                setLoadingCountries(false);
            }
        };
        loadCountries();
    }, []);

    // ── Load lead types when country changes ─────────────────────────────────
    useEffect(() => {
        const loadLeadTypes = async () => {
            if (!selectedCountry) return;
            setLoadingLeadTypes(true);
            try {
                const data = await leadTypeService.getLeadTypesByCountry(selectedCountry.id);
                setLeadTypes(data);
                if (data.length > 0) setSelectedLeadType(data[0]);
            } catch (err) {
                console.error('Failed to load lead types:', err);
                setError('Failed to load lead types');
            } finally {
                setLoadingLeadTypes(false);
            }
        };
        loadLeadTypes();
    }, [selectedCountry]);

    // ── Load suppliers when country or lead type changes ─────────────────────
    useEffect(() => {
        const loadSuppliers = async () => {
            if (!selectedCountry || !selectedLeadType) {
                setSuppliers([]);
                return;
            }
            setLoadingSuppliers(true);
            try {
                const data = await supplierService.getSuppliersByFilters(
                    selectedCountry.id, selectedLeadType?.id);
                
                console.log('raw data from service:', data);        // ← add this
                console.log('is array:', Array.isArray(data));      // ← add this
                console.log('length:', data?.length);               
                    setSuppliers(Array.isArray(data) ? data : []);   
            } catch (err) {
                console.error('Failed to load suppliers:', err);
                setError('Failed to load suppliers');
            } finally {
                setLoadingSuppliers(false);
            }
        };
        loadSuppliers();
    }, [selectedCountry, selectedLeadType]);

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // ── Reset form ──────────────────────────────────────────────────────────
    const resetForm = () => {
        setSelectedFile(null);
        setSupplierId('');
        setNewSupplierName('');
        setIsNewSupplier(false);
        setError(null);
        setWarning(null);
        setColumnMapping({});
        setColumnMappingStatus(defaultColumnMappingStatus);
        setValidationReport(null);
        setShowValidationReport(false);
        setProgress({
            percentage: 0,
            message: '',
            status: 'uploading',
            step: 'validating'
        });
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    // ── Validation ──────────────────────────────────────────────────────────
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        if (!file) return { valid: false, error: "No file selected" };
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return { valid: false, error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` };
        }
        const maxSize = 100 * 1024 * 1024; // 100MB max
        if (file.size > maxSize) {
            return { valid: false, error: `File too large. Max size: 100MB. Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB` };
        }
        return { valid: true };
    };

    const getActiveColumnMapping = () =>
        Object.fromEntries(
            Object.entries(columnMapping).filter(([, targetField]) => targetField.trim())
        );

    const isMappingLoading = Boolean(selectedFile && columnMappingStatus.isCsv && columnMappingStatus.isLoading);
    const isMissingPhoneMapping = Boolean(
        selectedFile &&
        columnMappingStatus.isCsv &&
        columnMappingStatus.hasDetectedColumns &&
        !columnMappingStatus.hasPhoneMapping
    );
    const isMappingBlockingValidation = isMappingLoading || isMissingPhoneMapping;
    const mappingBlockerMessage = isMappingLoading
        ? 'Lecture des colonnes du fichier en cours...'
        : isMissingPhoneMapping
            ? 'Selectionnez la colonne telephone avant de valider le fichier.'
            : null;

    const handleValidate = async () => {
         // Validation
        if (!selectedFile) { setError('Please select a file'); return; }
        if (!selectedCountry) { setError('Please select a country'); return; }
        if (!selectedLeadType) { setError('Please select a lead type'); return; }
        if (!isNewSupplier && (!supplierId || supplierId === '')) { setError('Please select a supplier'); return; }
        if (isNewSupplier && !newSupplierName.trim()) { setError('Please enter supplier name'); return; }
        if (isMappingBlockingValidation) { setError(mappingBlockerMessage || 'Please complete column mapping'); return; }

        const safeFile = new File(
            [selectedFile],
            selectedFile.name.replace(/[/\\]/g, '').replace(/\.\./g, ''),
            { type: selectedFile.type }
        );
        const uploadDto: SourceFileUploadDto = {
                file: safeFile,
                countryId: selectedCountry.id,
                leadTypeId: selectedLeadType.id,
            };

            if (!isNewSupplier && supplierId && supplierId !== '') {
                uploadDto.supplierId = parseInt(supplierId, 10);
            }
            if (isNewSupplier && newSupplierName.trim()) {
                uploadDto.newSupplierName = newSupplierName;
            }
            const activeColumnMapping = getActiveColumnMapping();
            if (Object.keys(activeColumnMapping).length > 0) {
                uploadDto.columnMapping = activeColumnMapping;
            }
            setIsValidating(true);
            setError(null);
        try {
            var result = await sourceFileService.validateFile(uploadDto);
            console.log('Validation result:', result);
            console.log('Validation result:', JSON.stringify(result));

            console.log('Invalid rows:', result.invalidRows);
            setValidationReport(result);
            setShowValidationReport(true);
        }
        catch (err: any) {
            console.error('Validation error:', err);
            const msg = err?.response?.data?.message || 'Validation failed. Please try again.';
            setError(msg);
        }
        finally {
            setIsValidating(false);}
            
    }
    const handleDownloadErrorReport = () => {
        if (!validationReport || validationReport.invalidRows.length === 0) return;
        const csvLines:string[] =[];
        csvLines.push('Ligne,Téléphone,Nom,Raison');
        //build each row
        validationReport.invalidRows.forEach(row => {
            const line =[
                row.rowNumber ?? '',
                row.phone ?? '',
                row.name ?? '',
                row.reason ?? ''
            ]
            .map(field => {
            const str = String(field);
            // Wrap in quotes if contains comma, quote, or newline
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        })
        .join(',');

        csvLines.push(line);
    });
    //convert to string
    const csvContent = csvLines.join('\n');
    //create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download=`rapport_erreur_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    //cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

    const handleFileSelect = (file: File) => {
        const validation = validateFile(file);
        if (!validation.valid) {
            setError(validation.error || "Invalid file");
            setWarning(null);
            return;
        }
        setSelectedFile(file);
        setError(null);
        setWarning(null);
        setColumnMapping({});
        setColumnMappingStatus(defaultColumnMappingStatus);
        setValidationReport(null);
        setShowValidationReport(false);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const getPreviewFileName = (): string => {
        if (!selectedFile) return 'No file selected';
        const nameWithoutExtension = selectedFile.name.replace(/\.(csv|xlsx|xls)$/i, '');
        const listNum = suppliers.length + 1;
        return `${nameWithoutExtension} - List ${listNum}`;
    };

    const generatePhonePrefix = (name: string): string => {
        const normalized = name.toLowerCase().trim();
        return (countryPrefix as Record<string, string>)[normalized] || '';
    };

    const generateCountryCode = (name: string) => {
        return name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    };

    const handleAddCountry = async () => {
        if (!newCountryName.trim()) { setError('Country name is required'); return; }
        setIsAddingCountry(true);
        const countryExists = countries.some(
            c => c.name.toLowerCase() === newCountryName.trim().toLowerCase());
        if (countryExists) {
            setError(`Country "${newCountryName}" already exists!`);
            setIsAddingCountry(false);
            return;
        }
        try {
            const newCountry = await countryService.createCountry({
                name: newCountryName.trim(),
                code: generateCountryCode(newCountryName),
                phonePrefix: generatePhonePrefix(newCountryName)
            });
            setCountries(prev => [...prev, newCountry]);
            setSelectedCountry(newCountry);
            setShowAddCountryModal(false);
            setNewCountryName('');
            setError(null);
        } catch (err: any) {
            if (err.message?.includes('already exists') || err.response?.status === 409) {
                setError(`Country "${newCountryName}" already exists in the database.`);
                const freshCountries = await countryService.getAllCountries();
                setCountries(freshCountries);
            } else {
                setError('Failed to add country. Please try again.');
            }
        } finally {
            setIsAddingCountry(false);
        }
    };

    const handleAddLeadType = async () => {
        if (!newLeadTypeCode.trim()) { setError('Lead type code is required'); return; }
        if (!selectedCountry) { setError('Please select a country first'); return; }
        setIsAddingLeadType(true);
        const LeadTypeExists = leadTypes.some(
            lt => lt.code.toLowerCase() === newLeadTypeCode.trim().toLowerCase());
        if (LeadTypeExists) {
            setError(`Lead type "${newLeadTypeCode}" already exists for this country!`);
            setIsAddingLeadType(false);
            return;
        }
        try {
            const newLeadType = await leadTypeService.createLeadType({
                code: newLeadTypeCode.trim().toUpperCase(),
                name: newLeadTypeName.trim() || newLeadTypeCode.trim(),
                isActive: true,
                createdAt: new Date().toISOString(),
                CountryId: selectedCountry.id
            });
            setLeadTypes(prev => [...prev, newLeadType]);
            setSelectedLeadType(newLeadType);
            setShowAddLeadTypeModal(false);
            setNewLeadTypeCode('');
            setNewLeadTypeName('');
            setError(null);
        } catch (err: any) {
            if (err.message?.includes('already exists') || err.response?.status === 409) {
                setError(`Lead type "${newLeadTypeCode}" already exists for this country.`);
                const freshLeadTypes = await leadTypeService.getAllLeadTypes();
                setLeadTypes(freshLeadTypes);
            } else {
                setError('Failed to add lead type. Please try again.');
            }
        } finally {
            setIsAddingLeadType(false);
        }
    };

    // ── Simulate progress steps ──────────────────────────────────────────────
    const simulateProgress = (step: UploadProgress['step'], onComplete?: () => void) => {
        const steps = {
            validating: { message: 'Validation du fichier...', maxPercent: 20 },
            counting: { message: 'Comptage des contacts...', maxPercent: 35 },
            processing_contacts: { message: 'Traitement des contacts...', maxPercent: 70 },
            saving: { message: 'Sauvegarde en base de données...', maxPercent: 90 },
            done: { message: 'Terminé !', maxPercent: 100 }
        };

        const currentStep = steps[step];
        let currentPercent = progress.percentage;
        
        const interval = setInterval(() => {
            if (currentPercent < currentStep.maxPercent) {
                currentPercent += Math.random() * 5;
                if (currentPercent > currentStep.maxPercent) {
                    currentPercent = currentStep.maxPercent;
                }
                setProgress(prev => ({
                    ...prev,
                    percentage: Math.min(currentPercent, currentStep.maxPercent),
                    message: currentStep.message,
                    step: step
                }));
            } else {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, 300);

        return () => clearInterval(interval);
    };

    const waitForImportJob = async (jobId: string | number) => {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const status = await sourceFileService.getJobStatus(jobId);
            const job = status.job;

            if (job.status === 'Failed') {
                throw new Error(job.errorMessage || 'Import failed.');
            }

            if (job.status === 'Completed') {
                setProgress({
                    percentage: 100,
                    message: 'Import terminé avec succès !',
                    status: 'completed',
                    step: 'done'
                });
                return job;
            }

            const hasTotal = job.totalRows > 0;
            const percentage = hasTotal
                ? Math.min(95, 35 + (job.processedRows / job.totalRows) * 60)
                : job.status === 'Processing'
                    ? 65
                    : 35;

            setProgress({
                percentage,
                message: job.status === 'Processing'
                    ? `Import en cours - ${job.validContacts.toLocaleString()} contacts valides`
                    : 'Import en file d\'attente...',
                status: 'processing',
                step: job.status === 'Processing' ? 'processing_contacts' : 'saving'
            });
        }
    };

    // ── Main upload handler with real progress ───────────────────────────────
    const handleUpload = async () => {
    // Validation
    if (!selectedFile) { setError('Please select a file'); return; }
    if (!selectedCountry) { setError('Please select a country'); return; }
    if (!selectedLeadType) { setError('Please select a lead type'); return; }
    if (!isNewSupplier && (!supplierId || supplierId === '')) { setError('Please select a supplier'); return; }
    if (isNewSupplier && !newSupplierName.trim()) { setError('Please enter supplier name'); return; }
    if (isMappingBlockingValidation) { setError(mappingBlockerMessage || 'Please complete column mapping'); return; }

    // Sanitize filename for security
    const safeFile = new File(
        [selectedFile],
        selectedFile.name.replace(/[/\\]/g, '').replace(/\.\./g, ''),
        { type: selectedFile.type }
    );
    //setup upload state
    setIsUploading(true);
    setError(null);
    setWarning(null);
    
    // Create abort controller for this upload
    abortControllerRef.current = new AbortController();

    // Start progress simulation
    let cleanupProgress: (() => void) | null = null;
    
    try {
        // Step 1: Validating
        cleanupProgress = simulateProgress('validating');
        
        const uploadDto: SourceFileUploadDto = {
            file: safeFile,
            countryId: selectedCountry.id,
            leadTypeId: selectedLeadType.id,
        };

        if (!isNewSupplier && supplierId && supplierId !== '') {
            uploadDto.supplierId = parseInt(supplierId, 10);
        }
        if (isNewSupplier && newSupplierName.trim()) {
            uploadDto.newSupplierName = newSupplierName;
        }
        const activeColumnMapping = getActiveColumnMapping();
        if (Object.keys(activeColumnMapping).length > 0) {
            uploadDto.columnMapping = activeColumnMapping;
        }
        {selectedFile && columnMapping && Object.keys(columnMapping).length > 0 && (
            <DataPreview
                file={selectedFile}
                columnMapping={getActiveColumnMapping()}
            />
        )}
        // Cleanup previous simulation
        if (cleanupProgress) cleanupProgress();
        
        // Step 2: Counting
        cleanupProgress = simulateProgress('counting');
        
        // Small delay to show counting step
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (cleanupProgress) cleanupProgress();
        
        // Step 3: Processing contacts
        cleanupProgress = simulateProgress('processing_contacts');
        
        // Actual API call
        const response = await sourceFileService.uploadFile(uploadDto);
        console.log('Upload response ', response);

        if (cleanupProgress) cleanupProgress();

        const jobId = response.jobId || response.job?.id;
        if (response.success === false || !jobId) {
            throw new Error(response.message || 'Upload failed');
        }

        setProgress({
            percentage: 35,
            message: 'Import en file d\'attente...',
            status: 'processing',
            step: 'saving'
        });

        const completedJob = await waitForImportJob(jobId);

        if (completedJob.invalidContacts > 0) {
            setWarning(
                `Import terminé. ${completedJob.invalidContacts.toLocaleString()} ligne(s) invalide(s) conservée(s) dans le rapport d'import.`
            );
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        resetForm();
        onUploadSuccess?.(null);
        onClose?.();
        
    } catch (err: any) {
        if (cleanupProgress) cleanupProgress();

        if (err.name === 'AbortError') {
            setError("Upload annulé par l'utilisateur");
        } else {
            const backendMessage = 
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.response?.data ||
                err.message ||
                'Erreur lors de l\'upload. Veuillez réessayer.';

            console.error('Upload error:', {
                status: err.response?.status,
                message: backendMessage,
                data: err.response?.data
            });

            setError(backendMessage);
            onUploadError?.(new Error(backendMessage));
        }

        setProgress({
            percentage: 0,
            message: 'Erreur',
            status: 'error',
            step: 'validating'
        });
    } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
    }
};
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        resetForm();
        onClose?.();
    };

    // ── Get progress bar color ───────────────────────────────────────────────
    const getProgressColor = (): string => {
        if (progress.status === 'error') return 'bg-red-500';
        if (progress.status === 'completed') return 'bg-green-500';
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
    };

    // ── Get status icon ──────────────────────────────────────────────────────
    const getStatusIcon = () => {
        if (progress.status === 'completed') {
            return (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
            );
        }
        if (progress.status === 'error') {
            return (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                </div>
            );
        }
        return (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        );
    };

    const formatNumber = (value: number | undefined) => (value ?? 0).toLocaleString('fr-FR');
    const isBaseDuplicateRow = (row: InvalidRowDto) =>
        (row.reason ?? '').toLowerCase().includes('doublon base');
    const baseDuplicateCount = validationReport?.invalidRows?.filter(isBaseDuplicateRow).length ?? 0;
    const validationIssueCount = validationReport
        ? validationReport.invalidPhones + validationReport.emptyRows + validationReport.duplicates + baseDuplicateCount
        : 0;
    const getValidationRowLabel = (row: InvalidRowDto) => {
        if (row.rowNumber > 0) return row.rowNumber.toString();
        return isBaseDuplicateRow(row) ? 'Base' : '-';
    };
    const validationRate = validationReport && validationReport.totalLines > 0
        ? Math.round((validationReport.validContacts / validationReport.totalLines) * 100)
        : 0;
    const invalidRowsPreview = validationReport?.invalidRows?.slice(0, 6) ?? [];
    const selectedFileSizeLabel = selectedFile
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
        : '';
    const selectedFileExtension = selectedFile?.name.split('.').pop()?.toUpperCase() ?? '';
    const activeWorkflowStep = isUploading || showValidationReport
        ? 4
        : isValidating
            ? 3
            : selectedFile
                ? 2
                : 1;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Ajouter une source de leads</h3>
                        <p className="mt-1 text-sm text-gray-500">Configurez le fournisseur, importez le fichier, puis validez les contacts.</p>
                    </div>
                    {onClose && !isUploading && (
                        <button onClick={handleCancel} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Fermer">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="space-y-6 p-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-4">
                            {workflowSteps.map((step) => {
                                const isComplete = step.id < activeWorkflowStep || (step.id === 4 && progress.status === 'completed');
                                const isActive = step.id === activeWorkflowStep && !isComplete;

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-2 ${
                                            isActive
                                                ? 'bg-white shadow-sm ring-1 ring-blue-200'
                                                : isComplete
                                                    ? 'bg-green-50'
                                                    : 'bg-transparent'
                                        }`}
                                    >
                                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                            isComplete
                                                ? 'bg-green-600 text-white'
                                                : isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-500 ring-1 ring-gray-200'
                                        }`}>
                                            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`truncate text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>
                                                {step.label}
                                            </p>
                                            <p className="truncate text-xs text-gray-500">{step.caption}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Country & Lead Type Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Country */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Pays *</label>
                            <select
                                value={selectedCountry?.id || ''}
                                onChange={(e) => {
                                    const found = countries.find(c => c.id === parseInt(e.target.value, 10));
                                    setSelectedCountry(found || null);
                                    setSelectedLeadType(null);
                                    setSupplierId('');
                                }}
                                disabled={loadingCountries || isUploading}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">
                                    {loadingCountries ? 'Chargement des pays...' : '-- Sélectionnez un pays --'}
                                </option>
                                {countries.map(country => (
                                    <option key={country.id} value={country.id}>{country.name}</option>
                                ))}
                            </select>
                            {!showAddCountryModal ? (
                                <button 
                                    onClick={() => setShowAddCountryModal(true)} 
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                    disabled={isUploading}
                                >
                                    + Ajouter un pays
                                </button>
                            ) : (
                                <div className="mt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Nom du pays" 
                                        value={newCountryName}
                                        onChange={(e) => setNewCountryName(e.target.value)}
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                                        autoFocus 
                                    />
                                    <button 
                                        onClick={handleAddCountry} 
                                        disabled={isAddingCountry}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                    >
                                        {isAddingCountry ? 'Ajout...' : 'Sauvegarder'}
                                    </button>
                                    <button 
                                        onClick={() => { setShowAddCountryModal(false); setNewCountryName(''); }}
                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Lead Type */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Type de lead *</label>
                            <select
                                value={selectedLeadType?.id || ''}
                                onChange={(e) => {
                                    const found = leadTypes.find(l => l.id === parseInt(e.target.value, 10));
                                    setSelectedLeadType(found || null);
                                    setSupplierId('');
                                }}
                                disabled={!selectedCountry || loadingLeadTypes || isUploading}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">
                                    {loadingLeadTypes ? 'Chargement des types...' : '-- Sélectionnez un type --'}
                                </option>
                                {leadTypes.map(leadType => (
                                    <option key={leadType.id} value={leadType.id}>{leadType.code} - {leadType.name}</option>
                                ))}
                            </select>
                            {!showAddLeadTypeModal ? (
                                <button 
                                    onClick={() => setShowAddLeadTypeModal(true)} 
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                                    disabled={!selectedCountry || isUploading}
                                >
                                    + Ajouter un type de lead
                                </button>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Code du type (ex: B2B)" 
                                        value={newLeadTypeCode}
                                        onChange={(e) => setNewLeadTypeCode(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                                        autoFocus 
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Nom du type (optionnel)" 
                                        value={newLeadTypeName}
                                        onChange={(e) => setNewLeadTypeName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleAddLeadType} 
                                            disabled={isAddingLeadType}
                                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                                        >
                                            {isAddingLeadType ? 'Ajout...' : 'Sauvegarder'}
                                        </button>
                                        <button 
                                            onClick={() => { setShowAddLeadTypeModal(false); setNewLeadTypeCode(''); setNewLeadTypeName(''); }}
                                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Supplier */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Fournisseur *</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input 
                                    type="radio" 
                                    checked={!isNewSupplier} 
                                    onChange={() => setIsNewSupplier(false)} 
                                    disabled={isUploading}
                                />
                                <span className="text-sm">Fournisseur existant</span>
                            </label>
                            {!isNewSupplier && (
                                <select 
                                    value={supplierId} 
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="ml-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    disabled={loadingSuppliers || isUploading}
                                >
                                    <option value="">Sélectionnez un fournisseur</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            )}
                            <label className="flex items-center gap-2">
                                <input 
                                    type="radio" 
                                    checked={isNewSupplier} 
                                    onChange={() => setIsNewSupplier(true)} 
                                    disabled={isUploading}
                                />
                                <span className="text-sm">Nouveau fournisseur</span>
                            </label>
                            {isNewSupplier && (
                                <input 
                                    type="text" 
                                    placeholder="Nom du nouveau fournisseur" 
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    disabled={isUploading}
                                    className="ml-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            )}
                        </div>
                    </div>

                    {/* File and mapping */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fichier source *</label>
                                <p className="mt-0.5 text-xs text-gray-500">CSV, XLSX ou XLS jusqu'a 100 MB.</p>
                            </div>
                            {selectedFile && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                    {selectedFileExtension}
                                </span>
                            )}
                        </div>

                        <div
                            className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
                                dragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : selectedFile
                                        ? 'border-gray-200 bg-white hover:border-blue-300'
                                        : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'
                            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={() => document.getElementById('fileInput')?.click()}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {selectedFile ? (
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
                                                Pret
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span>{selectedFileSizeLabel}</span>
                                            <span>{getPreviewFileName()}</span>
                                        </div>
                                    </div>
                                    {!isUploading && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                setColumnMapping({});
                                                setColumnMappingStatus(defaultColumnMappingStatus);
                                            }}
                                            className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                        >
                                            Retirer
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-gray-200">
                                        <UploadCloud className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">Glissez le fichier ici</p>
                                    <p className="mt-1 text-sm text-gray-500">ou cliquez pour parcourir vos fichiers</p>
                                </div>
                            )}
                            <input
                                id="fileInput"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
                            />
                        </div>

                        {selectedFile && (
                            <ColumnMapping
                                file={selectedFile}
                                value={columnMapping}
                                onChange={setColumnMapping}
                                onStatusChange={setColumnMappingStatus}
                                disabled={isUploading || isValidating || showValidationReport}
                            />
                        )}

                        {mappingBlockerMessage && (
                            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                                isMappingLoading
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'border-red-200 bg-red-50 text-red-700'
                            }`}>
                                {isMappingLoading
                                    ? <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                                    : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                                <span>{mappingBlockerMessage}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Section */}
                    {isUploading && (
                        <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                            <div className="flex items-center gap-3">
                                {getStatusIcon()}
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{progress.message}</p>
                                    <p className="text-xs text-gray-500">
                                        {progress.step === 'validating' && 'Vérification du format...'}
                                        {progress.step === 'counting' && 'Comptage des contacts...'}
                                        {progress.step === 'processing_contacts' && 'Validation des numéros...'}
                                        {progress.step === 'saving' && 'Enregistrement...'}
                                        {progress.step === 'done' && 'Finalisation...'}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{Math.round(progress.percentage)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`}
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            {progress.percentage < 100 && (
                                <p className="text-center text-xs text-gray-500">
                                    Veuillez patienter, cette opération peut prendre quelques instants...
                                </p>
                            )}
                        </div>
                    )}

                    {/* Warning Message */}
                    {warning && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-sm text-yellow-800">{warning}</p>
                                </div>
                                <button
                                    onClick={() => { setWarning(null); resetForm(); onClose?.(); }}
                                    className="text-xs text-yellow-600 underline hover:text-yellow-700"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-4">
                            <div className="flex items-start gap-2">
                                <span className="text-xl">❌</span>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {showValidationReport && validationReport && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                        validationIssueCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                        {validationIssueCount > 0 ? <FileWarning className="h-5 w-5" /> : <FileCheck2 className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">Rapport de validation</h4>
                                        <p className="mt-0.5 text-sm text-gray-500">
                                            {validationIssueCount > 0
                                                ? `${formatNumber(validationIssueCount)} point(s) a verifier avant import`
                                                : 'Le fichier est pret pour import'}
                                        </p>
                                    </div>
                                </div>
                                <div className="min-w-[120px]">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Validite</span>
                                        <span className="font-medium text-gray-700">{validationRate}%</span>
                                    </div>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className={`h-full rounded-full ${validationIssueCount > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                                            style={{ width: `${validationRate}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                                <div className="rounded-lg bg-gray-50 px-3 py-2">
                                    <p className="text-xs text-gray-500">Lignes</p>
                                    <p className="mt-1 text-base font-semibold text-gray-900">{formatNumber(validationReport.totalLines)}</p>
                                </div>
                                <div className="rounded-lg bg-green-50 px-3 py-2">
                                    <p className="text-xs text-green-700">Valides</p>
                                    <p className="mt-1 text-base font-semibold text-green-800">{formatNumber(validationReport.validContacts)}</p>
                                </div>
                                <div className="rounded-lg bg-red-50 px-3 py-2">
                                    <p className="text-xs text-red-700">Invalides</p>
                                    <p className="mt-1 text-base font-semibold text-red-800">{formatNumber(validationReport.invalidPhones)}</p>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-3 py-2">
                                    <p className="text-xs text-amber-700">Vides</p>
                                    <p className="mt-1 text-base font-semibold text-amber-800">{formatNumber(validationReport.emptyRows)}</p>
                                </div>
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-xs text-blue-700">Doublons</p>
                                    <p className="mt-1 text-base font-semibold text-blue-800">{formatNumber(validationReport.duplicates)}</p>
                                </div>
                                <div className="rounded-lg bg-cyan-50 px-3 py-2">
                                    <p className="text-xs text-cyan-700">Deja en base</p>
                                    <p className="mt-1 text-base font-semibold text-cyan-800">{formatNumber(baseDuplicateCount)}</p>
                                </div>
                            </div>

                            {invalidRowsPreview.length > 0 && (
                                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                            <ListChecks className="h-4 w-4 text-gray-400" />
                                            Lignes a corriger
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {formatNumber(validationReport.invalidRows.length)} erreur(s)
                                        </span>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-white text-xs uppercase text-gray-400">
                                                <tr>
                                                    <th className="px-3 py-2 font-medium">Ligne</th>
                                                    <th className="px-3 py-2 font-medium">Telephone</th>
                                                    <th className="px-3 py-2 font-medium">Nom</th>
                                                    <th className="px-3 py-2 font-medium">Raison</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {invalidRowsPreview.map((row, index) => (
                                                    <tr key={`${row.rowNumber}-${index}`} className="align-top">
                                                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                                            {getValidationRowLabel(row)}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-700">{row.phone || '-'}</td>
                                                        <td className="px-3 py-2 text-gray-700">{row.name || '-'}</td>
                                                        <td className="px-3 py-2 text-gray-600">{row.reason || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {validationReport.invalidRows.length > invalidRowsPreview.length && (
                                        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                                            {formatNumber(validationReport.invalidRows.length - invalidRowsPreview.length)} autre(s) ligne(s) dans le rapport CSV.
                                        </div>
                                    )}
                                </div>
                            )}

                            {validationIssueCount > 0 && (
                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    Les contacts valides peuvent etre importes. Les lignes invalides seront ignorees ou disponibles dans le rapport.
                                </div>
                            )}

                            <ul className="hidden">
                                <li>Total de contacts dans le fichier : {validationReport.totalLines}</li>
                                <li>Contacts valides : {validationReport.validContacts}</li>
                                <li>Numéros invalides : {validationReport.invalidPhones}</li>
                                <li>Lignes vides : {validationReport.emptyRows}</li>
                                <li>Contacts en double : {validationReport.duplicates}</li>
                                {(validationReport.invalidRows?.length  ?? 0 ) > 0 && (
                                    <li>
                                        Détails des lignes invalides :
                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-blue-600">
                                            {validationReport.invalidRows.slice(0, 5).map((row, index) => (
                                                <li key={index}>        
                                                    <strong>{row.rowNumber > 0 ? `Ligne ${row.rowNumber}` : 'Base'} :</strong> {row.reason}                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        {onClose && (
                            <button 
                                onClick={handleCancel} 
                                disabled={isUploading}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                                Annuler
                            </button>
                        )}
                        {!showValidationReport && (
                            <>
                                <button
                                    onClick={handleValidate}
                                    disabled={!selectedFile || isValidating || isUploading || isMappingBlockingValidation}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                                    {isValidating ? 'Validation en cours...' : 'Previsualiser'}
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || isUploading || isMappingBlockingValidation}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isUploading && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {isUploading ? 'Import en cours...' : 'Confirmer l\'import'}
                                </button>
                            </>
                        )}
                        {showValidationReport && (
                            <>
                                {validationReport && (validationReport.invalidRows?.length  ?? 0 ) > 0 && (
                                    <button
                                        onClick={handleDownloadErrorReport}
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-red-700"
                                    >
                                        <Download className="h-4 w-4" />
                                        Télécharger le rapport d'erreurs
                                    </button>
                                    )}
                                <button
                                    onClick={() => { setShowValidationReport(false); setValidationReport(null); }}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                    Modifier
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isUploading && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {isUploading ? 'Traitement en cours...' : 'Confirmer l\'import'}

                                </button>
                            </>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
};
