# CRM Call Center — Architecture & Workflow

A full-stack call center CRM built with **ASP.NET Core 8** (backend) and **React + TypeScript** (frontend), backed by **PostgreSQL**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 8, Entity Framework Core |
| Frontend | React, TypeScript, Vite |
| Database | PostgreSQL |
| Auth | JWT (access token + refresh token) |
| Phone calls | RingOver (planned integration) |

---

## Project Structure

```
CRM_ebi/
├── Backend/
│   ├── Controllers/        # API endpoints
│   ├── Entities/           # Database models
│   ├── DTOs/               # Request/response shapes
│   ├── Services/           # Business logic
│   │   ├── Auth/
│   │   ├── Agents/
│   │   ├── Campaign/
│   │   ├── ContactDistribution/   # Core calling engine
│   │   ├── SourceFiles/
│   │   └── ...
│   ├── Migrations/         # EF Core migrations
│   ├── Data/               # ApplicationDbContext
│   └── Constants/          # CallStatus, QualificationStatuses, etc.
└── Frontend/
    ├── src/
    │   ├── Pages/
    │   ├── components/
    │   ├── services/        # API calls
    │   ├── types/
    │   └── contexts/
```

---

## Core Concepts

### Roles

| Role | Description |
|------|-------------|
| Admin | Manages everything — campaigns, agents, files, permissions |
| Agent | Works on campaigns, calls contacts, qualifies them |

Permissions are granular and can be assigned per role or per user via `role_permissions` and `user_permissions` tables.

---

## Full Workflow

### 1. Supplier & File Management

1. Admin creates **Suppliers** (the companies that sell contact lists).
2. Admin creates **Countries** and **Lead Types** (e.g. France / Pompe à Chaleur).
3. Admin uploads a **contact file** (CSV/Excel) linked to a Supplier, Country, and Lead Type.
4. The file goes through:
   - **Column mapping** — admin maps CSV columns to standard fields (phone, name, address, etc.)
   - **Phone validation** — each number is validated and normalized using `PhoneValidationHelper`
   - **Import job** — background worker (`SourceFileImportWorker`) processes the file asynchronously, storing valid contacts in `source_file_contacts` and invalid ones in `source_file_invalid_rows`

Large files are automatically **split into batches** (child files) for better performance.

---

### 2. Campaign Management

1. Admin creates a **Campaign** with a name, description, and status (`Draft` / `Active` / `Inactive`).
2. Admin **adds agents** to the campaign (`campaign_agents`).
3. Admin **links source files** to the campaign (`campaign_files`).
4. Admin **injects** a file into the campaign — this copies valid contacts from `source_file_contacts` into `campaign_file_contacts`, skipping any number already in the **global blacklist**.

Each injected contact gets:
- `call_status = Pending`
- `max_attempts` from the campaign setting (default: 3)
- A `random_order` value for shuffled distribution
- `is_assignable = false` (not yet in the active pool)

---

### 3. Contact Distribution Engine

The engine lives in `ContactDistributionService` and handles all the logic of which contact goes to which agent.

#### Active Pool System

Not all contacts are available to agents at once. The engine maintains an **active pool** of contacts with `is_assignable = true`. This pool is refilled automatically when it drops below a threshold.

Pool size is calculated dynamically:
```
pool_target = active_agents × contacts_per_agent_per_hour × pool_buffer_hours
```

The engine measures real call rates from the last 2 hours and adjusts automatically if `auto_pool_sizing = true`.

#### When agent clicks "Lancer un appel"

The engine runs `GetNextContactAsync` which follows this priority order:

```
1. Return current assigned contact (if agent already has one)
2. Preferred agent callbacks (contacts where this agent is preferred)
3. General callbacks due now (any unassigned callback)
4. Normal pending contacts from the active pool
```

Contacts are assigned atomically with optimistic concurrency (3-retry loop) to prevent two agents getting the same contact simultaneously.

When a contact is claimed:
- `call_status → Assigned`
- `assigned_agent_id` set
- `attempt_count` incremented
- A `call_attempt` record is created
- Agent presence → `OnCall`

#### Timeout

If a contact stays `Assigned` for longer than `call_timeout_minutes` (configurable per campaign, default 10 min) without being qualified, it is automatically released back to `Pending` by `ReleaseTimedOutContacts`, which runs at the start of every `GetNextContactAsync` call.

---

### 4. Qualification

After a call, the agent qualifies the contact. Possible statuses and what happens:

| Status | French | What happens |
|--------|--------|-------------|
| `nrp` | Non Répondu | Deferred, marked `NearCampaignEnd` — recycled at end of campaign |
| `occupe` | Occupé | Callback to same agent next day |
| `a_rappeler` | À Rappeler | Callback at chosen date (preferred agent if within 1 month) |
| `rdv_client1/2/3` | RDV pris | Completed, appointment saved |
| `pas_interesse` | Pas Intéressé | Removed from active pool (manual recycle only) |
| `ne_plus_rappeler` | Ne Plus Rappeler | **Blacklisted globally** — never called again in any campaign |
| `refus` | Refus | Completed |
| `hc_logement/langue/consommation` | Hors Critères | Completed |
| `porte` | Porte | Completed |
| `pas_signe` | Pas Signé | Completed |

For non-NRP statuses, the agent must fill at least one field on the **fiche client** (heating type, ownership, income, etc.).

After qualification, agent presence → `WrapUp`.

---

### 5. Recycle

When a campaign file is exhausted or the admin wants to re-run it, they can **recycle** the file by choosing which qualification statuses to reset back to `Pending`. This allows the same contact list to be worked multiple times with different approaches.

---

### 6. Global Blacklist

When a contact is qualified as `NePlusRappeler`:
1. Their contact record is set to `CallStatus = Blacklisted`
2. Their normalized phone number is inserted into the global `blacklist` table
3. On every future file injection, blacklisted numbers are skipped automatically

---

### 7. NRP Recycling at Campaign End

NRP contacts are set to `NextAction = NearCampaignEnd` instead of being immediately re-queued.

The `NearCampaignEndWorker` background job runs every 30 minutes. When a campaign's active pending contacts drop below 5% of the NRP pool, it resets those NRP contacts back to `Pending` for a final calling round.

---

### 8. Agent Presence System

Agents have a presence status tracked in real-time:

| Status | Meaning |
|--------|---------|
| `Offline` | Not logged in |
| `Available` | Ready to receive contacts |
| `OnCall` | Currently on a call |
| `WrapUp` | Just finished a call, filling qualification form |
| `Break` | On break, no contacts assigned |

A **heartbeat** endpoint (`POST /api/Agents/me/heartbeat`) must be called regularly by the frontend. The `AgentPresenceCleanupWorker` marks agents offline if their heartbeat goes stale.

---

## Background Workers

| Worker | Frequency | What it does |
|--------|-----------|-------------|
| `SourceFileImportWorker` | Continuous | Processes uploaded CSV/Excel files |
| `AgentPresenceCleanupWorker` | Periodic | Marks agents offline if heartbeat is stale |
| `NearCampaignEndWorker` | Every 30 min | Recycles NRP contacts when campaign is nearly done |

---

## Key Database Tables

| Table | Purpose |
|-------|---------|
| `suppliers` | Contact list providers |
| `source_files` | Uploaded files (before injection) |
| `source_file_contacts` | Individual validated contacts from files |
| `campaigns` | Calling campaigns |
| `campaign_files` | Links source files to campaigns |
| `campaign_file_contacts` | Active contacts inside a campaign (the calling queue) |
| `call_attempts` | Full history of every call attempt |
| `contact_notes` | Agent notes per contact |
| `blacklist` | Global do-not-call list (by phone number) |
| `users` | Admins and agents |
| `agent_profiles` | Agent stats, contract type, salary |
| `campaign_agents` | Which agents are assigned to which campaigns |

---

## API Endpoints (Main)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/Auth/login` | Login |
| GET | `/api/Agents` | List all agents |
| POST | `/api/Agents` | Create agent |
| GET | `/api/Campaigns` | List campaigns |
| POST | `/api/Campaigns` | Create campaign |
| POST | `/api/Distribution/campaigns/{id}/inject` | Inject file into campaign |
| GET | `/api/Distribution/campaigns/{id}/next-contact` | Agent gets next contact to call |
| POST | `/api/Distribution/campaigns/{id}/contacts/{cid}/qualify` | Agent qualifies contact |
| PATCH | `/api/Agents/me/presence` | Agent updates their presence |
| POST | `/api/Agents/me/heartbeat` | Agent heartbeat |

---

## Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=...;Database=...;Username=...;Password=..."
  },
  "Jwt": {
    "Secret": "your-secret-key",
    "Issuer": "crm-api",
    "Audience": "crm-client",
    "ExpiryMinutes": 60
  },
  "RingOver": {
    "ApiKey": "",
    "WebHookSecret": ""
  }
}
```

---

## Running the Project

### Backend
```bash
cd Backend
dotnet ef database update   # Apply migrations
dotnet run
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

Backend runs on `https://localhost:5001`, Frontend on `http://localhost:5173`.

---

## What's Next

- [ ] RingOver (or alternative VoIP) integration
- [ ] Agent dialer page integration with backend
- [ ] Campaign statistics dashboard
- [ ] Appointment confirmation workflow
- [ ] Admin reporting (calls per agent, conversion rates)
