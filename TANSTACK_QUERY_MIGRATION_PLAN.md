# TanStack Query Migration Plan

Objective: replace the custom cache/realtime reduction layer with a more standard and configurable query layer based on TanStack Query, while keeping `apiClient.ts` focused on transport, auth and refresh.

## Principles

1. `apiClient.ts` remains the low-level fetch/auth client.
2. Server state lives in TanStack Query, not in ad hoc screen code.
3. SSE only emits invalidation signals, not full domain payloads.
4. Query keys must be stable, serializable and derived from the resource shape.
5. Invalidations must be declarative, not hardcoded per screen.
6. Migration must be incremental: keep the app working at every step.

## Backend roadmap

### Phase 1: contract and key catalog

- [ ] Publish a single authoritative catalog of realtime invalidation keys.
- [ ] Map every existing resource mutation to the keys it invalidates.
- [ ] Decide which aggregates are first-class resources and which are derived UI state.
- [ ] Document resource ownership boundaries: campaign, mission, character, chat, profile, admin.
- [ ] Verify that each key is stable and not coupled to screen names.

### Phase 2: SSE consistency

- [ ] Keep SSE payloads minimal: `reason`, `keys`, `occurredAt`.
- [ ] Ensure `/api/v1/realtime/events` stays stable and authenticated.
- [ ] Add integration coverage for the invalidation stream.
- [ ] Verify reconnect and heartbeat behavior do not produce duplicate invalidations.

### Phase 3: mutation coverage

- [ ] Audit mission mutations and confirm they invalidate campaign-level and mission-level keys where needed.
- [ ] Audit campaign mutations and confirm they invalidate discover, campaign details and dependent lists.
- [ ] Audit character mutations and confirm they invalidate character lists, details and sheets.
- [ ] Audit chat mutations and confirm they invalidate chat-related keys only.
- [ ] Audit profile and realm mutations and confirm they invalidate user-scoped keys only.

### Backend acceptance criteria

- [ ] Every mutation publishes the smallest correct invalidation set.
- [ ] No mutation relies on frontend screen state to know what to invalidate.
- [ ] New resources can be added by extending the key catalog, not by changing the SSE transport.

## Frontend roadmap

### Phase 1: install the query core

- [x] Add TanStack Query to the project.
- [x] Create a single `QueryClient` instance.
- [x] Wrap the app with `QueryClientProvider`.
- [x] Set sane defaults for retries, stale time, refetch-on-focus, and cache time.
- [x] Keep `apiClient.ts` unchanged except for any needed fetch helpers.

### Phase 2: define query conventions

- [x] Define query key factories by domain: `profile`, `memberships`, `campaigns`, `missions`, `characters`, `chat`, `admin`.
- [x] Co-locate each key factory with the query function it identifies.
- [x] Standardize query key parameters so they include every variable used by the fetch.
- [x] Define a small wrapper around `apiClient.ts` for TanStack Query query functions.
- [x] Create the first query option module for bootstrap data.

### Phase 3: first migrations

- [x] Migrate the highest-churn reads first.
- [x] Migrate bootstrap reads: profile, memberships, realm permissions, post-login summary.
- [x] Migrate campaign reads: campaign details, members, rooms, missions, characters.
- [x] Extract bootstrap TanStack query orchestration out of `App.tsx` into a dedicated hook.
- [x] Extract campaign TanStack query orchestration out of `App.tsx` into a dedicated hook.
- [x] Migrate mission reads: mission participants and mission chat.
- [x] Migrate admin lists only after the core campaign flows are stable.

### Phase 4: SSE to query invalidation

- [x] Replace the custom invalidation dispatcher with a translation layer that maps SSE keys to query keys.
- [x] Invalidate active queries through `queryClient.invalidateQueries`.
- [x] Keep the mapping declarative and data-driven.
- [x] Avoid screen-specific invalidation logic unless a screen has a unique UI concern.
- [x] If a mutation affects multiple slices, invalidate all affected query keys from one place.

### Phase 5: mutations

- [x] Convert writes to `useMutation`.
- [x] Extract campaign application, invite access, and mission writes into `useCampaignMutations`.
- [x] Extract profile and admin write flows into dedicated mutation hooks.
- [x] Extract campaign creation, campaign editing, invite token creation, ownership transfer, and room creation into a command mutation hook.
- [x] Extract character create/edit/status/apply writes into a dedicated mutation hook.
- [x] Extract campaign member moderation writes into a dedicated mutation hook.
- [x] For each mutation, define its invalidation targets next to the mutation.
- [x] Add optimistic updates only where they remove real latency and are easy to reason about.
- [x] Prefer invalidation over optimistic updates for complex relational updates.

### Phase 6: cleanup

- [x] Remove the custom `scopedCache.ts` layer when the migrated queries cover the required screens.
- [x] Remove `cachedGateApi.ts` once its responsibilities are fully replaced.
- [x] Remove screen-specific cache priming and stale flags.
- [x] Keep `apiClient.ts` as the shared transport/auth module.

## Suggested migration order

1. Core query infrastructure.
2. Bootstrap data.
3. Campaign detail and mission views.
4. Character views and chat.
5. Admin views.
6. Mutation invalidation and optimistic updates.
7. Removal of the old cache layer.

## Implementation notes

- Use `apiClient.ts` for fetch, refresh token handling and header composition only.
- Use TanStack Query for caching, request deduplication, stale handling and invalidation.
- Use SSE as an invalidation trigger, not as a data transport.
- Keep query keys readable enough that invalidation debugging is obvious.
- Prefer a small number of shared utilities over one-off per-screen code.

## Definition of done

- [x] The FE no longer needs a custom cache registry for the migrated resources.
- [x] A backend invalidation event updates the correct query caches without per-screen switch logic.
- [x] Reopening a screen uses cached server state unless the relevant query is stale.
- [x] New endpoints can be added by defining a query key and a query function, not by wiring a new cache subsystem.
