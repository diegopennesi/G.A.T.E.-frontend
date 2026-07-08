# GATE Frontend — Refactoring Plan

**Target codebase:** `gate/fe/src/` + `gate/` (backend)
**Primary stack:** React 18, TypeScript, Vite / Spring Boot, Kotlin
**Branch:** `dev-user-frontend-realm`
**Last updated:** 2026-07-08

---

## Legend
- ✅ DONE
- 🔲 TODO
- ⚠️ PARTIAL
- 🧪 TEST TO RUN
- OK VERIFIED

---

## Priority 0 — Fix Code Duplication ✅ DONE

### 0.1 ✅ Created `src/shared/utils.ts`
Exports: `toMessage`, `isUnauthorized`, `catalogEntryByCode/Label/Description`,
`CAMPAIGN_TONE_OPTIONS`, `campaignToneLabel`, `scopedStorageKey`, `readStoredJson`,
`SortDirection`, `compareSortableValues`, `formatShortDate`,
`campaignModuleIconName/Title/Description/Unavailable`, `CAMPAIGN_MODULE_*`,
`statusTone`, `platformRoleLabel`, `getSheetBlocks`, `sheetFieldPath`,
`getSheetOptionValue/Label`, `sheetValueAsText`, `parseSheetValue`

### 0.2 ✅ Removed duplicate `toMessage` from `AuthScreen.tsx`
### 0.3 ✅ Removed duplicate `toMessage` from `ProfilePages.tsx`
### 0.4 ✅ Removed duplicates from `CreateCampaignPage.tsx`
`CAMPAIGN_TONE_OPTIONS`, `catalogEntryByCode`, `catalogEntryDescription` rimossi.

### 0.5 ✅ Removed duplicates from `App.tsx`
7 blocchi rimossi (CAMPAIGN_TONE_OPTIONS, campaignToneLabel, catalogEntry*, formatShortDate,
compareSortableValues, scopedStorageKey, readStoredJson, toMessage, SortDirection).

---

## Priority 1 — Break Up App.tsx ✅ DONE

App.tsx: 7989 → 4685 righe (-41%).

### 1.1 ✅ Created `src/types/ui.ts`
`Screen`, `AuthMode`, `UiEvent`, `BreadcrumbItem`, `ThemeMode`, `EffectiveThemeMode`,
`CampaignPickerCampaign`, `LeaveCampaignContext`, `InviteAccessPreview`,
`NavigationSection`, `SCREEN_LABELS`, `SCREEN_ICONS`, `SCREEN_PATH_SEGMENTS`,
`NAVIGATION_SECTIONS`

### 1.2 ✅ Created `src/shared/routing.ts`
`resolveRealmContextFromPath`, `buildPathForState`, `DEFAULT_REALM_CODE`

### 1.3 ✅ Extracted shared components
- `src/shared/components/InfoBlock.tsx`
- `src/shared/components/FilterChipGroup.tsx`
- `src/shared/components/RealmStatusScreen.tsx`

### 1.4 ✅ Extracted campaign feature components
- `src/features/campaigns/components/LeaveCampaignModal.tsx`
- `src/features/campaigns/components/CampaignPickerModal.tsx`

### 1.5 ✅ Extracted campaign feature pages
- `src/features/campaigns/pages/CampaignListPage.tsx`
- `src/features/campaigns/pages/CampaignDetailPage.tsx`
- `src/features/campaigns/pages/CampaignManagementPage.tsx` (include CampaignToggleSettingsTable)
- `src/features/campaigns/pages/CampaignMemberProfilePage.tsx`

### 1.6 ✅ Extracted character feature pages
- `src/features/characters/pages/CharacterListPage.tsx`
- `src/features/characters/pages/CharacterDetailPage.tsx`

### 1.7 ✅ Created admin feature
- `src/features/admin/pages/SystemCatalogsPage.tsx`
- `src/features/admin/index.ts`

### 1.8 ✅ Cleaned up App.tsx imports
Rimossi tutti gli import inutilizzati dopo l'estrazione.

---

## Priority 2 — Minor Issues ⚠️ PARTIAL

### 2.1 ✅ `isUnauthorized` spostato in `src/shared/utils.ts`

### 2.2 ✅ `RealmStatusScreen` estratto in `src/shared/components/RealmStatusScreen.tsx`

### 2.3 ✅ URL routing ad-hoc documentato
`resolveRealmContextFromPath` e `buildPathForState` in `src/shared/routing.ts` implementano
un router manuale senza `react-router-dom` (non installato).
Aggiungere commento architetturale che documenta questa scelta intenzionale.

### 2.4 ✅ `LeaveCampaignContext` spostato in `src/types/ui.ts`

---

## Priority 3 — App.tsx State Extraction ✅ DONE

App.tsx era ancora carico di `useState` e data loader inline.
L'estrazione e' stata eseguita con custom hooks + React Context.

### 3.1 ✅ Creato `src/hooks/`
- `useCampaignState.ts`
- `useMissionState.ts`
- `useCharacterState.ts`
- `useRealmState.ts`
- `useAdminState.ts`
- `useProfileState.ts`
- `useUiState.ts`

### 3.2 ✅ Creato `src/context/`
Context providers per ogni hook, così i feature screen possono consumare
stato senza prop drilling.

Context aggiunti:
- `CampaignContext.tsx`
- `MissionContext.tsx`
- `CharacterContext.tsx`
- `RealmContext.tsx`
- `AdminContext.tsx`
- `ProfileContext.tsx`
- `UiContext.tsx`

### 3.3 ✅ Ridotto App a orchestratore
App chiama hooks, computa derived values, renderizza layout.
Feature screens importano context hooks direttamente.

Page migrate a consumo diretto dei context:
- `AuthScreen.tsx`
- `CampaignListPage.tsx`
- `CampaignDetailPage.tsx`
- `ApprovalPage.tsx`
- `CreateCampaignPage.tsx`
- `CampaignManagementPage.tsx`
- `CampaignMemberProfilePage.tsx`
- `CharacterListPage.tsx`
- `CharacterDetailPage.tsx`
- `CharacterQuickPages.tsx`
- `MissionsPage.tsx`
- `RoomsPage.tsx`
- `ProfilePages.tsx`
- `NotificationsPage.tsx`
- `SystemCatalogsPage.tsx`

### 3.4 OK VERIFIED Build
- `npm run build` → OK VERIFIED

### 3.5 OK VERIFIED Lint
- `npm run lint` → OK VERIFIED
- note: restano warning `react-hooks/exhaustive-deps` storici in `App.tsx` e un warning analogo in alcune page; non bloccano la build e non falliscono il comando.

### 3.6 ✅ Admin campaigns view refit
- La vista campagne admin ora usa una tabella con riga espandibile.
- Colonne summary: nome campagna, realm di provenienza, stato, numero moduli, azione `Modifica`.
- Nel dettaglio espanso i parametri configurabili sono mostrati come lista tabellare, non come cards.
- I moduli campagna restano in una tabella separata dentro il dettaglio, così la UI scala meglio quando il numero di moduli cresce.
- Backend admin campaigns list aggiornata per esporre `realmId`, `realmCode`, `realmName`.
- Verifica eseguita:
  - `npm run build` → OK VERIFIED
  - `npm run lint` → OK VERIFIED
  - `smoke-campaign-create.spec.ts` → 🧪 da riallineare al flusso auth corrente, non usato come verifica del refit campagne

---

## Backend — Admin Realm Scoping ✅ DONE

### B.1 ✅ Frontend: `realm: false` su tutte le 14 funzioni admin in `gateApi.ts`
`src/services/apiClient.ts` — aggiunto param `realm?: boolean` (default `true`).
Quando `false`, non invia `X-GATE-Realm-Code` header.

Funzioni aggiornate: `listAdminUsers`, `updateAdminUser`, `listAdminCampaigns`,
`updateAdminCampaign`, `listAdminRealms`, `createAdminRealm`, `updateAdminRealm`,
`listAdminRealmUserRoles`, `upsertAdminRealmUserRole`, `listAdminGameSystems`,
`createAdminGameSystem`, `updateAdminGameSystem`, `listAdminSheetTypes`,
`createAdminSheetType`, `updateAdminSheetType`.

### B.2 ✅ Backend: `listAdminCampaigns` de-realm-scopato
`gate/src/main/kotlin/com/gate/campaign/CampaignService.kt`
`findByRealmId(currentRealm.id, pageable)` → `findAll(pageable)`.
Ora restituisce tutte le campagne di tutti i realm.

### B.3 ✅ Backend: `updateAdminCampaign` de-realm-scopato
`gate/src/main/kotlin/com/gate/campaign/CampaignService.kt`
`findCampaignInCurrentRealm(campaignId)` → `campaignRepository.findById(campaignId)`.
Ora modifica qualsiasi campagna indipendentemente dal realm.

---

## Constraints (immutabili)

1. No modifiche a URL endpoint in `gateApi.ts`
2. No modifiche a `types/domain.ts`
3. No CSS changes
4. No router library (react-router non installato — intenzionale)
5. Import con path relativi (nessun alias)
6. TypeScript strict mode attivo
7. No testing framework configurato
