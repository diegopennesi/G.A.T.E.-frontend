import { expect, test } from '@playwright/test'
import { QueryClient } from '@tanstack/react-query'
import { buildCampaignsForList } from './src/features/campaigns/utils/campaignListModel'
import { readOrFetchQuery } from './src/services/queryCache'
import { queryKeys } from './src/services/queryKeys'
import { applyRealtimeInvalidation, type RealtimeInvalidationActions, type RealtimeInvalidationState } from './src/services/realtimeInvalidation'
import { invalidateQueriesForResourceEvent } from './src/services/realtimeQueryInvalidation'
import type { ResourceInvalidationPayload } from './src/types/realtime'

type TestQuery<T> = {
  queryKey: readonly unknown[]
  queryFn: () => Promise<T>
}

const scope = { userId: 'user-1', realmCode: 'gate' }

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
      },
    },
  })
}

function countedQuery<T>(queryKey: readonly unknown[], values: T[]): TestQuery<T> & { calls: () => number } {
  let calls = 0
  return {
    queryKey,
    queryFn: async () => {
      const index = Math.min(calls, values.length - 1)
      calls += 1
      return values[index]
    },
    calls: () => calls,
  }
}

async function flushInvalidation() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function invalidate(queryClient: QueryClient, keys: string[], reason = 'test.invalidated') {
  const payload: ResourceInvalidationPayload = {
    reason,
    keys,
  }
  invalidateQueriesForResourceEvent(queryClient, payload, scope)
}

function createRealtimeState(overrides: Partial<RealtimeInvalidationState> = {}): RealtimeInvalidationState {
  return {
    screen: 'Profilo',
    campaignId: 'campaign-1',
    activeUserId: 'user-1',
    isSystemSession: false,
    systemAdminView: 'users',
    adminUsersPageIndex: 0,
    adminCampaignsPageIndex: 0,
    adminRealmsPageIndex: 0,
    ...overrides,
  }
}

function createRealtimeActions() {
  const calls: Record<string, unknown[]> = {}
  const push = (name: string, value: unknown = true) => {
    calls[name] = [...(calls[name] || []), value]
  }
  const actions: RealtimeInvalidationActions = {
    refreshProfile: async (options) => push('refreshProfile', options || {}),
    refreshPostLoginSummary: async (options) => push('refreshPostLoginSummary', options || {}),
    refreshCampaignBlock: async (options) => push('refreshCampaignBlock', options || {}),
    refreshCharacterBlock: async () => push('refreshCharacterBlock'),
    refreshMissions: async (options) => push('refreshMissions', options || {}),
    refreshMissionChat: async () => push('refreshMissionChat'),
    loadDiscoverableCampaigns: async (options) => push('loadDiscoverableCampaigns', options || {}),
    loadCharactersForManagement: async (options) => push('loadCharactersForManagement', options || {}),
    loadPendingForActiveCampaign: async (options) => push('loadPendingForActiveCampaign', options || {}),
    refreshPendingApplicationsForCampaign: async (campaignId) => push('refreshPendingApplicationsForCampaign', campaignId),
    loadAdminUsers: async (page, query) => push('loadAdminUsers', { page, query }),
    loadAdminCampaigns: async (page) => push('loadAdminCampaigns', { page }),
    loadAdminRealms: async (page, query) => push('loadAdminRealms', { page, query }),
    loadAdminRealmUserRoles: async (realmId) => push('loadAdminRealmUserRoles', { realmId }),
    loadAdminSheetCatalogs: async () => push('loadAdminSheetCatalogs'),
    clearActiveCampaignContext: () => push('clearActiveCampaignContext'),
  }
  return { actions, calls }
}

async function applyRealtime(keys: string[], state: Partial<RealtimeInvalidationState> = {}) {
  const { actions, calls } = createRealtimeActions()
  applyRealtimeInvalidation(
    {
      reason: 'test.invalidated',
      keys,
    },
    createRealtimeState(state),
    actions,
  )
  await flushInvalidation()
  return calls
}

test('campaign list model drops inactive campaigns even when they still exist in local membership data', async () => {
  const result = buildCampaignsForList({
    discoverableCampaigns: [
      {
        id: 'campaign-a',
        name: 'Campagna A',
        description: null,
        summary: null,
        coverImageUrl: null,
        founderId: 'founder-a',
        isOpen: true,
        isActive: true,
        isSearchable: true,
        autoJoinEnabled: false,
        createdAt: '2026-07-17T00:00:00Z',
        membershipStatus: null,
        membershipRole: null,
        moderationReason: null,
      },
      {
        id: 'campaign-b',
        name: 'Campagna B',
        description: null,
        summary: null,
        coverImageUrl: null,
        founderId: 'founder-b',
        isOpen: true,
        isActive: false,
        isSearchable: true,
        autoJoinEnabled: false,
        createdAt: '2026-07-17T00:00:00Z',
        membershipStatus: null,
        membershipRole: null,
        moderationReason: null,
      },
    ],
    myCampaigns: [
      {
        campaignId: 'campaign-c',
        campaignName: 'Campagna C',
        role: 'GIOCATORE',
        memberStatus: 'APPROVED',
        characterStatus: null,
        moderationReason: null,
        isFounder: false,
      },
    ],
    campaignDetailsById: {
      'campaign-c': {
        id: 'campaign-c',
        name: 'Campagna C',
        description: null,
        summary: null,
        setting: null,
        tone: null,
        rules: null,
        requirements: null,
        coverImageUrl: null,
        founderId: 'founder-c',
        isOpen: true,
        isActive: false,
        isSearchable: true,
        autoJoinEnabled: false,
        gameSystem: 'DND5E',
        allowedModules: [],
        createdAt: '2026-07-17T00:00:00Z',
        inviteCode: 'inv-1',
      },
    },
  })

  expect(result.map((item) => item.id)).toEqual(['campaign-a'])
})

test('cache-first read calls BE once and then reuses TanStack cache', async () => {
  const queryClient = createTestQueryClient()
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), [
    'missions-from-be',
    'missions-should-not-be-used',
  ])

  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-from-be')
  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-from-be')

  expect(missions.calls()).toBe(1)
})

test('invalidated query refetches once, then returns to cache-first behavior', async () => {
  const queryClient = createTestQueryClient()
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), [
    'missions-v1',
    'missions-v2',
    'missions-should-not-be-used',
  ])

  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v1')

  invalidate(queryClient, ['campaigns:campaign-1:missions'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v2')
  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v2')

  expect(missions.calls()).toBe(2)
})

test('mission invalidation refetches missions but keeps characters and rooms cached', async () => {
  const queryClient = createTestQueryClient()
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])
  const characters = countedQuery(queryKeys.campaignCharacters('campaign-1'), ['characters-v1', 'characters-v2'])
  const rooms = countedQuery(queryKeys.campaignRooms('campaign-1'), ['rooms-v1', 'rooms-v2'])

  await readOrFetchQuery(queryClient, missions)
  await readOrFetchQuery(queryClient, characters)
  await readOrFetchQuery(queryClient, rooms)

  invalidate(queryClient, ['campaigns:campaign-1:missions'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v2')
  await expect(readOrFetchQuery(queryClient, characters)).resolves.toBe('characters-v1')
  await expect(readOrFetchQuery(queryClient, rooms)).resolves.toBe('rooms-v1')

  expect(missions.calls()).toBe(2)
  expect(characters.calls()).toBe(1)
  expect(rooms.calls()).toBe(1)
})

test('participant invalidation refetches only the participant slice', async () => {
  const queryClient = createTestQueryClient()
  const missionList = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])
  const participants = countedQuery(queryKeys.missionParticipants('campaign-1', 'mission-1'), [
    'participants-v1',
    'participants-v2',
  ])

  await readOrFetchQuery(queryClient, missionList)
  await readOrFetchQuery(queryClient, participants)

  invalidate(queryClient, ['campaigns:campaign-1:missions:mission-1:participants'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, participants)).resolves.toBe('participants-v2')
  await expect(readOrFetchQuery(queryClient, missionList)).resolves.toBe('missions-v1')

  expect(participants.calls()).toBe(2)
  expect(missionList.calls()).toBe(1)
})

test('pending applications invalidation refetches access requests without refetching members', async () => {
  const queryClient = createTestQueryClient()
  const pending = countedQuery(queryKeys.campaignPendingApplications('campaign-1'), ['pending-v1', 'pending-v2'])
  const members = countedQuery(queryKeys.campaignMembers('campaign-1'), ['members-v1', 'members-v2'])
  const membersManagement = countedQuery(queryKeys.campaignMembersForManagement('campaign-1'), [
    'members-management-v1',
    'members-management-v2',
  ])

  await readOrFetchQuery(queryClient, pending)
  await readOrFetchQuery(queryClient, members)
  await readOrFetchQuery(queryClient, membersManagement)

  invalidate(queryClient, ['campaigns:campaign-1:pending-applications'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, pending)).resolves.toBe('pending-v2')
  await expect(readOrFetchQuery(queryClient, members)).resolves.toBe('members-v1')
  await expect(readOrFetchQuery(queryClient, membersManagement)).resolves.toBe('members-management-v1')

  expect(pending.calls()).toBe(2)
  expect(members.calls()).toBe(1)
  expect(membersManagement.calls()).toBe(1)
})

test('discover invalidation refreshes campaign discovery and landing summary, not profile', async () => {
  const queryClient = createTestQueryClient()
  const bootstrapDiscover = countedQuery([...queryKeys.bootstrap(scope), 'discover-campaigns', { openOnly: false }], [
    'discover-v1',
    'discover-v2',
  ])
  const standaloneDiscover = countedQuery(queryKeys.discoverCampaigns(false), ['standalone-discover-v1', 'standalone-discover-v2'])
  const postLoginSummary = countedQuery([...queryKeys.bootstrap(scope), 'post-login-summary'], ['summary-v1', 'summary-v2'])
  const profile = countedQuery([...queryKeys.bootstrap(scope), 'profile'], ['profile-v1', 'profile-v2'])

  await readOrFetchQuery(queryClient, bootstrapDiscover)
  await readOrFetchQuery(queryClient, standaloneDiscover)
  await readOrFetchQuery(queryClient, postLoginSummary)
  await readOrFetchQuery(queryClient, profile)

  invalidate(queryClient, ['campaigns:discover'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, bootstrapDiscover)).resolves.toBe('discover-v2')
  await expect(readOrFetchQuery(queryClient, standaloneDiscover)).resolves.toBe('standalone-discover-v2')
  await expect(readOrFetchQuery(queryClient, postLoginSummary)).resolves.toBe('summary-v2')
  await expect(readOrFetchQuery(queryClient, profile)).resolves.toBe('profile-v1')

  expect(bootstrapDiscover.calls()).toBe(2)
  expect(standaloneDiscover.calls()).toBe(2)
  expect(postLoginSummary.calls()).toBe(2)
  expect(profile.calls()).toBe(1)
})

test('campaign deactivation realtime invalidation clears the active campaign context', async () => {
  const { actions, calls } = createRealtimeActions()
  applyRealtimeInvalidation(
    {
      reason: 'campaign.deactivated',
      keys: ['campaigns:campaign-1', 'campaigns:discover'],
      occurredAt: new Date().toISOString(),
    },
    createRealtimeState({ screen: 'Scheda Campagna' }),
    actions,
  )
  await flushInvalidation()

  expect(calls.clearActiveCampaignContext).toHaveLength(1)
  expect(calls.refreshCampaignBlock || []).toHaveLength(0)
  expect(calls.loadDiscoverableCampaigns || []).toHaveLength(0)
})

test('campaign deactivation invalidation refreshes bootstrap discovery and landing summary', async () => {
  const queryClient = createTestQueryClient()
  const bootstrapDiscover = countedQuery([...queryKeys.bootstrap(scope), 'discover-campaigns', { openOnly: false }], [
    'discover-v1',
    'discover-v2',
  ])
  const standaloneDiscover = countedQuery(queryKeys.discoverCampaigns(false), ['standalone-discover-v1', 'standalone-discover-v2'])
  const postLoginSummary = countedQuery([...queryKeys.bootstrap(scope), 'post-login-summary'], ['summary-v1', 'summary-v2'])

  await readOrFetchQuery(queryClient, bootstrapDiscover)
  await readOrFetchQuery(queryClient, standaloneDiscover)
  await readOrFetchQuery(queryClient, postLoginSummary)

  invalidate(queryClient, ['campaigns:campaign-1'], 'campaign.deactivated')
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, bootstrapDiscover)).resolves.toBe('discover-v2')
  await expect(readOrFetchQuery(queryClient, standaloneDiscover)).resolves.toBe('standalone-discover-v2')
  await expect(readOrFetchQuery(queryClient, postLoginSummary)).resolves.toBe('summary-v2')

  expect(bootstrapDiscover.calls()).toBe(2)
  expect(standaloneDiscover.calls()).toBe(2)
  expect(postLoginSummary.calls()).toBe(2)
})

test('current user profile invalidation refreshes own bootstrap data without touching campaign details', async () => {
  const queryClient = createTestQueryClient()
  const profile = countedQuery([...queryKeys.bootstrap(scope), 'profile'], ['profile-v1', 'profile-v2'])
  const memberships = countedQuery([...queryKeys.bootstrap(scope), 'memberships'], ['memberships-v1', 'memberships-v2'])
  const publicProfile = countedQuery(queryKeys.publicProfile('user-1'), ['public-profile-v1', 'public-profile-v2'])
  const campaignDetails = countedQuery(queryKeys.campaignDetails('campaign-1'), ['details-v1', 'details-v2'])

  await readOrFetchQuery(queryClient, profile)
  await readOrFetchQuery(queryClient, memberships)
  await readOrFetchQuery(queryClient, publicProfile)
  await readOrFetchQuery(queryClient, campaignDetails)

  invalidate(queryClient, ['users:user-1:profile'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, profile)).resolves.toBe('profile-v2')
  await expect(readOrFetchQuery(queryClient, memberships)).resolves.toBe('memberships-v2')
  await expect(readOrFetchQuery(queryClient, publicProfile)).resolves.toBe('public-profile-v2')
  await expect(readOrFetchQuery(queryClient, campaignDetails)).resolves.toBe('details-v1')

  expect(profile.calls()).toBe(2)
  expect(memberships.calls()).toBe(2)
  expect(publicProfile.calls()).toBe(2)
  expect(campaignDetails.calls()).toBe(1)
})

test('mission invalidation is isolated to the target campaign', async () => {
  const queryClient = createTestQueryClient()
  const campaignOneMissions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), [
    'campaign-1-missions-v1',
    'campaign-1-missions-v2',
  ])
  const campaignTwoMissions = countedQuery(queryKeys.campaignMissions('campaign-2', '2026-01-01'), [
    'campaign-2-missions-v1',
    'campaign-2-missions-v2',
  ])

  await readOrFetchQuery(queryClient, campaignOneMissions)
  await readOrFetchQuery(queryClient, campaignTwoMissions)

  invalidate(queryClient, ['campaigns:campaign-1:missions'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, campaignOneMissions)).resolves.toBe('campaign-1-missions-v2')
  await expect(readOrFetchQuery(queryClient, campaignTwoMissions)).resolves.toBe('campaign-2-missions-v1')

  expect(campaignOneMissions.calls()).toBe(2)
  expect(campaignTwoMissions.calls()).toBe(1)
})

test('mission list invalidation refreshes every since-window list for that campaign', async () => {
  const queryClient = createTestQueryClient()
  const currentWindow = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), [
    'current-window-v1',
    'current-window-v2',
  ])
  const olderWindow = countedQuery(queryKeys.campaignMissions('campaign-1', '2025-01-01'), [
    'older-window-v1',
    'older-window-v2',
  ])
  const participants = countedQuery(queryKeys.missionParticipants('campaign-1', 'mission-1'), [
    'participants-v1',
    'participants-v2',
  ])

  await readOrFetchQuery(queryClient, currentWindow)
  await readOrFetchQuery(queryClient, olderWindow)
  await readOrFetchQuery(queryClient, participants)

  invalidate(queryClient, ['campaigns:campaign-1:missions'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, currentWindow)).resolves.toBe('current-window-v2')
  await expect(readOrFetchQuery(queryClient, olderWindow)).resolves.toBe('older-window-v2')
  await expect(readOrFetchQuery(queryClient, participants)).resolves.toBe('participants-v1')

  expect(currentWindow.calls()).toBe(2)
  expect(olderWindow.calls()).toBe(2)
  expect(participants.calls()).toBe(1)
})

test('other user profile invalidation does not refresh current bootstrap data', async () => {
  const queryClient = createTestQueryClient()
  const profile = countedQuery([...queryKeys.bootstrap(scope), 'profile'], ['profile-v1', 'profile-v2'])
  const memberships = countedQuery([...queryKeys.bootstrap(scope), 'memberships'], ['memberships-v1', 'memberships-v2'])
  const currentPublicProfile = countedQuery(queryKeys.publicProfile('user-1'), ['current-public-v1', 'current-public-v2'])
  const otherPublicProfile = countedQuery(queryKeys.publicProfile('user-2'), ['other-public-v1', 'other-public-v2'])

  await readOrFetchQuery(queryClient, profile)
  await readOrFetchQuery(queryClient, memberships)
  await readOrFetchQuery(queryClient, currentPublicProfile)
  await readOrFetchQuery(queryClient, otherPublicProfile)

  invalidate(queryClient, ['users:user-2:profile'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, profile)).resolves.toBe('profile-v1')
  await expect(readOrFetchQuery(queryClient, memberships)).resolves.toBe('memberships-v1')
  await expect(readOrFetchQuery(queryClient, currentPublicProfile)).resolves.toBe('current-public-v1')
  await expect(readOrFetchQuery(queryClient, otherPublicProfile)).resolves.toBe('other-public-v2')

  expect(profile.calls()).toBe(1)
  expect(memberships.calls()).toBe(1)
  expect(currentPublicProfile.calls()).toBe(1)
  expect(otherPublicProfile.calls()).toBe(2)
})

test('broad campaign key refreshes campaign details only', async () => {
  const queryClient = createTestQueryClient()
  const details = countedQuery(queryKeys.campaignDetails('campaign-1'), ['details-v1', 'details-v2'])
  const members = countedQuery(queryKeys.campaignMembers('campaign-1'), ['members-v1', 'members-v2'])
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])

  await readOrFetchQuery(queryClient, details)
  await readOrFetchQuery(queryClient, members)
  await readOrFetchQuery(queryClient, missions)

  invalidate(queryClient, ['campaigns:campaign-1'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, details)).resolves.toBe('details-v2')
  await expect(readOrFetchQuery(queryClient, members)).resolves.toBe('members-v1')
  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v1')

  expect(details.calls()).toBe(2)
  expect(members.calls()).toBe(1)
  expect(missions.calls()).toBe(1)
})

test('character sheet invalidation does not refetch character list or detail', async () => {
  const queryClient = createTestQueryClient()
  const characters = countedQuery(queryKeys.campaignCharacters('campaign-1'), ['characters-v1', 'characters-v2'])
  const detail = countedQuery(queryKeys.campaignCharacterDetail('campaign-1', 'character-1'), ['detail-v1', 'detail-v2'])
  const sheet = countedQuery(queryKeys.campaignCharacterSheet('campaign-1', 'character-1'), ['sheet-v1', 'sheet-v2'])

  await readOrFetchQuery(queryClient, characters)
  await readOrFetchQuery(queryClient, detail)
  await readOrFetchQuery(queryClient, sheet)

  invalidate(queryClient, ['campaigns:campaign-1:characters:character-1:sheet'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, characters)).resolves.toBe('characters-v1')
  await expect(readOrFetchQuery(queryClient, detail)).resolves.toBe('detail-v1')
  await expect(readOrFetchQuery(queryClient, sheet)).resolves.toBe('sheet-v2')

  expect(characters.calls()).toBe(1)
  expect(detail.calls()).toBe(1)
  expect(sheet.calls()).toBe(2)
})

test('mission chat invalidation does not refetch participants or mission lists', async () => {
  const queryClient = createTestQueryClient()
  const missionList = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])
  const participants = countedQuery(queryKeys.missionParticipants('campaign-1', 'mission-1'), [
    'participants-v1',
    'participants-v2',
  ])
  const chat = countedQuery(queryKeys.campaignChat('campaign-1', 'mission-1'), ['chat-v1', 'chat-v2'])

  await readOrFetchQuery(queryClient, missionList)
  await readOrFetchQuery(queryClient, participants)
  await readOrFetchQuery(queryClient, chat)

  invalidate(queryClient, ['campaigns:campaign-1:missions:mission-1:chat'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, missionList)).resolves.toBe('missions-v1')
  await expect(readOrFetchQuery(queryClient, participants)).resolves.toBe('participants-v1')
  await expect(readOrFetchQuery(queryClient, chat)).resolves.toBe('chat-v2')

  expect(missionList.calls()).toBe(1)
  expect(participants.calls()).toBe(1)
  expect(chat.calls()).toBe(2)
})

test('admin catalogs invalidation refreshes both catalog slices without touching campaign game systems', async () => {
  const queryClient = createTestQueryClient()
  const adminGameSystems = countedQuery(queryKeys.adminGameSystems(), ['admin-game-systems-v1', 'admin-game-systems-v2'])
  const adminSheetTypes = countedQuery(queryKeys.adminSheetTypes(), ['admin-sheet-types-v1', 'admin-sheet-types-v2'])
  const campaignGameSystems = countedQuery(queryKeys.campaignGameSystems(), ['campaign-game-systems-v1', 'campaign-game-systems-v2'])

  await readOrFetchQuery(queryClient, adminGameSystems)
  await readOrFetchQuery(queryClient, adminSheetTypes)
  await readOrFetchQuery(queryClient, campaignGameSystems)

  invalidate(queryClient, ['admin:catalogs'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, adminGameSystems)).resolves.toBe('admin-game-systems-v2')
  await expect(readOrFetchQuery(queryClient, adminSheetTypes)).resolves.toBe('admin-sheet-types-v2')
  await expect(readOrFetchQuery(queryClient, campaignGameSystems)).resolves.toBe('campaign-game-systems-v1')

  expect(adminGameSystems.calls()).toBe(2)
  expect(adminSheetTypes.calls()).toBe(2)
  expect(campaignGameSystems.calls()).toBe(1)
})

test('campaign game systems invalidation does not refetch admin catalogs', async () => {
  const queryClient = createTestQueryClient()
  const adminGameSystems = countedQuery(queryKeys.adminGameSystems(), ['admin-game-systems-v1', 'admin-game-systems-v2'])
  const campaignGameSystems = countedQuery(queryKeys.campaignGameSystems(), ['campaign-game-systems-v1', 'campaign-game-systems-v2'])

  await readOrFetchQuery(queryClient, adminGameSystems)
  await readOrFetchQuery(queryClient, campaignGameSystems)

  invalidate(queryClient, ['campaign-game-systems'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, adminGameSystems)).resolves.toBe('admin-game-systems-v1')
  await expect(readOrFetchQuery(queryClient, campaignGameSystems)).resolves.toBe('campaign-game-systems-v2')

  expect(adminGameSystems.calls()).toBe(1)
  expect(campaignGameSystems.calls()).toBe(2)
})

test('unknown realtime keys and null scopes do not invalidate cached data', async () => {
  const queryClient = createTestQueryClient()
  const details = countedQuery(queryKeys.campaignDetails('campaign-1'), ['details-v1', 'details-v2'])
  const profile = countedQuery([...queryKeys.bootstrap(scope), 'profile'], ['profile-v1', 'profile-v2'])

  await readOrFetchQuery(queryClient, details)
  await readOrFetchQuery(queryClient, profile)

  invalidate(queryClient, ['campaigns:campaign-1:unknown-resource', 'not-a-real-key'])
  invalidateQueriesForResourceEvent(
    queryClient,
    { reason: 'test.null-scope', keys: ['campaigns:campaign-1:details', 'users:user-1:profile'] },
    null,
  )
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, details)).resolves.toBe('details-v1')
  await expect(readOrFetchQuery(queryClient, profile)).resolves.toBe('profile-v1')

  expect(details.calls()).toBe(1)
  expect(profile.calls()).toBe(1)
})

test('player mission invalidation does not refetch master-only campaign management slices', async () => {
  const queryClient = createTestQueryClient()
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])
  const participants = countedQuery(queryKeys.missionParticipants('campaign-1', 'mission-1'), [
    'participants-v1',
    'participants-v2',
  ])
  const pending = countedQuery(queryKeys.campaignPendingApplications('campaign-1'), ['pending-v1', 'pending-v2'])
  const membersManagement = countedQuery(queryKeys.campaignMembersForManagement('campaign-1'), [
    'members-management-v1',
    'members-management-v2',
  ])
  const managePermission = countedQuery(queryKeys.campaignPermission('campaign-1', 'MANAGE_CAMPAIGN_SETTINGS'), [
    'manage-permission-v1',
    'manage-permission-v2',
  ])

  await readOrFetchQuery(queryClient, missions)
  await readOrFetchQuery(queryClient, participants)
  await readOrFetchQuery(queryClient, pending)
  await readOrFetchQuery(queryClient, membersManagement)
  await readOrFetchQuery(queryClient, managePermission)

  invalidate(queryClient, [
    'campaigns:campaign-1:missions',
    'campaigns:campaign-1:missions:mission-1:participants',
  ])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v2')
  await expect(readOrFetchQuery(queryClient, participants)).resolves.toBe('participants-v2')
  await expect(readOrFetchQuery(queryClient, pending)).resolves.toBe('pending-v1')
  await expect(readOrFetchQuery(queryClient, membersManagement)).resolves.toBe('members-management-v1')
  await expect(readOrFetchQuery(queryClient, managePermission)).resolves.toBe('manage-permission-v1')

  expect(missions.calls()).toBe(2)
  expect(participants.calls()).toBe(2)
  expect(pending.calls()).toBe(1)
  expect(membersManagement.calls()).toBe(1)
  expect(managePermission.calls()).toBe(1)
})

test('permission invalidation refreshes only the specific permission action', async () => {
  const queryClient = createTestQueryClient()
  const manageSettings = countedQuery(queryKeys.campaignPermission('campaign-1', 'MANAGE_CAMPAIGN_SETTINGS'), [
    'manage-settings-v1',
    'manage-settings-v2',
  ])
  const approveAccess = countedQuery(queryKeys.campaignPermission('campaign-1', 'APPROVE_OR_REJECT_APPLICATIONS'), [
    'approve-access-v1',
    'approve-access-v2',
  ])
  const createRoom = countedQuery(queryKeys.campaignPermission('campaign-1', 'CREATE_ROOM'), [
    'create-room-v1',
    'create-room-v2',
  ])

  await readOrFetchQuery(queryClient, manageSettings)
  await readOrFetchQuery(queryClient, approveAccess)
  await readOrFetchQuery(queryClient, createRoom)

  invalidate(queryClient, ['campaigns:campaign-1:permissions:APPROVE_OR_REJECT_APPLICATIONS'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, manageSettings)).resolves.toBe('manage-settings-v1')
  await expect(readOrFetchQuery(queryClient, approveAccess)).resolves.toBe('approve-access-v2')
  await expect(readOrFetchQuery(queryClient, createRoom)).resolves.toBe('create-room-v1')

  expect(manageSettings.calls()).toBe(1)
  expect(approveAccess.calls()).toBe(2)
  expect(createRoom.calls()).toBe(1)
})

test('broad permission invalidation refreshes all permission actions for that campaign only', async () => {
  const queryClient = createTestQueryClient()
  const campaignOneManage = countedQuery(queryKeys.campaignPermission('campaign-1', 'MANAGE_CAMPAIGN_SETTINGS'), [
    'campaign-1-manage-v1',
    'campaign-1-manage-v2',
  ])
  const campaignOneApprove = countedQuery(queryKeys.campaignPermission('campaign-1', 'APPROVE_OR_REJECT_APPLICATIONS'), [
    'campaign-1-approve-v1',
    'campaign-1-approve-v2',
  ])
  const campaignTwoManage = countedQuery(queryKeys.campaignPermission('campaign-2', 'MANAGE_CAMPAIGN_SETTINGS'), [
    'campaign-2-manage-v1',
    'campaign-2-manage-v2',
  ])

  await readOrFetchQuery(queryClient, campaignOneManage)
  await readOrFetchQuery(queryClient, campaignOneApprove)
  await readOrFetchQuery(queryClient, campaignTwoManage)

  invalidate(queryClient, ['campaigns:campaign-1:permissions'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, campaignOneManage)).resolves.toBe('campaign-1-manage-v2')
  await expect(readOrFetchQuery(queryClient, campaignOneApprove)).resolves.toBe('campaign-1-approve-v2')
  await expect(readOrFetchQuery(queryClient, campaignTwoManage)).resolves.toBe('campaign-2-manage-v1')

  expect(campaignOneManage.calls()).toBe(2)
  expect(campaignOneApprove.calls()).toBe(2)
  expect(campaignTwoManage.calls()).toBe(1)
})

test('system admin campaigns invalidation refreshes only admin campaign pages', async () => {
  const queryClient = createTestQueryClient()
  const adminCampaignsPageZero = countedQuery(queryKeys.adminCampaigns(0), ['admin-campaigns-page-0-v1', 'admin-campaigns-page-0-v2'])
  const adminCampaignsPageOne = countedQuery(queryKeys.adminCampaigns(1), ['admin-campaigns-page-1-v1', 'admin-campaigns-page-1-v2'])
  const adminUsers = countedQuery(queryKeys.adminUsers(0), ['admin-users-v1', 'admin-users-v2'])
  const campaignDetails = countedQuery(queryKeys.campaignDetails('campaign-1'), ['details-v1', 'details-v2'])
  const discover = countedQuery([...queryKeys.bootstrap(scope), 'discover-campaigns', { openOnly: false }], [
    'discover-v1',
    'discover-v2',
  ])

  await readOrFetchQuery(queryClient, adminCampaignsPageZero)
  await readOrFetchQuery(queryClient, adminCampaignsPageOne)
  await readOrFetchQuery(queryClient, adminUsers)
  await readOrFetchQuery(queryClient, campaignDetails)
  await readOrFetchQuery(queryClient, discover)

  invalidate(queryClient, ['admin:campaigns'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, adminCampaignsPageZero)).resolves.toBe('admin-campaigns-page-0-v2')
  await expect(readOrFetchQuery(queryClient, adminCampaignsPageOne)).resolves.toBe('admin-campaigns-page-1-v2')
  await expect(readOrFetchQuery(queryClient, adminUsers)).resolves.toBe('admin-users-v1')
  await expect(readOrFetchQuery(queryClient, campaignDetails)).resolves.toBe('details-v1')
  await expect(readOrFetchQuery(queryClient, discover)).resolves.toBe('discover-v1')

  expect(adminCampaignsPageZero.calls()).toBe(2)
  expect(adminCampaignsPageOne.calls()).toBe(2)
  expect(adminUsers.calls()).toBe(1)
  expect(campaignDetails.calls()).toBe(1)
  expect(discover.calls()).toBe(1)
})

test('system campaign update invalidates admin list, public discovery and campaign details without touching members', async () => {
  const queryClient = createTestQueryClient()
  const adminCampaigns = countedQuery(queryKeys.adminCampaigns(0), ['admin-campaigns-v1', 'admin-campaigns-v2'])
  const discover = countedQuery([...queryKeys.bootstrap(scope), 'discover-campaigns', { openOnly: false }], [
    'discover-v1',
    'discover-v2',
  ])
  const summary = countedQuery([...queryKeys.bootstrap(scope), 'post-login-summary'], ['summary-v1', 'summary-v2'])
  const details = countedQuery(queryKeys.campaignDetails('campaign-1'), ['details-v1', 'details-v2'])
  const members = countedQuery(queryKeys.campaignMembers('campaign-1'), ['members-v1', 'members-v2'])
  const missions = countedQuery(queryKeys.campaignMissions('campaign-1', '2026-01-01'), ['missions-v1', 'missions-v2'])

  await readOrFetchQuery(queryClient, adminCampaigns)
  await readOrFetchQuery(queryClient, discover)
  await readOrFetchQuery(queryClient, summary)
  await readOrFetchQuery(queryClient, details)
  await readOrFetchQuery(queryClient, members)
  await readOrFetchQuery(queryClient, missions)

  invalidate(queryClient, ['admin:campaigns', 'campaigns:discover', 'campaigns:campaign-1:details'])
  await flushInvalidation()

  await expect(readOrFetchQuery(queryClient, adminCampaigns)).resolves.toBe('admin-campaigns-v2')
  await expect(readOrFetchQuery(queryClient, discover)).resolves.toBe('discover-v2')
  await expect(readOrFetchQuery(queryClient, summary)).resolves.toBe('summary-v2')
  await expect(readOrFetchQuery(queryClient, details)).resolves.toBe('details-v2')
  await expect(readOrFetchQuery(queryClient, members)).resolves.toBe('members-v1')
  await expect(readOrFetchQuery(queryClient, missions)).resolves.toBe('missions-v1')

  expect(adminCampaigns.calls()).toBe(2)
  expect(discover.calls()).toBe(2)
  expect(summary.calls()).toBe(2)
  expect(details.calls()).toBe(2)
  expect(members.calls()).toBe(1)
  expect(missions.calls()).toBe(1)
})

test('access request realtime event updates active campaign pending badge bridge outside approval tab', async () => {
  const calls = await applyRealtime(['campaigns:campaign-1:pending-applications'], {
    screen: 'Missioni',
    campaignId: 'campaign-1',
  })

  expect(calls.refreshPendingApplicationsForCampaign).toEqual(['campaign-1'])
  expect(calls.loadPendingForActiveCampaign).toEqual([{}])
  expect(calls.refreshMissions).toBeUndefined()
})

test('mission realtime event updates missions bridge when missions screen is open', async () => {
  const calls = await applyRealtime(['campaigns:campaign-1:missions'], {
    screen: 'Missioni',
    campaignId: 'campaign-1',
  })

  expect(calls.refreshMissions).toEqual([{ clearSelection: true }])
  expect(calls.loadPendingForActiveCampaign).toBeUndefined()
  expect(calls.refreshCampaignBlock).toBeUndefined()
})

test('discover realtime event updates landing bridge while user is on landing page', async () => {
  const calls = await applyRealtime(['campaigns:discover'], {
    screen: 'Ingresso',
  })

  expect(calls.refreshPostLoginSummary).toEqual([{}])
  expect(calls.loadDiscoverableCampaigns).toBeUndefined()
  expect(calls.refreshProfile).toBeUndefined()
})
