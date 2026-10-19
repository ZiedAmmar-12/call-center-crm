import React, { useEffect, useState } from 'react';
import { FileText, Download, Upload } from 'lucide-react';

interface Fichier {
  id: number;
  nom: string;
  dateImport: string;
  nbContacts: number;
  statut: string;
  source: string;
}

export default function FichierContacts() {
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [file,     setFile]     = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const token = () => localStorage.getItem('token');

  useEffect(() => { fetchFichiers(); }, []);

  const fetchFichiers = () => {
    fetch('/api/technique/fichiers', {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { setFichiers(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const exportCsv = async (id: number, nom: string) => {
    const res = await fetch(`/api/technique/fichiers/${id}/export`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (!res.ok) { alert('Export impossible'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${nom}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/leads/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: form,
      });
      if (res.ok) {
        alert('Fichier importé avec succès !');
        setShowForm(false);
        setFile(null);
        fetchFichiers();
      } else {
        alert('Erreur lors de l\'import');
      }
    } catch {
      alert('Erreur réseau');
    }
    setUploading(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Fichier des contacts</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestion des listes de contacts importées</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          <Upload size={16} />
          Injecter une liste
        </button>
      </div>

      {/* Formulaire d'injection */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold mb-4 dark:text-white">Importer un fichier CSV</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Fichier CSV</label>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-white hover:file:opacity-90"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {uploading ? 'Import...' : 'Importer'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFile(null); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Table des fichiers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 font-semibold dark:text-white">
          Listes des contacts
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Liste', 'Date injection', 'Nombre de contacts', 'Source', 'Statut', 'Action'].map(h => (
                <th key={h} className="p-3 text-left text-gray-700 dark:text-gray-300 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fichiers.map(f => (
              <tr key={f.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <td className="p-3 font-medium dark:text-white flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  {f.nom}
                </td>
                <td className="p-3 dark:text-gray-300">{f.dateImport}</td>
                <td className="p-3 dark:text-gray-300">{f.nbContacts.toLocaleString()}</td>
                <td className="p-3 dark:text-gray-300">{f.source || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.statut === 'TERMINE'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : f.statut === 'EN_COURS'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {f.statut}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => exportCsv(f.id, f.nom)}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Download size={13} />
                    Exporter csv
                  </button>
                </td>
              </tr>
            ))}
            {fichiers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Aucun fichier importé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
