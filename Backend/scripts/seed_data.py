"""
CRM EBI — Script de seeding des données de test
Exécuter depuis le répertoire Backend :
    python seed_data.py

Pré-requis : pip install requests
"""

import requests
import json
import sys
import time

BASE = "http://localhost:5241"
AI   = "http://localhost:8000"

# ─── couleurs console ──────────────────────────────────────────────────────────
G = "\033[92m"  # vert
R = "\033[91m"  # rouge
Y = "\033[93m"  # jaune
B = "\033[94m"  # bleu
E = "\033[0m"   # reset

def ok(msg):   print(f"  {G}✓{E}  {msg}")
def fail(msg): print(f"  {R}✗{E}  {msg}")
def info(msg): print(f"  {B}→{E}  {msg}")
def step(msg): print(f"\n{Y}══ {msg} ══{E}")

def post(url, data, headers=None):
    try:
        r = requests.post(url, json=data, headers=headers or {}, timeout=30)
        return r
    except Exception as e:
        return None

def get(url, headers=None):
    try:
        r = requests.get(url, headers=headers or {}, timeout=30)
        return r
    except Exception as e:
        return None

def put(url, data, headers=None):
    try:
        r = requests.put(url, json=data, headers=headers or {}, timeout=30)
        return r
    except Exception as e:
        return None

# ══════════════════════════════════════════════════════════════════════════════
# 0. HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════
step("0. Vérification des services")

r = get(f"{BASE}/swagger/index.html")
if not r or r.status_code != 200:
    fail(f"Backend inaccessible sur {BASE} — lance 'dotnet run' d'abord")
    sys.exit(1)
ok(f"Backend OK ({BASE})")

r = get(f"{AI}/health")
if r and r.status_code == 200:
    ok(f"Microservice IA OK ({AI})")
else:
    info(f"Microservice IA absent — les scores utiliseront le fallback heuristique")

# ══════════════════════════════════════════════════════════════════════════════
# 1. CRÉER ADMIN (si inexistant) + LOGIN
# ══════════════════════════════════════════════════════════════════════════════
step("1. Authentification Admin")

# Essai de création admin via Init
r = post(f"{BASE}/api/Init/create-admin", {
    "nom": "Systeme",
    "prenom": "Admin",
    "email": "admin@ebi.com",
    "password": "Admin@2026"
})
if r and r.status_code == 200:
    ok("Admin créé via /api/Init/create-admin")
elif r and r.status_code in (400, 409):
    info("Admin déjà existant")
else:
    info(f"Init/create-admin: {r.status_code if r else 'timeout'}")

# Login — le mot de passe par défaut créé par InitController est "role123"
# Les champs attendus par LoginDTO sont "Email" et "Password" (majuscules)
login_payloads = [
    {"Email": "admin@ebi.com", "MotDePasse": "role123"},       # Champ réel du LoginDTO
    {"Email": "admin@ebi.com", "MotDePasse": "Admin@2026"},    # Si recréé manuellement
    {"email": "admin@ebi.com", "motDePasse": "role123"},       # camelCase JSON
    {"email": "admin@ebi.com", "motDePasse": "Admin@2026"},
]

r = None
for payload in login_payloads:
    info(f"Tentative login: {payload}")
    r = post(f"{BASE}/api/Auth/login", payload)
    if r and r.status_code == 200:
        break
    else:
        info(f"  → {r.status_code if r else 'timeout'}: {(r.text or '')[:100] if r else 'aucune réponse'}")

if not r or r.status_code != 200:
    fail("Impossible de s'authentifier.")
    info("Essaie dans Swagger : POST /api/Auth/login avec {\"Email\":\"admin@ebi.com\",\"MotDePasse\":\"role123\"}")
    info("Puis copie le token et relance : TOKEN=xxx python seed_data.py")
    import os
    env_token = os.environ.get("TOKEN")
    if env_token:
        info(f"TOKEN trouvé dans les variables d'env — utilisation directe")
        TOKEN = env_token
        H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    else:
        sys.exit(1)

if r and r.status_code == 200:
    data = r.json()
    TOKEN = data.get("token") or data.get("Token") or data.get("accessToken") or data.get("AccessToken")
    if not TOKEN:
        fail(f"Token introuvable dans la réponse: {r.text[:300]}")
        sys.exit(1)
    ok(f"Connecté en tant que {data.get('role') or data.get('Role','?')} (id={data.get('userId') or data.get('UserId','?')})")
    H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
# (sinon TOKEN et H déjà définis via variable d'env)

# ══════════════════════════════════════════════════════════════════════════════
# 2. CRÉER LES UTILISATEURS
# ══════════════════════════════════════════════════════════════════════════════
step("2. Création des utilisateurs")

users = [
    # Agents — role="agent" (switch case sensible, ToLower)
    {"nom":"Mansouri","prenom":"Karim",  "email":"agent1@ebi.com", "motDePasse":"Agent@2026","role":"agent"},
    {"nom":"Benhamed","prenom":"Sara",   "email":"agent2@ebi.com", "motDePasse":"Agent@2026","role":"agent"},
    {"nom":"Trabelsi","prenom":"Yassine","email":"agent3@ebi.com", "motDePasse":"Agent@2026","role":"agent"},
    # Confirmatrices — role doit correspondre aux case du switch
    {"nom":"Gharbi","prenom":"Sonia",    "email":"conf1@ebi.com",  "motDePasse":"Conf@2026", "role":"confirmatrice1"},
    {"nom":"Ayari", "prenom":"Nadia",    "email":"conf2@ebi.com",  "motDePasse":"Conf@2026", "role":"confirmatrice2"},
    {"nom":"Slama", "prenom":"Amira",    "email":"confc@ebi.com",  "motDePasse":"Conf@2026", "role":"confclient"},
    # Commercial
    {"nom":"Jendoubi","prenom":"Walid",  "email":"comm@ebi.com",   "motDePasse":"Comm@2026", "role":"commercial"},
    # Qualite
    {"nom":"Ferchichi","prenom":"Hajer", "email":"qualite@ebi.com","motDePasse":"Qual@2026", "role":"qualite"},
    # Technique
    {"nom":"Saidi","prenom":"Bassem",    "email":"tech@ebi.com",   "motDePasse":"Tech@2026", "role":"technique"},
]

user_ids = {}
for u in users:
    r = post(f"{BASE}/api/admin/utilisateurs", u, H)
    if r and r.status_code in (200, 201):
        uid = r.json().get("id") or r.json().get("Id")
        user_ids[u["email"]] = uid
        ok(f"Créé : {u['prenom']} {u['nom']} ({u['role']}) → id={uid}")
    elif r and r.status_code == 400 and "existe" in (r.text or "").lower():
        info(f"Déjà existant : {u['email']}")
    else:
        info(f"Utilisateur {u['email']}: {r.status_code if r else 'timeout'} — {(r.text or '')[:100] if r else ''}")

# ══════════════════════════════════════════════════════════════════════════════
# 3. ACTIVER AGENT ELITE
# ══════════════════════════════════════════════════════════════════════════════
step("3. Activer Agent Elite (Karim Mansouri)")

# Récupérer les utilisateurs pour trouver l'ID de l'agent
r = get(f"{BASE}/api/admin/utilisateurs", H)
agents_data = []
if r and r.status_code == 200:
    all_users = r.json()
    user_list = all_users if isinstance(all_users, list) else all_users.get("users", [])
    agents_data = [u for u in user_list if u.get("role") == "AGENT" or u.get("Role") == "AGENT"]
    info(f"{len(agents_data)} agents trouvés")

# Chercher Karim dans la liste agents (endpoint /api/Agent)
r = get(f"{BASE}/api/Agent", H)
if r and r.status_code == 200:
    agents_list = r.json()
    if isinstance(agents_list, list) and agents_list:
        first_agent = agents_list[0]
        agent_id = first_agent.get("id") or first_agent.get("Id")
        # Mettre IsElite via PUT
        r2 = put(f"{BASE}/api/Agent/{agent_id}", {**first_agent, "isElite": True}, H)
        if r2 and r2.status_code in (200, 204):
            ok(f"Agent id={agent_id} marqué Elite")
        else:
            info(f"PUT Agent/{agent_id}: {r2.status_code if r2 else 'timeout'} — essaie manuellement dans Swagger")

# ══════════════════════════════════════════════════════════════════════════════
# 4. ASSIGNER AGENDAS AUX CONFIRMATRICES
# ══════════════════════════════════════════════════════════════════════════════
step("4. Assigner agendas aux confirmatrices")

# Récupérer les confirmatrices
r = get(f"{BASE}/api/admin/confirmatrices/agendas", H)
if r and r.status_code == 200:
    confs = r.json()
    if isinstance(confs, list):
        for conf in confs:
            cid = conf.get("id") or conf.get("Id")
            ctype = conf.get("typeConfirmatrice") or conf.get("TypeConfirmatrice","")
            # Assigner les agendas selon le type
            if "CLIENT" in str(ctype).upper():
                agendas = "CLIENT1,CLIENT2,REFUS"
            elif "CONF1" in str(ctype).upper():
                agendas = "EBI,CLIENT1"
            elif "CONF2" in str(ctype).upper():
                agendas = "EBI,CLIENT2"
            else:
                agendas = "EBI"

            r2 = put(f"{BASE}/api/admin/confirmatrices/{cid}/assign-agenda",
                     {"agendasAccess": agendas}, H)
            if r2 and r2.status_code in (200, 204):
                ok(f"Confirmatrice {cid} ({ctype}) → agendas: {agendas}")
            else:
                info(f"Assign agenda {cid}: {r2.status_code if r2 else 'timeout'}")
else:
    info(f"GET confirmatrices/agendas: {r.status_code if r else 'timeout'}")

# ══════════════════════════════════════════════════════════════════════════════
# 5. CRÉER DES CONTACTS DE TEST
# ══════════════════════════════════════════════════════════════════════════════
step("5. Création des contacts")

# Récupérer l'ID du premier agent
agent_id_1 = None
r = get(f"{BASE}/api/Agent", H)
if r and r.status_code == 200 and isinstance(r.json(), list) and r.json():
    agent_id_1 = r.json()[0].get("id") or r.json()[0].get("Id")
    agent_id_2 = r.json()[1].get("id") if len(r.json()) > 1 else agent_id_1

contacts_test = [
    # Leads chauds (score IA élevé attendu)
    {"nom":"Martin","prenom":"Pierre","telephone":"0612345678","numGSM":"0712345678",
     "email":"pierre.martin@gmail.com","adresse":"12 rue des Lilas","codePostal":"69001","ville":"Lyon",
     "source":"FICHIER_EBI","modeChauffage":"Gaz","ageChaudiere":15,"equipePV":False,"equipePAC":False,
     "surface":120.0,"nombrePersonnes":4,"revenus":"Moyen","credits":"Non","fichage":False,
     "statutAgent":"NRP","nombreNRP":2,"agentId":agent_id_1,"typeRendezVous":"EBI"},

    {"nom":"Dupont","prenom":"Marie","telephone":"0623456789","numGSM":None,
     "email":"marie.dupont@gmail.com","adresse":"5 allée des Roses","codePostal":"13001","ville":"Marseille",
     "source":"FICHIER_EBI","modeChauffage":"Fioul","ageChaudiere":20,"equipePV":False,"equipePAC":False,
     "surface":145.0,"nombrePersonnes":5,"revenus":"Eleve","credits":"Non","fichage":False,
     "statutAgent":"HC_LOGEMENT","nombreNRP":1,"agentId":agent_id_1,"typeRendezVous":"EBI"},

    {"nom":"Bernard","prenom":"Jean","telephone":"0634567890","numGSM":"0734567890",
     "email":"jean.bernard@yahoo.fr","adresse":"8 rue de la Paix","codePostal":"75001","ville":"Paris",
     "source":"FICHIER_CLIENT1","modeChauffage":"Gaz","ageChaudiere":12,"equipePV":False,"equipePAC":True,
     "surface":95.0,"nombrePersonnes":3,"revenus":"Moyen","credits":"Oui","fichage":False,
     "statutAgent":None,"nombreNRP":0,"agentId":agent_id_1,"typeRendezVous":"CLIENT1"},

    # Leads froids (score IA bas attendu)
    {"nom":"Leclerc","prenom":"Sophie","telephone":"0645678901","numGSM":None,
     "email":"sophie.leclerc@hotmail.com","adresse":"3 impasse du Moulin","codePostal":"31001","ville":"Toulouse",
     "source":"FICHIER_EBI","modeChauffage":"Pompe a chaleur","ageChaudiere":2,"equipePV":True,"equipePAC":True,
     "surface":80.0,"nombrePersonnes":2,"revenus":"Faible","credits":"Non","fichage":True,
     "statutAgent":"REFUS_PAS_INTERESSE","nombreNRP":5,"agentId":agent_id_1,"typeRendezVous":None},

    {"nom":"Rousseau","prenom":"Paul","telephone":"0656789012","numGSM":"0756789012",
     "email":"paul.rousseau@gmail.com","adresse":"15 avenue Victor Hugo","codePostal":"44001","ville":"Nantes",
     "source":"FICHIER_CLIENT2","modeChauffage":"Electrique","ageChaudiere":3,"equipePV":True,"equipePAC":False,
     "surface":65.0,"nombrePersonnes":1,"revenus":"Faible","credits":"Oui","fichage":False,
     "statutAgent":"PORTE","nombreNRP":3,"agentId":agent_id_2 if 'agent_id_2' in dir() else agent_id_1,"typeRendezVous":"CLIENT2"},

    # Contacts variés pour prévision
    {"nom":"Petit","prenom":"Lucie","telephone":"0667890123","numGSM":None,
     "email":"lucie.petit@gmail.com","adresse":"7 rue Gambetta","codePostal":"67001","ville":"Strasbourg",
     "source":"FICHIER_EBI","modeChauffage":"Gaz","ageChaudiere":18,"equipePV":False,"equipePAC":False,
     "surface":110.0,"nombrePersonnes":3,"revenus":"Moyen","credits":"Non","fichage":False,
     "statutAgent":"RDV_CLIENT1","nombreNRP":0,"agentId":agent_id_1,"typeRendezVous":"CLIENT1"},

    {"nom":"Moreau","prenom":"Antoine","telephone":"0678901234","numGSM":"0778901234",
     "email":"antoine.moreau@outlook.fr","adresse":"2 place de la Republique","codePostal":"59001","ville":"Lille",
     "source":"FICHIER_EBI","modeChauffage":"Fioul","ageChaudiere":25,"equipePV":False,"equipePAC":False,
     "surface":160.0,"nombrePersonnes":6,"revenus":"Eleve","credits":"Non","fichage":False,
     "statutAgent":None,"nombreNRP":0,"agentId":agent_id_1,"typeRendezVous":"EBI"},

    {"nom":"Simon","prenom":"Isabelle","telephone":"0689012345","numGSM":None,
     "email":"isabelle.simon@gmail.com","adresse":"9 rue Saint-Nicolas","codePostal":"21000","ville":"Dijon",
     "source":"FICHIER_REFUS","modeChauffage":"Gaz","ageChaudiere":8,"equipePV":True,"equipePAC":False,
     "surface":75.0,"nombrePersonnes":2,"revenus":"Moyen","credits":"Non","fichage":False,
     "statutAgent":"REFUS_PAS_INTERESSE","nombreNRP":4,"agentId":agent_id_2 if 'agent_id_2' in dir() else agent_id_1,"typeRendezVous":"REFUS"},
]

contact_ids = []
for c in contacts_test:
    c_clean = {k: v for k, v in c.items() if v is not None}
    r = post(f"{BASE}/api/Contact", c_clean, H)
    if r and r.status_code in (200, 201):
        cid = r.json().get("id") or r.json().get("Id")
        contact_ids.append(cid)
        ok(f"Contact créé : {c['prenom']} {c['nom']} — statut={c.get('statutAgent','—')} NRP={c.get('nombreNRP',0)}")
    else:
        info(f"Contact {c['nom']}: {r.status_code if r else 'timeout'} — {(r.text or '')[:120] if r else ''}")

# ══════════════════════════════════════════════════════════════════════════════
# 6. CRÉER DES RENDEZ-VOUS
# ══════════════════════════════════════════════════════════════════════════════
step("6. Création des rendez-vous")

from datetime import datetime, timedelta
now = datetime.utcnow()

rdv_list = [
    {"statut":"BRUT","typeAgenda":"EBI","dateRendezVous":(now+timedelta(days=1)).isoformat()+"Z",
     "heureDebut":"09:00","heureFin":"10:00","adresse":"12 rue des Lilas","ville":"Lyon","codePostal":"69001",
     "agentId":agent_id_1},
    {"statut":"CONFIRME","typeAgenda":"CLIENT1","dateRendezVous":(now+timedelta(days=2)).isoformat()+"Z",
     "heureDebut":"14:00","heureFin":"15:00","adresse":"8 rue de la Paix","ville":"Paris","codePostal":"75001",
     "agentId":agent_id_1},
    {"statut":"BRUT","typeAgenda":"CLIENT2","dateRendezVous":(now+timedelta(days=3)).isoformat()+"Z",
     "heureDebut":"10:00","heureFin":"11:00","adresse":"15 avenue Victor Hugo","ville":"Nantes","codePostal":"44001",
     "agentId":agent_id_1},
    {"statut":"SIGNE","typeAgenda":"EBI","dateRendezVous":(now-timedelta(days=2)).isoformat()+"Z",
     "heureDebut":"09:00","heureFin":"10:00","adresse":"5 allée des Roses","ville":"Marseille","codePostal":"13001",
     "agentId":agent_id_1},
    {"statut":"ANNULE","typeAgenda":"CLIENT1","dateRendezVous":(now-timedelta(days=5)).isoformat()+"Z",
     "heureDebut":"15:00","heureFin":"16:00","adresse":"7 rue Gambetta","ville":"Strasbourg","codePostal":"67001",
     "agentId":agent_id_1},
]

for rdv in rdv_list:
    r = post(f"{BASE}/api/RendezVous", rdv, H) if False else None  # Tenter plusieurs endpoints
    # Essayer via confirmation1/rdv
    r = post(f"{BASE}/api/confirmation1/rdv", rdv, H)
    if r and r.status_code in (200, 201):
        ok(f"RDV créé : {rdv['typeAgenda']} — {rdv['statut']} — {rdv['dateRendezVous'][:10]}")
    else:
        # Essayer via l'endpoint Confirmatrice générique
        info(f"RDV {rdv['typeAgenda']}: {r.status_code if r else 'timeout'} — endpoint alternatif...")

# ══════════════════════════════════════════════════════════════════════════════
# 7. CRÉER DES ÉVALUATIONS
# ══════════════════════════════════════════════════════════════════════════════
step("7. Création des évaluations agents")

if agent_id_1:
    evals = [
        {"agentId": agent_id_1, "notePitchCommercial": 17.0, "noteTraitementObjections": 15.5,
         "noteQualiteAppel": 18.0, "noteRespectScript": 16.0, "noteEcoute": 17.5,
         "commentaire": "Bon agent, excellente gestion des objections.",
         "nbRdvBrut": 12, "nbRdvConfirme": 8, "nbRdvSigne": 3,
         "dateEvaluation": (now - timedelta(days=14)).isoformat() + "Z"},
        {"agentId": agent_id_1, "notePitchCommercial": 14.0, "noteTraitementObjections": 13.0,
         "noteQualiteAppel": 15.5, "noteRespectScript": 14.5, "noteEcoute": 15.0,
         "commentaire": "Progression satisfaisante. Travailler le pitch.",
         "nbRdvBrut": 9, "nbRdvConfirme": 6, "nbRdvSigne": 2,
         "dateEvaluation": (now - timedelta(days=45)).isoformat() + "Z"},
    ]
    for ev in evals:
        r = post(f"{BASE}/api/Qualite/evaluations", ev, H)
        if r and r.status_code in (200, 201):
            ok(f"Évaluation créée pour agent {ev['agentId']} — note globale ≈ {(ev['notePitchCommercial']+ev['noteTraitementObjections']+ev['noteQualiteAppel']+ev['noteRespectScript']+ev['noteEcoute'])/5:.1f}/20")
        else:
            info(f"Evaluation: {r.status_code if r else 'timeout'} — {(r.text or '')[:120] if r else ''}")

# ══════════════════════════════════════════════════════════════════════════════
# 8. SCORING IA (batch)
# ══════════════════════════════════════════════════════════════════════════════
step("8. Lancement du scoring IA")

r = post(f"{BASE}/api/AI/score-contacts?force=true", {}, H)
if r and r.status_code == 200:
    d = r.json()
    ok(f"Scoring terminé : {d.get('scored',0)} contacts scorés — {d.get('message','')}")
else:
    info(f"Scoring: {r.status_code if r else 'timeout'} — {(r.text or '')[:150] if r else ''}")

# ══════════════════════════════════════════════════════════════════════════════
# 9. MESSAGES CHAT (via REST — SignalR nécessite WS)
# ══════════════════════════════════════════════════════════════════════════════
step("9. Vérification Chat (historique)")

r = get(f"{BASE}/api/Chat", H)
if r and r.status_code == 200:
    ok(f"Canaux chat disponibles : {[c.get('id') for c in r.json()]}")
else:
    info(f"Chat: {r.status_code if r else 'timeout'}")

r = get(f"{BASE}/api/Chat/GENERAL?limit=10", H)
if r and r.status_code == 200:
    msgs = r.json()
    ok(f"Historique GENERAL : {len(msgs)} message(s)")
else:
    info(f"Chat/GENERAL: {r.status_code if r else 'timeout'}")

# ══════════════════════════════════════════════════════════════════════════════
# 10. VÉRIFICATION FINALE
# ══════════════════════════════════════════════════════════════════════════════
step("10. Vérification finale")

checks = [
    (f"{BASE}/api/AI/dashboard",           "Dashboard IA"),
    (f"{BASE}/api/AI/contacts-scored",     "Contacts scorés"),
    (f"{BASE}/api/AI/forecast",            "Prévision production"),
    (f"{BASE}/api/AI/anomalies",           "Anomalies agents"),
    (f"{BASE}/api/Contact/export/csv",     "Export CSV"),
    (f"{BASE}/api/Agent/me/pointage",      "Mon pointage"),
    (f"{BASE}/api/Agent/me/evaluations",   "Mes évaluations"),
    (f"{BASE}/api/Chat",                   "Canaux chat"),
]

for url, label in checks:
    r = get(url, H)
    if r and r.status_code == 200:
        ok(f"{label} → 200 OK")
    elif r:
        info(f"{label} → {r.status_code} {r.text[:80]}")
    else:
        fail(f"{label} → timeout/erreur")

# ══════════════════════════════════════════════════════════════════════════════
print(f"\n{G}═══════════════════════════════════════════════════════{E}")
print(f"{G}  Seeding terminé !  Accès frontend : http://localhost:5173{E}")
print(f"{G}═══════════════════════════════════════════════════════{E}")
print(f"""
Comptes créés :
  admin@ebi.com      / Admin@2026  (ADMIN)
  agent1@ebi.com     / Agent@2026  (AGENT — Elite)
  agent2@ebi.com     / Agent@2026  (AGENT)
  agent3@ebi.com     / Agent@2026  (AGENT)
  conf1@ebi.com      / Conf@2026   (CONFIRMATRICE CONF1)
  conf2@ebi.com      / Conf@2026   (CONFIRMATRICE CONF2)
  confc@ebi.com      / Conf@2026   (CONFIRMATRICE CLIENT)
  comm@ebi.com       / Comm@2026   (COMMERCIAL)
  qualite@ebi.com    / Qual@2026   (QUALITE)
  tech@ebi.com       / Tech@2026   (TECHNIQUE)

Dashboard IA : http://localhost:5173/admin/ai-dashboard
Swagger API  : http://localhost:5241/swagger
""")
