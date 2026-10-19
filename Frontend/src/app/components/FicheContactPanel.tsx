import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  X, Phone, PhoneCall, User, MapPin, Calendar, Flame,
  Home, Zap, Users, Lock, CheckCircle, MessageSquare,
  ArrowRight, BadgeCheck
} from 'lucide-react';
import { api } from '../../services/api';

export interface RdvDetail {
  id: number;
  contactId: number;
  contactNom: string;
  contactPrenom: string;
  telephone: string;
  numGSM?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  source: string;
  agentId?: number;
  agentNom: string;
  dateCreation: string;
  dateRendezVous: string;
  statut: string;
  typeRendezVous?: string;
  commentaireAgent?: string;
  commentaireConfirmation?: string;
  projet?: string;
  proprietaireDepuis?: string;
  modeChauffage?: string;
  consommationChauffage?: string;
  ageChaudiere?: number;
  etudePV?: boolean;
  equipePV?: boolean;
  equipePAC?: boolean;
  etatToiture?: string;
  etatIsolation?: string;
  surface?: number;
  nombrePersonnes?: number;
  professionMr?: string;
  professionMme?: string;
  credits?: string;
  revenus?: string;
  fichage?: boolean;
}

export const STATUTS_EBI: { label: string; value: string }[] = [
  { label: 'RDV Confirmé', value: 'CONFIRME' },
  { label: 'RDV Annulé', value: 'ANNULE' },
  { label: 'RDV HC (Hors Cible)', value: 'HORS_CIBLE' },
  { label: 'RDV à refixer', value: 'REPORTER' },
  { label: 'Pas intéressé', value: 'NON_SIGNE' },
  { label: 'A refixer', value: 'REPORTER' },
  { label: 'Annul présence du couple', value: 'ANNULE' },
  { label: 'Projet pas pour tt de suite', value: 'PORTE' },
  { label: 'A rappeler', value: 'REPORTER' },
  { label: 'Annul infinançable', value: 'ANNULE' },
  { label: 'NRP', value: 'NRP' },
];

export const STATUTS_CLIENT2: { label: string; value: string }[] = [
  { label: 'RDV Confirmé', value: 'CONFIRME' },
  { label: 'RDV Annulé', value: 'ANNULE' },
  { label: 'RDV HC', value: 'HORS_CIBLE' },
  { label: 'RDV à refixer', value: 'REPORTER' },
  { label: 'Projet pas pour le moment', value: 'PORTE' },
  { label: 'Pas intéressé', value: 'NON_SIGNE' },
  { label: 'NRP (n fois)', value: 'NRP' },
];

interface Props {
  rdv: RdvDetail;
  agendaType: 'EBI' | 'CLIENT1' | 'CLIENT2' | 'REFUS';
  updateEndpoint: string;   // e.g. '/api/confirmation1/rdv'
  returnPath: string;       // e.g. '/confirmation1/agenda-ebi'
  onClose: () => void;
  onSaved: () => void;
}

const statutColor: Record<string, string> = {
  CONFIRME:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  ANNULE:             'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  REPORTER:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  BRUT:               'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  NRP:                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  HORS_CIBLE:         'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  NON_SIGNE:          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  PORTE:              'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  CONFIRME_CONF_CALL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  CONFIRME_TOTAL:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

const statutLabel: Record<string, string> = {
  CONFIRME:           'Confirmé',
  CONFIRME_CONF_CALL: 'Conf. Conf Call',
  CONFIRME_TOTAL:     'Confirmé Totalement',
  ANNULE:             'Annulé',
  REPORTER:           'Reporté',
  BRUT:               'Brut',
  NRP:                'NRP',
  HORS_CIBLE:         'Hors Cible',
  NON_SIGNE:          'Non Signé',
  PORTE:              'Porté',
};

export default function FicheContactPanel({ rdv, agendaType, updateEndpoint, returnPath, onClose, onSaved }: Props) {
  const navigate = useNavigate();
  const calledKey = `called_rdv_${rdv.id}`;
  const [hasCalled, setHasCalled] = useState(() => sessionStorage.getItem(calledKey) === 'true');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [commentaire, setCommentaire] = useState(rdv.commentaireConfirmation || '');
  const [projet, setProjet] = useState(rdv.projet || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // RDV passé = lecture seule (pas d'appel ni qualification)
  const rdvDate = new Date(rdv.dateRendezVous);
  rdvDate.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const isPastRdv = rdvDate < todayMidnight;

  const statuts = agendaType === 'CLIENT2' ? STATUTS_CLIENT2 : STATUTS_EBI;
  const phoneMain = rdv.numGSM || rdv.telephone;
  const phoneSec  = rdv.numGSM ? rdv.telephone : undefined;

  const handleCall = () => {
    sessionStorage.setItem(calledKey, 'true');
    setHasCalled(true);
    navigate(`/agent/contact?id=${rdv.contactId}&returnTo=${encodeURIComponent(returnPath)}&rdvId=${rdv.id}`);
  };

  const handleSave = async () => {
    if (!selectedStatut) { alert('Sélectionnez un statut'); return; }
    setSaving(true);
    try {
      await api.put(`${updateEndpoint}/${rdv.id}/statut`, {
        statut: selectedStatut,
        commentaire,
        projet,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async (newStatut: string, typeRendezVous?: string) => {
    setSaving(true);
    try {
      await api.put(`${updateEndpoint}/${rdv.id}/statut`, {
        statut: newStatut,
        ...(typeRendezVous ? { typeRendezVous } : {}),
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Erreur lors de la mise à jour du workflow');
    } finally {
      setSaving(false);
    }
  };

  // Workflow : conf call EBI → envoyer vers agenda client
  const isWorkflowConfCall = agendaType === 'EBI' && rdv.statut === 'CONFIRME';
  // Workflow : conf client EBI → confirmer totalement
  const isWorkflowConfClient = agendaType === 'EBI' && rdv.statut === 'CONFIRME_CONF_CALL';

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).getFullYear().toString();
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800">
      {/* Header — sticky par rapport au conteneur scrollable parent */}
      <div className="flex items-start justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-lg truncate">
            {rdv.contactPrenom} {rdv.contactNom}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColor[rdv.statut] || 'bg-gray-100 text-gray-600'}`}>
              {statutLabel[rdv.statut] || rdv.statut}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(rdv.dateRendezVous).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à {new Date(rdv.dateRendezVous).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ml-2 flex-shrink-0">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 text-sm">

        {/* Appel */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 border border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Appel</p>
          <div className="space-y-2">
            {phoneMain && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-primary" />
                  <span className="font-mono font-medium dark:text-white">{phoneMain}</span>
                  {rdv.numGSM && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">GSM</span>}
                </div>
              </div>
            )}
            {phoneSec && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone size={13} />
                <span className="font-mono">{phoneSec}</span>
                <span className="text-xs text-gray-400">Fixe</span>
              </div>
            )}
          </div>
          {isPastRdv ? (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-xs">
              <Lock size={14} />
              RDV passé — appel non disponible
            </div>
          ) : (
            <button
              onClick={handleCall}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              <PhoneCall size={16} />
              Appeler ce contact
            </button>
          )}
          {hasCalled && !isPastRdv && (
            <div className="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs">
              <CheckCircle size={13} />
              Appel effectué — qualification déverrouillée
            </div>
          )}
        </div>

        {/* Info agent + source */}
        <div className="space-y-1.5 text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <User size={13} className="text-gray-400 flex-shrink-0" />
            <span>Agent : <span className="font-medium">{rdv.agentNom || '—'}</span></span>
          </div>
          {rdv.adresse && (
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{rdv.adresse}{rdv.codePostal ? `, ${rdv.codePostal}` : ''}{rdv.ville ? ` ${rdv.ville}` : ''}</span>
            </div>
          )}
          {rdv.email && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span className="text-xs">✉</span>
              <span className="truncate">{rdv.email}</span>
            </div>
          )}
        </div>

        {/* Commentaire agent (confidentiel) */}
        {rdv.commentaireAgent && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Commentaire agent
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-xs">{rdv.commentaireAgent}</p>
          </div>
        )}

        {/* Qualification logement */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Home size={12} /> Logement
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 dark:text-gray-300">
            <Row label="Propriétaire depuis" value={formatDate(rdv.proprietaireDepuis)} />
            <Row label="Mode chauffage" value={rdv.modeChauffage} />
            <Row label="Conso. chauffage" value={rdv.consommationChauffage} />
            <Row label="Âge chaudière" value={rdv.ageChaudiere ? `${rdv.ageChaudiere} ans` : undefined} />
            <Row label="État toiture" value={rdv.etatToiture} />
            <Row label="État isolation" value={rdv.etatIsolation} />
            <Row label="Surface" value={rdv.surface ? `${rdv.surface} m²` : undefined} />
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {rdv.etudePV   && <Badge label="Étude PV" color="yellow" />}
            {rdv.equipePV  && <Badge label="Équipé PV" color="green" />}
            {rdv.equipePAC && <Badge label="Équipé PAC" color="blue" />}
          </div>
        </div>

        {/* Foyer */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Users size={12} /> Foyer
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 dark:text-gray-300">
            <Row label="Nbre personnes" value={rdv.nombrePersonnes?.toString()} />
            <Row label="Profession Mr" value={rdv.professionMr} />
            <Row label="Profession Mme" value={rdv.professionMme} />
            <Row label="Crédits" value={rdv.credits} />
            <Row label="Revenus" value={rdv.revenus} />
            <Row label="Fichage" value={rdv.fichage === true ? 'Oui' : rdv.fichage === false ? 'Non' : undefined} />
          </div>
        </div>

        {/* Qualification confirmatrice */}
        <div className={`rounded-lg border p-3 space-y-3 ${isPastRdv ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60' : hasCalled ? 'border-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'}`}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            {isPastRdv ? <Lock size={12} /> : hasCalled ? <CheckCircle size={12} className="text-primary" /> : <Lock size={12} />}
            Qualification confirmatrice
          </p>

          {/* ── Workflow Conf Call → Agenda Client 1 / Client 2 ── */}
          {!isPastRdv && isWorkflowConfCall && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <ArrowRight size={13} /> Envoyer vers Agenda Client
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleWorkflowAction('CONFIRME_CONF_CALL', 'CLIENT1')}
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowRight size={14} /> Client 1
                </button>
                <button
                  onClick={() => handleWorkflowAction('CONFIRME_CONF_CALL', 'CLIENT2')}
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowRight size={14} /> Client 2
                </button>
              </div>
            </div>
          )}

          {/* ── Workflow Conf Client → Confirmation totale ── */}
          {!isPastRdv && isWorkflowConfClient && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <BadgeCheck size={13} /> Action workflow
              </p>
              <button
                onClick={() => handleWorkflowAction('CONFIRME_TOTAL')}
                disabled={saving}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BadgeCheck size={15} />
                {saved ? 'Confirmé !' : saving ? 'En cours…' : 'Confirmer Totalement'}
              </button>
            </div>
          )}

          {isPastRdv ? (
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-2">
              <Lock size={14} />
              <span>RDV passé — qualification disponible uniquement le jour J</span>
            </div>
          ) : !hasCalled ? (
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-2">
              <Lock size={14} />
              <span>Appelez d'abord le contact pour déverrouiller la qualification</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Statut *</label>
                <select
                  value={selectedLabel}
                  onChange={e => {
                    const opt = statuts.find(s => s.label === e.target.value);
                    setSelectedLabel(e.target.value);
                    setSelectedStatut(opt?.value || '');
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">-- Sélectionner --</option>
                  {statuts.map((s, i) => (
                    <option key={i} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Projet</label>
                <input
                  type="text"
                  value={projet}
                  onChange={e => setProjet(e.target.value)}
                  placeholder="PV, PAC, Isolation…"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Commentaire confirmation</label>
                <textarea
                  rows={3}
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder="Remarques confirmatrice…"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !selectedStatut}
                className="w-full py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition font-medium text-sm flex items-center justify-center gap-2"
              >
                {saved ? <><CheckCircle size={15} /> Sauvegardé</> : saving ? 'Sauvegarde…' : 'Valider la qualification'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <>
      <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </>
  );
}

function Badge({ label, color }: { label: string; color: 'yellow' | 'green' | 'blue' }) {
  const cls = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
