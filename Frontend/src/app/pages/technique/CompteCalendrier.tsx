import React, { useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

export default function CompteCalendrier() {
  const [calId,    setCalId]    = useState('');
  const [mdp,      setMdp]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calId || !mdp) { setError('ID et mot de passe sont obligatoires'); return; }
    setSaving(true); setError(''); setSuccess('');

    try {
      const res = await fetch('/api/technique/calendrier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ calId, motDePasse: mdp }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Compte calendrier créé avec succès le ${data.createdAt}`);
        setCalId('');
        setMdp('');
      } else {
        setError(data.message || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Compte Calendrier</h1>
        <p className="text-gray-500 dark:text-gray-400">Créer un accès au calendrier partagé EBI</p>
      </div>

      <div className="max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={20} className="text-primary" />
            <span className="font-semibold dark:text-white">Ajouter compte calendrier</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Créer ID
              </label>
              <input
                type="text"
                value={calId}
                onChange={e => setCalId(e.target.value)}
                placeholder="ex: agenda.ebi2026"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={mdp}
                onChange={e => setMdp(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{error}</p>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-3 py-2 text-sm">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-medium"
            >
              {saving ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
