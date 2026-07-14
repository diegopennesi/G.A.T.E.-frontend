# Cache-First Audit

Objective: identify frontend reads that were still capable of hitting the backend on screen entry instead of reusing TanStack cache first, then track the fix status.

## Fixed navigation loaders

- `src/hooks/useBootstrapDataFlow.ts` `loadCurrentRealmPermissions`
  Reason: realm permissions were always fetched through `fetchQuery` from screen/bootstrap flows instead of explicitly reading fresh cache first.
  Status: fixed with `readOrFetchQuery(...)`.

- `src/hooks/useBootstrapDataFlow.ts` `loadDiscoverableCampaigns`
  Reason: campaign discovery on `Lista Campagne` re-enter could still pass through a network-capable fetch path.
  Status: fixed with `readOrFetchQuery(...)`.

- `src/hooks/useBootstrapDataFlow.ts` `loadPostLoginCampaignSummary`
  Reason: `Ingresso` could re-run the summary loader without first restoring cached data into screen state.
  Status: fixed by restoring fresh cached summary first and fetching only when missing or invalidated.

- `src/App.tsx` `loadCharacterDetailBlock`
  Reason: `Scheda PG` re-entry always passed through imperative `fetchQuery(...)`.
  Status: fixed with `readOrFetchQuery(...)`.

- `src/hooks/useCampaignDataFlow.ts` `loadCampaignBlockFor`
  Reason: `Scheda Campagna` re-entry reloaded campaign details, members, characters, missions, rooms, permissions and management-only slices through network-capable fetches.
  Status: fixed by routing every resource through `readOrFetchQuery(...)`, and by fetching management-only data only when the permission query allows it.

- `src/hooks/useCampaignDataFlow.ts` `refreshMissions`
  Reason: `Missioni` re-entry reloaded mission lists, characters and mission participants for all approved campaigns through imperative fetches.
  Status: fixed with `readOrFetchQuery(...)` for missions, characters and participants.

- `src/hooks/useCampaignDataFlow.ts` `loadPendingForCampaign`
  Reason: pending applications were read through `fetchQuery(...)`, and `403/404` fallback values were not cached.
  Status: fixed by normalizing `403/404` to `[]` inside a cache-first reader so the fallback result is cached too.

- `src/hooks/useCampaignDataFlow.ts` `loadMissionChat`
  Reason: reopening the same mission chat could still pass through an imperative fetch path.
  Status: fixed with `readOrFetchQuery(...)`.

- `src/App.tsx` `loadCharactersForManagement`
  Reason: `Gestione Personaggi` re-entry reloaded members and characters for all approved campaigns through imperative fetches.
  Status: fixed with `readOrFetchQuery(...)`.

- `src/App.tsx` `screen === 'Approvazione Accessi'` effect
  Reason: screen entry explicitly forced `loadPendingForActiveCampaign({ force: true })`.
  Status: fixed by removing the forced refresh on entry. Forced refresh remains only on invalidation or explicit mutation paths.

## Fixed key instability

- `src/App.tsx` `missionWindowSince`
  Reason: the missions query key used a moving timestamp window. That could create artificial cache misses between navigation steps.
  Status: fixed by freezing the mission window start in a session-scoped ref.

## Intentionally still non-cache-first

- Auth bootstrap in `src/hooks/useBootstrapDataFlow.ts` `refreshProfile({ force: true })` after login/logout-sensitive flows.
  Reason: these are explicit session boundary refreshes, not screen re-entry reads.

- Mutation follow-ups in `src/hooks/useCampaignMutations.ts`, `src/hooks/useCampaignCommandMutations.ts`, `src/hooks/useCharacterMutations.ts`, `src/hooks/useAdminMutations.ts`.
  Reason: after writes, the caller is intentionally forcing a refresh or relying on invalidation to guarantee fresh server state.

- Admin console loaders in `src/App.tsx`.
  Reason: they are operational/admin views and were not part of the campaign/mission cache-first regression path addressed in this pass.

- Manual refresh actions such as `reloadCampaign`, post-login `onRefresh`, and admin pagination/search refreshes.
  Reason: explicit user refresh must remain allowed to bypass cache.
