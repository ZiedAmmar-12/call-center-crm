import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { campaignService } from '../../../../services/campaignService';
import type {
  AvailableAgentDto,
  CampaignAgentDto,
  CampaignFileDto,
  CampaignHopperDto,
  CampaignResponseDto,
  CampaignStatus,
} from '../../../../types/campaign';

interface HopperFormState {
  lowContactsThreshold: string;
}

interface CampaignDetails {
  files: CampaignFileDto[];
  agents: CampaignAgentDto[];
  availableAgents: AvailableAgentDto[];
  hopper: CampaignHopperDto | null;
  hopperForm: HopperFormState | null;
  loading: boolean;
  error: string | null;
  assignAgentId: string;
  quota: string;
  assigning: boolean;
  removingAgentId: number | null;
  removingFileId: number | null;
  togglingFileId: number | null;
  updatingPriorityId: number | null;
  savingHopper: boolean;
}

const createEmptyDetails = (): CampaignDetails => ({
  files: [],
  agents: [],
  availableAgents: [],
  hopper: null,
  hopperForm: null,
  loading: false,
  error: null,
  assignAgentId: '',
  quota: '',
  assigning: false,
  removingAgentId: null,
  removingFileId: null,
  togglingFileId: null,
  updatingPriorityId: null,
  savingHopper: false,
});

const qualificationLabels: Record<string, string> = {
  nrp: 'NRP',
  rdv_client1: 'RDV client 1',
  rdv_client2: 'RDV client 2',
  rdv_client3: 'RDV client 3',
  refus: 'Refus',
  pas_interesse: 'Pas interesse',
  hc_logement: 'HC logement',
  hc_langue: 'HC langue',
  hc_consommation: 'HC consommation',
  a_rappeler: 'A rappeler',
  porte: 'Porte',
  pas_signe: 'Pas signe',
};

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  0: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
  1: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  2: { label: 'Inactive', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

const hopperStatusConfig: Record<string, { label: string; className: string; barClassName: string }> = {
  healthy: {
    label: 'Stable',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    barClassName: 'bg-emerald-600',
  },
  low: {
    label: 'Bas',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    barClassName: 'bg-amber-500',
  },
  empty: {
    label: 'Vide',
    className: 'bg-red-50 text-red-700 ring-red-200',
    barClassName: 'bg-red-500',
  },
};

const priorityOptions = [
  { value: 20, label: 'Haute' },
  { value: 0, label: 'Normale' },
  { value: -20, label: 'Basse' },
];

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString('fr-FR');
}

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'Non injecte';
}

function getProgress(total: number, done: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function getAgentName(agent: AvailableAgentDto) {
  return agent.fullName || [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email;
}

function getQualificationLabel(status: string) {
  return qualificationLabels[status] ?? status;
}

function createHopperForm(source: CampaignHopperDto | CampaignResponseDto): HopperFormState {
  return {
    lowContactsThreshold: String(source.lowContactsThreshold),
  };
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : fallback;
}

function CampaignCard({
  campaign,
  isUpdating,
  onEnter,
  onToggleStatus,
}: {
  campaign: CampaignResponseDto;
  isUpdating: boolean;
  onEnter: () => void;
  onToggleStatus: () => void;
}) {
  const status = statusConfig[campaign.status] ?? statusConfig[0];
  const progress = getProgress(campaign.totalContacts, campaign.qualifiedContacts);
  const activeAgents = campaign.campaignAgents.filter((agent) => agent.isActive).length;

  return (
    <article className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <button type="button" onClick={onEnter} className="block w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">{campaign.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {campaign.description || 'Campagne sans description'}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-400">Fichiers</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{campaign.campaignFiles.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Agents</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{activeAgents}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Restants</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatNumber(campaign.remainingContacts)}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>{formatNumber(campaign.qualifiedContacts)} appeles</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={onEnter}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <FileText className="h-4 w-4" />
          Entrer
        </button>
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={isUpdating}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            campaign.status === 1
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isUpdating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : campaign.status === 1 ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {campaign.status === 1 ? 'Pause' : 'Activer'}
        </button>
      </div>
    </article>
  );
}

function FileList({
  files,
  details,
  onRecycleFile,
  onToggleFile,
  onRemoveFile,
  onChangePriority,
}: {
  files: CampaignFileDto[];
  details: CampaignDetails;
  onRecycleFile: (file: CampaignFileDto) => void;
  onToggleFile: (file: CampaignFileDto) => void;
  onRemoveFile: (file: CampaignFileDto) => void;
  onChangePriority: (file: CampaignFileDto, priority: number) => void;
}) {
  const injectedFiles = files.filter(file => file.isInjected === true);

  if (details.loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-gray-200 bg-white">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (injectedFiles.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-gray-300" />
        <h3 className="mt-4 text-sm font-semibold text-gray-900">Aucun fichier injecté</h3>
        <p className="mt-1 text-sm text-gray-500">Les fichiers injectés de cette campagne apparaîtront ici.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="hidden grid-cols-12 gap-3 bg-gray-50 px-4 py-2 text-xs font-medium uppercase text-gray-400 md:grid">
        <div className="col-span-3">Fichier</div>
        <div className="col-span-2">Contacts</div>
        <div className="col-span-2">Priorite</div>
        <div className="col-span-2">Progression</div>
        <div className="col-span-1">Statut</div>
        <div className="col-span-2">Actions</div>
      </div>
      {injectedFiles.map((file) => {
        const progress = getProgress(file.contactsTotal, file.contactsCalled);
        const isToggling = details.togglingFileId === file.id;
        const isRemoving = details.removingFileId === file.id;
        const isUpdatingPriority = details.updatingPriorityId === file.id;
        const sourceFileName = file.sourceFileName || `Fichier ${file.sourceFileId}`;        return (
          <div key={file.id} className="grid grid-cols-12 gap-3 border-t border-gray-100 px-4 py-3 first:border-t-0 hover:bg-gray-50/70">
            <div className="col-span-12 md:col-span-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{sourceFileName}</p>
                  <p className="text-xs text-gray-400">Injection: {formatDate(file.injectedAt)}</p>
                </div>
              </div>
            </div>

            <div className="col-span-6 md:col-span-2">
              <p className="text-sm font-medium text-gray-800">{formatNumber(file.contactsTotal)}</p>
              <p className="text-xs text-gray-400">{formatNumber(file.contactsRemaining)} restants</p>
            </div>

            <div className="col-span-6 md:col-span-2">
              <select
                value={file.priority}
                onChange={(event) => onChangePriority(file, Number(event.target.value))}
                disabled={isUpdatingPriority}
                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-50"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {isUpdatingPriority ? 'Mise a jour...' : `Rang ${file.priority}`}
              </p>
            </div>

            <div className="col-span-6 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                </div>
                <span className="w-9 text-right text-xs text-gray-500">{progress}%</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{formatNumber(file.contactsCalled)} appeles</p>
            </div>

            <div className="col-span-6 md:col-span-1">
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    file.isInjected ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {file.isInjected ? 'Injecte' : 'Non injecte'}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    file.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {file.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            <div className="col-span-6 md:col-span-2">
              <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                <button
                  type="button"
                  onClick={() => onRecycleFile(file)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                  title="Recycler la liste"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFile(file)}
                  disabled={isToggling}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  title={file.isActive ? 'Desactiver' : 'Activer'}
                >
                  {isToggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFile(file)}
                  disabled={isRemoving}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  title="Retirer de la campagne"
                >
                  {isRemoving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        );
      })} 
    </div>
  );
}

function HopperPanel({
  campaign,
  details,
  onChangeField,
  onSave,
}: {
  campaign: CampaignResponseDto;
  details: CampaignDetails;
  onChangeField: (field: keyof HopperFormState, value: string) => void;
  onSave: () => void;
}) {
  const hopper = details.hopper;
  const form = details.hopperForm ?? createHopperForm(hopper ?? campaign);
  const statusInfo = hopperStatusConfig[hopper?.status ?? 'empty'] ?? hopperStatusConfig.empty;
  const activeContacts = hopper?.activeAssignableContacts ?? 0;
  const targetContacts = hopper?.targetContacts ?? campaign.activePoolTarget;
  const lowThreshold = hopper?.lowThresholdContacts ?? campaign.lowContactsThreshold;
  const backlogContacts = hopper?.pendingBacklogContacts ?? 0;
  const progress = targetContacts > 0 ? Math.min(100, Math.round((activeContacts / targetContacts) * 100)) : 0;

  return (
    <section className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Hopper</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${statusInfo.barClassName}`} style={{ width: `${progress}%` }} />
            </div>
            <span className="w-12 text-right text-xs font-medium text-gray-500">{progress}%</span>
          </div>
        </div>

      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-400">Actifs</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatNumber(activeContacts)} / {formatNumber(targetContacts)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-400">Seuil bas</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(lowThreshold)}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Seuil bas</span>
            <input
              type="number"
              min={1}
              value={form.lowContactsThreshold}
              onChange={(event) => onChangeField('lowContactsThreshold', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onSave}
              disabled={details.savingHopper}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
            >
              {details.savingHopper ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentPanel({
  campaignId,
  details,
  onAssign,
  onRemove,
  onChangeAssign,
  onChangeQuota,
}: {
  campaignId: number;
  details: CampaignDetails;
  onAssign: (campaignId: number) => void;
  onRemove: (campaignId: number, agentId: number, agentName: string) => void;
  onChangeAssign: (campaignId: number, agentId: string) => void;
  onChangeQuota: (campaignId: number, quota: string) => void;
}) {
  const activeAgents = details.agents.filter((agent) => agent.isActive);
  const assignedIds = new Set(activeAgents.map((agent) => agent.agentId));
  const assignableAgents = details.availableAgents.filter((agent) => !assignedIds.has(agent.id));

  return (
    <aside className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Equipe</h3>
            <p className="text-xs text-gray-500">{activeAgents.length} agent{activeAgents.length > 1 ? 's' : ''} assigne{activeAgents.length > 1 ? 's' : ''}</p>
          </div>
          <Users className="h-4 w-4 text-gray-400" />
        </div>

        <div className="space-y-2">
          {activeAgents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
              Aucun agent assigne
            </div>
          ) : (
            activeAgents.map((agent) => {
              const isRemoving = details.removingAgentId === agent.agentId;
              return (
                <div key={agent.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{agent.agentName || `Agent ${agent.agentId}`}</p>
                    <p className="text-xs text-gray-400">
                      {formatNumber(agent.contactsCalled)} appeles / {formatNumber(agent.contactsAssigned)} assignes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(campaignId, agent.agentId, agent.agentName)}
                    disabled={isRemoving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    title="Retirer l'agent"
                  >
                    {isRemoving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Assigner un agent</h3>
        <div className="mt-3 space-y-3">
          <select
            value={details.assignAgentId}
            onChange={(event) => onChangeAssign(campaignId, event.target.value)}
            disabled={details.assigning || assignableAgents.length === 0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">
              {assignableAgents.length === 0 ? 'Aucun agent disponible' : 'Selectionner un agent'}
            </option>
            {assignableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {getAgentName(agent)}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={details.quota}
              onChange={(event) => onChangeQuota(campaignId, event.target.value)}
              placeholder="Quota"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onAssign(campaignId)}
              disabled={details.assigning || !details.assignAgentId}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {details.assigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function RecycleFileModal({
  campaignId,
  file,
  onClose,
  onRecycled,
}: {
  campaignId: number;
  file: CampaignFileDto;
  onClose: () => void;
  onRecycled: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualificationCounts, setQualificationCounts] = useState<{ qualificationStatus: string; count: number }[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [recycling, setRecycling] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const options = await campaignService.getRecycleOptions(campaignId, file.id);
        if (!mounted) return;
        setQualificationCounts(options.qualificationCounts);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Impossible de charger les qualifications');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadOptions();

    return () => {
      mounted = false;
    };
  }, [campaignId, file.id]);

  const selectedCount = qualificationCounts
    .filter((item) => selectedStatuses.includes(item.qualificationStatus))
    .reduce((sum, item) => sum + item.count, 0);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  };

  const handleRecycle = async () => {
    if (selectedStatuses.length === 0) {
      setError('Selectionnez au moins une qualification');
      return;
    }

    setRecycling(true);
    setError(null);
    try {
      await campaignService.recycleCampaignFile(campaignId, file.id, {
        qualificationStatuses: selectedStatuses,
      });
      onRecycled();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors du recyclage');
    } finally {
      setRecycling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recycler la liste</h2>
          <p className="mt-1 truncate text-sm text-gray-500">{file.sourceFileName}</p>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : qualificationCounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
              <h3 className="mt-3 text-sm font-semibold text-gray-900">Aucune qualification disponible</h3>
              <p className="mt-1 text-sm text-gray-500">
                Qualifiez des contacts avant de recycler cette liste.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Choisissez les qualifications a transformer en nouvelle liste recyclee.
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {qualificationCounts.map((item) => {
                  const checked = selectedStatuses.includes(item.qualificationStatus);
                  return (
                    <label
                      key={item.qualificationStatus}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                        checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStatus(item.qualificationStatus)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {getQualificationLabel(item.qualificationStatus)}
                        </span>
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-200">
                        {formatNumber(item.count)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {formatNumber(selectedCount)} contact{selectedCount > 1 ? 's' : ''} selectionne{selectedCount > 1 ? 's' : ''}
              </div>
            </>
          )}

          {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={recycling}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleRecycle()}
            disabled={recycling || loading || qualificationCounts.length === 0 || selectedStatuses.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {recycling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recycler
          </button>
        </div>
      </div>
    </div>
  );
}

export function InjectionTab({ onRecycled }: { onRecycled?: () => void }) {
  const [campaigns, setCampaigns] = useState<CampaignResponseDto[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [detailsByCampaignId, setDetailsByCampaignId] = useState<Record<number, CampaignDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updatingCampaignId, setUpdatingCampaignId] = useState<number | null>(null);
  const [recycleTarget, setRecycleTarget] = useState<{ campaignId: number; file: CampaignFileDto } | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [createCampaignName, setCreateCampaignName] = useState('');
  const [createCampaignDescription, setCreateCampaignDescription] = useState('');
  const [createCampaignAgentIds, setCreateCampaignAgentIds] = useState<number[]>([]);
  const [createCampaignAgents, setCreateCampaignAgents] = useState<AvailableAgentDto[]>([]);
  const [loadingCreateAgents, setLoadingCreateAgents] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [createCampaignError, setCreateCampaignError] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return campaigns;
    return campaigns.filter((campaign) => campaign.name.toLowerCase().includes(normalizedSearch));
  }, [campaigns, search]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const selectedDetails = selectedCampaignId
    ? detailsByCampaignId[selectedCampaignId] ?? createEmptyDetails()
    : createEmptyDetails();

  function patchDetails(campaignId: number, patch: Partial<CampaignDetails>) {
    setDetailsByCampaignId((current) => ({
      ...current,
      [campaignId]: {
        ...createEmptyDetails(),
        ...current[campaignId],
        ...patch,
      },
    }));
  }

  async function loadCampaignDetails(campaignId: number) {
    patchDetails(campaignId, { loading: true, error: null });
    try {
      const [files, agents, availableAgents, hopper] = await Promise.all([
        campaignService.getCampaignFiles(campaignId),
        campaignService.getAgentsInCampaign(campaignId),
        campaignService.getAvailableAgents(campaignId),
        campaignService.getCampaignHopper(campaignId),
      ]);

      patchDetails(campaignId, {
        files,
        agents,
        availableAgents,
        hopper,
        hopperForm: createHopperForm(hopper),
        loading: false,
        error: null,
      });
    } catch (err: any) {
      patchDetails(campaignId, {
        loading: false,
        error: err?.response?.data?.message || 'Impossible de charger la campagne',
      });
    }
  }

  async function loadCampaigns(showLoading = true) {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await campaignService.getAllCampaigns();
      setCampaigns(data);
      if (selectedCampaignId && !data.some((campaign) => campaign.id === selectedCampaignId)) {
        setSelectedCampaignId(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Impossible de charger les campagnes');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function loadCreateCampaignAgents() {
    setLoadingCreateAgents(true);
    setCreateCampaignError(null);
    try {
      const agents = await campaignService.getAvailableAgents();
      setCreateCampaignAgents(agents);
    } catch (err: any) {
      setCreateCampaignError(err?.response?.data?.message || 'Impossible de charger les agents');
    } finally {
      setLoadingCreateAgents(false);
    }
  }

  const toggleCreateCampaignAgent = (agentId: number, checked: boolean) => {
    setCreateCampaignAgentIds((current) =>
      checked ? [...current, agentId] : current.filter((id) => id !== agentId)
    );
  };

  const resetCreateCampaignForm = () => {
    setCreateCampaignName('');
    setCreateCampaignDescription('');
    setCreateCampaignAgentIds([]);
    setCreateCampaignError(null);
  };

  const handleCreateCampaign = async () => {
    if (!createCampaignName.trim()) {
      setCreateCampaignError('Le nom de la campagne est requis');
      return;
    }

    setCreatingCampaign(true);
    setCreateCampaignError(null);
    try {
      await campaignService.createCampaign({
        name: createCampaignName.trim(),
        description: createCampaignDescription.trim() || undefined,
        agentsIds: createCampaignAgentIds,
      });
      resetCreateCampaignForm();
      setShowCreateCampaign(false);
      await loadCampaigns(false);
    } catch (err: any) {
      setCreateCampaignError(err?.response?.data?.message || 'Erreur lors de la creation de la campagne');
    } finally {
      setCreatingCampaign(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    if (!showCreateCampaign) return;
    void loadCreateCampaignAgents();
  }, [showCreateCampaign]);

  const enterCampaign = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    if (!detailsByCampaignId[campaignId]) {
      void loadCampaignDetails(campaignId);
    }
  };

  const refreshCampaign = async (campaignId: number) => {
    await Promise.all([loadCampaignDetails(campaignId), loadCampaigns(false)]);
  };

  const handleToggleCampaignStatus = async (campaign: CampaignResponseDto) => {
    setUpdatingCampaignId(campaign.id);
    setError(null);
    try {
      await campaignService.updateCampaignStatus(campaign.id, campaign.status !== 1);
      await refreshCampaign(campaign.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la mise a jour de la campagne');
    } finally {
      setUpdatingCampaignId(null);
    }
  };

  const handleChangeAssign = (campaignId: number, agentId: string) => {
    patchDetails(campaignId, { assignAgentId: agentId });
  };

  const handleChangeQuota = (campaignId: number, quota: string) => {
    patchDetails(campaignId, { quota });
  };

  const handleAssignAgent = async (campaignId: number) => {
    const details = detailsByCampaignId[campaignId];
    const agentId = Number(details?.assignAgentId);
    if (!agentId) return;

    const quota = details.quota.trim() ? Number(details.quota) : undefined;
    patchDetails(campaignId, { assigning: true, error: null });
    try {
      await campaignService.addAgentToCampaign(campaignId, {
        agentId,
        userId: agentId,
        quota: Number.isFinite(quota) ? quota : undefined,
      });
      patchDetails(campaignId, { assignAgentId: '', quota: '', assigning: false });
      await refreshCampaign(campaignId);
    } catch (err: any) {
      patchDetails(campaignId, {
        assigning: false,
        error: err?.response?.data?.message || "Erreur lors de l'assignation de l'agent",
      });
    }
  };

  const handleRemoveAgent = async (campaignId: number, agentId: number, agentName: string) => {
    if (!window.confirm(`Retirer ${agentName || 'cet agent'} de la campagne ?`)) return;

    patchDetails(campaignId, { removingAgentId: agentId, error: null });
    try {
      await campaignService.removeAgentFromCampaign(campaignId, agentId);
      patchDetails(campaignId, { removingAgentId: null });
      await refreshCampaign(campaignId);
    } catch (err: any) {
      patchDetails(campaignId, {
        removingAgentId: null,
        error: err?.response?.data?.message || "Erreur lors du retrait de l'agent",
      });
    }
  };

  const handleToggleFile = async (campaignId: number, file: CampaignFileDto) => {
    patchDetails(campaignId, { togglingFileId: file.id, error: null });
    try {
      await campaignService.updateFileStatus(campaignId, file.id, !file.isActive);
      patchDetails(campaignId, { togglingFileId: null });
      await refreshCampaign(campaignId);
    } catch (err: any) {
      patchDetails(campaignId, {
        togglingFileId: null,
        error: err?.response?.data?.message || 'Erreur lors de la mise a jour du fichier',
      });
    }
  };

  const handleChangeFilePriority = async (campaignId: number, file: CampaignFileDto, priority: number) => {
    patchDetails(campaignId, { updatingPriorityId: file.id, error: null });
    try {
      await campaignService.updateFilePriority(campaignId, file.id, priority);
      patchDetails(campaignId, { updatingPriorityId: null });
      await refreshCampaign(campaignId);
    } catch (err: any) {
      patchDetails(campaignId, {
        updatingPriorityId: null,
        error: err?.response?.data?.message || 'Erreur lors de la mise a jour de la priorite',
      });
    }
  };

  const handleChangeHopperField = (
    campaignId: number,
    field: keyof HopperFormState,
    value: string
  ) => {
    setDetailsByCampaignId((current) => {
      const details = {
        ...createEmptyDetails(),
        ...current[campaignId],
      };
      const campaign = campaigns.find((item) => item.id === campaignId);
      const fallbackForm = details.hopperForm
        ?? (details.hopper ? createHopperForm(details.hopper) : campaign ? createHopperForm(campaign) : null);

      if (!fallbackForm) return current;

      return {
        ...current,
        [campaignId]: {
          ...details,
          hopperForm: {
            ...fallbackForm,
            [field]: value,
          },
        },
      };
    });
  };

  const handleSaveHopper = async (campaign: CampaignResponseDto) => {
    const details = detailsByCampaignId[campaign.id] ?? createEmptyDetails();
    const form = details.hopperForm ?? createHopperForm(details.hopper ?? campaign);

    patchDetails(campaign.id, { savingHopper: true, error: null });
    try {
      await campaignService.updateCampaign(campaign.id, {
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        lowContactsThreshold: parseInteger(form.lowContactsThreshold, campaign.lowContactsThreshold),
      });
      patchDetails(campaign.id, { savingHopper: false });
      await refreshCampaign(campaign.id);
    } catch (err: any) {
      patchDetails(campaign.id, {
        savingHopper: false,
        error: err?.response?.data?.message || 'Erreur lors de la mise a jour du hopper',
      });
    }
  };

  const handleRemoveFile = async (campaignId: number, file: CampaignFileDto) => {
    if (!window.confirm(`Retirer "${file.sourceFileName}" de cette campagne ?`)) return;

    patchDetails(campaignId, { removingFileId: file.id, error: null });
    try {
      await campaignService.removeFile(campaignId, file.id);
      patchDetails(campaignId, { removingFileId: null });
      await refreshCampaign(campaignId);
    } catch (err: any) {
      patchDetails(campaignId, {
        removingFileId: null,
        error: err?.response?.data?.message || 'Erreur lors du retrait du fichier',
      });
    }
  };

  const handleRecycleDone = async () => {
    const target = recycleTarget;
    setRecycleTarget(null);
    if (target) {
      await refreshCampaign(target.campaignId);
    }
    onRecycled?.();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-sm text-gray-500">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  if (error && campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Erreur</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        {recycleTarget && (
          <RecycleFileModal
            campaignId={recycleTarget.campaignId}
            file={recycleTarget.file}
            onClose={() => setRecycleTarget(null)}
            onRecycled={() => void handleRecycleDone()}
          />
        )}
      </div>
    );
  }

  const totalContacts = campaigns.reduce((sum, campaign) => sum + campaign.totalContacts, 0);
  const totalFiles = campaigns.reduce((sum, campaign) => sum + campaign.campaignFiles.length, 0);
  const totalAgents = campaigns.reduce(
    (sum, campaign) => sum + campaign.campaignAgents.filter((agent) => agent.isActive).length,
    0,
  );

  if (selectedCampaign) {
    const status = statusConfig[selectedCampaign.status] ?? statusConfig[0];
    const progress = getProgress(selectedCampaign.totalContacts, selectedCampaign.qualifiedContacts);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSelectedCampaignId(null)}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Campagnes
          </button>

          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-gray-900">{selectedCampaign.name}</h1>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCampaign.description || 'Fichiers injectes et equipe de distribution.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void refreshCampaign(selectedCampaign.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleCampaignStatus(selectedCampaign)}
                  disabled={updatingCampaignId === selectedCampaign.id}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    selectedCampaign.status === 1
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {updatingCampaignId === selectedCampaign.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : selectedCampaign.status === 1 ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {selectedCampaign.status === 1 ? 'Mettre en pause' : 'Activer'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Contacts</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(selectedCampaign.totalContacts)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Appeles</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(selectedCampaign.qualifiedContacts)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Restants</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(selectedCampaign.remainingContacts)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Progression</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{progress}%</span>
                </div>
              </div>
            </div>
          </div>

          {selectedDetails.error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{selectedDetails.error}</div>
          )}

          <HopperPanel
            campaign={selectedCampaign}
            details={selectedDetails}
            onChangeField={(field, value) => handleChangeHopperField(selectedCampaign.id, field, value)}
            onSave={() => void handleSaveHopper(selectedCampaign)}
          />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Fichiers</h2>
                <span className="text-xs text-gray-400">{selectedDetails.files.length} fichier{selectedDetails.files.length > 1 ? 's' : ''}</span>
              </div>
              <FileList
                files={selectedDetails.files}
                details={selectedDetails}
                onRecycleFile={(file) => setRecycleTarget({ campaignId: selectedCampaign.id, file })}
                onToggleFile={(file) => void handleToggleFile(selectedCampaign.id, file)}
                onRemoveFile={(file) => void handleRemoveFile(selectedCampaign.id, file)}
                onChangePriority={(file, priority) => void handleChangeFilePriority(selectedCampaign.id, file, priority)}
              />
            </div>

            <AgentPanel
              campaignId={selectedCampaign.id}
              details={selectedDetails}
              onAssign={(campaignId) => void handleAssignAgent(campaignId)}
              onRemove={(campaignId, agentId, agentName) => void handleRemoveAgent(campaignId, agentId, agentName)}
              onChangeAssign={handleChangeAssign}
              onChangeQuota={handleChangeQuota}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Injections</h1>
              <p className="mt-1 text-sm text-gray-500">
                Entrez dans une campagne pour consulter ses fichiers et gerer ses agents.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                <FileText className="h-3.5 w-3.5" />
                {formatNumber(totalFiles)} fichiers
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(totalAgents)} agents
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {formatNumber(totalContacts)} contacts
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une campagne..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCampaign((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nouvelle campagne
            </button>
            <button
              type="button"
              onClick={() => void loadCampaigns(false)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>
        </div>

        {showCreateCampaign && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Nouvelle campagne</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Creez la campagne ici, puis injectez les fichiers depuis l'onglet Fichiers sources.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetCreateCampaignForm();
                  setShowCreateCampaign(false);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    type="text"
                    value={createCampaignName}
                    onChange={(event) => setCreateCampaignName(event.target.value)}
                    placeholder="Ex: Campagne PV - Juin 2026"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={creatingCampaign}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={createCampaignDescription}
                    onChange={(event) => setCreateCampaignDescription(event.target.value)}
                    placeholder="Objectif, fournisseur, pays ou notes utiles"
                    className="min-h-24 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={creatingCampaign}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Agents</label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {loadingCreateAgents ? (
                    <p className="text-sm text-gray-500">Chargement des agents...</p>
                  ) : createCampaignAgents.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucun agent disponible</p>
                  ) : (
                    <div className="space-y-1">
                      {createCampaignAgents.map((agent) => (
                        <label key={agent.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={createCampaignAgentIds.includes(agent.id)}
                            onChange={(event) => toggleCreateCampaignAgent(agent.id, event.target.checked)}
                            disabled={creatingCampaign}
                          />
                          <span className="truncate text-sm">{getAgentName(agent)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Les agents peuvent aussi etre ajoutes plus tard dans la campagne.
                </p>
              </div>
            </div>

            {createCampaignError && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {createCampaignError}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetCreateCampaignForm();
                  setShowCreateCampaign(false);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                disabled={creatingCampaign}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleCreateCampaign()}
                disabled={creatingCampaign || !createCampaignName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingCampaign && <RefreshCw className="h-4 w-4 animate-spin" />}
                Creer la campagne
              </button>
            </div>
          </div>
        )}

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {filteredCampaigns.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <Clock3 className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune campagne</h3>
            <p className="mt-1 text-sm text-gray-500">Les campagnes avec fichiers injectes apparaitront ici.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isUpdating={updatingCampaignId === campaign.id}
                onEnter={() => enterCampaign(campaign.id)}
                onToggleStatus={() => void handleToggleCampaignStatus(campaign)}
              />
            ))}
          </div>
        )}
      </div>
      {recycleTarget && (
        <RecycleFileModal
          campaignId={recycleTarget.campaignId}
          file={recycleTarget.file}
          onClose={() => setRecycleTarget(null)}
          onRecycled={() => void handleRecycleDone()}
        />
      )}
    </div>
  );
}
