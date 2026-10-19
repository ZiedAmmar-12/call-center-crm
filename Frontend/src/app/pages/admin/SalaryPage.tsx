import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, Trophy, RefreshCw, Download,
  Settings, ChevronLeft, ChevronRight, Search, X, Save,
  DollarSign, Award, CheckCircle, Zap, Banknote,
  BarChart3, ShieldAlert, Clock, Briefcase, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

type TabType = 'dashboard' | 'salaries' | 'config';

const DEFAULT_CONFIG = {
  pT_BaseSalary: 900, pT_PrimeAssiduite: 100, pT_SeuilRdv: 21, pT_Install1: 300, pT_InstallExtra: 100,
  mT_BaseSalary: 600, mT_PrimeAssiduite: 100, mT_SeuilRdv: 12, mT_Install1: 300, mT_InstallExtra: 150,
};

export default function SalaryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toLowerCase() === 'superadmin';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [configDraft, setConfigDraft] = useState<any>(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [calculating, setCalculating] = useState(false);

  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salRes, sumRes, cfgRes] = await Promise.all([
        api.get(`/salaries?month=${selectedMonth}`),
        api.get(`/salaries/monthly-summary?month=${selectedMonth}`),
        api.get('/salaries/config'),
      ]);
      setSalaries(salRes.data);
      setSummary(sumRes.data);
      setConfig(cfgRes.data);
      setConfigDraft(cfgRes.data);
    } catch (err) {
      console.error('Salary fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await api.get(`/salaries/calculate?month=${selectedMonth}`);
      fetchData();
    } finally {
      setCalculating(false);
    }
  };

  const handlePaymentStatus = async (salaryId: number, status: string) => {
    await api.put(`/salaries/${salaryId}/payment`, { status });
    fetchData();
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg('');
    try {
      await api.put('/salaries/config', configDraft);
      setConfig(configDraft);
      setConfigMsg('✓ Paramètres sauvegardés');
      setTimeout(() => setConfigMsg(''), 3000);
    } catch {
      setConfigMsg('✗ Erreur lors de la sauvegarde');
    } finally {
      setConfigSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Agent', 'Régime', 'Base (DT)', 'RDV', 'Installations', 'Absences', 'P.Assiduité', 'P.Installation', 'Total (DT)', 'Statut'];
    const rows = filteredSalaries.map((s: any) => [
      s.agentName, s.typeContrat || '', s.baseSalary, s.rdvCount,
      s.installations ?? s.poseCount, s.absenceCount ?? s.refusCount,
      s.primeAssiduite ?? s.rdvBonus, s.primeInstallation ?? s.installationBonus,
      s.totalSalary, s.paymentStatus
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `salaires_${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSalaries = salaries.filter((s: any) => {
    const matchSearch = !searchTerm || (s.agentName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || s.paymentStatus === statusFilter;
    const matchType   = !typeFilter  || (s.typeContrat || '') === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.ceil(filteredSalaries.length / itemsPerPage);
  const paginatedSalaries = filteredSalaries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const fmt = (v: number) => `${(v || 0).toFixed(2)} DT`;

  const paymentBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      paid:      { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Payé' },
      pending:   { bg: 'bg-yellow-500/10',  text: 'text-yellow-500',  label: 'En attente' },
      partial:   { bg: 'bg-blue-500/10',    text: 'text-blue-500',    label: 'Partiel' },
      cancelled: { bg: 'bg-red-500/10',     text: 'text-red-400',     label: 'Annulé' },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const typeBadge = (tc: string) => {
    const isPT = tc === 'PLEIN_TEMPS';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isPT ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-400'}`}>
        {isPT ? 'PT' : 'MT'}
      </span>
    );
  };

  // ── Config field helper ────────────────────────────────────────────────────
  const cfgField = (label: string, key: string, isInt = false, hint?: string) => (
    <div key={key}>
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</label>
      <input
        type="number" step={isInt ? '1' : '0.01'} min="0"
        value={configDraft[key] ?? ''}
        onChange={e => setConfigDraft((d: any) => ({ ...d, [key]: isInt ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0 }))}
        disabled={!isSuperAdmin}
        className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[9px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-primary pl-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
            Gestion des <span className="text-primary">Salaires</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Calcul PT/MT · Prime assiduité · Prime installation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-10 px-4 bg-muted border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button onClick={handleCalculate} disabled={calculating}
            className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
            {calculating
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Zap className="w-3.5 h-3.5" />}
            Calculer
          </button>
          <button onClick={fetchData} className="p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all text-primary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {([
          { key: 'dashboard' as TabType, label: 'Dashboard',       icon: BarChart3 },
          { key: 'salaries'  as TabType, label: 'Tableau Salaires', icon: Banknote },
          { key: 'config'    as TabType, label: 'Paramètres',       icon: Settings },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${
              activeTab === tab.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Agents',         value: summary?.totalAgents || 0,         icon: Users,      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
              { label: 'Masse Salariale', value: fmt(summary?.totalMass || 0),      icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Salaire Moyen',  value: fmt(summary?.avgSalary || 0),       icon: TrendingUp, color: 'text-purple-400',  bg: 'bg-purple-500/10' },
              { label: 'Meilleur Agent', value: summary?.bestAgent || 'N/A',        icon: Trophy,     color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
              { label: 'Total Primes',   value: fmt(summary?.totalPrimes || 0),     icon: Award,      color: 'text-orange-400',  bg: 'bg-orange-500/10' },
            ].map((kpi, i) => (
              <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3 ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div className="text-lg font-black text-foreground">{loading ? '…' : kpi.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Grille règles PT/MT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                label: 'Plein Temps (PT)', color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: Briefcase,
                rows: [
                  ['Salaire de base', `${config.pT_BaseSalary} DT`],
                  ['Prime assiduité', `${config.pT_PrimeAssiduite} DT`],
                  ['Seuil RDV (assiduité)', `≥ ${config.pT_SeuilRdv} RDV`],
                  ['1ère installation', `${config.pT_Install1} DT`],
                  ['Installation suppl.', `+${config.pT_InstallExtra} DT/install`],
                ],
              },
              {
                label: 'Mi-Temps (MT)', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Clock,
                rows: [
                  ['Salaire de base', `${config.mT_BaseSalary} DT`],
                  ['Prime assiduité', `${config.mT_PrimeAssiduite} DT`],
                  ['Seuil RDV (assiduité)', `≥ ${config.mT_SeuilRdv} RDV`],
                  ['1ère installation', `${config.mT_Install1} DT`],
                  ['Installation suppl.', `+${config.mT_InstallExtra} DT/install`],
                ],
              },
            ].map((regime, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${regime.color}`}>
                  <div className={`w-7 h-7 rounded-lg ${regime.bg} flex items-center justify-center`}>
                    <regime.icon className="w-4 h-4" />
                  </div>
                  {regime.label}
                </h3>
                <div className="space-y-2">
                  {regime.rows.map(([k, v], i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-muted/10 rounded-xl">
                      <span className="text-xs font-medium text-muted-foreground">{k}</span>
                      <span className={`text-sm font-black ${regime.color}`}>{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-3 leading-relaxed">
                  Prime assiduité versée si : 0 absence <strong>ET</strong> ({regime.label === 'Plein Temps (PT)' ? '≥ 21 RDV' : '≥ 12 RDV'} OU ≥ 1 installation)
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Répartition Salaires (top 10)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salaries.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="agentName" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Bar dataKey="baseSalary"        name="Base (DT)"       fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="primeAssiduite"    name="P.Assiduité"     fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="primeInstallation" name="P.Installation"  fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── SALARIES TABLE ─────────────────────────────────────────────────────── */}
      {activeTab === 'salaries' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Tableau des Salaires — {selectedMonth}</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Rechercher agent…" value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs w-44" />
              </div>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 rounded-xl border border-border bg-background text-xs">
                <option value="">Tous régimes</option>
                <option value="PLEIN_TEMPS">Plein Temps</option>
                <option value="MI_TEMPS">Mi-Temps</option>
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 rounded-xl border border-border bg-background text-xs">
                <option value="">Tous statuts</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="partial">Partiel</option>
              </select>
              <button onClick={exportCSV} className="h-9 px-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/10 border-b border-border">
                  {['Agent', 'Régime', 'Base', 'RDV', 'Installs', 'Absences', 'Assiduité', 'P.Assiduité', 'P.Installation', 'Total', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-xs animate-pulse">Chargement…</td></tr>
                ) : paginatedSalaries.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-xs">Aucun salaire calculé. Cliquez sur "Calculer".</td></tr>
                ) : paginatedSalaries.map((s: any) => {
                  const installs   = s.installations ?? s.poseCount ?? 0;
                  const absences   = s.absenceCount  ?? s.refusCount ?? 0;
                  const pAssid     = s.primeAssiduite    ?? s.rdvBonus         ?? 0;
                  const pInstall   = s.primeInstallation ?? s.installationBonus ?? 0;
                  const assidOk    = s.assiduiteOk ?? (pAssid > 0);
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-semibold text-xs whitespace-nowrap">{s.agentName}</td>
                      <td className="px-3 py-3">{s.typeContrat ? typeBadge(s.typeContrat) : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-3 py-3 text-xs font-mono">{fmt(s.baseSalary)}</td>
                      <td className="px-3 py-3 text-center text-xs">{s.rdvCount}</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-emerald-400">{installs}</td>
                      <td className="px-3 py-3 text-center text-xs">
                        <span className={absences > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{absences}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {assidOk
                          ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                          : <X className="w-4 h-4 text-red-400 mx-auto" />}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono text-emerald-400">{fmt(pAssid)}</td>
                      <td className="px-3 py-3 text-xs font-mono text-yellow-400">{fmt(pInstall)}</td>
                      <td className="px-3 py-3 text-xs font-black font-mono">{fmt(s.totalSalary)}</td>
                      <td className="px-3 py-3">{paymentBadge(s.paymentStatus)}</td>
                      <td className="px-3 py-3">
                        {s.paymentStatus === 'pending' && (
                          <button onClick={() => handlePaymentStatus(s.id, 'paid')}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-all" title="Marquer payé">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground">{filteredSalaries.length} résultats — Page {currentPage}/{totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* SuperAdmin notice */}
          {!isSuperAdmin && (
            <div className="flex items-center gap-3 px-5 py-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-xs font-medium text-yellow-400">
                Lecture seule — seul le <strong>SuperAdmin</strong> peut modifier ces paramètres.
              </p>
            </div>
          )}

          {/* Règle de calcul expliquée */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" /> Règle de calcul
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground leading-relaxed">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                <p className="font-black text-indigo-400 mb-2 uppercase tracking-widest text-[10px]">Plein Temps (PT)</p>
                <p>• Salaire = Base + Prime assiduité + Prime installation</p>
                <p>• Prime assiduité : si <strong>0 absence ET</strong> (≥ seuil RDV <strong>OU</strong> ≥ 1 install)</p>
                <p>• Prime install : 1ère install = PT_Install1 DT, suivantes = +PT_InstallExtra DT chacune</p>
              </div>
              <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                <p className="font-black text-orange-400 mb-2 uppercase tracking-widest text-[10px]">Mi-Temps (MT)</p>
                <p>• Salaire = Base + Prime assiduité + Prime installation</p>
                <p>• Prime assiduité : si <strong>0 absence ET</strong> (≥ seuil RDV <strong>OU</strong> ≥ 1 install)</p>
                <p>• Prime install : 1ère install = MT_Install1 DT, suivantes = +MT_InstallExtra DT chacune</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PT */}
            <div className="bg-card border border-indigo-500/20 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2 text-indigo-400">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                Plein Temps (PT)
              </h3>
              <div className="space-y-4">
                {cfgField('Salaire de base (DT)',          'pT_BaseSalary',     false)}
                {cfgField('Prime assiduité (DT)',          'pT_PrimeAssiduite', false)}
                {cfgField('Seuil RDV pour assiduité',     'pT_SeuilRdv',       true, 'Nb de RDV minimum pour déclencher la prime (si 0 absence)')}
                {cfgField('1ère installation (DT)',        'pT_Install1',       false)}
                {cfgField('Par installation suppl. (DT)', 'pT_InstallExtra',   false)}
              </div>
            </div>

            {/* MT */}
            <div className="bg-card border border-orange-500/20 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2 text-orange-400">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                Mi-Temps (MT)
              </h3>
              <div className="space-y-4">
                {cfgField('Salaire de base (DT)',          'mT_BaseSalary',     false)}
                {cfgField('Prime assiduité (DT)',          'mT_PrimeAssiduite', false)}
                {cfgField('Seuil RDV pour assiduité',     'mT_SeuilRdv',       true, 'Nb de RDV minimum pour déclencher la prime (si 0 absence)')}
                {cfgField('1ère installation (DT)',        'mT_Install1',       false)}
                {cfgField('Par installation suppl. (DT)', 'mT_InstallExtra',   false)}
              </div>
            </div>
          </div>

          {/* Save button + feedback */}
          {isSuperAdmin && (
            <div className="flex items-center gap-4 justify-end">
              {configMsg && (
                <span className={`text-xs font-bold ${configMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {configMsg}
                </span>
              )}
              <button onClick={() => setConfigDraft(config)}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted rounded-xl transition-all">
                Annuler
              </button>
              <button onClick={handleSaveConfig} disabled={configSaving}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                {configSaving
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                Sauvegarder
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
