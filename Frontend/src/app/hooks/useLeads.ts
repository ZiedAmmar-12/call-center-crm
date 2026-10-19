import { useState, useCallback, useEffect } from 'react'
import type { TreeCountryDto } from '../../types/sourceFiles';
import { sourceFileService } from '../../services/sourceFileService';

export function useLeads() {
  const [tree , setTree] = useState<TreeCountryDto[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

   const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Fetching tree from backend...');
      const data = await sourceFileService.getTree();
      console.log('🌲 Tree data received:', data);
      setTree(data);
    } catch (err) {
      console.error('❌ Failed to load tree:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tree on mount
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  

  const renameFile = useCallback(async (fileId: number, newName: string) => {
    try {
      await sourceFileService.renameFile(fileId, newName);
      await loadTree(); // Refresh tree after rename
    } catch (err) {
      console.error('Rename failed:', err);
    }
  }, [loadTree]);


  const uploadFichier = useCallback(async (
    file: File,
    countryId: number,
    leadTypeId: number,
    supplierId?: number,
    newSupplierName?: string
  ): Promise<boolean> => {
    try {
      const response = await sourceFileService.uploadFile({
        file,
        countryId,
        leadTypeId,
        supplierId,
        newSupplierName,
      });
      
      if (response.success) {
        const jobId = response.jobId || response.job?.id;
        if (jobId) {
          await sourceFileService.waitForJobCompletion(jobId);
        }
        await loadTree(); // Refresh tree after import completion
        return true;
      }
      return false;
    } catch (err) {
      console.error('Upload failed:', err);
      return false;
    }
  }, [loadTree]);

const refresh = useCallback(() => {
    loadTree();
  }, [loadTree]);





  return {
    tree,
    loading,
    error,
    renameFile,
    uploadFichier,
    refresh,
    showUploadModal,
    setShowUploadModal,
  };
}

export type LeadsHook = ReturnType<typeof useLeads>
