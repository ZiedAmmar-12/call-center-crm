import React, { useEffect, useState } from 'react';
import { Shield, Plus, X } from 'lucide-react';

interface LogEntry {
  membre: string;
  id: string;
  role: string;
  dateCreation: string;
}

interface CreateForm {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
}

export default function GererAcces() {
  const [logs,      setLogs]     = useState<LogEntry[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [showForm,  setShowForm] = useState(false);
  const [form,      setForm]     = useState<CreateForm>({ nom: '', prenom: '', email: '', motDePasse: '' });
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState('');

  const token = () => localStorage.getItem('token');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    fetch('/api/technique/logs', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleCreate = async () => {
    if (!form.nom || !form.email) { setError('Nom et email sont obligatoires'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/technique/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ nom: '', prenom: '', email: '', motDePasse: '' });
        fetchLogs();
      } else {
        const data = await res.json();
        setError(data.message || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  const roleLabel = (role: string) => ({ TECH: 'Technique', ADMIN: 'Admin', AGENT: 'Agent', QUALITE: 'Qualité', CONFIRMATRICE: 'Confirmatrice', COMMERCIAL: 'Commercial' }[role] || role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Gérer les accès</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestion des comptes et logs d'accès</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          <Plus size={16} />
          Créer nouveau log
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold dark:text-white">Créer un nouveau compte</h3>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nom *', key: 'nom' },
              { label: 'Prénom', key: 'prenom' },
              { label: 'Email (ID) *', key: 'email' },
              { label: 'Mot de passe', key: 'motDePasse', type: 'password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  placeholder={f.key === 'motDePasse' ? 'Laisser vide pour Temp@1234' : ''}
                />
              </div>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Table des logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          Logs
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Membre', 'ID (Email)', 'Rôle', 'Date de création'].map(h => (
                  <th key={h} className="p-3 text-left text-gray-600 dark:text-gray-300 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="p-3 font-medium dark:text-white">{l.membre}</td>
                  <td className="p-3 dark:text-gray-300">{l.id}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {roleLabel(l.role)}
                    </span>
                  </td>
                  <td className="p-3 dark:text-gray-300">{l.dateCreation}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun log trouvé</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
