import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../../../../services/api';

interface Commercial {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  totalRdv: number;
  rdvSignes: number;
  rdvNonSignes: number;
  rdvRefixes: number;
  r2: number;
  tauxSignature: number;
  chiffreAffaire: number;
}

export default function SuiviCommerciaux() {
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommercial, setSelectedCommercial] = useState<Commercial | null>(null);

  useEffect(() => {
    fetchCommerciaux();
  }, []);

  const fetchCommerciaux = async () => {
    try {
      const response = await api.get('/confirmation-client/commerciaux');
      setCommerciaux(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi Commerciaux</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Performance et statistiques des commerciaux</p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{commerciaux.length}</div>
          <div className="text-sm text-gray-600 mt-1">👔 Commerciaux</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{commerciaux.reduce((s, c) => s + c.totalRdv, 0)}</div>
          <div className="text-sm text-gray-600 mt-1">📋 Total RDV</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{commerciaux.reduce((s, c) => s + c.rdvSignes, 0)}</div>
          <div className="text-sm text-gray-600 mt-1">✅ RDV Signés</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{Math.round(commerciaux.reduce((s, c) => s + c.tauxSignature, 0) / commerciaux.length)}%</div>
          <div className="text-sm text-gray-600 mt-1">📊 Taux moyen</div>
        </div>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {commerciaux.slice(0, 3).map((c, idx) => (
          <div key={c.id} className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2"><Award className={`w-10 h-10 ${getRankColor(idx)}`} /></div>
            <div className="font-bold text-lg">{c.prenom} {c.nom}</div>
            <div className="text-2xl font-bold text-primary mt-2">{c.tauxSignature}%</div>
            <div className="text-sm text-gray-500">Taux de signature</div>
          </div>
        ))}
      </div>

      {/* Tableau complet */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left">Commercial</th>
                <th className="p-3 text-center">RDV</th>
                <th className="p-3 text-center">Signés</th>
                <th className="p-3 text-center">Non Signés</th>
                <th className="p-3 text-center">À refixer</th>
                <th className="p-3 text-center">R2</th>
                <th className="p-3 text-center">Taux</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {commerciaux.map((c) => (
                <tr key={c.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="p-3 font-medium">{c.prenom} {c.nom}</td>
                  <td className="p-3 text-center">{c.totalRdv}</td>
                  <td className="p-3 text-center text-green-600">{c.rdvSignes}</td>
                  <td className="p-3 text-center text-red-600">{c.rdvNonSignes || 0}</td>
                  <td className="p-3 text-center text-yellow-600">{c.rdvRefixes || 0}</td>
                  <td className="p-3 text-center text-purple-600">{c.r2 || 0}</td>
                  <td className="p-3 text-center"><span className={`font-bold ${c.tauxSignature >= 50 ? 'text-green-600' : 'text-red-600'}`}>{c.tauxSignature}%</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => setSelectedCommercial(c)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition">Détails</button>
                  </td>
                </tr>
              ))}
              {commerciaux.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Aucun commercial trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détails */}
      {selectedCommercial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedCommercial.prenom} {selectedCommercial.nom}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Statistiques détaillées</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-600">{selectedCommercial.totalRdv}</div><div className="text-xs text-gray-500">Total RDV</div></div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-600">{selectedCommercial.rdvSignes}</div><div className="text-xs text-gray-500">Signés</div></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-600">{selectedCommercial.rdvNonSignes || 0}</div><div className="text-xs text-gray-500">Non Signés</div></div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-yellow-600">{selectedCommercial.rdvRefixes || 0}</div><div className="text-xs text-gray-500">À refixer</div></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-600">{selectedCommercial.r2 || 0}</div><div className="text-xs text-gray-500">R2</div></div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-orange-600">{selectedCommercial.tauxSignature}%</div><div className="text-xs text-gray-500">Taux signature</div></div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between"><span className="text-gray-500">Chiffre d'affaires</span><span className="font-bold text-primary">{selectedCommercial.chiffreAffaire.toLocaleString()} €</span></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setSelectedCommercial(null)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}