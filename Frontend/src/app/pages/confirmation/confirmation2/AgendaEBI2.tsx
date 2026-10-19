import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router';
import {
  ChevronLeft, ChevronRight, Loader2, Building2, CheckCircle, XCircle,
  AlertCircle, Clock, RefreshCw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../../../../services/api';
import FicheContactPanel, { type RdvDetail } from '../../../components/FicheContactPanel';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRME:           { label: 'Confirmé',        color: 'bg-green-500',   icon: <CheckCircle size={10} /> },
  ANNULE:             { label: 'Annulé',           color: 'bg-red-500',    icon: <XCircle size={10} /> },
  REPORTER:           { label: 'Reporté',          color: 'bg-yellow-500', icon: <Clock size={10} /> },
  BRUT:               { label: 'Brut',             color: 'bg-blue-500',   icon: <AlertCircle size={10} /> },
  NRP:                { label: 'NRP',              color: 'bg-gray-500',   icon: <AlertCircle size={10} /> },
  HORS_CIBLE:         { label: 'HC',               color: 'bg-orange-500', icon: <XCircle size={10} /> },
  NON_SIGNE:          { label: 'Pas int.',         color: 'bg-purple-500', icon: <XCircle size={10} /> },
  PORTE:              { label: 'Porté',            color: 'bg-cyan-500',   icon: <Clock size={10} /> },
  CONFIRME_CONF_CALL: { label: 'Conf. Conf Call', color: 'bg-indigo-500', icon: <CheckCircle size={10} /> },
  CONFIRME_TOTAL:     { label: 'Confirmé Total',  color: 'bg-emerald-500', icon: <CheckCircle size={10} /> },
};

export default function AgendaEBI2() {
  const location = useLocation();
  const [rdvs, setRdvs] = useState<RdvDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedRdv, setSelectedRdv] = useState<RdvDetail | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('TOUS');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/confirmation2/agenda-ebi');
      const data: RdvDetail[] = (res.data || []).map((r: any) => ({
        ...r,
        id: Number(r.id),
        contactId: Number(r.contactId),
      }));
      setRdvs(data);

      const params = new URLSearchParams(location.search);
      const calledRdvId = params.get('calledRdvId');
      if (calledRdvId) {
        const rdv = data.find(r => r.id === Number(calledRdvId));
        if (rdv) {
          setSelectedRdv(rdv);
          setSelectedDay(new Date(rdv.dateRendezVous));
          setCurrentMonth(new Date(rdv.dateRendezVous));
          sessionStorage.setItem(`called_rdv_${rdv.id}`, 'true');
        }
      }
    } catch (err) {
      console.error('Erreur chargement agenda EBI conf2:', err);
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const startPad = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const rdvsOnDay = (day: Date) => rdvs.filter(r => isSameDay(new Date(r.dateRendezVous), day));
  const rdvsFiltered = selectedDay
    ? rdvs.filter(r => isSameDay(new Date(r.dateRendezVous), selectedDay) && (filterStatut === 'TOUS' || r.statut === filterStatut))
    : [];

  const stats = {
    total: rdvs.length,
    confirme: rdvs.filter(r => r.statut === 'CONFIRME').length,
    annule: rdvs.filter(r => r.statut === 'ANNULE').length,
    reporter: rdvs.filter(r => r.statut === 'REPORTER').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Agenda EBI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">RDV Confirmés &amp; Bruts</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total',     value: stats.total,    color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
          { label: 'Confirmés', value: stats.confirme, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
          { label: 'Annulés',   value: stats.annule,   color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
          { label: 'Reportés',  value: stats.reporter, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 ${s.color} text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="flex gap-4">
          <div className={`${selectedRdv ? 'w-3/5' : 'w-full'} transition-all duration-300`}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronLeft size={18} />
                </button>
                <h2 className="font-semibold text-gray-900 dark:text-white capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h2>
                <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="p-3">
                <div className="grid grid-cols-7 mb-2">
                  {JOURS.map(j => (
                    <div key={j} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{j}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                  {daysInMonth.map(day => {
                    const dayRdvs = rdvsOnDay(day);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const isToday = isSameDay(day, new Date());
                    const inMonth = isSameMonth(day, currentMonth);
                    return (
                      <button
                        key={day.toString()}
                        onClick={() => { setSelectedDay(isSelected ? null : day); setSelectedRdv(null); }}
                        className={`relative rounded-lg p-1 min-h-[52px] text-left transition-all ${!inMonth ? 'opacity-30' : ''} ${
                          isSelected ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
                          : isToday  ? 'bg-primary/10 dark:bg-primary/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-200'}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayRdvs.slice(0, 2).map(r => {
                            const cfg = STATUT_CONFIG[r.statut] || { color: 'bg-gray-400', label: r.statut };
                            return (
                              <div key={r.id} className={`${cfg.color} text-white text-[9px] rounded px-1 truncate leading-4`}>
                                {r.contactNom}
                              </div>
                            );
                          })}
                          {dayRdvs.length > 2 && <div className="text-[9px] text-gray-500 dark:text-gray-400">+{dayRdvs.length - 2}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedDay && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
                    <span className="ml-2 text-xs text-gray-400">({rdvsFiltered.length} RDV)</span>
                  </h3>
                  <select
                    value={filterStatut}
                    onChange={e => setFilterStatut(e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {rdvsFiltered.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-sm">Aucun RDV ce jour</p>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {rdvsFiltered.map(rdv => {
                      const cfg = STATUT_CONFIG[rdv.statut] || { color: 'bg-gray-400', label: rdv.statut };
                      const isActive = selectedRdv?.id === rdv.id;
                      return (
                        <button
                          key={rdv.id}
                          onClick={() => setSelectedRdv(isActive ? null : rdv)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {rdv.contactPrenom} {rdv.contactNom}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(rdv.dateRendezVous), 'HH:mm')} — {rdv.agentNom}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${cfg.color}`}>{cfg.label}</span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedRdv && (
            <div className="w-2/5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto sticky top-4 self-start max-h-[calc(100vh-8rem)]">
              <FicheContactPanel
                rdv={selectedRdv}
                agendaType="EBI"
                updateEndpoint="/confirmation2/rdv"
                returnPath="/confirmation2/agenda-ebi"
                onClose={() => setSelectedRdv(null)}
                onSaved={fetchData}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
