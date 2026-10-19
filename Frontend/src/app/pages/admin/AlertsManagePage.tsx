import React, { useState, useEffect } from 'react';
import {
  Bell, AlertTriangle, TrendingDown, Clock, Plus, Trash2,
  Edit3, CheckCircle, X, RefreshCw, Save, History
} from 'lucide-react';
import api from '../../../services/api';

interface AlertRule {
  id: number;
  ruleType: string;
  thresholdValue: number;
  notificationEmail?: string;
  isActive: boolean;
}

interface AlertHistoryItem {
  id: number;
  agentName: string;
  alertType: string;
  severity: string;
  message: string;
  thresholdValue: number;
  actualValue: number;
  createdAt: string;
}

const RULE_LABELS: Record<string, string> = {
  low_score: 'Score minimum',
  inactivity: 'Inactivité max (min)',
  conversion: 'Taux conversion min (%)',
};

const RULE_ICONS: Record<string, React.ElementType> = {
  low_score: TrendingDown,
  inactivity: Clock,
  conversion: AlertTriangle,
};

const SEVERITY_STYLE: Record<string, string> = {
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export default function AlertsManagePage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [form, setForm] = useState({ ruleType: 'low_score', thresholdValue: 70, notificationEmail: '', isActive: true });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, histRes] = await Promise.all([
        api.get('/alerts/rules'),
        api.get('/alerts/history?limit=30'),
      ]);
      setRules(rulesRes.data.rules || []);
      setHistory(histRes.data.history || []);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/alerts/rules/${editing.id}`, { thresholdValue: form.thresholdValue, isActive: form.isActive });
      } else {
        await api.post('/alerts/rules', form);
      }
      setShowModal(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette règle ?')) return;
    await api.delete(`/alerts/rules/${id}`);
    fetchData();
  };

  const openEdit = (rule: AlertRule) => {
    setEditing(rule);
    setForm({ ruleType: rule.ruleType, thresholdValue: rule.thresholdValue, notificationEmail: rule.notificationEmail || '', isActive: rule.isActive });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ruleType: 'low_score', thresholdValue: 70, notificationEmail: '', isActive: true });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-primary pl-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
            Gestion des <span className="text-primary">Alertes</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Seuils critiques et historique des déclenchements
          </p>
        </div>
        <button onClick={fetchData} className="p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all text-primary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {[
          { key: 'rules' as const, label: 'Règles', icon: Bell },
          { key: 'history' as const, label: 'Historique', icon: History },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-xl transition-all ${
              activeTab === tab.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest">Règles d'Alertes</h3>
            </div>
            <button onClick={openNew}
              className="h-9 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Nouvelle Règle
            </button>
          </div>

          <div className="p-6 space-y-4">
            {rules.length === 0 && !loading && (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Aucune règle configurée</p>
                <p className="text-xs text-muted-foreground mt-2">Ajoutez des règles pour surveiller les performances</p>
              </div>
            )}
            {rules.map(rule => {
              const Icon = RULE_ICONS[rule.ruleType] || AlertTriangle;
              return (
                <div key={rule.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${rule.isActive ? 'bg-card border-border' : 'bg-muted/20 border-border/50 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{RULE_LABELS[rule.ruleType] || rule.ruleType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Seuil: <span className="font-black text-foreground">{rule.thresholdValue}</span>
                        {rule.notificationEmail && ` • ${rule.notificationEmail}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${rule.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {rule.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Historique des Alertes</h3>
          </div>

          <div className="divide-y divide-border">
            {history.length === 0 ? (
              <div className="p-16 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aucune alerte récente</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-5 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.warning}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black uppercase text-foreground">{item.agentName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.warning}`}>
                            {item.severity}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Seuil: {item.thresholdValue} • Valeur: {item.actualValue} •{' '}
                          {new Date(item.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">{editing ? 'Modifier la règle' : 'Nouvelle règle'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!editing && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Type de règle</label>
                  <select value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none">
                    <option value="low_score">Score minimum</option>
                    <option value="inactivity">Inactivité maximum (min)</option>
                    <option value="conversion">Taux de conversion minimum (%)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Valeur seuil</label>
                <input type="number" value={form.thresholdValue} onChange={e => setForm({ ...form, thresholdValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Email notification (optionnel)</label>
                <input type="email" value={form.notificationEmail} onChange={e => setForm({ ...form, notificationEmail: e.target.value })}
                  placeholder="admin@exemple.com"
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active</label>
                <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-10 h-5 rounded-full transition-all ${form.isActive ? 'bg-emerald-500' : 'bg-muted'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${form.isActive ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-[10px] font-black uppercase text-muted-foreground hover:bg-muted rounded-xl">Annuler</button>
              <button onClick={handleSave} className="px-5 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 flex items-center gap-2">
                <Save className="w-3.5 h-3.5" />{editing ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
