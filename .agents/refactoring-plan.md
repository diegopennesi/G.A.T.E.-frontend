# GATE Frontend — Refactoring Plan

**Target codebase:** `gate/fe/src/`
**Primary stack:** React 18, TypeScript, Vite
**Current branch:** `dev-user-frontend-realm`

---

## Context

The codebase was partially refactored by moving page components into feature folders
(`features/auth`, `features/campaigns`, `features/missions`, etc.) to reduce `App.tsx` size.
However, `App.tsx` remains a ~312KB god component holding all global state and data-loading logic.
Additionally, several utility functions and constants were duplicated across files during
the extraction instead of being shared.

This document lists all changes that need to be made, in priority order.

---

## Priority 0 — Fix Code Duplication (highest urgency)

### 0.1 — Create `src/shared/utils.ts`

Create this file. It does not exist yet. It should export all shared utility functions.

**File to create:** `src/shared/utils.ts`

```typescript
import { ApiError } from '../services/apiClient'
import type { CampaignCatalogEntry } from '../types/domain'

/**
 * Convert any thrown value to a user-readable string.
 * Handles ApiError (with optional field-level validation details),
 * generic Error, and unknown thrown values.
 *
 * NOTE: This is the canonical version. The simplified copies in
 * AuthScreen.tsx and ProfilePages.tsx must be removed.
 */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.payload?.fields
      ? ` (${Object.entries(error.payload.fields)
          .map(([key, value]) => `${key}:${value}`)
          .join(', ')})`
      : ''
    return `${error.message}${fields}`
  }
  if (error instanceof Error) return error.message
  return 'Errore non gestito'
}

/**
 * Catalog entry helpers.
 * Used in App.tsx (campaign sheet view) and CreateCampaignPage.tsx.
 * Currently duplicated — must be unified here.
 */
export const catalogEntryByCode = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): CampaignCatalogEntry | null => {
  if (!code) return null
  return entries.find((entry) => entry.code === code) || null
}

export const catalogEntryLabel = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): string | null => {
  return catalogEntryByCode(entries, code)?.label || code || null
}

export const catalogEntryDescription = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): string | null => {
  if (!code) return null
  return catalogEntryByCode(entries, code)?.description || null
}

/**
 * Campaign tone options.
 * Currently duplicated in App.tsx:318 and CreateCampaignPage.tsx:20.
 * Single source of truth goes here.
 */
export const CAMPAIGN_TONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EPIC_FANTASY', label: 'Fantasy Epico' },
  { value: 'HEROIC', label: 'Eroico' },
  { value: 'DARK', label: 'Dark' },
  { value: 'MYSTERY', label: 'Mistero' },
  { value: 'HORROR', label: 'Horror' },
  { value: 'POLITICAL_INTRIGUE', label: 'Intrigo Politico' },
  { value: 'ADVENTURE', label: 'Avventura' },
  { value: 'LIGHTHEARTED', label: 'Leggero' },
]

export const campaignToneLabel = (value: string | null | undefined): string | null => {
  if (!value) return null
  const match = CAMPAIGN_TONE_OPTIONS.find((opt) => opt.value === value)
  return match?.label || value
}

/**
 * Generic localStorage/sessionStorage helpers.
 * Currently private in App.tsx. Needed by multiple future features.
 */
export function scopedStorageKey(baseKey: string, userId?: string | null): string {
  return userId ? `${baseKey}:${userId}` : baseKey
}

export function readStoredJson<T>(storage: Storage, key: string, fallback: T): T {
  const raw = storage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Generic sort comparator used by admin tables.
 * Currently private in App.tsx:377.
 */
export type SortDirection = 'asc' | 'desc'

export const compareSortableValues = (
  left: unknown,
  right: unknown,
  direction: SortDirection,
): number => {
  const factor = direction === 'asc' ? 1 : -1
  const normalize = (value: unknown) => {
    if (typeof value === 'boolean') return value ? 1 : 0
    if (typeof value === 'number') return value
    return String(value ?? '').toLowerCase()
  }
  const a = normalize(left)
  const b = normalize(right)
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * factor
  return String(a).localeCompare(String(b), 'it') * factor
}

/**
 * Short date formatter (italian locale).
 * Currently private in App.tsx:366.
 */
export const formatShortDate = (value: string | null | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date)
}
```

---

### 0.2 — Remove duplicate `toMessage` from `AuthScreen.tsx`

**File:** `src/features/auth/pages/AuthScreen.tsx`

Remove lines 6–9:
```typescript
// DELETE THESE LINES:
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Errore imprevisto'
}
```

Add import at top of file:
```typescript
import { toMessage } from '../../../shared/utils'
```

> **Warning:** The version in AuthScreen is simplified (no ApiError handling).
> After switching to the shared version, API field-level validation errors will also
> be shown in the auth flow. This is an improvement, not a regression.

---

### 0.3 — Remove duplicate `toMessage` from `ProfilePages.tsx`

**File:** `src/features/profile/pages/ProfilePages.tsx`

Remove lines 23–26:
```typescript
// DELETE THESE LINES:
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Errore imprevisto'
}
```

Add import at top of file:
```typescript
import { toMessage } from '../../../shared/utils'
```

---

### 0.4 — Remove duplicates from `CreateCampaignPage.tsx`

**File:** `src/features/campaigns/pages/CreateCampaignPage.tsx`

Remove lines 20–38 (the local definitions of `CAMPAIGN_TONE_OPTIONS`, `catalogEntryByCode`,
`catalogEntryDescription`):
```typescript
// DELETE ALL OF THIS:
const CAMPAIGN_TONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EPIC_FANTASY', label: 'Fantasy Epico' },
  // ...all 8 entries...
]

const catalogEntryByCode = (entries: CampaignCatalogEntry[], code: string | null | undefined): CampaignCatalogEntry | null => {
  if (!code) return null
  return entries.find((entry) => entry.code === code) || null
}

const catalogEntryDescription = (entries: CampaignCatalogEntry[], code: string | null | undefined): string | null => {
  if (!code) return null
  return catalogEntryByCode(entries, code)?.description || null
}
```

Add import at top of file:
```typescript
import { CAMPAIGN_TONE_OPTIONS, catalogEntryDescription } from '../../../shared/utils'
```

> Note: `catalogEntryByCode` is used only internally by `catalogEntryDescription` in this file.
> After removing both and importing `catalogEntryDescription` from shared, `catalogEntryByCode`
> does not need to be imported separately here.

---

### 0.5 — Remove duplicates from `App.tsx`

**File:** `src/App.tsx`

Remove the following blocks and replace with imports from `'./shared/utils'`:

| Lines to remove | Symbol(s) |
|---|---|
| `318–333` | `CAMPAIGN_TONE_OPTIONS` + `campaignToneLabel` |
| `335–348` | `catalogEntryByCode`, `catalogEntryLabel`, `catalogEntryDescription` |
| `366–375` | `formatShortDate` |
| `377–388` | `compareSortableValues` + local `SortDirection` type alias |
| `259–261` | `scopedStorageKey` |
| `263–272` | `readStoredJson` |
| `7972–7983` | `toMessage` |

Add at top of `App.tsx` (after existing imports):
```typescript
import {
  toMessage,
  catalogEntryByCode,
  catalogEntryLabel,
  catalogEntryDescription,
  campaignToneLabel,
  CAMPAIGN_TONE_OPTIONS,
  formatShortDate,
  compareSortableValues,
  scopedStorageKey,
  readStoredJson,
} from './shared/utils'
import type { SortDirection } from './shared/utils'
```

> **Note:** `SortDirection` is currently defined locally in App.tsx as
> `type SortDirection = 'asc' | 'desc'` (line ~393). Remove the local type definition
> and import from shared/utils instead.

---

## Priority 1 — Break Up App.tsx

App.tsx is 311.9KB and contains ~80+ `useState` hooks in a single `function App()`.
The feature page components were extracted but the state and data-loading remain
centralized in App.tsx, so the extraction did not reduce actual complexity —
it only moved JSX rendering out.

### 1.1 — Extract domain state into custom hooks

Create a `src/hooks/` directory. Split App's state by domain:

#### `src/hooks/useCampaignState.ts`

Manage:
- `campaignId`, `knownCampaignIds`, `knownCampaignMeta`
- `myCampaigns`, `discoverableCampaigns`, `campaignDetailsById`
- `campaign`, `members`, `memberNames`, `campaignMembersForManagement`
- `permissions`, `campaignModules`, `campaignGameSystems`
- `pendingApplications`, `pendingApplicationsByCampaignId`
- `campaignFounderNames`, `canManageCampaignMembers`

Expose: state + setters + async data loaders (e.g. `loadCampaign(id)`, `loadMembers()`)

#### `src/hooks/useMissionState.ts`

Manage:
- `missions`, `selectedMissionId`
- `missionParticipantsById`, `myMissionParticipationById`
- `missionParticipantCharacterLabelById`
- `selectedMissionChatContext`, `missionChat`, `missionChatBusy`, `missionChatError`

Expose: state + async loaders + chat send action

#### `src/hooks/useCharacterState.ts`

Manage:
- `characters`, `selectedCharacterId`
- `characterDetail`, `characterSheetDetail`

#### `src/hooks/useRealmState.ts`

Manage:
- `realmCode`, `realmBranding`, `realmAvailability`, `realmAvailabilityMessage`
- `realmPermissions`, `realmWelcome`
- `authMode`

#### `src/hooks/useAdminState.ts`

Manage all `adminUsers*`, `adminCampaigns*`, `adminRealms*`, `adminGameSystems`,
`adminSheetTypes`, `systemAdminView`, sort/search state.

#### `src/hooks/useProfileState.ts`

Manage:
- `profile`, `rooms`
- `selectedCampaignMember`, `selectedCampaignMemberProfile`

#### `src/hooks/useUiState.ts`

Manage:
- `screen`, `busy`, `error`, `events`
- `isSidebarOpen`, `isCampaignPickerOpen`, `campaignPickerTarget`
- `isLeaveCampaignOpen`, `theme`

---

### 1.2 — Reduce App component to orchestration only

After custom hooks are in place, `App` should:
1. Call the hooks
2. Compute derived values (memoized)
3. Render layout + route to screen

All `async` data-loading functions currently inlined in App (e.g. `loadCampaignBlock`,
`refreshMissions`) should live inside their respective custom hooks.

---

### 1.3 — Share state via React Context

Each custom hook should be wrapped in a Context provider so that feature screens
can access state without prop drilling.

**Example pattern:**

```tsx
// src/context/CampaignContext.tsx
import { createContext, useContext, type ReactNode } from 'react'
import { useCampaignState } from '../hooks/useCampaignState'

const CampaignContext = createContext<ReturnType<typeof useCampaignState> | null>(null)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const state = useCampaignState()
  return <CampaignContext.Provider value={state}>{children}</CampaignContext.Provider>
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign used outside CampaignProvider')
  return ctx
}
```

Root composition in `main.tsx`:
```tsx
<RealmProvider>
  <ProfileProvider>
    <CampaignProvider>
      <MissionProvider>
        <App />
      </MissionProvider>
    </CampaignProvider>
  </ProfileProvider>
</RealmProvider>
```

---

### 1.4 — Make feature screens independently data-aware

Currently feature screens receive all data and callbacks as props from App.tsx.

**Before (current pattern):**
```tsx
// App.tsx passes 20+ props:
<MissionsPage
  missions={missions}
  campaignId={campaignId}
  profile={profile}
  onJoin={handleJoinMission}
  onLeave={handleLeaveMission}
  // ... 15+ more props
/>
```

**After (target pattern):**
```tsx
// MissionsPage.tsx uses hooks directly:
import { useMission } from '../../../context/MissionContext'
import { useCampaign } from '../../../context/CampaignContext'

export function MissionsPage() {
  const { missions, joinMission, leaveMission } = useMission()
  const { campaignId } = useCampaign()
  // ...
}
```

---

## Priority 2 — Minor Issues

### 2.1 — `isUnauthorized` helper not shared

`App.tsx:7985` defines:
```typescript
function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
```
Used only in App.tsx currently. If auth error handling spreads to feature screens,
move this to `shared/utils.ts`.

### 2.2 — `RealmStatusScreen` component belongs in a feature or shared folder

`App.tsx:228` defines a `RealmStatusScreen` component (loading/unavailable state).
It uses `Icon` from shared components. Extract to either:
- `src/features/realm/components/RealmStatusScreen.tsx`
- `src/shared/components/RealmStatusScreen.tsx`

### 2.3 — URL routing is ad-hoc

`resolveRealmContextFromPath` and `buildPathForState` in App.tsx implement a manual
URL router using `window.history.replaceState`. Consider documenting this as an
intentional architectural decision (no router library installed), or migrate to
`react-router-dom` in a separate dedicated task.

### 2.4 — `LeaveCampaignContext` type is local to App.tsx

```typescript
type LeaveCampaignContext = {
  campaignName: string
  characterWillBeRetired: boolean
}
```
If leave-campaign logic is extracted to a feature or hook, move this type with it.

---

## File Change Summary

| File | Action | Reason |
|---|---|---|
| `src/shared/utils.ts` | **CREATE** | Central home for all shared utility functions |
| `src/features/auth/pages/AuthScreen.tsx` | **EDIT** | Remove local `toMessage`, import from shared |
| `src/features/profile/pages/ProfilePages.tsx` | **EDIT** | Remove local `toMessage`, import from shared |
| `src/features/campaigns/pages/CreateCampaignPage.tsx` | **EDIT** | Remove `CAMPAIGN_TONE_OPTIONS`, `catalogEntryByCode`, `catalogEntryDescription`; import from shared |
| `src/App.tsx` | **EDIT** | Remove 7 duplicated functions/constants/types, import from shared |
| `src/hooks/useCampaignState.ts` | **CREATE** | Extract campaign state + loaders from App |
| `src/hooks/useMissionState.ts` | **CREATE** | Extract mission state + loaders from App |
| `src/hooks/useCharacterState.ts` | **CREATE** | Extract character state from App |
| `src/hooks/useRealmState.ts` | **CREATE** | Extract realm/auth state from App |
| `src/hooks/useAdminState.ts` | **CREATE** | Extract admin state from App |
| `src/hooks/useProfileState.ts` | **CREATE** | Extract profile state from App |
| `src/hooks/useUiState.ts` | **CREATE** | Extract UI state from App |
| `src/context/CampaignContext.tsx` | **CREATE** | Context provider wrapping campaign hook |
| `src/context/MissionContext.tsx` | **CREATE** | Context provider wrapping mission hook |
| `src/context/RealmContext.tsx` | **CREATE** | Context provider wrapping realm hook |
| `src/features/missions/pages/MissionsPage.tsx` | **EDIT** | Use context hooks instead of props (after P1 done) |
| `src/features/campaigns/pages/CreateCampaignPage.tsx` | **EDIT** | Use context hooks instead of props (after P1 done) |
| `src/features/profile/pages/ProfilePages.tsx` | **EDIT** | Use context hooks instead of props (after P1 done) |

---

## Constraints and Notes for the Agent

1. **Do not change any API endpoint URLs** in `gateApi.ts`. The service layer is correct as-is.

2. **Do not modify `types/domain.ts`**. All domain types are correct and centralized.

3. **Do not modify `services/apiClient.ts`**. Token refresh, realm header injection,
   and error parsing logic are correct.

4. **The `toMessage` in App.tsx (line 7972) is the canonical version.**
   It handles `ApiError` with field-level error details. The copies in `AuthScreen.tsx`
   and `ProfilePages.tsx` are degraded (they only handle `Error`, not `ApiError`).
   Always use the App.tsx version as the source of truth when creating `shared/utils.ts`.

5. **Start with Priority 0 only.** Priority 1 changes are large and must be done
   incrementally. Do not attempt the full P1 refactor in a single pass — it will
   break the application.

6. **All imports use relative paths.** No path aliases are configured in `tsconfig.json`
   or `vite.config.ts`. Maintain this convention when adding new imports.

7. **No testing framework is configured.** There are no tests to update or write.

8. **TypeScript strict mode is active.** All new code must be fully type-safe.

9. **No CSS changes needed.** All class names exist in `App.css`. Do not touch CSS files.

10. **No router library is installed.** Navigation is managed via `window.history.replaceState`
    and `window.location.pathname` in App.tsx. Do not introduce `react-router-dom`
    as part of this refactoring.
