import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { XCircle, Search, AlertCircle, Phone, MapPin, User } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5241';

interface RdvRefus {
  id: number;
  dateRendezVous: string;
  statut: string;
  commentaire?: string;
  commentaireConfirmation?: string;
  contact: {
    id: number;
    nom: string;
    prenom: string;
    telephone: string;
    numGSM?: string;
    ville?: string;
    codePostal?: string;
    statutAgent?: string;
  };
  agent: { id: number; nom: string; prenom: string };
}

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  BRUT: { label: 'Brut', cls: 'bg-blue-100 text-blue-700' },
  CONFIRME: { label: 'Confirmé', cls: 'bg-green-100 text-green-700' },
  ANNULE: { label: 'Annulé', cls: 'bg-red-100 text-red-700' },
  REPORTER: { label: 'Reporté', cls: 'bg-yellow-100 text-yellow-700' },
  HORS_CIBLE: { label: 'Hors cible', cls: 'bg-gray-100 text-gray-700' },
};

export default function AgendaRefusEquipe() {
  const [rdvs, setRdvs] = useState<RdvRefus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debutFilter, setDebutFilter] = useState('');
  const [finFilter, setFinFilter] = useState('');

  const fetchRdvs = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params: any = {};
    if (debutFilter) params.debut = debutFilter;
    if (finFilter) params.fin = finFilter;

    axios.get(`${API_URL}/api/qualite/agenda-refus`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })
      .then(res => setRdvs(res.data))
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRdvs(); }, []);

  const filtered = rdvs.filter(r =>
    !search ||
    r.contact.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact.prenom?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact.telephone?.includes(search) ||
    r.agent.nom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" /> Agenda Refus — Équipe
          </h1>
          <p className="text-muted-foreground">Tous les RDV de type REFUS de l'équipe</p>
        </div>

        {/* Filtres */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-muted-foreground mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nom, téléphone, agent…"
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Date début</label>
            <input
              type="date"
              value={debutFilter}
              onChange={e => setDebutFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Date fin</label>
            <input
              type="date"
              value={finFilter}
              onChange={e => setFinFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={fetchRdvs}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Filtrer
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              RDV Refus ({filtered.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun RDV refus trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date RDV</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Coordonnées</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(rdv => {
                    const st = STATUT_LABELS[rdv.statut] || { label: rdv.statut, cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={rdv.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(rdv.dateRendezVous).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{rdv.contact.nom} {rdv.contact.prenom}</div>
                          {rdv.contact.statutAgent && (
                            <div className="text-xs text-muted-foreground mt-0.5">{rdv.contact.statutAgent}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" /> {rdv.contact.telephone}
                          </div>
                          {rdv.contact.ville && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" /> {rdv.contact.codePostal} {rdv.contact.ville}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <User className="w-3 h-3" /> {rdv.agent.nom} {rdv.agent.prenom}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-muted-foreground truncate">{rdv.commentaire || '—'}</p>
                          {rdv.commentaireConfirmation && (
                            <p className="text-xs text-blue-600 truncate mt-0.5">{rdv.commentaireConfirmation}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
