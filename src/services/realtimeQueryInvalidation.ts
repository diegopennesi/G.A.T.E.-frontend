import type { QueryClient } from '@tanstack/react-query'
import type { ResourceInvalidationPayload } from '../types/realtime'
import { queryKeys } from './queryKeys'

type BootstrapScope = { userId: string; realmCode?: string | null }

function normalizeRealmCode(value?: string | null): string {
  return value?.trim().toLowerCase() || ''
}

function parseCampaignId(key: string): string | null {
  const match = key.match(/^campaigns:([^:]+)(?::.*)?$/)
  return match?.[1]?.trim() || null
}

function parseCampaignKey(key: string): string[] | null {
  if (!key.startsWith('campaigns:')) return null
  return key.split(':')
}

function parseUserId(key: string): string | null {
  const match = key.match(/^users:([^:]+):profile$/)
  return match?.[1]?.trim() || null
}

function invalidateBootstrapProfile(queryClient: QueryClient, scope: BootstrapScope) {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.bootstrap(scope), 'profile'], exact: true })
}

function invalidateBootstrapMemberships(queryClient: QueryClient, scope: BootstrapScope) {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.bootstrap(scope), 'memberships'], exact: true })
}

function invalidateBootstrapPostLoginSummary(queryClient: QueryClient, scope: BootstrapScope) {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.bootstrap(scope), 'post-login-summary'], exact: true })
}

function invalidateBootstrapDiscoverCampaigns(queryClient: QueryClient, scope: BootstrapScope) {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.bootstrap(scope), 'discover-campaigns'], exact: false })
}

function invalidateDiscoverCampaigns(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['discover-campaigns'], exact: false })
}

function invalidateCampaignMissionLists(queryClient: QueryClient, campaignId: string) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey
      return key[0] === 'campaigns' && key[1] === campaignId && key[2] === 'missions' && key.length === 4
    },
  })
}

function invalidateAdmin(queryClient: QueryClient, root: 'users' | 'campaigns' | 'realms' | 'realm-user-roles' | 'catalogs') {
  void queryClient.invalidateQueries({ queryKey: ['admin', root], exact: false })
}

function invalidatePublicProfile(queryClient: QueryClient, userId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(userId), exact: false })
}

function invalidateCampaignKey(queryClient: QueryClient, key: string) {
  const parts = parseCampaignKey(key)
  if (!parts) return

  const campaignId = parseCampaignId(key)
  if (!campaignId || campaignId === 'discover') return

  const resource = parts[2]
  if (!resource) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaignDetails(campaignId), exact: true })
    return
  }

  switch (resource) {
    case 'details':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignDetails(campaignId), exact: true })
      break
    case 'members':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId), exact: true })
      break
    case 'members-management':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembersForManagement(campaignId), exact: true })
      break
    case 'member':
      if (parts[3]) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignMember(campaignId, parts[3]), exact: true })
      }
      break
    case 'pending-applications':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignPendingApplications(campaignId), exact: true })
      break
    case 'characters':
      if (!parts[3]) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacters(campaignId), exact: true })
        break
      }
      if (parts[4] === 'detail') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacterDetail(campaignId, parts[3]), exact: true })
      }
      if (parts[4] === 'sheet') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacterSheet(campaignId, parts[3]), exact: true })
      }
      if (parts[4] === 'sheet-history') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacterSheetHistory(campaignId, parts[3]), exact: true })
      }
      break
    case 'sheet-reviews':
      if (parts[3] === 'pending') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignPendingSheetReviews(campaignId), exact: true })
      }
      break
    case 'missions':
      if (!parts[3]) {
        invalidateCampaignMissionLists(queryClient, campaignId)
        break
      }
      if (parts[4] === 'participants') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(campaignId, parts[3]), exact: true })
      }
      if (parts[4] === 'chat') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignChat(campaignId, parts[3]), exact: true })
      }
      break
    case 'chat':
      void queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'chat'], exact: false })
      break
    case 'rooms':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignRooms(campaignId), exact: true })
      break
    case 'permissions':
      if (parts[3]) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignPermission(campaignId, parts[3]), exact: true })
      } else {
        void queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'permissions'], exact: false })
      }
      break
    case 'invite-tokens':
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaignInviteTokens(campaignId), exact: true })
      break
    default:
      break
  }
}

export function invalidateQueriesForResourceEvent(
  queryClient: QueryClient,
  payload: ResourceInvalidationPayload,
  scope: BootstrapScope | null,
) {
  const normalizedScope = scope
    ? { userId: scope.userId.trim(), realmCode: normalizeRealmCode(scope.realmCode) }
    : null

  if (!normalizedScope) return

  const keys = new Set(payload.keys)
  const campaignDeactivated = payload.reason === 'campaign.deactivated'

  if (campaignDeactivated) {
    invalidateBootstrapDiscoverCampaigns(queryClient, normalizedScope)
    invalidateBootstrapPostLoginSummary(queryClient, normalizedScope)
    invalidateDiscoverCampaigns(queryClient)
  }

  if (keys.has('campaigns:discover')) {
    invalidateBootstrapDiscoverCampaigns(queryClient, normalizedScope)
    invalidateBootstrapPostLoginSummary(queryClient, normalizedScope)
    invalidateDiscoverCampaigns(queryClient)
  }

  for (const key of payload.keys) {
    if (key.startsWith('users:') && key.endsWith(':profile')) {
      const userId = parseUserId(key)
      if (userId) {
        if (userId === normalizedScope.userId) {
          invalidateBootstrapProfile(queryClient, normalizedScope)
          invalidateBootstrapMemberships(queryClient, normalizedScope)
          invalidateBootstrapPostLoginSummary(queryClient, normalizedScope)
        }
        invalidatePublicProfile(queryClient, userId)
      }
      continue
    }

    if (key.startsWith('campaigns:')) {
      invalidateCampaignKey(queryClient, key)
      continue
    }

    switch (key) {
      case 'campaign-game-systems':
        void queryClient.invalidateQueries({ queryKey: queryKeys.campaignGameSystems(), exact: true })
        break
      case 'admin:users':
        invalidateAdmin(queryClient, 'users')
        break
      case 'admin:campaigns':
        invalidateAdmin(queryClient, 'campaigns')
        break
      case 'admin:realms':
        invalidateAdmin(queryClient, 'realms')
        break
      case 'admin:realm-user-roles':
        invalidateAdmin(queryClient, 'realm-user-roles')
        break
      case 'admin:catalogs':
        invalidateAdmin(queryClient, 'catalogs')
        break
      default:
        break
    }
  }
}
