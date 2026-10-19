# MIGRATION GUIDE - projet_fusionné

## Ce qui a été ajouté (Fonctionnalités du collègue)

### Backend - Nouvelles entités DB
- `User` + `Role` → tables `users`, `roles`
- `Country` → table `countries`
- `LeadType` → table `lead_types`  
- `Supplier` → table `suppliers`
- `SourceFile` → table `source_files`
- `SourceFileContact` (mis à jour - maintenant entité DB complète)
- `SourceFileInvalidRow` → table `source_file_invalid_rows`
- `ImportJob` → table `import_jobs`
- `Campaign` → table `campaigns`
- `CampaignFile` → table `campaign_files`
- `CampaignFileContact` → table `campaign_file_contacts`
- `CampaignAgents` → table `campaign_agents`
- `CallAttempt` → table `call_attempts`
- `AgentProfile` → table `agent_profiles`
- `Permission` + `RolePermission` + `UserPermission` (mis à jour)

### Backend - Nouveaux contrôleurs
- `GET/POST api/Countries`
- `GET/POST api/LeadTypes`
- `GET/POST api/Suppliers`
- `GET/POST/PUT/DELETE api/SourceFiles`
- `GET/POST/PUT/DELETE api/Campaigns`
- `GET/PUT api/Permissions`
- `GET api/Agents` (gestion agents User-based)

### Frontend - Nouveaux composants
- `InjectedFilesTab.tsx` - Onglet fichiers injectés
- `PermissionButton.tsx` - Bouton avec vérif. permission
- `TabSources.tsx` - Onglet sources (version complète)
- `UploadFile.tsx` - Interface upload

### Frontend - Nouveaux services/hooks
- `authService.ts`, `distributionService.ts`
- `hooks/useFileUpload.ts`
- `types/leads.ts`, `types/role.ts`
- `constants/role.ts`

## Étapes pour démarrer

### 1. Migration Base de Données
```bash
cd Backend
dotnet ef migrations add AddColleagueFeatures
dotnet ef database update
```

### 2. Installer les packages Frontend
```bash
cd Frontend
npm install
# ou
pnpm install
```

### 3. Lancer le projet
```bash
# Terminal 1: Backend
cd Backend
dotnet run

# Terminal 2: Frontend
cd Frontend
npm run dev
```

## API URL
Le frontend se connecte à: `http://localhost:5241/api`
Swagger disponible sur: `http://localhost:5241/swagger`

## Notes importantes
- L'auth existante (Agent, Admin, Confirmatrice, Commercial) fonctionne comme avant
- Les nouvelles fonctionnalités (Campaign, Supplier, etc.) utilisent une table `users` séparée
- Les migrations existantes sont conservées - seulement ajouter une nouvelle migration
