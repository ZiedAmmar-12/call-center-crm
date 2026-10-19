/**
 * AIDashboardPage.tsx — Tableau de bord IA / ML (Admin + Qualité + Tech)
 * Endpoints consommés :
 *   GET  /api/ai/dashboard
 *   GET  /api/ai/contacts-scored?page=1&size=20
 *   GET  /api/ai/forecast
 *   GET  /api/ai/anomalies
 *   POST /api/ai/score-contacts          (déclenche le batch scoring)
 */
import React, { useEffect, useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` };
}

async function apiFetch(path: string) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalContacts: number;
  scoredContacts: number;
  coveragePct: number;
  avgScore: number;
  distribution: { high: number; medium: number; low: number };
}

interface ScoredContact {
  id: number; nom: string; prenom: string; telephone: string;
  codePostal: string; ville: string; statutAgent: string;
  scoreIA: number; creneauOptimalIA: string; nombreNRP: number;
  agentNom: string;
}

interface ForecastPoint {
  date: string; count: number; lower: number; upper: number;
}

interface AnomalyAgent {
  agentId: number; agentNom: string; total: number; nrp: number;
  rdv: number; ratioNrp: number; zScore: number; isAnomalie: boolean; niveau: string;
}

// ── Score badge ────────────────────────────────────────────────────────────
const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const bg = score >= 70 ? '#dcfce7' : score >= 40 ? '#fef9c3' : '#fee2e2';
  const fg = score >= 70 ? '#15803d' : score >= 40 ? '#854d0e' : '#b91c1c';
  return (
    <span style={{ background: bg, color: fg, borderRadius: 20, padding: '2px 10px',
                   fontWeight: 700, fontSize: 13 }}>
      {score.toFixed(1)}
    </span>
  );
};

// ── KPI card ───────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> =
  ({ label, value, sub, color = '#2563eb' }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '18px 22px',
                boxShadow: '0 1px 6px rgba(0,0,0,.09)', flex: 1, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Page principale ─────────────────────────────────────────────────────────
const AIDashboardPage: React.FC = () => {
  const [tab, setTab]             = useState<'scoring' | 'forecast' | 'anomaly'>('scoring');
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [contacts, setContacts]   = useState<ScoredContact[]>([]);
  const [forecast, setForecast]   = useState<ForecastPoint[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAgent[]>([]);
  const [scoring, setScoring]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const PAGE_SIZE = 20;

  // ── Chargement stats générales ────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/api/ai/dashboard')
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques IA.'));
  }, []);

  // ── Chargement selon l'onglet ─────────────────────────────────────────────
  const loadTab = useCallback(async (t: typeof tab) => {
    setLoading(true);
    setError('');
    try {
      if (t === 'scoring') {
        const data = await apiFetch(`/api/ai/contacts-scored?page=${page}&size=${PAGE_SIZE}`);
        setContacts(data.items ?? []);
        setTotal(data.total ?? 0);
      } else if (t === 'forecast') {
        const data = await apiFetch('/api/ai/forecast');
        setForecast(data.forecast ?? []);
      } else {
        const data = await apiFetch('/api/ai/anomalies');
        setAnomalies(data.anomalies ?? data.all ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadTab(tab); }, [tab, page, loadTab]);

  // ── Déclencher le scoring batch ────────────────────────────────────────────
  const runScoring = async () => {
    setScoring(true);
    try {
      const r = await fetch(`${API}/api/ai/score-contacts`, {
        method: 'POST', headers: authHeaders(),
      });
      const d = await r.json();
      alert(d.message ?? 'Scoring terminé');
      loadTab('scoring');
      const stats2 = await apiFetch('/api/ai/dashboard');
      setStats(stats2);
    } catch {
      alert('Erreur lors du scoring');
    } finally {
      setScoring(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', fontFamily: 'Inter, system-ui, sans-serif', color: '#111827' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>🤖 Tableau de Bord IA</h1>
        <p style={{ color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
          Lead Scoring · Prévision de Production · Détection d'Anomalies
        </p>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <KpiCard label="Total contacts"    value={stats.totalContacts}   color="#374151" />
          <KpiCard label="Contacts scorés"   value={stats.scoredContacts}  sub={`${stats.coveragePct}% couverture`} color="#2563eb" />
          <KpiCard label="Score moyen"       value={`${stats.avgScore}/100`} color="#7c3aed" />
          <KpiCard label="Score ≥ 70 (chaud)" value={stats.distribution.high} color="#059669" />
          <KpiCard label="Score 40-70 (tiède)" value={stats.distribution.medium} color="#d97706" />
          <KpiCard label="Score < 40 (froid)"  value={stats.distribution.low}  color="#dc2626" />
        </div>
      )}

      {/* Bouton scoring */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={runScoring}
          disabled={scoring}
          style={{
            background: scoring ? '#9ca3af' : '#2563eb', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 20px',
            fontWeight: 700, cursor: scoring ? 'not-allowed' : 'pointer', fontSize: 14,
          }}
        >
          {scoring ? '⏳ Scoring en cours…' : '🚀 Lancer le Scoring IA'}
        </button>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Calcule le score de qualification pour tous les contacts non encore traités.
        </span>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'scoring',  label: '🎯 Lead Scoring'         },
          { key: 'forecast', label: '📈 Prévision Production' },
          { key: 'anomaly',  label: '🚨 Anomalies Agents'     },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key as typeof tab); setPage(1); }}
            style={{
              border: 'none', background: 'none', padding: '10px 20px',
              cursor: 'pointer', fontWeight: tab === key ? 700 : 400,
              fontSize: 14, color: tab === key ? '#2563eb' : '#6b7280',
              borderBottom: tab === key ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -2, transition: 'all .15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8,
                      padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Chargement…
        </div>
      )}

      {/* ── TAB : LEAD SCORING ───────────────────────────────────────────── */}
      {!loading && tab === 'scoring' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['Score IA', 'Contact', 'Téléphone', 'Ville', 'Agent', 'Créneau', 'NRP', 'Statut'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                                        fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6',
                                          background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px' }}><ScoreBadge score={c.scoreIA} /></td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {c.prenom} {c.nom}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{c.telephone}</td>
                    <td style={{ padding: '10px 14px' }}>{c.codePostal} {c.ville}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.agentNom ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {c.creneauOptimalIA
                        ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px',
                                         borderRadius: 12, fontSize: 12 }}>⏰ {c.creneauOptimalIA}</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {c.nombreNRP > 0
                        ? <span style={{ color: '#dc2626', fontWeight: 700 }}>×{c.nombreNRP}</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{c.statutAgent ?? '—'}</span>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                    Aucun contact scoré. Cliquez sur « Lancer le Scoring IA ».
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      style={paginBtn}>‹ Précédent</button>
              <span style={{ padding: '8px 14px', fontSize: 13, color: '#374151' }}>
                Page {page} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / PAGE_SIZE)}
                      style={paginBtn}>Suivant ›</button>
            </div>
          )}
        </>
      )}

      {/* ── TAB : PRÉVISION ─────────────────────────────────────────────── */}
      {!loading && tab === 'forecast' && (
        <div style={{ overflowX: 'auto' }}>
          {forecast.length === 0
            ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>
                Pas assez de données historiques pour générer une prévision.
              </p>
            : (
              <>
                <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                  Prévision Holt-Winters (saisonnalité semaine) — 7 prochains jours
                </p>
                {/* Mini bar chart (CSS only) */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 180,
                              padding: '0 8px', marginBottom: 8 }}>
                  {forecast.map(f => {
                    const maxVal = Math.max(...forecast.map(x => x.upper), 1);
                    const barH = Math.max((f.count / maxVal) * 160, 8);
                    const bandH = Math.max(((f.upper - f.lower) / maxVal) * 160, 4);
                    const bandBottom = Math.max((f.lower / maxVal) * 160, 0);
                    return (
                      <div key={f.date} style={{ flex: 1, display: 'flex', flexDirection: 'column',
                                                  alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{f.count}</span>
                        <div style={{ position: 'relative', width: '100%', height: 160, display: 'flex',
                                      alignItems: 'flex-end', justifyContent: 'center' }}>
                          {/* Bande IC */}
                          <div style={{ position: 'absolute', bottom: bandBottom, left: '20%', right: '20%',
                                        height: bandH, background: '#bfdbfe', borderRadius: 4 }} />
                          {/* Barre */}
                          <div style={{ position: 'absolute', bottom: 0, left: '30%', right: '30%',
                                        height: barH, background: '#2563eb', borderRadius: '4px 4px 0 0' }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                          {new Date(f.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                  Barre = prévision · Zone bleue = intervalle de confiance (±20 %)
                </p>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Prévision RDV</th>
                      <th style={thStyle}>Borne basse</th>
                      <th style={thStyle}>Borne haute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map(f => (
                      <tr key={f.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={tdStyle}>{new Date(f.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#1d4ed8' }}>{f.count}</td>
                        <td style={tdStyle}>{f.lower}</td>
                        <td style={tdStyle}>{f.upper}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )
          }
        </div>
      )}

      {/* ── TAB : ANOMALIES ─────────────────────────────────────────────── */}
      {!loading && tab === 'anomaly' && (
        <div style={{ overflowX: 'auto' }}>
          {anomalies.length === 0
            ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>
                Aucune anomalie détectée (ou pas assez de données — minimum 3 agents avec 10+ contacts).
              </p>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    {['Niveau', 'Agent', 'Total', 'NRP', 'RDV', 'Ratio NRP', 'Z-Score'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => {
                    const bg = a.niveau === 'CRITIQUE' ? '#fef2f2'
                             : a.niveau === 'ATTENTION' ? '#fffbeb' : '#f0fdf4';
                    const fg = a.niveau === 'CRITIQUE' ? '#b91c1c'
                             : a.niveau === 'ATTENTION' ? '#92400e' : '#15803d';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: bg }}>
                        <td style={tdStyle}>
                          <span style={{ background: fg, color: '#fff', borderRadius: 12,
                                         padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                            {a.niveau === 'CRITIQUE' ? '🚨' : a.niveau === 'ATTENTION' ? '⚠️' : '✅'} {a.niveau}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{a.agentNom}</td>
                        <td style={tdStyle}>{a.total}</td>
                        <td style={{ ...tdStyle, color: '#dc2626', fontWeight: 600 }}>{a.nrp}</td>
                        <td style={{ ...tdStyle, color: '#059669', fontWeight: 600 }}>{a.rdv}</td>
                        <td style={tdStyle}>{(a.ratioNrp * 100).toFixed(1)}%</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{a.zScore.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
            Algorithme : Z-score sur le ratio NRP/Total (30 derniers jours). Seuil anomalie : |Z| &gt; 2.
          </p>
        </div>
      )}
    </div>
  );
};

const paginBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', fontSize: 13,
};
const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontWeight: 600,
  color: '#374151', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '10px 14px' };

export default AIDashboardPage;
