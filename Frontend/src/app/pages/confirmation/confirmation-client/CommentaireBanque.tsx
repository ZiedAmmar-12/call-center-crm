import React, { useEffect, useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';

interface Commercial {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  totalRdv: number;
  rdvSignes: number;
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
      const response = await fetch('/api/confirmation2/commerciaux/suivi', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCommerciaux(data);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suivi Commerciaux</h1>
        <p className="text-gray-500">Performance des commerciaux</p>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {commerciaux.slice(0, 3).map((c, idx) => (
          <div key={c.id} className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">
              <Award className={`w-10 h-10 ${getRankColor(idx)}`} />
            </div>
            <div className="font-bold text-lg">{c.prenom} {c.nom}</div>
            <div className="text-2xl font-bold text-primary mt-2">{c.tauxSignature}%</div>
            <div className="text-sm text-gray-500">Taux de signature</div>
          </div>
        ))}
      </div>

      {/* Tableau complet */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Commercial</th>
                <th className="p-3 text-center">RDV</th>
                <th className="p-3 text-center">Signés</th>
                <th className="p-3 text-center">Taux</th>
                <th className="p-3 text-center">CA</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {commerciaux.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.prenom} {c.nom}</td>
                  <td className="p-3 text-center">{c.totalRdv}</td>
                  <td className="p-3 text-center text-green-600">{c.rdvSignes}</td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${c.tauxSignature >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {c.tauxSignature}%
                    </span>
                  </td>
                  <td className="p-3 text-center">{c.chiffreAffaire.toLocaleString()} €</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedCommercial(c)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
              {commerciaux.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Aucun commercial trouvé
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détails */}
      {selectedCommercial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{selectedCommercial.prenom} {selectedCommercial.nom}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total RDV</span>
                <span className="font-bold">{selectedCommercial.totalRdv}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">RDV signés</span>
                <span className="font-bold text-green-600">{selectedCommercial.rdvSignes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taux signature</span>
                <span className="font-bold">{selectedCommercial.tauxSignature}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chiffre d'affaires</span>
                <span className="font-bold text-primary">{selectedCommercial.chiffreAffaire.toLocaleString()} €</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button onClick={() => setSelectedCommercial(null)} className="px-4 py-2 bg-primary text-white rounded">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}