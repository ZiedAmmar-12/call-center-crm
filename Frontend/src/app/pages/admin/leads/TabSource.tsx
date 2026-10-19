// components/TabSource.tsx
import { useState, useMemo } from 'react';
import { useLeads } from '../../../hooks/useLeads';
import { FileUploader } from '../../../components/FileUploader';
import { sourceFileService } from '../../../../services/sourceFileService';
import FileSearch from '../../../components/FileSearch';
import type { TreeCountryDto, TreeLeadTypeDto, TreeFileDto, TreeSupplierDto } from '../../../../types/sourceFiles';
import { CampaignInjectionModal } from '../../../components/CampaignInjectionModal';
import { 
  ChevronRight, 
  ChevronDown, 
  Upload, 
  FileText, X,
  HardDrive, 
  Users, 
  RefreshCw,
  Edit2, Trash2,
  PlayCircle, Download, Search
} from 'lucide-react';
import { PERMISSIONS } from '../../../../types/permissions';
import PermissionGuard from '../../../components/PermissionGuard';
import { supplierService } from '../../../../services/supplierService';

const FILES_PER_PAGE = 10;

// ==================== FILE ROW COMPONENT ====================
function FileRow({ file, onRename, onInject, onDelete, onDownload }: { 
  file: TreeFileDto; 
  onRename: (id: number, newName: string) => Promise<void>; 
  onInject: (id: number, fileName?: string) => void;
  onDelete: (id: number) => void;
  onDownload: (id: number, fileName: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);    
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    if (editName.trim() && editName !== file.name) {
      setIsRenaming(true);
      try {
        await onRename(file.id, editName.trim());
      } finally {
        setIsRenaming(false);
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Supprimer "${file.name}" ?`)) {
      setIsDeleting(true);
      try {
        await onDelete(file.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const ext = file.format || 'csv';
      await onDownload(file.id, `${file.name}.${ext}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    original: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Original' },
    injecté: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Injecté' },
    traité: { color: 'text-green-600', bgColor: 'bg-green-50', label: 'Traité' },
    recyclé: { color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Recyclé' },
  };

  const status = statusConfig[file.statut] || { color: 'text-gray-600', bgColor: 'bg-gray-100', label: file.statut };
  
  return (
    <div className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/50">
      <div className="grid grid-cols-12 gap-3 px-4 py-3">
 
        {/* File name + date */}
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    autoFocus
                    disabled={isRenaming}
                  />
                  <PermissionGuard permission={PERMISSIONS.Files.Rename}>
                    <button
                      onClick={handleRename}
                      disabled={isRenaming}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isRenaming ? '...' : 'OK'}
                    </button>
                  </PermissionGuard>
                  <button
                    onClick={() => { setIsEditing(false); setEditName(file.name); }}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(file.uploadedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
 
        {/* Contact count */}
        <div className="col-span-3 md:col-span-2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-600">{file.contactCount.toLocaleString()}</span>
          </div>
        </div>
 
        {/* File size */}
        <div className="col-span-3 md:col-span-2">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-500">{file.fileSizeLabel}</span>
          </div>
        </div>
 
        {/* Status badge */}
        <div className="col-span-3 md:col-span-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        </div>
 
        {/* Actions */}
        <div className="col-span-12 md:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {/* Rename */}
            <button
              onClick={() => setIsEditing(true)}
              title="Renommer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <Edit2 className="h-3 w-3" />
              <span className="hidden sm:inline">Renommer</span>
            </button>
 
            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Supprimer"
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              <span className="hidden sm:inline">{isDeleting ? '...' : 'Supprimer'}</span>
            </button>
 
            {/* Inject */}
            <button
              onClick={() => onInject(file.id, file.name)}
              title="Injecter"
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-green-700 hover:to-green-600"
            >
              <PlayCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Injecter</span>
            </button>
 
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              title="Télécharger"
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-600 disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">{isDownloading ? '...' : 'Télécharger'}</span>
            </button>
          </div>
        </div>
 
      </div>
    </div>
  );
}

// ==================== SUPPLIER BLOCK COMPONENT ====================
function SupplierBlock({ supplier, onRename, onInject, onDelete, onRenameSupplier, onDeleteSupplier, onDownload }: {
  supplier: TreeSupplierDto;
  onRename: (id: number, newName: string) => Promise<void>;
  onInject: (id: number, fileName?: string) => void;
  onDelete: (id: number) => void;
  onRenameSupplier: (id: number, newName: string) => Promise<void>;
  onDeleteSupplier: (id: number) => void;
  onDownload: (id: number, fileName: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(supplier.name);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const filteredFiles = useMemo(
    () => supplier.sourceFiles.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase())
    ),
    [supplier.sourceFiles, search]
  );
  
  const visibleFiles = filteredFiles.slice(0, page * FILES_PER_PAGE);
  const hasMore = filteredFiles.length > visibleFiles.length;
  const remaining = filteredFiles.length - visibleFiles.length;
  const totalContacts = supplier.sourceFiles.reduce((sum, file) => sum + file.contactCount, 0);

  const handleRenameSubmit = async () => {
    if (editName.trim() && editName !== supplier.name) {
      await onRenameSupplier(supplier.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleDeleteSupplierClick = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le fournisseur "${supplier.name}" et tous ses fichiers ?`)) {
      await onDeleteSupplier(supplier.id);
    }
  };
  
  return (
    <div className="rounded-lg border border-gray-100 bg-white">
      {/* Supplier header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={isOpen ? 'Réduire' : 'Développer'}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
 
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button onClick={handleRenameSubmit} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">OK</button>
              <button onClick={() => { setIsEditing(false); setEditName(supplier.name); }} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="font-medium text-gray-800">{supplier.name}</span>
          )}
 
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              <FileText className="h-3 w-3" />
              {supplier.sourceFiles.length} fichier{supplier.sourceFiles.length > 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              <Users className="h-3 w-3" />
              {totalContacts.toLocaleString()}
            </span>
          </div>
        </div>
 
        <div className="flex items-center gap-1">
          <button onClick={() => setIsEditing(true)} title="Renommer le fournisseur" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDeleteSupplierClick} title="Supprimer le fournisseur" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
 
      {isOpen && (
        <div className="border-t border-gray-100">
          {supplier.sourceFiles.length > 5 && (
            <div className="border-b border-gray-100 px-4 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un fichier..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
 
          <div className="hidden border-b border-gray-100 bg-gray-50/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-400 md:grid md:grid-cols-12 md:gap-3">
            <div className="col-span-5">Fichier</div>
            <div className="col-span-2">Contacts</div>
            <div className="col-span-2">Taille</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-2">Actions</div>
          </div>
 
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {search ? `Aucun fichier correspondant à "${search}"` : 'Aucun fichier'}
            </div>
          ) : (
            <>
              {visibleFiles.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  onRename={onRename}
                  onInject={onInject}
                  onDelete={onDelete}
                  onDownload={onDownload}
                />
              ))}
 
              {hasMore && (
                <div className="border-t border-gray-100 px-4 py-3 text-center">
                  <button onClick={() => setPage(p => p + 1)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    Afficher {Math.min(remaining, FILES_PER_PAGE)} de plus
                    <span className="ml-1 text-gray-400">({remaining} restants)</span>
                  </button>
                </div>
              )}
 
              <div className="border-t border-gray-100 px-4 py-2 text-right">
                <span className="text-xs text-gray-400">
                  {search
                    ? `${filteredFiles.length} résultat${filteredFiles.length > 1 ? 's' : ''} sur ${supplier.sourceFiles.length}`
                    : `${visibleFiles.length} / ${supplier.sourceFiles.length} fichiers`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== LEAD TYPE BLOCK COMPONENT ====================
function LeadTypeBlock({ leadType, onRename, onInject, onDelete, onRenameSupplier, onDeleteSupplier, onDownload }: {
  leadType: TreeLeadTypeDto;
  onRename: (id: number, newName: string) => Promise<void>;
  onInject: (id: number, fileName?: string) => void;
  onDelete: (id: number) => void;
  onRenameSupplier: (id: number, newName: string) => Promise<void>;
  onDeleteSupplier: (id: number) => void;
  onDownload: (id: number, fileName: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  if (leadType.suppliers.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 transition-all hover:from-blue-100 hover:to-indigo-100"
      >
        <span className="text-blue-500">
          {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
        <span className="font-semibold text-blue-700">{leadType.code}</span>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs text-blue-600 backdrop-blur-sm">
          {leadType.suppliers.length} fournisseur(s)
        </span>
      </button>

      {isOpen && (
        <div className="ml-4 mt-2 space-y-2">
          {leadType.suppliers.map(supplier => (
            <SupplierBlock
              key={supplier.id}
              supplier={supplier}
              onRename={onRename}
              onInject={onInject}
              onDelete={onDelete}
              onRenameSupplier={onRenameSupplier}
              onDeleteSupplier={onDeleteSupplier}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== COUNTRY BLOCK COMPONENT ====================
function CountryBlock({ country, onRename, onInject, onDelete, onRenameSupplier, onDeleteSupplier, onDownload, defaultOpen=false }: {
  country: TreeCountryDto;
  defaultOpen?: boolean;
  onRename: (id: number, newName: string) => Promise<void>;
  onInject: (id: number, fileName?: string) => void;
  onDelete: (id: number) => void;
  onRenameSupplier: (id: number, newName: string) => Promise<void>;
  onDeleteSupplier: (id: number) => void;
  onDownload: (id: number, fileName: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (country.leadTypes.length === 0) return null;
  
  const totalFiles = country.leadTypes.reduce((sum, lt) => 
    sum + lt.suppliers.reduce((s, sup) => s + sup.sourceFiles.length, 0), 0);
  
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-gray-50 to-white px-6 py-4 transition-all hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">{country.code}</h3>
            <p className="text-xs text-gray-500">{country.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 sm:inline-flex">
            <FileText className="h-3 w-3" />
            {totalFiles} fichiers
          </span>
          <div className="rounded-full bg-gray-100 p-1">
            {isOpen ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
          </div>
        </div>
      </button>
 
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50/30 p-6">
          {country.leadTypes.map(leadType => (
            <LeadTypeBlock
              key={leadType.id}
              leadType={leadType}
              onRename={onRename}
              onInject={onInject}
              onDelete={onDelete}
              onRenameSupplier={onRenameSupplier}
              onDeleteSupplier={onDeleteSupplier}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MAIN TAB SOURCE COMPONENT ====================
export function TabSource() {
  const { tree, loading, error, refresh } = useLeads();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  // ✅ State for injection modal
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [selectedFileForInject, setSelectedFileForInject] = useState<{id: number, name: string} | null>(null);

  const sourceStats = useMemo(() => {
    return tree.reduce(
      (acc, country) => {
        acc.countries += 1;
        country.leadTypes.forEach((leadType) => {
          leadType.suppliers.forEach((supplier) => {
            acc.suppliers += 1;
            supplier.sourceFiles.forEach((file) => {
              acc.files += 1;
              acc.contacts += file.contactCount;
            });
          });
        });
        return acc;
      },
      { countries: 0, suppliers: 0, files: 0, contacts: 0 },
    );
  }, [tree]);

  const handleRename = async (id: number, newName: string) => {
    try {
      await sourceFileService.renameFile(id, newName);
      await refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur lors du renommage';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await sourceFileService.deleteFile(id);
      await refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur lors de la suppression';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleInject = (id: number, fileName?: string) => {
    console.log('Injecter fichier', id, fileName);
    setSelectedFileForInject({ id, name: fileName || `File ${id}` });
    setShowInjectionModal(true);
  };

  const handleRenameSupplier = async (id: number, newName: string) => {
    try {
      await supplierService.updateSupplier(id, newName);
      await refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur lors du renommage du fournisseur';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      await sourceFileService.downloadFileAs(id, fileName);
    } catch (error: any) {
      console.error('Download failed:', error);
      const msg = error?.response?.data?.message || 'Erreur lors du téléchargement du fichier';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
      if (error.response?.status === 404) {
        alert('Fichier non trouvé sur le serveur');
      } else if (error.response?.status === 403) {
        alert('Vous n\'avez pas la permission de télécharger ce fichier');
      } else {
        alert('Erreur lors du téléchargement du fichier');
      }
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    try {
      await supplierService.deleteSupplier(id);
      await refresh();
    } catch (err: any) {
      const msg = err?.response?.status === 403
        ? "Vous n'avez pas la permission de supprimer ce fournisseur"
        : err?.response?.data?.message || 'Erreur lors de la suppression du fournisseur';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-sm text-gray-500">Chargement des sources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Erreur</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sources de leads</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gérez vos fichiers sources organisés par pays, type de lead et fournisseur
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                  <FileText className="h-3.5 w-3.5" />
                  {sourceStats.files.toLocaleString('fr-FR')} fichiers
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                  <Users className="h-3.5 w-3.5" />
                  {sourceStats.contacts.toLocaleString('fr-FR')} contacts
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {sourceStats.countries.toLocaleString('fr-FR')} pays
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {sourceStats.suppliers.toLocaleString('fr-FR')} fournisseurs
                </span>
              </div>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`inline-flex items-center justify-center rounded-xl p-2.5 transition-all ${
                  showSearch
                    ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg hover:from-gray-700 hover:to-gray-600' 
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={showSearch ? "Fermer la recherche" : "Rechercher un fichier"}
              >
                <Search className="h-5 w-5" />
              </button>
              {!showSearch && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-600 hover:shadow-xl"
                >
                  <Upload className="h-4 w-4" />
                  Ajouter une source
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="mb-8">
            <FileUploader
              onClose={() => {
                setShowUploadModal(false);
                refresh();
              }}
              onUploadSuccess={() => {
                setShowUploadModal(false);
                refresh();
              }}
            />
          </div>
        )}
        
        {/* Action Error Message */}
        {actionError && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {actionError}
          </div>
        )}
        
        {/* Conditional Rendering: Search View OR Tree View */}
        {showSearch ? (
          <FileSearch />
        ) : (
          <>
            {tree.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center transition-all hover:border-gray-300">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  <FileText className="h-9 w-9 text-blue-500" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun fichier source</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Commencez par ajouter votre premier fichier source
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  Ajouter un fichier
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tree.map((country, index) => (
                  <CountryBlock
                    key={country.id}
                    country={country}
                    onRename={handleRename}
                    onInject={handleInject}
                    defaultOpen={index === 0}
                    onDelete={handleDelete}
                    onRenameSupplier={handleRenameSupplier}
                    onDeleteSupplier={handleDeleteSupplier}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ✅ INJECTION MODAL - Placed here, outside the conditional rendering */}
        {showInjectionModal && selectedFileForInject && (
          <CampaignInjectionModal
            fileId={selectedFileForInject.id}
            fileName={selectedFileForInject.name}
            onClose={() => {
              setShowInjectionModal(false);
              setSelectedFileForInject(null);
            }}
            onSuccess={() => {
              refresh(); // Refresh the tree to show updated file status
              setShowInjectionModal(false);
              setSelectedFileForInject(null);
            }}
          />
        )}

      </div>
    </div>
  );
}
