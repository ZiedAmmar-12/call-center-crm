import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Users, Download, CheckCircle, AlertCircle,
  RefreshCw, Search, Filter, X
} from 'lucide-react';
import api from '../../../services/api';

interface Lead {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  postalCode?: string;
  campaignName?: string;
  companyName?: string;
}

interface LeadStats {
  total: number;
  campaigns: Array<{ campaign: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-blue-500/10 text-blue-500' },
  contacted: { label: 'Contacté', color: 'bg-amber-500/10 text-amber-500' },
  qualified: { label: 'Qualifié', color: 'bg-emerald-500/10 text-emerald-500' },
  converted: { label: 'Converti', color: 'bg-purple-500/10 text-purple-500' },
  rejected: { label: 'Rejeté', color: 'bg-red-500/10 text-red-500' },
};

export default function LeadsKhaledPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; imported: number; filename: string } | null>(null);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [campaignName, setCampaignName] = useState('Campagne Import');
  const [companyName, setCompanyName] = useState('CRM');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        api.get('/leads-import/stats'),
        api.get('/leads-import?limit=200'),
      ]);
      setStats(statsRes.data);
      setLeads(leadsRes.data);
    } catch (err) {
      console.error('Leads fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('campaignName', campaignName);
    formData.append('companyName', companyName);
    try {
      const res = await api.post('/leads-import/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchData();
    } catch (err) {
      console.error('Import error:', err);
      setImportResult({ success: false, imported: 0, filename: selectedFile.name });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    await api.put(`/leads-import/${id}/status`, { status });
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  const filteredLeads = leads.filter(l => {
    const matchSearch = !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search) || (l.email || '').toLowerCase().includes(search.toLowerCase());
    const matchCampaign = !campaignFilter || l.campaignName === campaignFilter;
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchCampaign && matchStatus;
  });

  const campaigns = [...new Set(leads.map(l => l.campaignName).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-primary pl-6">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
          Import <span className="text-primary">Leads</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
          Importation CSV/XLSX et gestion des leads par campagne
        </p>
      </div>

      {/* Stats KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Total Leads</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-2xl font-black text-foreground">{stats.campaigns.length}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Campagnes</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-2xl font-black text-emerald-500">
              {stats.statuses.find(s => s.status === 'converted')?.count || 0}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Convertis</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-2xl font-black text-blue-500">
              {stats.statuses.find(s => s.status === 'new')?.count || 0}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Nouveaux</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import Panel */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Importer un Fichier</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Success/Error banner */}
            {importResult && (
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${importResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                {importResult.success
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                }
                <div>
                  <p className={`text-xs font-bold ${importResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                    {importResult.success ? `${importResult.imported} leads importés !` : 'Erreur lors de l\'import'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{importResult.filename}</p>
                </div>
                <button onClick={() => setImportResult(null)} className="ml-auto"><X className="w-3 h-3 text-muted-foreground" /></button>
              </div>
            )}

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors relative"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground">{selectedFile ? selectedFile.name : 'CSV ou XLSX'}</p>
              <p className="text-xs text-muted-foreground mt-1">Cliquez pour sélectionner</p>
            </div>

            {/* Campaign & Company */}
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Nom de la campagne</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Entreprise</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <button onClick={handleImport} disabled={!selectedFile || uploading}
              className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Import en cours...' : 'Importer'}
            </button>

            {/* Format reminder */}
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              <p className="font-bold mb-1">Colonnes attendues (CSV) :</p>
              <p>name, phone, email, postal_code</p>
            </div>
          </div>
        </div>

        {/* Stats campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {stats && stats.campaigns.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="text-sm font-black uppercase tracking-widest">Leads par Campagne</h3>
              </div>
              <div className="p-5 space-y-3">
                {stats.campaigns.map(c => (
                  <div key={c.campaign} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground w-48 truncate">{c.campaign}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(c.count / stats.total) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black text-foreground w-10 text-right">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && stats.statuses.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="text-sm font-black uppercase tracking-widest">Statuts</h3>
              </div>
              <div className="p-5 flex flex-wrap gap-3">
                {stats.statuses.map(s => {
                  const style = STATUS_LABELS[s.status] || { label: s.status, color: 'bg-muted text-muted-foreground' };
                  return (
                    <div key={s.status} className={`px-3 py-2 rounded-xl ${style.color} font-bold text-xs`}>
                      {style.label}: {s.count}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Liste des Leads ({filteredLeads.length})</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs w-40" />
            </div>
            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs">
              <option value="">Toutes campagnes</option>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs">
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                {['Nom', 'Téléphone', 'Email', 'CP', 'Campagne', 'Entreprise', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs animate-pulse">Chargement...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs">Aucun lead trouvé</td></tr>
              ) : (
                filteredLeads.slice(0, 100).map((lead) => {
                  const st = STATUS_LABELS[lead.status || 'new'] || STATUS_LABELS.new;
                  return (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-semibold">{lead.name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{lead.phone || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{lead.email || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{lead.postalCode || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{lead.campaignName || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{lead.companyName || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={lead.status || 'new'} onChange={e => handleStatusUpdate(lead.id, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-border bg-background text-xs outline-none">
                          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
