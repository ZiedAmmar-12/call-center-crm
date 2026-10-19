import React, { useEffect, useState } from 'react';
import { FileText, Upload, Download, Trash2, Calendar, Users } from 'lucide-react';

interface FichierContact {
  id: number;
  nom: string;
  dateInjection: string;
  nombreContacts: number;
  statut: string;
}

export default function FichiersContacts() {
  const [fichiers, setFichiers] = useState<FichierContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [campagne, setCampagne] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFichiers();
  }, []);

  const fetchFichiers = async () => {
    try {
      const response = await fetch('/api/confirmation1/fichiers-contacts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setFichiers(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('campagne', campagne);
    try {
      await fetch('/api/confirmation1/upload-contacts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      setShowUpload(false);
      setSelectedFile(null);
      setCampagne('');
      fetchFichiers();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async (id: number) => {
    window.open(`/api/confirmation1/export-contacts/${id}?token=${localStorage.getItem('token')}`, '_blank');
  };

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer ce fichier ?')) {
      await fetch(`/api/confirmation1/fichiers-contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchFichiers();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fichiers Contacts</h1>
          <p className="text-gray-500">Gestion des listes de contacts</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
          <Upload size={16} /> Importer
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{fichiers.length}</div>
          <div className="text-sm text-gray-500">Fichiers importés</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{fichiers.reduce((sum, f) => sum + f.nombreContacts, 0)}</div>
          <div className="text-sm text-gray-500">Total contacts</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{fichiers.filter(f => f.statut === 'EN_COURS').length}</div>
          <div className="text-sm text-gray-500">En cours</div>
        </div>
      </div>

      {/* Liste des fichiers */}
      <div className="space-y-3">
        {fichiers.map((fichier) => (
          <div key={fichier.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <FileText size={32} className="text-blue-500" />
              <div>
                <div className="font-medium">{fichier.nom}</div>
                <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Calendar size={12} />{new Date(fichier.dateInjection).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users size={12} />{fichier.nombreContacts} contacts</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${fichier.statut === 'TERMINE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {fichier.statut === 'TERMINE' ? 'Terminé' : 'En cours'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport(fichier.id)} className="p-2 hover:bg-gray-100 rounded" title="Exporter"><Download size={18} /></button>
              <button onClick={() => handleDelete(fichier.id)} className="p-2 hover:bg-red-100 rounded text-red-500" title="Supprimer"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {fichiers.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucun fichier importé</div>
        )}
      </div>

      {/* Modal upload */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Importer une liste de contacts</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fichier CSV/Excel</label>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom de la campagne</label>
                <input type="text" value={campagne} onChange={(e) => setCampagne(e.target.value)} className="w-full p-2 border rounded" placeholder="Campagne été 2026" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowUpload(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Annuler</button>
                <button onClick={handleUpload} disabled={!selectedFile || uploading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">
                  {uploading ? 'Upload...' : 'Importer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}