import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { MapPin, TrendingUp, Filter, Loader2, RefreshCw } from 'lucide-react';

const API_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5241') + '/api';

interface RegionStat {
  region: string;
  appels: number;
  conversions: number;
  taux: number;
}

export default function MapPage() {
  const [data, setData] = useState<RegionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'tunisia' | 'france'>('all');

  const tunisiaCities = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Gabès', 'Ariana', 'Monastir', 'Ben Arous', 'Gafsa', 'Kasserine', 'Kairouan', 'Médenine', 'Sidi Bouzid', 'Jendouba', 'Mahdia', 'Siliana', 'Zaghouan'];
  const franceCities  = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Toulon'];

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/contact/geo-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur API');
      const json: RegionStat[] = await res.json();
      setData(json);
    } catch {
      setError('Impossible de charger les données géographiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const filtered = filter === 'all' ? data
    : filter === 'tunisia' ? data.filter(r => tunisiaCities.some(c => r.region.toLowerCase().includes(c.toLowerCase())))
    : data.filter(r => franceCities.some(c => r.region.toLowerCase().includes(c.toLowerCase())));

  const totalAppels      = filtered.reduce((s, r) => s + r.appels, 0);
  const totalConversions = filtered.reduce((s, r) => s + r.conversions, 0);
  const tauxMoyen        = filtered.length
    ? (filtered.reduce((s, r) => s + r.taux, 0) / filtered.length).toFixed(1)
    : '0.0';

  const getColor = (taux: number) => {
    if (taux >= 60) return { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400' };
    if (taux >= 40) return { bg: 'bg-amber-500/20',   border: 'border-amber-500',   text: 'text-amber-400' };
    return              { bg: 'bg-red-500/20',         border: 'border-red-500',     text: 'text-red-400' };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Carte Géographique</h2>
            <p className="text-muted-foreground mt-1 text-sm">Distribution géographique des conversions — données en temps réel</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Filtre */}
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
          >
            <option value="all">Toutes les régions</option>
            <option value="tunisia">Tunisie</option>
            <option value="france">France</option>
          </select>
          {!loading && (
            <span className="text-xs text-muted-foreground">{filtered.length} villes trouvées</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement des données...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
            <div className="text-center">
              <p className="text-destructive font-medium">{error}</p>
              <button onClick={fetchStats} className="mt-3 text-sm text-primary hover:underline">Réessayer</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucune donnée géographique disponible.</p>
              <p className="text-xs mt-1">Créez des contacts avec un champ "Ville" renseigné.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte de chaleur */}
            <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Carte de chaleur des conversions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1">
                {filtered.map((region) => {
                  const col = getColor(region.taux);
                  const scale = 0.85 + (region.taux / 100) * 0.3;
                  return (
                    <div
                      key={region.region}
                      className="group cursor-pointer"
                      style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
                    >
                      <div className={`p-4 rounded-lg border-2 transition-all group-hover:shadow-lg ${col.bg} ${col.border}`}>
                        <MapPin className="w-6 h-6 mx-auto mb-1 text-primary" />
                        <p className="text-center font-medium text-foreground text-sm truncate">{region.region}</p>
                        <p className={`text-center text-xl font-bold mt-1 ${col.text}`}>{region.taux}%</p>
                        <p className="text-center text-xs text-muted-foreground">{region.conversions} / {region.appels}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Légende */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ≥ 60%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 40–60%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt; 40%</span>
              </div>
            </div>

            {/* Panneau droit */}
            <div className="space-y-4">
              {/* Top régions */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Top régions</h3>
                <div className="space-y-3">
                  {[...filtered]
                    .sort((a, b) => b.taux - a.taux)
                    .slice(0, 5)
                    .map((region, idx) => (
                      <div key={region.region} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary text-sm">#{idx + 1}</span>
                          <div>
                            <p className="font-medium text-foreground text-sm">{region.region}</p>
                            <p className="text-xs text-muted-foreground">{region.appels} appels</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium text-sm ${getColor(region.taux).text}`}>{region.taux}%</p>
                          <p className="text-xs text-muted-foreground">{region.conversions}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Statistiques globales */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Statistiques globales</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Total appels</span>
                    <span className="font-medium text-foreground">{totalAppels.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Conversions</span>
                    <span className="font-medium text-emerald-400">{totalConversions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Taux moyen</span>
                    <span className="font-medium text-primary">{tauxMoyen}%</span>
                  </div>
                </div>
              </div>

              {/* Barre de progression par région */}
              {filtered.length > 0 && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">Volume par région</h3>
                  <div className="space-y-2">
                    {[...filtered].sort((a, b) => b.appels - a.appels).slice(0, 6).map(r => (
                      <div key={r.region}>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="truncate">{r.region}</span>
                          <span>{r.appels}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min((r.appels / (filtered[0]?.appels || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
