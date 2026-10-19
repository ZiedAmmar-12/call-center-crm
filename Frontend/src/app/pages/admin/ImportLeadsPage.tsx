// ImportLeadsPage.tsx — updated with: column mapping preview, dedup control,
// scheduled injection, priority field, leads-per-agent unit, confirmation summary

import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import {
  Upload, FileText, Users, Download, ChevronDown, ChevronRight,
  Play, Pause, CheckCircle, AlertCircle, ArrowLeft,
  ShieldAlert, SlidersHorizontal, Calendar, Info,
  ArrowRight, Settings2, X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import type { PendingFile } from './FichierAcharge';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const CSV_TEMPLATE_HEADERS = ['Nom de la societe', 'Prenom', 'Nom', 'Telephone', 'Email', 'Adresse'];
const CSV_TEMPLATE_EXAMPLE = ['Orange Telecom', 'Jean', 'Dupont', '0611223344', 'jean.dupont@example.com', '12 Rue de la Republique'];

function downloadCsvTemplate() {
  const rows = [CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE];
  // Prefix with a UTF-8 BOM so accented characters open correctly in Excel.
  const csvContent = '﻿' + rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modele_import_leads.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type LeadFile = {
  id: number;
  date: string;
  fichier: string;
  leads: number;
  calls: number;
  active: boolean;
  statut: 'Actif' | 'Inactif';
  companyName?: string;
  // NEW: distribution metadata passed through from injection
  distributionMode?: string;
  leadsPerAgent?: number;
  leadsPerAgentUnit?: string;
  priority?: string;
};

type Campaign = {
  id: number;
  name: string;
  expanded: boolean;
  files: LeadFile[];
};

// ─── Shared distribution config state (used in the right panel) ───────────────
type DistribConfig = {
  mode: string;
  perAgent: number;
  perAgentUnit: string;
  team: string;
  priority: string;
  dedup: string;
  scheduled: boolean;
  schedDate: string;
  schedTime: string;
};

const DEFAULT_CONFIG: DistribConfig = {
  mode: 'round-robin',
  perAgent: 50,
  perAgentUnit: 'day',
  team: '',
  priority: 'normal',
  dedup: 'ignore',
  scheduled: false,
  schedDate: '',
  schedTime: '08:00',
};

// ─── ColumnMappingPreview — shown when a file is being prepared for import ────
function ColumnMappingPreview({ fileName }: { fileName?: string }) {
  const mapping = [
    { source: 'Nom_Societe',   destination: 'Nom société',  status: 'ok',   note: '' },
    { source: 'Contact_Full',  destination: 'Prénom Nom',   status: 'ok',   note: '' },
    { source: 'Tel_Principal', destination: 'Téléphone',    status: 'ok',   note: '' },
    { source: 'Mail',          destination: 'Email',        status: 'ok',   note: '' },
    { source: 'Adresse_1',     destination: 'Adresse',      status: 'warn', note: '412 vides' },
  ];
  const okCount = mapping.filter(m => m.status === 'ok').length;

  if (!fileName) return null;

  return (
    <div className="mt-4 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <span className="text-xs font-medium text-foreground">Mapping colonnes — {fileName}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          okCount === mapping.length
            ? 'bg-green-500/10 text-green-600'
            : 'bg-yellow-500/10 text-yellow-600'
        }`}>
          {okCount}/{mapping.length} colonnes OK
        </span>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/10">
          <tr>
            <th className="text-left p-2 text-muted-foreground font-medium">Source</th>
            <th className="p-2 w-5"></th>
            <th className="text-left p-2 text-muted-foreground font-medium">Champ CRM</th>
            <th className="p-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {mapping.map((m, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-2 font-mono text-muted-foreground">{m.source}</td>
              <td className="p-2 text-center text-muted-foreground">
                <ArrowRight className="w-3 h-3 inline" />
              </td>
              <td className="p-2 font-medium text-foreground">{m.destination}</td>
              <td className="p-2">
                {m.status === 'ok'
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />
                  : (
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-yellow-600">{m.note}</span>
                    </span>
                  )
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DistributionPanel — replaces the old simple distribution settings ────────
function DistributionPanel({
  config,
  onChange,
  onConfirm,
  pendingFile,
}: {
  config: DistribConfig;
  onChange: (patch: Partial<DistribConfig>) => void;
  onConfirm: () => void;
  pendingFile?: PendingFile;
}) {
  const DEDUP_COUNT = 3247; // mock — would come from server
  const NET_LEADS = pendingFile
    ? pendingFile.recordCount - (config.dedup === 'ignore' ? DEDUP_COUNT : 0)
    : 0;
  const AGENTS = 20;
  const estDays = config.perAgentUnit === 'day'
    ? Math.ceil(NET_LEADS / (config.perAgent * AGENTS))
    : config.perAgentUnit === 'session'
    ? Math.ceil(NET_LEADS / (config.perAgent * AGENTS * 2))
    : 1;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        Distribution automatique
      </h3>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Mode de distribution</label>
        <select
          value={config.mode}
          onChange={e => onChange({ mode: e.target.value })}
          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="round-robin">Round-robin (équilibré)</option>
          <option value="random">Aléatoire</option>
          <option value="performance">Par performance agent</option>
          <option value="manual">Manuel</option>
        </select>
      </div>

      {/* NEW: leads per agent with unit */}
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Leads par agent</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={config.perAgent}
            min={1}
            onChange={e => onChange({ perAgent: Number(e.target.value) })}
            className="w-24 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          />
          <select
            value={config.perAgentUnit}
            onChange={e => onChange({ perAgentUnit: e.target.value })}
            className="flex-1 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="day">par jour</option>
            <option value="session">par session</option>
            <option value="total">total</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Équipe cible</label>
        <select
          value={config.team}
          onChange={e => onChange({ team: e.target.value })}
          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">Toutes les équipes</option>
          <option value="a">Équipe A</option>
          <option value="b">Équipe B</option>
          <option value="c">Équipe C</option>
        </select>
      </div>

      {/* NEW: Priority within campaign */}
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Priorité dans la campagne</label>
        <select
          value={config.priority}
          onChange={e => onChange({ priority: e.target.value })}
          className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="high">Haute (dialer en premier)</option>
          <option value="normal">Normale</option>
          <option value="low">Basse</option>
        </select>
      </div>

      {/* NEW: Dedup control */}
      {pendingFile && (
        <>
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-medium">{DEDUP_COUNT.toLocaleString()} numéros</span> déjà présents en base.
              Choisissez comment les traiter.
            </p>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Gestion des doublons
            </label>
            <select
              value={config.dedup}
              onChange={e => onChange({ dedup: e.target.value })}
              className="w-full px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="ignore">Ignorer les doublons</option>
              <option value="update">Mettre à jour les existants</option>
              <option value="create">Créer quand même</option>
            </select>
          </div>
        </>
      )}

      {/* NEW: Scheduled injection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-muted-foreground">Injection programmée</label>
          <button
            onClick={() => onChange({ scheduled: !config.scheduled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${config.scheduled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.scheduled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {config.scheduled && (
          <div className="flex gap-2">
            <input
              type="date"
              value={config.schedDate}
              onChange={e => onChange({ schedDate: e.target.value })}
              className="flex-1 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
            />
            <input
              type="time"
              value={config.schedTime}
              onChange={e => onChange({ schedTime: e.target.value })}
              className="w-28 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
            />
          </div>
        )}
      </div>

      {/* NEW: Confirmation summary */}
      {pendingFile && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2 text-sm">
          <p className="font-medium text-foreground flex items-center gap-1 mb-3">
            <Info className="w-4 h-4" /> Récapitulatif
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Leads à injecter</span>
            <span className="font-semibold text-foreground">{NET_LEADS.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Doublons {config.dedup === 'ignore' ? 'ignorés' : 'traités'}</span>
            <span>{DEDUP_COUNT.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agents concernés</span>
            <span>{AGENTS}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Leads / agent / {config.perAgentUnit === 'day' ? 'jour' : config.perAgentUnit === 'session' ? 'session' : 'total'}
            </span>
            <span>{config.perAgent}</span>
          </div>
          {config.perAgentUnit === 'day' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durée estimée</span>
              <span>~{estDays} jour{estDays > 1 ? 's' : ''}</span>
            </div>
          )}
          {config.scheduled && config.schedDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Injection programmée</span>
              <span className="text-primary font-medium">{config.schedDate} à {config.schedTime}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onConfirm}
        className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
      >
        {config.scheduled ? 'Programmer l\'injection' : 'Configurer la distribution'}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImportLeadsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [injectionSuccess, setInjectionSuccess] = useState<string | null>(null);
  const [distribConfig, setDistribConfig] = useState<DistribConfig>(DEFAULT_CONFIG);
  const [pendingFileForImport, setPendingFileForImport] = useState<PendingFile | undefined>(undefined);

  // Browse / drag-drop upload state (local to this page — the actual working
  // import pipeline lives on "Gestion Fichiers"; here we just capture the file
  // client-side and surface it, matching the rest of this page's mock flow).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isAcceptedFile = (file: File) =>
    ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

  const acceptFile = (file: File) => {
    if (!isAcceptedFile(file)) {
      setUploadError(`Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.join(', ')}.`);
      setUploadedFile(null);
      return;
    }
    setUploadError(null);
    setUploadedFile(file);
  };

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    // reset so selecting the same file again still fires onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  const { selectedFile, selectedFiles, action } = location.state || {};

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 1,
      name: 'Campagne X',
      expanded: false,
      files: [
        { id: 1, date: '2026-04-01 14:30', fichier: 'leads_avril_2026.csv',   leads: 250, calls: 180, active: true,  statut: 'Actif',   companyName: 'Orange Telecom' },
        { id: 2, date: '2026-03-28 09:15', fichier: 'prospects_mars.xlsx',     leads: 180, calls: 145, active: false, statut: 'Inactif', companyName: 'SFR Business' },
      ],
    },
    {
      id: 2,
      name: 'Campagne Y',
      expanded: false,
      files: [
        { id: 3, date: '2026-03-25 16:45', fichier: 'societes_france.csv',     leads: 320, calls: 278, active: true, statut: 'Actif', companyName: 'Bouygues Telecom' },
      ],
    },
    {
      id: 3,
      name: 'Campagne Z',
      expanded: false,
      files: [
        { id: 4, date: '2026-03-20 11:20', fichier: 'clients_q4.csv',          leads: 450, calls: 412, active: true,  statut: 'Actif',   companyName: 'Free Mobile' },
        { id: 5, date: '2026-03-15 09:00', fichier: 'prospects_novembre.csv',  leads: 300, calls: 0,   active: false, statut: 'Inactif', companyName: 'Orange Telecom' },
      ],
    },
  ]);

  // Pre-fill config if coming from FichierAcharge with already-configured file
  useEffect(() => {
    if (action === 'inject' && selectedFile) {
      setPendingFileForImport(selectedFile);
      // If the file already had a config saved, pre-fill
      if (selectedFile.distributionMode) {
        setDistribConfig(prev => ({
          ...prev,
          mode: selectedFile.distributionMode ?? prev.mode,
          perAgent: selectedFile.leadsPerAgent ?? prev.perAgent,
          perAgentUnit: selectedFile.leadsPerAgentUnit ?? prev.perAgentUnit,
          priority: selectedFile.priority ?? prev.priority,
          dedup: selectedFile.dedupStrategy ?? prev.dedup,
          scheduled: !!selectedFile.scheduledAt,
          schedDate: selectedFile.scheduledAt?.split('T')[0] ?? '',
          schedTime: selectedFile.scheduledAt?.split('T')[1]?.slice(0, 5) ?? '08:00',
        }));
      }
      setInjectionSuccess(`Fichier "${selectedFile.fileName}" prêt pour injection dans ${selectedFile.campaignTarget}`);
      setTimeout(() => setInjectionSuccess(null), 4000);

      const targetCampaign = campaigns.find(c => c.name === selectedFile.campaignTarget);
      if (targetCampaign) {
        const newFile: LeadFile = {
          id: Date.now(),
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          fichier: selectedFile.fileName,
          leads: selectedFile.recordCount,
          calls: 0,
          active: true,
          statut: 'Actif',
          companyName: selectedFile.companyName,
          distributionMode: selectedFile.distributionMode,
          leadsPerAgent: selectedFile.leadsPerAgent,
          leadsPerAgentUnit: selectedFile.leadsPerAgentUnit,
          priority: selectedFile.priority,
        };
        setCampaigns(prev => prev.map(camp =>
          camp.id === targetCampaign.id
            ? { ...camp, files: [...camp.files, newFile] }
            : camp
        ));
      }
    }

    if (action === 'bulk-inject' && selectedFiles) {
      setInjectionSuccess(`${selectedFiles.length} fichiers injectés avec succès`);
      setTimeout(() => setInjectionSuccess(null), 3000);
    }
  }, [selectedFile, selectedFiles, action]);

  // "Gestion des leads" (/admin/import-leads/FichierAcharge, aliased to LeadsPage)
  // is an unfinished feature — its hook is missing most of the state TabFichiers
  // and friends expect, so it crashes on render. Point navigation at the real,
  // working file-management flow instead until that page is finished.
  const handleClick = () => navigate('/superadmin/injection');

  const toggleCampaign = (campaignId: number) => {
    setCampaigns(campaigns.map(c =>
      c.id === campaignId ? { ...c, expanded: !c.expanded } : c
    ));
  };

  const toggleFileActive = (campaignId: number, fileId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCampaigns(campaigns.map(camp => {
      if (camp.id !== campaignId) return camp;
      return {
        ...camp,
        files: camp.files.map(file => {
          if (file.id !== fileId) return file;
          const newActive = !file.active;
          return { ...file, active: newActive, statut: newActive ? 'Actif' : 'Inactif', calls: newActive ? file.calls : 0 };
        }),
      };
    }));
  };

  const getTotalCalls  = (files: LeadFile[]) => files.reduce((s, f) => s + (f.active ? f.calls : 0), 0);
  const getTotalLeads  = (files: LeadFile[]) => files.reduce((s, f) => s + (f.active ? f.leads : 0), 0);
  const getActiveCount = (files: LeadFile[]) => files.filter(f => f.active).length;

  const filesByCompany = campaigns.flatMap(camp =>
    camp.files.map(file => ({ ...file, campaignName: camp.name }))
  ).reduce((acc, file) => {
    const co = file.companyName || 'Autre';
    if (!acc[co]) acc[co] = [];
    acc[co].push(file);
    return acc;
  }, {} as Record<string, (LeadFile & { campaignName: string })[]>);

  const priorityBadge: Record<string, string> = { high: 'Haute', normal: 'Normale', low: 'Basse' };
  const modeBadge: Record<string, string> = { 'round-robin': 'RR', random: 'Aléat.', performance: 'Perf.', manual: 'Manuel' };

  return (
    <Layout>
      <div className="space-y-6">
        {injectionSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-foreground">{injectionSuccess}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={handleClick} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold">Import de Leads</h2>
              <p className="text-muted-foreground mt-1">Importez et distribuez les leads aux agents</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Gestion des fichiers
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — upload */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border p-8">
              <div className="text-center mb-6">
                <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="mb-2 font-semibold">Importer un fichier</h3>
                <p className="text-sm text-muted-foreground">Formats acceptés: CSV, Excel (.xlsx, .xls)</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                className="hidden"
                onChange={handleFileInputChange}
              />

              {uploadedFile ? (
                <div className="border-2 border-solid border-primary/40 bg-primary/5 rounded-lg p-6 text-center">
                  <FileText className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-foreground font-medium truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {(uploadedFile.size / 1024).toFixed(1)} Ko
                  </p>
                  <button
                    onClick={clearUploadedFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Retirer
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleBrowseClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                  }`}
                >
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground mb-2">Glissez-déposez votre fichier ici</p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Parcourir les fichiers
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{uploadError}</p>
                </div>
              )}

              {/* NEW: column mapping preview appears after a file is loaded */}
              {(pendingFileForImport || uploadedFile) && (
                <ColumnMappingPreview fileName={pendingFileForImport?.fileName ?? uploadedFile?.name} />
              )}

              <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
                <h4 className="font-medium text-info mb-2">Format requis</h4>
                <ul className="text-sm text-foreground space-y-1">
                  <li>• Nom de la société</li>
                  <li>• Contact (nom et prénom)</li>
                  <li>• Numéro de téléphone</li>
                  <li>• Email (optionnel)</li>
                  <li>• Adresse (optionnel)</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <Download className="w-5 h-5" />
                Télécharger modèle CSV
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* NEW: full DistributionPanel replaces old basic block */}
            <DistributionPanel
              config={distribConfig}
              onChange={patch => setDistribConfig(prev => ({ ...prev, ...patch }))}
              onConfirm={() => {
                setInjectionSuccess('Configuration de distribution sauvegardée.');
                setTimeout(() => setInjectionSuccess(null), 3000);
              }}
              pendingFile={pendingFileForImport}
            />

            {/* Campaigns */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold mb-4">Campagnes par entreprise</h3>

              <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(filesByCompany).map(company => (
                  <span key={company} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    {company}: {filesByCompany[company].length} fichier(s)
                  </span>
                ))}
              </div>

              <div className="space-y-4">
                {campaigns.map((campagne) => (
                  <div key={campagne.id} className="border border-border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCampaign(campagne.id)}
                    >
                      <div className="flex items-center gap-3">
                        {campagne.expanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                        <div>
                          <h4 className="font-semibold text-foreground">{campagne.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {campagne.files.length} fichier(s) • {getActiveCount(campagne.files)} actif(s) •{' '}
                            {getTotalCalls(campagne.files)} appels • {getTotalLeads(campagne.files)} leads actifs
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Taux d'appels</p>
                        <p className="font-medium text-foreground">
                          {getTotalLeads(campagne.files) > 0
                            ? Math.round((getTotalCalls(campagne.files) / getTotalLeads(campagne.files)) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    {campagne.expanded && (
                      <div className="border-t border-border p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-primary/5 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{getTotalLeads(campagne.files)}</p>
                            <p className="text-sm text-muted-foreground">Leads actifs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{getTotalCalls(campagne.files)}</p>
                            <p className="text-sm text-muted-foreground">Appels effectués</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">
                              {getTotalLeads(campagne.files) > 0
                                ? Math.round((getTotalCalls(campagne.files) / getTotalLeads(campagne.files)) * 100)
                                : 0}%
                            </p>
                            <p className="text-sm text-muted-foreground">Taux de conversion</p>
                          </div>
                        </div>

                        {Object.entries(filesByCompany).map(([company, files]) => {
                          const companyFiles = files.filter(f => f.campaignName === campagne.name);
                          if (companyFiles.length === 0) return null;
                          return (
                            <div key={company} className="mb-4">
                              <h5 className="text-sm font-medium text-primary mb-2">{company}</h5>
                              {companyFiles.map((item) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border mb-2 transition-colors ${
                                    item.active ? 'bg-background border-border' : 'bg-muted/20 border-border opacity-75'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className={`w-5 h-5 flex-shrink-0 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <div className="min-w-0">
                                      <p className={`font-medium truncate ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {item.fichier}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-muted-foreground">{item.date}</p>
                                        {/* NEW: show distribution config chip per file if set */}
                                        {item.distributionMode && (
                                          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                            {modeBadge[item.distributionMode] ?? item.distributionMode}
                                            {item.leadsPerAgent != null && ` · ${item.leadsPerAgent}/${item.leadsPerAgentUnit === 'day' ? 'j' : 'sess'}`}
                                          </span>
                                        )}
                                        {item.priority && item.priority !== 'normal' && (
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            item.priority === 'high'
                                              ? 'bg-red-500/10 text-red-600'
                                              : 'bg-muted text-muted-foreground'
                                          }`}>
                                            {priorityBadge[item.priority]}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Leads</p>
                                      <p className={`font-medium text-sm ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {item.leads.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Appels</p>
                                      <p className={`font-medium text-sm ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {item.active ? item.calls : 0}
                                      </p>
                                    </div>

                                    <button
                                      onClick={(e) => toggleFileActive(campagne.id, item.id, e)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        item.active
                                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                          : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                                      }`}
                                    >
                                      {item.active
                                        ? <><Pause className="w-3 h-3" />Désactiver</>
                                        : <><Play  className="w-3 h-3" />Activer</>
                                      }
                                    </button>

                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      item.active
                                        ? 'bg-green-500/10 text-green-600'
                                        : 'bg-gray-500/10 text-gray-500'
                                    }`}>
                                      {item.active ? 'Actif' : 'Inactif'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}

                        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
                          <button className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded transition-colors">
                            + Ajouter un fichier
                          </button>
                          <button className="px-3 py-1 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors">
                            Supprimer la campagne
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}