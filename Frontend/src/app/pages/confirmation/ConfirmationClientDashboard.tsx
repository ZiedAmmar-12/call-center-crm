import SessionAttendanceWidget from '../../components/SessionAttendanceWidget';
import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Building, Phone, Users, CheckCircle, Briefcase, Banknote, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

const AGENDA_TABS = [
  { id: 'CLIENT2', label: 'Agenda Client',   icon: '👥', endpoint: 'confirmation2/agenda'      },
  { id: 'CLIENT1', label: 'RDV Disponibles', icon: '👤', endpoint: 'confirmation-client/rdv-disponibles' },
];

interface Rdv {
  id: number;
  contactNom: string;
  contactPrenom: string;
  telephone: string;
  email?: string;
  source: string;
  agentNom: string;
  dateRendezVous: string;
  statut: string;
  commentaire?: string;
  commentaireBanque?: string;
}

interface Commercial {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
}

export default function ConfirmationClientDashboard() {
  const [rdvs, setRdvs] = useState<Rdv[]>([]);
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRdv, setSelectedRdv] = useState<Rdv | null>(null);
  const [selectedCommercial, setSelectedCommercial] = useState('');
  const [commentaireBanque, setCommentaireBanque] = useState('');

  const [myAgendas, setMyAgendas] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('CLIENT2');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const token = () => localStorage.getItem('token');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    fetchMyAgendas();
    fetchCommerciaux();
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [activeTab]);

  const fetchMyAgendas = async () => {
    try {
      const res = await fetch(`${API_URL}/confirmatrice/my-agendas`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) return;
      const list: string[] = await res.json();
      setMyAgendas(list);
      const first = AGENDA_TABS.find(t => list.includes(t.id));
      if (first) setActiveTab(first.id);
    } catch {
      setMyAgendas(AGENDA_TABS.map(t => t.id));
    }
  };

  const fetchAgenda = async () => {
    try {
      const tab = AGENDA_TABS.find(t => t.id === activeTab) ?? AGENDA_TABS[0];
      const response = await fetch(`${API_URL}/${tab.endpoint}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setRdvs(await response.json());
      setError(null);
    } catch (error: any) {
      console.error('Erreur fetchAgenda:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommerciaux = async () => {
    try {
      const response = await fetch(`${API_URL}/confirmation2/commerciaux`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setCommerciaux(await response.json());
    } catch (error) {
      console.error('Erreur fetchCommerciaux:', error);
    }
  };

  const assignerCommercial = async (rdvId: number) => {
    if (!selectedCommercial) { showToast('Veuillez sélectionner un commercial', 'error'); return; }
    try {
      const t = token();
      await fetch(`${API_URL}/confirmation2/rdv/${rdvId}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ commercialId: parseInt(selectedCommercial) })
      });
      if (commentaireBanque) {
        await fetch(`${API_URL}/confirmation2/rdv/${rdvId}/banque`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ commentaireBanque })
        });
      }
      setSelectedRdv(null);
      setSelectedCommercial('');
      setCommentaireBanque('');
      fetchAgenda();
      showToast('Rendez-vous assigné avec succès !');
    } catch (error) {
      console.error('Erreur assignerCommercial:', error);
      showToast("Erreur lors de l'assignation", 'error');
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'CONFIRME': return <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} />Confirmé</span>;
      case 'ANNULE':   return <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded-full text-xs">❌ Annulé</span>;
      case 'REPORTER': return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 px-2 py-1 rounded-full text-xs">⏰ Reporter</span>;
      default:         return <span className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">{statut}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
      <div className="mb-4">
        <SessionAttendanceWidget />
      </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-500 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="font-semibold">⚠️ Erreur de connexion au serveur</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={() => { fetchAgenda(); fetchCommerciaux(); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-500'
            : 'bg-red-500'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={18} className="shrink-0" />
            : <XCircle size={18} className="shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Service Confirmation Client</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestion des rendez-vous et attribution aux commerciaux</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 text-center border border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="flex items-center justify-center mb-2">
            <Calendar size={28} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{rdvs.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">📋 RDV à traiter</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 text-center border border-green-200 dark:border-green-700 shadow-sm">
          <div className="flex items-center justify-center mb-2">
            <Users size={28} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{commerciaux.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">👔 Commerciaux actifs</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-5 text-center border border-purple-200 dark:border-purple-700 shadow-sm">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle size={28} className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{rdvs.filter(r => r.statut === 'CONFIRME').length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">✅ RDV confirmés</div>
        </div>
      </div>

      {/* Agenda Tabs */}
      {(() => {
        const visibleTabs = AGENDA_TABS.filter(t => myAgendas.length === 0 || myAgendas.includes(t.id));
        return visibleTabs.length > 1 ? (
          <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg shadow p-1 border border-gray-200 dark:border-gray-700">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        ) : null;
      })()}

      {/* Liste des RDV */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">📋 Rendez-vous à traiter</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{rdvs.length} rendez-vous</span>
        </div>

        {rdvs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
            <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p>Aucun rendez-vous à traiter</p>
            <p className="text-sm mt-1">Tous les rendez-vous ont été assignés</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rdvs.map((rdv) => (
              <div key={rdv.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-700">
                {/* En-tête carte */}
                <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Building size={18} className="text-primary" />
                    <span className="font-semibold text-gray-800 dark:text-white">{rdv.source}</span>
                  </div>
                  {getStatutBadge(rdv.statut)}
                </div>

                {/* Informations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Users size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-400 text-xs block">Contact</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{rdv.contactPrenom} {rdv.contactNom}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-400 text-xs block">Téléphone</span>
                        <span className="text-gray-800 dark:text-gray-200">{rdv.telephone}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-400 text-xs block">Agent</span>
                        <span className="text-gray-800 dark:text-gray-200">{rdv.agentNom || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Calendar size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-400 text-xs block">Date du rendez-vous</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(rdv.dateRendezVous).toLocaleString()}</span>
                      </div>
                    </div>
                    {rdv.commentaireBanque && (
                      <div className="flex items-start gap-2">
                        <Banknote size={16} className="text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-400 text-xs block">Commentaire banque</span>
                          <span className="text-gray-800 dark:text-gray-200 text-sm">{rdv.commentaireBanque}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={() => setSelectedRdv(rdv)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Briefcase size={16} />
                    Assigner à un commercial
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal assignation */}
      {selectedRdv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            {/* En-tête modal */}
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assigner le rendez-vous</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedRdv.contactPrenom} {selectedRdv.contactNom}
              </p>
            </div>

            {/* Corps modal */}
            <div className="p-6 space-y-5">
              {/* Info RDV */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{selectedRdv.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{new Date(selectedRdv.dateRendezVous).toLocaleString()}</span>
                </div>
              </div>

              {/* Sélection commercial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  👔 Sélectionner un commercial
                </label>
                <select
                  value={selectedCommercial}
                  onChange={(e) => setSelectedCommercial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">-- Choisir un commercial --</option>
                  {commerciaux.map((c) => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>

              {/* Commentaire banque */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💰 Commentaire banque (optionnel)
                </label>
                <textarea
                  value={commentaireBanque}
                  onChange={(e) => setCommentaireBanque(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Ajouter un commentaire pour la banque..."
                />
              </div>
            </div>

            {/* Boutons modal */}
            <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedRdv(null);
                  setSelectedCommercial('');
                  setCommentaireBanque('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => assignerCommercial(selectedRdv.id)}
                disabled={!selectedCommercial}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
