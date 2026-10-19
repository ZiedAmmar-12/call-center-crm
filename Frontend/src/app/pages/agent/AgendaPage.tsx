import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { agentService } from '../../../services/agentService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckCircle, XCircle, AlertCircle, Clock, RefreshCw, Phone, User
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, addMonths, subMonths
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgendaEvent {
  id: number;
  dateHeure: string;
  contact: string;
  societe: string;
  statut: string;
  commentaire: string | null;
  type: 'RDV' | 'REFUS';
}

interface AgendaData {
  totalRdv: number;
  rdvConfirmes: number;
  totalRefus: number;
  aRecontacter: number;
  rendezVous: AgendaEvent[];
  refus: AgendaEvent[];
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const RDV_STATUT: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRME:           { label: 'Confirmé',        color: 'text-green-700',   bg: 'bg-green-500'  },
  ANNULE:             { label: 'Annulé',           color: 'text-red-700',    bg: 'bg-red-500'    },
  REPORTER:           { label: 'Reporté',          color: 'text-yellow-700', bg: 'bg-yellow-500' },
  BRUT:               { label: 'Brut',             color: 'text-blue-700',   bg: 'bg-blue-500'   },
  NRP:                { label: 'NRP',              color: 'text-gray-600',   bg: 'bg-gray-400'   },
  HORS_CIBLE:         { label: 'HC',               color: 'text-orange-700', bg: 'bg-orange-500' },
  SIGNE:              { label: 'Signé',            color: 'text-purple-700', bg: 'bg-purple-500' },
  CONFIRME_CONF_CALL: { label: 'Conf. Conf Call',  color: 'text-indigo-700', bg: 'bg-indigo-500' },
  CONFIRME_TOTAL:     { label: 'Confirmé Total',   color: 'text-emerald-700',bg: 'bg-emerald-500'},
};

const REFUS_STATUT: Record<string, { label: string; color: string; bg: string }> = {
  'Refusé':   { label: 'Refusé',    color: 'text-red-700',   bg: 'bg-red-500'    },
  'Rappel':   { label: 'Rappel',    color: 'text-yellow-700',bg: 'bg-yellow-500' },
  'NRP':      { label: 'NRP',       color: 'text-gray-600',  bg: 'bg-gray-400'   },
  'Converti': { label: 'Converti',  color: 'text-green-700', bg: 'bg-green-500'  },
};

function getStatutStyle(statut: string, isRefus: boolean) {
  const map = isRefus ? REFUS_STATUT : RDV_STATUT;
  return map[statut] ?? { label: statut, color: 'text-muted-foreground', bg: 'bg-muted' };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [agenda, setAgenda] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'rdv' | 'refus'>('rdv');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgenda(user?.id || 1);
      setAgenda(data);
    } catch (err) {
      console.error('Erreur agenda:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const events = activeTab === 'rdv'
    ? (agenda?.rendezVous || [])
    : (agenda?.refus || []);

  const isRefus = activeTab === 'refus';

  // Calendrier
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay   = getDay(monthStart);
  const startPad   = firstDay === 0 ? 6 : firstDay - 1; // Lun→0

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.dateHeure), day));

  const eventsOfSelected = events.filter(e =>
    isSameDay(new Date(e.dateHeure), selectedDay)
  );

  // Stats
  const rdvStats = {
    total:    agenda?.totalRdv ?? 0,
    confirme: agenda?.rdvConfirmes ?? 0,
    annule:   (agenda?.rendezVous || []).filter(r => r.statut === 'ANNULE').length,
    reporter: (agenda?.rendezVous || []).filter(r => r.statut === 'REPORTER').length,
  };
  const refusStats = {
    total:        agenda?.totalRefus ?? 0,
    aRecontacter: agenda?.aRecontacter ?? 0,
    nrp:          (agenda?.refus || []).filter(r => r.statut === 'NRP').length,
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Mes Agendas</h1>
              <p className="text-xs text-muted-foreground">Rendez-vous pris et refus</p>
            </div>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-muted transition" title="Rafraîchir">
            <RefreshCw size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* ── Onglets ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-border">
          {(['rdv', 'refus'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {tab === 'rdv'
                ? `RDV Pris (${agenda?.totalRdv ?? 0})`
                : `Refus (${agenda?.totalRefus ?? 0})`}
            </button>
          ))}
        </div>

        {/* ── Stats cards ─────────────────────────────────────────────────── */}
        {activeTab === 'rdv' ? (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total',      value: rdvStats.total,    color: 'text-blue-500'  },
              { label: 'Confirmés',  value: rdvStats.confirme, color: 'text-green-500' },
              { label: 'Annulés',    value: rdvStats.annule,   color: 'text-red-500'   },
              { label: 'Reportés',   value: rdvStats.reporter, color: 'text-yellow-500'},
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Refus',    value: refusStats.total,        color: 'text-red-500'    },
              { label: 'À recontacter',  value: refusStats.aRecontacter, color: 'text-yellow-500' },
              { label: 'NRP',            value: refusStats.nrp,          color: 'text-gray-400'   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Corps : calendrier + panneau ───────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Calendrier (2/3) */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-4">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-muted rounded-lg transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-muted rounded-lg transition">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* En-têtes jours */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {JOURS.map(j => (
                <div key={j} className="text-center text-xs font-medium text-muted-foreground py-1">{j}</div>
              ))}
            </div>

            {/* Cases */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[72px]" />
              ))}

              {days.map(day => {
                const dayEvts  = eventsOnDay(day);
                const isToday  = isSameDay(day, new Date());
                const isSelect = isSameDay(day, selectedDay);

                return (
                  <div key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] p-1 rounded-lg cursor-pointer transition-colors hover:bg-muted/40 ${
                      isSelect ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}>
                    {/* Numéro */}
                    <div className="flex justify-end">
                      <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-primary text-white' : 'text-foreground'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    {/* Chips */}
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvts.slice(0, 2).map(evt => {
                        const st = getStatutStyle(evt.statut, isRefus);
                        return (
                          <div key={evt.id}
                            className={`text-white text-[10px] px-1 py-0.5 rounded truncate ${st.bg}`}>
                            {evt.contact.split(' ')[1] ?? evt.contact}
                          </div>
                        );
                      })}
                      {dayEvts.length > 2 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{dayEvts.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panneau détail (1/3) */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Titre jour */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} className="text-primary" />
                <span className="text-sm font-semibold capitalize">
                  {format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>

            {eventsOfSelected.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarIcon size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Aucun {activeTab === 'rdv' ? 'RDV' : 'refus'} ce jour</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {eventsOfSelected.map(evt => {
                  const st = getStatutStyle(evt.statut, isRefus);
                  return (
                    <div key={evt.id} className="p-4 hover:bg-muted/20 transition">
                      {/* Heure + badge statut */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Clock size={13} className="text-muted-foreground" />
                          {format(new Date(evt.dateHeure), 'HH:mm')}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${st.bg}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <User size={12} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{evt.contact}</span>
                      </div>

                      {/* Source */}
                      {evt.societe && (
                        <p className="text-xs text-muted-foreground mb-1 ml-4">{evt.societe}</p>
                      )}

                      {/* Commentaire */}
                      {evt.commentaire && (
                        <div className="mt-2 flex items-start gap-1.5 bg-muted/40 rounded-lg p-2">
                          <Phone size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{evt.commentaire}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer count */}
            {eventsOfSelected.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  {eventsOfSelected.length} {activeTab === 'rdv' ? 'rendez-vous' : 'refus'} ce jour
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
