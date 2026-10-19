"""
CRM EBI — Microservice IA / Machine Learning
FastAPI + scikit-learn

Modules :
  1. Lead Scoring    — Random Forest (+ fallback heuristique)
  2. Production Forecast — Triple Exponential Smoothing
  3. Anomaly Detection  — Isolation Forest + Z-score NRP

Lancer : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os, math, datetime
from typing import List, Optional
import numpy as np

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ──────────────────────────────────────────────────────────────────────────────
# INIT APP
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CRM-EBI AI Service",
    description="Microservice ML : Lead Scoring, Prévision Production, Détection Anomalies",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ──────────────────────────────────────────────────────────────────────────────

class ContactFeatures(BaseModel):
    id: int
    mode_chauffage: Optional[str] = None
    age_chaudiere: Optional[int] = None
    equipe_pv: Optional[bool] = None
    equipe_pac: Optional[bool] = None
    surface: Optional[float] = None
    nb_personnes: Optional[int] = None
    revenus: Optional[str] = None
    credits: Optional[str] = None
    code_postal: Optional[str] = None
    fichage: Optional[bool] = None
    nombre_nrp: int = 0
    statut: Optional[str] = None

class ScoreBatchRequest(BaseModel):
    contacts: List[ContactFeatures]

class SingleScoreRequest(ContactFeatures):
    pass

class HistoryPoint(BaseModel):
    date: str
    count: int

class ForecastRequest(BaseModel):
    history: List[HistoryPoint]
    horizon: int = 7

class AgentStat(BaseModel):
    agentId: Optional[int]
    agentNom: str
    total: int
    nrp: int
    hc: int
    rdv: int

class AnomalyRequest(BaseModel):
    agents: List[AgentStat]


# ──────────────────────────────────────────────────────────────────────────────
# MODÈLE SCORING — Random Forest (avec fallback heuristique si pas de données)
# ──────────────────────────────────────────────────────────────────────────────

# Référentiel de chauffage énergivore (score +)
ENERGIVORE_CHAUFFAGE = {"gaz", "fioul", "electricite", "électricité", "fuel", "mazout"}

def _encode_contact(c: ContactFeatures) -> List[float]:
    """Transforme un contact en vecteur numérique pour le modèle."""
    chauffage_str = (c.mode_chauffage or "").lower()
    is_energivore = float(any(k in chauffage_str for k in ENERGIVORE_CHAUFFAGE))
    age_chaud     = float(c.age_chaudiere or 0)
    has_pv        = 0.0 if c.equipe_pv else 1.0       # pas équipé = intérêt potentiel
    has_pac       = 0.0 if c.equipe_pac else 1.0
    surface       = float(c.surface or 100) / 300.0    # normaliser ~300 m² max
    nb_personnes  = float(c.nb_personnes or 2) / 6.0
    fichage       = float(c.fichage or False)
    nrp_penalite  = min(c.nombre_nrp / 10.0, 1.0)     # pénalité progressive

    # Revenus : très approximatif (texte libre → ordinal)
    revenus_str   = (c.revenus or "").lower()
    revenus_score = 0.5
    if "faible" in revenus_str or "bas" in revenus_str:
        revenus_score = 0.2
    elif "moyen" in revenus_str:
        revenus_score = 0.5
    elif "élevé" in revenus_str or "eleve" in revenus_str or "haut" in revenus_str:
        revenus_score = 0.8

    return [is_energivore, age_chaud / 20.0, has_pv, has_pac,
            surface, nb_personnes, fichage, nrp_penalite, revenus_score]

def _heuristic_score(c: ContactFeatures) -> float:
    """Score purement heuristique (sans modèle entraîné)."""
    score = 50.0
    chauffage = (c.mode_chauffage or "").lower()
    if any(k in chauffage for k in ENERGIVORE_CHAUFFAGE):
        score += 15
    if c.age_chaudiere and c.age_chaudiere > 10:
        score += 10
    if c.equipe_pv is False:
        score += 5
    if c.equipe_pac is False:
        score += 5
    if c.nb_personnes and c.nb_personnes >= 3:
        score += 5
    if c.fichage:
        score -= 25
    score -= min(c.nombre_nrp * 3, 20)
    # Si statut = REFUS déjà traité
    if c.statut and "REFUS" in c.statut:
        score -= 15
    return max(0, min(100, round(score, 1)))

def _best_time(score: float) -> str:
    if score >= 65:
        return "09:00-11:00"
    elif score >= 40:
        return "14:00-16:00"
    else:
        return "11:00-13:00"

def _score_contact(c: ContactFeatures) -> dict:
    """Calcule le score. Essaie le modèle RF, sinon fallback heuristique."""
    try:
        # Tentative de chargement du modèle si déjà entraîné
        model_path = os.path.join(os.path.dirname(__file__), "models", "lead_scoring.pkl")
        if os.path.exists(model_path):
            import pickle
            with open(model_path, "rb") as f:
                model = pickle.load(f)
            features = [_encode_contact(c)]
            prob = model.predict_proba(features)[0][1]  # P(classe=1 = RDV obtenu)
            score = round(prob * 100, 1)
        else:
            score = _heuristic_score(c)
    except Exception:
        score = _heuristic_score(c)

    return {"id": c.id, "score": score, "best_time": _best_time(score)}


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINTS SCORING
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "CRM-EBI AI Service"}

@app.post("/score-single")
def score_single(req: SingleScoreRequest):
    result = _score_contact(req)
    return result

@app.post("/score-batch")
def score_batch(req: ScoreBatchRequest):
    scores = [_score_contact(c) for c in req.contacts]
    return {"scores": scores, "count": len(scores)}


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT PRÉVISION — Triple Exponential Smoothing (Holt-Winters)
# ──────────────────────────────────────────────────────────────────────────────

def _holt_winters(data: List[float], horizon: int,
                  alpha: float = 0.3, beta: float = 0.1, gamma: float = 0.2,
                  season_len: int = 7) -> List[float]:
    """Simple Holt-Winters additif (saisonnalité semaine)."""
    n = len(data)
    if n < 2:
        return [data[-1] if data else 5.0] * horizon

    # Initialisation
    level  = sum(data[:season_len]) / season_len if n >= season_len else sum(data) / n
    trend  = (sum(data[season_len:2*season_len]) - sum(data[:season_len])) / (season_len ** 2) \
             if n >= 2 * season_len else 0.0
    season = [data[i] - level for i in range(min(season_len, n))]
    while len(season) < season_len:
        season.append(0.0)

    for i in range(n):
        s_idx = i % season_len
        prev_level = level
        val = data[i]
        level  = alpha * (val - season[s_idx]) + (1 - alpha) * (prev_level + trend)
        trend  = beta  * (level - prev_level)  + (1 - beta)  * trend
        season[s_idx] = gamma * (val - prev_level - trend) + (1 - gamma) * season[s_idx]

    forecast = []
    for h in range(1, horizon + 1):
        pred = level + h * trend + season[(n + h - 1) % season_len]
        forecast.append(max(0.0, round(pred, 1)))

    return forecast

@app.post("/forecast")
def forecast_production(req: ForecastRequest):
    if len(req.history) < 3:
        return {"source": "insufficient_data", "forecast": [],
                "message": "Pas assez de données historiques (minimum 3 jours)."}

    counts = [h.count for h in req.history]
    preds  = _holt_winters(counts, req.horizon)

    # Bandes de confiance (±20 %)
    start_date = datetime.date.today() + datetime.timedelta(days=1)
    result = []
    for i, v in enumerate(preds):
        day = start_date + datetime.timedelta(days=i)
        result.append({
            "date":  day.isoformat(),
            "count": int(round(v)),
            "lower": int(max(0, round(v * 0.80))),
            "upper": int(round(v * 1.20)),
        })

    return {
        "source":   "holt_winters",
        "horizon":  req.horizon,
        "forecast": result,
        "history_avg": round(sum(counts) / len(counts), 1),
    }


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT ANOMALIES — Isolation Forest + Z-score
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/anomalies")
def detect_anomalies(req: AnomalyRequest):
    if len(req.agents) < 3:
        return {"source": "insufficient_data",
                "anomalies": [],
                "message": "Minimum 3 agents nécessaires pour la détection."}

    agents = req.agents
    ratios = [a.nrp / a.total if a.total > 0 else 0.0 for a in agents]

    # ── Z-score ───────────────────────────────────────────────────────────────
    mean_r = sum(ratios) / len(ratios)
    variance = sum((r - mean_r) ** 2 for r in ratios) / len(ratios)
    std_r = math.sqrt(variance) if variance > 0 else 1e-9

    z_scores = [(r - mean_r) / std_r for r in ratios]

    # ── Isolation Forest (si scikit-learn disponible) ─────────────────────────
    iso_scores = [0.0] * len(agents)
    source = "zscore"
    try:
        from sklearn.ensemble import IsolationForest
        X = np.array([[
            a.nrp / max(a.total, 1),
            a.rdv / max(a.total, 1),
            a.hc  / max(a.total, 1),
            a.total,
        ] for a in agents])
        iso = IsolationForest(contamination=0.1, random_state=42)
        iso.fit(X)
        preds_iso = iso.predict(X)       # -1 = anomalie, 1 = normal
        iso_scores = iso.decision_function(X).tolist()
        source = "isolation_forest+zscore"
    except ImportError:
        preds_iso = [1] * len(agents)

    results = []
    for i, a in enumerate(agents):
        z = round(z_scores[i], 2)
        is_anomalie = abs(z) > 2.0 or (preds_iso[i] == -1)
        niveau = "NORMAL"
        if abs(z) > 2.5 or (preds_iso[i] == -1 and abs(z) > 1.5):
            niveau = "CRITIQUE"
        elif abs(z) > 2.0:
            niveau = "ATTENTION"

        results.append({
            "agentId":    a.agentId,
            "agentNom":   a.agentNom,
            "total":      a.total,
            "nrp":        a.nrp,
            "hc":         a.hc,
            "rdv":        a.rdv,
            "ratioNrp":   round(ratios[i], 3),
            "zScore":     z,
            "isoScore":   round(iso_scores[i], 3) if iso_scores[i] else 0,
            "isAnomalie": is_anomalie,
            "niveau":     niveau,
        })

    results.sort(key=lambda x: abs(x["zScore"]), reverse=True)
    anomalies_only = [r for r in results if r["isAnomalie"]]

    return {
        "source":    source,
        "anomalies": anomalies_only,
        "all":       results,
        "mean":      round(mean_r, 3),
        "std":       round(std_r, 3),
        "threshold": 2.0,
    }


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT TRAINING (optionnel — à appeler avec de vraies données étiquetées)
# ──────────────────────────────────────────────────────────────────────────────

class TrainingContact(ContactFeatures):
    rdv_obtenu: bool = False   # 1 = RDV pris, 0 = pas de RDV

class TrainRequest(BaseModel):
    contacts: List[TrainingContact]

@app.post("/train")
def train_model(req: TrainRequest):
    """
    Entraîner le modèle Random Forest sur les données historiques étiquetées.
    Appeler une fois qu'on dispose de contacts avec label rdv_obtenu=True/False.
    """
    if len(req.contacts) < 50:
        return {"status": "error", "message": "Minimum 50 contacts étiquetés requis pour l'entraînement."}

    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score
        import pickle

        X = [_encode_contact(c) for c in req.contacts]
        y = [int(c.rdv_obtenu) for c in req.contacts]

        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
        )
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="roc_auc")
        model.fit(X, y)

        os.makedirs(os.path.join(os.path.dirname(__file__), "models"), exist_ok=True)
        model_path = os.path.join(os.path.dirname(__file__), "models", "lead_scoring.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(model, f)

        return {
            "status":   "trained",
            "samples":  len(req.contacts),
            "auc_cv":   round(float(cv_scores.mean()), 3),
            "auc_std":  round(float(cv_scores.std()), 3),
            "model_path": model_path,
        }
    except ImportError:
        return {"status": "error", "message": "scikit-learn non installé. Exécutez : pip install scikit-learn"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
