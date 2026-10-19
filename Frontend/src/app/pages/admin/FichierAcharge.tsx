// FichierAcharge.tsx — updated with: column mapping preview, dedup control,
// scheduled injection, priority field, leads-per-agent unit, confirmation summary

import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import {
  Upload, FileText, Users, Download, Play, Trash2,
  Eye, Clock, CheckCircle, XCircle, AlertCircle,
  HardDrive, Inbox, Filter, ChevronLeft, ChevronRight,
  Plus, Archive, RefreshCw, Building2, ChevronDown,
  ChevronRight as ChevronRightIcon, Calendar, Settings2,
  ShieldAlert, SlidersHorizontal, ArrowRight, Info
} from 'lucide-react';
import { useNavigate } from 'react-router';

export type PendingFile = {
  id: number;
  fileName: string;
  recordCount: number;
  campaignTarget: string;
  uploadDate: string;
  fileSize: string;
  status: 'Staged' | 'Injecting' | 'Injected' | 'Failed';
  companyId: number;
  fileFormat: 'csv' | 'xlsx';
  // NEW: distribution config per file
  distributionMode?: 'round-robin' | 'random' | 'performance';
  leadsPerAgent?: number;
  leadsPerAgentUnit?: 'day' | 'session' | 'total';
  teamTarget?: string;
  priority?: 'high' | 'normal' | 'low';
  dedupStrategy?: 'ignore' | 'update' | 'create';
  scheduledAt?: string; // ISO datetime string or ''
  // NEW: column mapping state
  columnMapping?: ColumnMap[];
  dedupCount?: number;
};

export type ColumnMap = {
  source: string;
  destination: string;
  status: 'ok' | 'warn';
  warnNote?: string;
};

export type Company = {
  id: number;
  name: string;
  expanded: boolean;
  files: PendingFile[];
};

// ─── mock column mapping per file format ─────────────────────────────────────
const MOCK_MAPPINGS: Record<string, ColumnMap[]> = {
  'clients_avril_2026.csv': [
    { source: 'Nom_Societe',   destination: 'Nom société',  status: 'ok' },
    { source: 'Contact_Full',  destination: 'Prénom Nom',   status: 'ok' },
    { source: 'Tel_Principal', destination: 'Téléphone',    status: 'ok' },
    { source: 'Mail',          destination: 'Email',        status: 'ok' },
    { source: 'Adresse_1',     destination: 'Adresse',      status: 'warn', warnNote: '412 vides' },
  ],
  default: [
    { source: 'company',  destination: 'Nom société', status: 'ok' },
    { source: 'fullname', destination: 'Prénom Nom',  status: 'ok' },
    { source: 'phone',    destination: 'Téléphone',   status: 'ok' },
    { source: 'email',    destination: 'Email',       status: 'warn', warnNote: '23 vides' },
    { source: 'address',  destination: 'Adresse',     status: 'ok' },
  ],
};

const MOCK_DEDUP: Record<string, number> = {
  'clients_avril_2026.csv': 3247,
  'clients_mai_2026.xlsx': 812,
  default: 0,
};

// ─── ConfigPanel: inline per-file distribution/scheduling config ──────────────
function ConfigPanel({
  file,
  companyId,
  onSave,
  onClose,
}: {
  file: PendingFile;
  companyId: number;
  onSave: (companyId: number, fileId: number, patch: Partial<PendingFile>) => void;
  onClose: () => void;
}) {
  const mapping = MOCK_MAPPINGS[file.fileName] ?? MOCK_MAPPINGS.default;
  const dedupCount = MOCK_DEDUP[file.fileName] ?? MOCK_DEDUP.default;
  const mappedOk = mapping.filter(m => m.status === 'ok').length;

  const [mode, setMode] = useState<PendingFile['distributionMode']>(file.distributionMode ?? 'round-robin');
  const [perAgent, setPerAgent] = useState(file.leadsPerAgent ?? 50);
  const [perAgentUnit, setPerAgentUnit] = useState<PendingFile['leadsPerAgentUnit']>(file.leadsPerAgentUnit ?? 'day');
  const [team, setTeam] = useState(file.teamTarget ?? '');
  const [priority, setPriority] = useState<PendingFile['priority']>(file.priority ?? 'normal');
  const [dedup, setDedup] = useState<PendingFile['dedupStrategy']>(file.dedupStrategy ?? 'ignore');
  const [scheduled, setScheduled] = useState(file.scheduledAt !== undefined ? file.scheduledAt !== '' : false);
  const [schedDate, setSchedDate] = useState(file.scheduledAt?.split('T')[0] ?? '');
  const [schedTime, setSchedTime] = useState(file.scheduledAt?.split('T')[1]?.slice(0, 5) ?? '08:00');
  const [addToQueue, setAddToQueue] = useState(false);

  const netLeads = file.recordCount - dedupCount;
  const agentsCount = 20;
  const estimatedDays = perAgentUnit === 'day'
    ? Math.ceil(netLeads / (perAgent * agentsCount))
    : perAgentUnit === 'session'
    ? Math.ceil(netLeads / (perAgent * agentsCount * 2))
    : 1;

  const handleConfirm = () => {
    onSave(companyId, file.id, {
      distributionMode: mode,
      leadsPerAgent: perAgent,
      leadsPerAgentUnit: perAgentUnit,
      teamTarget: team,
      priority,
      dedupStrategy: dedup,
      dedupCount,
      columnMapping: mapping,
      scheduledAt: scheduled ? `${schedDate}T${schedTime}` : '',
    });
    onClose();
  };

  return (
    <div className="border-t border-border bg-muted/10 p-5 space-y-5">

      {/* ── Column mapping ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Mapping colonnes</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            mappedOk === mapping.length
              ? 'bg-green-500/10 text-green-600'
              : 'bg-yellow-500/10 text-yellow-600'
          }`}>
            {mappedOk}/{mapping.length} colonnes OK
          </span>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium">Colonne source</th>
                <th className="p-2 text-muted-foreground font-medium w-6"></th>
                <th className="text-left p-2 text-muted-foreground font-medium">Champ CRM</th>
                <th className="p-2 text-muted-foreground font-medium w-6"></th>
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
                  <td className="p-2 text-center">
                    {m.status === 'ok'
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />
                      : (
                        <span className="inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-yellow-600">{m.warnNote}</span>
                        </span>
                      )
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dedup alert ──────────────────────────────── */}
      {dedupCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-foreground font-medium">
              {dedupCount.toLocaleString()} numéros déjà présents en base
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Choisissez comment les traiter ci-dessous.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Distribution ─────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribution</p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Mode</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as PendingFile['distributionMode'])}
              className="w-full px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="round-robin">Round-robin (équilibré)</option>
              <option value="random">Aléatoire</option>
              <option value="performance">Par performance agent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Leads par agent</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={perAgent}
                min={1}
                onChange={e => setPerAgent(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
              <select
                value={perAgentUnit}
                onChange={e => setPerAgentUnit(e.target.value as PendingFile['leadsPerAgentUnit'])}
                className="flex-1 px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="day">par jour</option>
                <option value="session">par session</option>
                <option value="total">total</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Équipe cible</label>
            <select
              value={team}
              onChange={e => setTeam(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">Toutes les équipes</option>
              <option value="a">Équipe A</option>
              <option value="b">Équipe B</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Priorité dans la campagne</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as PendingFile['priority'])}
              className="w-full px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="high">Haute (dialer en premier)</option>
              <option value="normal">Normale</option>
              <option value="low">Basse</option>
            </select>
          </div>
        </div>

        {/* ── Options ──────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Options</p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Doublons {dedupCount > 0 && `(${dedupCount.toLocaleString()} détectés)`}
            </label>
            <select
              value={dedup}
              onChange={e => setDedup(e.target.value as PendingFile['dedupStrategy'])}
              className="w-full px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="ignore">Ignorer les doublons</option>
              <option value="update">Mettre à jour les existants</option>
              <option value="create">Créer quand même</option>
            </select>
          </div>

          {/* Scheduled injection toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Injection programmée</label>
              <button
                onClick={() => setScheduled(!scheduled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${scheduled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {scheduled && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={schedDate}
                  onChange={e => setSchedDate(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
                <input
                  type="time"
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                  className="w-24 px-2 py-1.5 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`queue-${file.id}`}
              checked={addToQueue}
              onChange={e => setAddToQueue(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor={`queue-${file.id}`} className="text-xs text-muted-foreground cursor-pointer">
              Ajouter en file d'attente (sans injecter maintenant)
            </label>
          </div>

          {/* ── Summary card ─────────────────────── */}
          <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
            <p className="font-medium text-foreground mb-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Récapitulatif
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads à injecter</span>
              <span className="font-medium text-foreground">{netLeads.toLocaleString()}</span>
            </div>
            {dedupCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doublons ignorés</span>
                <span>{dedupCount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agents concernés</span>
              <span>{agentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads / agent / {perAgentUnit === 'day' ? 'jour' : perAgentUnit === 'session' ? 'session' : 'total'}</span>
              <span>{perAgent}</span>
            </div>
            {perAgentUnit === 'day' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée estimée</span>
                <span>~{estimatedDays} jour{estimatedDays > 1 ? 's' : ''}</span>
              </div>
            )}
            {scheduled && schedDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Injection</span>
                <span className="text-primary">{schedDate} à {schedTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          {addToQueue ? 'Mettre en file d\'attente' : scheduled ? 'Programmer l\'injection' : 'Confirmer et injecter'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FichierAcharge() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([
    {
      id: 1,
      name: 'Orange Telecom',
      expanded: true,
      files: [
        { id: 1, fileName: 'clients_avril_2026.csv',  recordCount: 125430, campaignTarget: '', uploadDate: '2026-04-07 09:30', fileSize: '24.3 MB', status: 'Staged', companyId: 1, fileFormat: 'csv' },
        { id: 2, fileName: 'clients_mai_2026.xlsx',   recordCount: 89000,  campaignTarget: '', uploadDate: '2026-04-06 14:15', fileSize: '18.2 MB', status: 'Staged', companyId: 1, fileFormat: 'xlsx' },
      ],
    },
    {
      id: 2,
      name: 'SFR Business',
      expanded: false,
      files: [
        { id: 3, fileName: 'prospects_mars.xlsx',  recordCount: 8200,  campaignTarget: '', uploadDate: '2026-04-06 14:15', fileSize: '2.1 MB',  status: 'Staged', companyId: 2, fileFormat: 'xlsx' },
        { id: 4, fileName: 'prospects_avril.csv',  recordCount: 15400, campaignTarget: '', uploadDate: '2026-04-05 11:30', fileSize: '3.8 MB',  status: 'Staged', companyId: 2, fileFormat: 'csv' },
      ],
    },
    {
      id: 3,
      name: 'Bouygues Telecom',
      expanded: false,
      files: [
        { id: 5, fileName: 'fidélisation_q2.csv', recordCount: 450000, campaignTarget: '', uploadDate: '2026-04-05 11:00', fileSize: '87.6 MB', status: 'Staged', companyId: 3, fileFormat: 'csv' },
      ],
    },
    {
      id: 4,
      name: 'Free Mobile',
      expanded: false,
      files: [
        { id: 6, fileName: 'test_rapide.csv',   recordCount: 50,    campaignTarget: '', uploadDate: '2026-04-04 16:20', fileSize: '0.01 MB', status: 'Staged', companyId: 4, fileFormat: 'csv' },
        { id: 7, fileName: 'clients_free.csv',  recordCount: 32500, campaignTarget: '', uploadDate: '2026-04-03 10:00', fileSize: '7.2 MB',  status: 'Staged', companyId: 4, fileFormat: 'csv' },
      ],
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Staged' | 'Injected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  // Track which file's config panel is open: { companyId, fileId }
  const [openConfig, setOpenConfig] = useState<{ companyId: number; fileId: number } | null>(null);
  const itemsPerPage = 3;

  const toggleCompany = (companyId: number) => {
    setCompanies(companies.map(c =>
      c.id === companyId ? { ...c, expanded: !c.expanded } : c
    ));
  };

  const handleUpdateCampaign = (companyId: number, fileId: number, campaignName: string) => {
    setCompanies(companies.map(c => {
      if (c.id !== companyId) return c;
      return { ...c, files: c.files.map(f => f.id === fileId ? { ...f, campaignTarget: campaignName } : f) };
    }));
  };

  // NEW: save per-file config from ConfigPanel
  const handleSaveConfig = (companyId: number, fileId: number, patch: Partial<PendingFile>) => {
    setCompanies(companies.map(c => {
      if (c.id !== companyId) return c;
      return { ...c, files: c.files.map(f => f.id === fileId ? { ...f, ...patch } : f) };
    }));
  };

  const handleInjectFile = (companyId: number, file: PendingFile) => {
    if (!file.campaignTarget) {
      alert(`Veuillez sélectionner une campagne cible pour ${file.fileName}`);
      return;
    }
    // Open config panel instead of navigating immediately
    setOpenConfig({ companyId, fileId: file.id });
  };

  const handleConfirmInject = (companyId: number, file: PendingFile) => {
    navigate('/admin/import-leads', {
      state: {
        selectedFile: file,
        companyName: companies.find(c => c.id === companyId)?.name,
        action: 'inject',
      },
    });
  };

  const getCompanyStats = (company: Company) => {
    const stagedFiles = company.files.filter(f => f.status === 'Staged');
    const totalRecords = stagedFiles.reduce((sum, f) => sum + f.recordCount, 0);
    const filesWithoutCampaign = stagedFiles.filter(f => !f.campaignTarget).length;
    return { stagedFiles: stagedFiles.length, totalRecords, filesWithoutCampaign };
  };

  const filteredCompanies = companies.filter(company => {
    const matchesName = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFile = company.files.some(f => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || company.files.some(f => f.status === statusFilter);
    return (matchesName || matchesFile) && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const allStagedFiles = companies.flatMap(c => c.files).filter(f => f.status === 'Staged');
  const totalFiles = allStagedFiles.length;
  const totalRecords = allStagedFiles.reduce((sum, f) => sum + f.recordCount, 0);
  const filesWithoutCampaign = allStagedFiles.filter(f => !f.campaignTarget).length;
  const scheduledCount = allStagedFiles.filter(f => f.scheduledAt && f.scheduledAt !== '').length;

  const getStatusIcon = (status: PendingFile['status']) => {
    switch (status) {
      case 'Staged':    return <Clock      className="w-4 h-4 text-yellow-500" />;
      case 'Injecting': return <RefreshCw  className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'Injected':  return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Failed':    return <XCircle    className="w-4 h-4 text-red-500" />;
    }
  };

  const priorityLabel: Record<string, string> = {
    high: 'Haute', normal: 'Normale', low: 'Basse',
  };
  const modeLabel: Record<string, string> = {
    'round-robin': 'Round-robin', random: 'Aléatoire', performance: 'Performance',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Fichiers en attente d'injection</h2>
            </div>
            <p className="text-muted-foreground mt-1">
              Zone de transit — Sélectionnez une campagne cible pour chaque fichier
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/import-leads')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvel import
          </button>
        </div>

        {/* Warning */}
        {filesWithoutCampaign > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-foreground">
              {filesWithoutCampaign} fichier(s) n'ont pas de campagne cible assignée.
              Veuillez sélectionner une campagne avant injection.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalFiles}</p>
                <p className="text-sm text-muted-foreground">Fichiers en attente</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalRecords.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Leads en attente</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Entreprises</p>
              </div>
            </div>
          </div>
          {/* NEW: scheduled injections counter */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{scheduledCount}</p>
                <p className="text-sm text-muted-foreground">Injections programmées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2">
              {(['all', 'Staged', 'Injected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'Staged' ? 'En attente' : 'Injectés'}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher entreprise ou fichier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-1.5 pl-9 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Companies list */}
        <div className="space-y-4">
          {paginatedCompanies.map((company) => {
            const stats = getCompanyStats(company);
            return (
              <div key={company.id} className="bg-card rounded-lg border border-border overflow-hidden">
                {/* Company header */}
                <div
                  className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="flex items-center gap-3">
                    {company.expanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    }
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stats.stagedFiles} fichier(s) en attente • {stats.totalRecords.toLocaleString()} leads
                        {stats.filesWithoutCampaign > 0 && (
                          <span className="text-yellow-500 ml-2">
                            • {stats.filesWithoutCampaign} sans campagne
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Fichiers prêts</p>
                    <p className="font-medium text-foreground">{stats.stagedFiles}</p>
                  </div>
                </div>

                {/* Files table */}
                {company.expanded && (
                  <div className="border-t border-border">
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/20">
                            <tr>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Fichier</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Leads</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Taille</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date d'upload</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Campagne cible</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Config</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Statut</th>
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {company.files.map((file) => {
                              const isConfigOpen = openConfig?.companyId === company.id && openConfig?.fileId === file.id;
                              return (
                                <React.Fragment key={file.id}>
                                  <tr className={`border-b border-border hover:bg-muted/20 transition-colors ${isConfigOpen ? 'bg-muted/30' : ''}`}>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-foreground font-medium">{file.fileName}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-foreground">{file.recordCount.toLocaleString()}</td>
                                    <td className="p-3 text-muted-foreground">{file.fileSize}</td>
                                    <td className="p-3 text-muted-foreground text-sm">{file.uploadDate}</td>
                                    <td className="p-3">
                                      {file.status === 'Staged' ? (
                                        <select
                                          value={file.campaignTarget}
                                          onChange={e => handleUpdateCampaign(company.id, file.id, e.target.value)}
                                          className="px-2 py-1 bg-input-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
                                        >
                                          <option value="">-- Sélectionner --</option>
                                          <option value="Campagne X">Campagne X</option>
                                          <option value="Campagne Y">Campagne Y</option>
                                          <option value="Campagne Z">Campagne Z</option>
                                          <option value="Test">Test</option>
                                        </select>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">{file.campaignTarget || '—'}</span>
                                      )}
                                    </td>

                                    {/* NEW: config summary chip */}
                                    <td className="p-3">
                                      {file.distributionMode ? (
                                        <button
                                          onClick={() => setOpenConfig(isConfigOpen ? null : { companyId: company.id, fileId: file.id })}
                                          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                        >
                                          <SlidersHorizontal className="w-3 h-3" />
                                          {modeLabel[file.distributionMode]} · {file.leadsPerAgent}/{file.leadsPerAgentUnit === 'day' ? 'j' : file.leadsPerAgentUnit === 'session' ? 'sess' : 'tot'}
                                          {file.scheduledAt ? ` · 📅` : ''}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setOpenConfig(isConfigOpen ? null : { companyId: company.id, fileId: file.id })}
                                          className="flex items-center gap-1 px-2 py-1 text-xs border border-dashed border-border text-muted-foreground rounded-lg hover:bg-muted/40 transition-colors"
                                        >
                                          <Settings2 className="w-3 h-3" />
                                          Configurer
                                        </button>
                                      )}
                                    </td>

                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(file.status)}
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          file.status === 'Staged'    ? 'bg-yellow-500/10 text-yellow-600' :
                                          file.status === 'Injected'  ? 'bg-green-500/10 text-green-600'  :
                                                                        'bg-red-500/10 text-red-600'
                                        }`}>
                                          {file.status === 'Staged'   ? 'En attente' :
                                           file.status === 'Injected' ? 'Injecté ✓'  : 'Échec'}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="p-3">
                                      {file.status === 'Staged' && (
                                        <button
                                          onClick={() => handleInjectFile(company.id, file)}
                                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                                            file.campaignTarget
                                              ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                              : 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                          }`}
                                          disabled={!file.campaignTarget}
                                        >
                                          <Play className="w-3 h-3" />
                                          Injecter
                                        </button>
                                      )}
                                      {file.status === 'Injected' && (
                                        <button className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-sm hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                                          <Eye className="w-3 h-3" />
                                          Voir
                                        </button>
                                      )}
                                    </td>
                                  </tr>

                                  {/* Inline config panel row */}
                                  {isConfigOpen && (
                                    <tr>
                                      <td colSpan={8} className="p-0">
                                        <ConfigPanel
                                          file={file}
                                          companyId={company.id}
                                          onSave={(cId, fId, patch) => {
                                            handleSaveConfig(cId, fId, patch);
                                          }}
                                          onClose={() => setOpenConfig(null)}
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end mt-4 pt-4 border-t border-border">
                        <button className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1">
                          <Plus className="w-4 h-4" />
                          Ajouter un fichier pour {company.name}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-muted rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-muted rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors flex items-center gap-1"
            >
              Suivant
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}