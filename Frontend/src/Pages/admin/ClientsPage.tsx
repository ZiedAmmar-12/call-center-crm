import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';
import { clientService } from '../../services/clientService';
import type { Client, CreateClientDto, UpdateClientDto } from '../../types/client';
import { Layout } from '../../shared/components/Layout';

const emptyForm: CreateClientDto = {
    code: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    isActive: true,
};

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState<CreateClientDto>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            setLoading(true);
            setError(null);
            const data = await clientService.getAll();
            setClients(data);
        } catch {
            setError('Impossible de charger les clients.');
        } finally {
            setLoading(false);
        }
    }

    function openCreate() {
        setEditingClient(null);
        setForm(emptyForm);
        setFormError(null);
        setShowModal(true);
    }

    function openEdit(client: Client) {
        setEditingClient(client);
        setForm({
            code: client.code,
            nom: client.nom,
            email: client.email ?? '',
            telephone: client.telephone ?? '',
            adresse: client.adresse ?? '',
            isActive: client.isActive,
        });
        setFormError(null);
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingClient(null);
        setForm(emptyForm);
        setFormError(null);
    }

    async function handleSave() {
        if (!form.code.trim()) { setFormError('Le code est obligatoire.'); return; }
        if (!form.nom.trim()) { setFormError('Le nom est obligatoire.'); return; }

        setSaving(true);
        setFormError(null);
        try {
            if (editingClient) {
                const dto: UpdateClientDto = {
                    nom: form.nom,
                    email: form.email || undefined,
                    telephone: form.telephone || undefined,
                    adresse: form.adresse || undefined,
                    isActive: form.isActive,
                };
                const updated = await clientService.update(editingClient.id, dto);
                setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            } else {
                const created = await clientService.create(form);
                setClients(prev => [...prev, created]);
            }
            closeModal();
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Une erreur est survenue.';
            setFormError(msg);
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleActive(client: Client) {
        try {
            const updated = await clientService.update(client.id, { isActive: !client.isActive });
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        } catch {
            setError('Impossible de modifier le statut.');
        }
    }

    async function handleDelete(id: number) {
        setDeleteError(null);
        try {
            await clientService.delete(id);
            setClients(prev => prev.filter(c => c.id !== id));
            setDeletingId(null);
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Impossible de supprimer ce client.';
            setDeleteError(msg);
        }
    }

    return (
        <Layout>
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Clients Partenaires</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Les noms réels sont visibles uniquement ici. Les agents voient uniquement le code (client1, client2…).
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau client
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Chargement…</div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        Aucun client partenaire. Créez-en un.
                    </div>
                ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Téléphone</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {clients.map(client => (
                                    <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs font-semibold">
                                                {client.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">{client.nom}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{client.email || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{client.telephone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggleActive(client)}
                                                className="flex items-center gap-1.5 text-xs font-medium"
                                            >
                                                {client.isActive ? (
                                                    <>
                                                        <ToggleRight className="w-5 h-5 text-green-500" />
                                                        <span className="text-green-600">Actif</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Inactif</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(client)}
                                                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                    title="Modifier"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setDeletingId(client.id); setDeleteError(null); }}
                                                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">
                                {editingClient ? 'Modifier le client' : 'Nouveau client partenaire'}
                            </h2>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            {formError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Code <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex: client1"
                                    value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                    disabled={!!editingClient}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {editingClient && (
                                    <p className="text-xs text-muted-foreground mt-1">Le code ne peut pas être modifié.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Nom réel <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex: Société Dupont Solar"
                                    value={form.nom}
                                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="contact@societe.fr"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                                <input
                                    type="text"
                                    placeholder="06 00 00 00 00"
                                    value={form.telephone}
                                    onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Adresse</label>
                                <input
                                    type="text"
                                    placeholder="12 rue de la Paix, Paris"
                                    value={form.adresse}
                                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 accent-primary"
                                />
                                <label htmlFor="isActive" className="text-sm text-foreground">Actif</label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deletingId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
                        <h2 className="font-semibold text-foreground mb-2">Supprimer ce client ?</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Cette action est irréversible. Si le client a des RDVs existants, la suppression sera bloquée.
                        </p>
                        {deleteError && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
                                {deleteError}
                            </div>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setDeletingId(null); setDeleteError(null); }}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="px-4 py-2 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
