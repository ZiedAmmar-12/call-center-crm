import React, { useEffect, useState } from 'react';
import { campaignService } from '../services/CampaignService';
import { contactDistributionService } from '../services/contactDistributionService';
import type { AvailableAgentDto, CampaignAgentDto, CampaignResponseDto } from '../types/campaign';

interface CampaignInjectionModalProps {
    fileId: number;
    fileName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CampaignInjectionModal: React.FC<CampaignInjectionModalProps> = ({
    fileId,
    fileName,
    onClose,
    onSuccess
}) => {
    const [campaigns, setCampaigns] = useState<CampaignResponseDto[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
    const [availableAgents, setAvailableAgents] = useState<AvailableAgentDto[]>([]);
    const [campaignAgents, setCampaignAgents] = useState<CampaignAgentDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [removingAgentId, setRemovingAgentId] = useState<number | null>(null);
    const [isInjecting, setIsInjecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCampaigns = async () => {
            setIsLoading(true);
            try {
                const campaignData = await campaignService.getAllCampaigns();
                setCampaigns(campaignData);
            } catch (err: any) {
                setError(err.response?.data?.message || "Impossible de charger les campagnes");
            } finally {
                setIsLoading(false);
            }
        };

        void loadCampaigns();
    }, []);

    useEffect(() => {
        const loadAgents = async () => {
            setSelectedAgents([]);

            if (!selectedCampaignId) {
                setCampaignAgents([]);
                setAvailableAgents([]);
                return;
            }

            setIsLoadingAgents(true);
            try {
                const [assignedAgents, agentsData] = await Promise.all([
                    campaignService.getAgentsInCampaign(selectedCampaignId),
                    campaignService.getAvailableAgents(selectedCampaignId),
                ]);
                setCampaignAgents(assignedAgents);
                setAvailableAgents(agentsData);
            } catch (err: any) {
                setError(err.response?.data?.message || "Impossible de charger les agents de la campagne");
            } finally {
                setIsLoadingAgents(false);
            }
        };

        void loadAgents();
    }, [selectedCampaignId]);

    const getAgentName = (agent: AvailableAgentDto) =>
        agent.fullName || [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email;

    const getAssignedAgentName = (agent: CampaignAgentDto) =>
        agent.agentName || `Agent ${agent.agentId}`;

    const toggleSelectedAgent = (agentId: number, checked: boolean) => {
        setSelectedAgents((current) =>
            checked ? [...current, agentId] : current.filter(id => id !== agentId)
        );
    };

    const removeCampaignAgent = async (agentId: number) => {
        if (!selectedCampaignId) return;

        setRemovingAgentId(agentId);
        setError(null);

        try {
            await campaignService.removeAgentFromCampaign(selectedCampaignId, agentId);
            const [assignedAgents, agentsData] = await Promise.all([
                campaignService.getAgentsInCampaign(selectedCampaignId),
                campaignService.getAvailableAgents(selectedCampaignId),
            ]);
            setCampaignAgents(assignedAgents);
            setAvailableAgents(agentsData);
            setSelectedAgents((current) => current.filter(id => id !== agentId));
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors du retrait de l'agent");
        } finally {
            setRemovingAgentId(null);
        }
    };

    const handleInject = async () => {
        if (!selectedCampaignId) {
            setError("Veuillez selectionner une campagne");
            return;
        }

        setIsInjecting(true);
        setError(null);

        try {
            for (const agentId of selectedAgents) {
                await campaignService.addAgentToCampaign(selectedCampaignId, { agentId, userId: agentId });
            }

            await contactDistributionService.injectFile(selectedCampaignId, fileId);

            alert(`Fichier "${fileName}" injecte avec succes !`);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors de l'injection");
        } finally {
            setIsInjecting(false);
        }
    };

    const hasAgentsForInjection = campaignAgents.length + selectedAgents.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="mb-1 text-xl font-semibold">Injecter le fichier</h2>
                <p className="mb-6 text-sm text-gray-600">
                    Fichier : <strong>{fileName}</strong>
                </p>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium">Campagne existante</label>
                    <select
                        value={selectedCampaignId || ''}
                        onChange={(event) => setSelectedCampaignId(Number(event.target.value) || null)}
                        className="w-full rounded-lg border border-gray-300 p-3"
                        disabled={isLoading || isInjecting}
                    >
                        <option value="">
                            {isLoading ? 'Chargement des campagnes...' : '-- Choisir une campagne --'}
                        </option>
                        {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </select>
                    {campaigns.length === 0 && !isLoading && (
                        <p className="mt-2 text-sm text-amber-700">
                            Creez une campagne dans l'onglet Injections avant d'injecter un fichier.
                        </p>
                    )}
                </div>

                {selectedCampaignId && (
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium">Agents assignes</label>
                        <div className="rounded-lg border border-gray-200 p-3">
                            {isLoadingAgents ? (
                                <p className="text-sm text-gray-500">Chargement des agents...</p>
                            ) : campaignAgents.length === 0 ? (
                                <p className="text-sm text-gray-400">Aucun agent assigne a cette campagne</p>
                            ) : (
                                <div className="space-y-2">
                                    {campaignAgents.map((agent) => (
                                        <div key={agent.id} className="flex items-center justify-between gap-3 rounded bg-gray-50 px-3 py-2">
                                            <span className="truncate text-sm">{getAssignedAgentName(agent)}</span>
                                            <button
                                                type="button"
                                                onClick={() => void removeCampaignAgent(agent.agentId)}
                                                disabled={removingAgentId === agent.agentId || isInjecting}
                                                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                {removingAgentId === agent.agentId ? 'Retrait...' : 'Retirer'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {selectedCampaignId && (
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium">Ajouter des agents</label>
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-3">
                            {isLoadingAgents ? (
                                <p className="text-sm text-gray-500">Chargement des agents...</p>
                            ) : availableAgents.length === 0 ? (
                                <p className="text-sm text-gray-400">Aucun agent disponible</p>
                            ) : (
                                availableAgents.map((agent) => (
                                    <label key={agent.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedAgents.includes(agent.id)}
                                            onChange={(event) => toggleSelectedAgent(agent.id, event.target.checked)}
                                        />
                                        <span>{getAgentName(agent)}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-lg px-5 py-2 text-gray-600 hover:bg-gray-100">
                        Annuler
                    </button>
                    <button
                        onClick={handleInject}
                        disabled={isInjecting || !selectedCampaignId || !hasAgentsForInjection}
                        className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        {isInjecting ? 'Injection en cours...' : "Confirmer l'injection"}
                    </button>
                </div>
            </div>
        </div>
    );
};
