import type { ResourceInvalidationPayload } from '../types/realtime'
import {
  markAdminCampaignsCacheStale,
  markAdminCatalogsCacheStale,
  markAdminRealmUserRolesCacheStale,
  markAdminRealmsCacheStale,
  markAdminUsersCacheStale,
  markCampaignCharactersCacheStale,
  markCampaignCharacterDetailsCacheStale,
  markCampaignCharacterSheetsCacheStale,
  markCampaignDetailsCacheStale,
  markCampaignGameSystemsCacheStale,
  markCampaignMembersCacheStale,
  markCampaignMemberGroupCacheStale,
  markCampaignMembersForManagementCacheStale,
  markCampaignMissionsCacheStale,
  markCampaignMissionParticipantsCacheStale,
  markCampaignModulesCacheStale,
  markCampaignPermissionsCacheStale,
  markCampaignChatGroupCacheStale,
  markCampaignRoomsCacheStale,
  markDiscoverCampaignsCacheStale,
  markMembershipsCacheStale,
  markPendingApplicationsCacheStale,
  markPostLoginSummaryCacheStale,
  markProfileCacheStale,
  markPublicProfileCacheStale,
  markRealmPermissionsCacheStale,
} from './cachedGateApi'

export type RealtimeInvalidationState = {
  screen: string
  campaignId: string
  activeUserId: string | null
  isSystemSession: boolean
  systemAdminView: string
  adminUsersPageIndex: number
  adminCampaignsPageIndex: number
  adminRealmsPageIndex: number
}

export type RealtimeInvalidationActions = {
  refreshProfile: () => Promise<void>
  refreshPostLoginSummary: () => Promise<void>
  refreshCampaignBlock: () => Promise<void>
  refreshCharacterBlock: () => Promise<void>
  refreshMissions: (options?: { clearSelection?: boolean }) => Promise<void>
  refreshMissionChat: () => Promise<void>
  loadDiscoverableCampaigns: () => Promise<void>
  loadCharactersForManagement: () => Promise<void>
  loadPendingForActiveCampaign: () => Promise<void>
  refreshPendingApplicationsForCampaign: (campaignId: string) => Promise<void>
  loadAdminUsers: (page: number, query?: string) => Promise<void>
  loadAdminCampaigns: (page: number) => Promise<void>
  loadAdminRealms: (page?: number, query?: string) => Promise<void>
  loadAdminRealmUserRoles: (realmId?: string) => Promise<void>
  loadAdminSheetCatalogs: () => Promise<void>
}

type RealtimeInvalidationScopes = {
  currentUserScope: { userId: string; realmCode?: string | null } | null
}

function isCampaignKey(key: string): boolean {
  return key.startsWith('campaigns:')
}

export function applyRealtimeInvalidation(
  payload: ResourceInvalidationPayload,
  state: RealtimeInvalidationState,
  actions: RealtimeInvalidationActions,
  scopes: RealtimeInvalidationScopes,
): void {
  const keys = new Set(payload.keys)
  const currentCampaignKey = state.campaignId.trim() ? `campaigns:${state.campaignId}` : ''
  const campaignKeyMatch = currentCampaignKey
    ? payload.keys.some((key) => key === currentCampaignKey || key.startsWith(`${currentCampaignKey}:`))
    : false
  const missionKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':missions'))
  const chatKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':chat'))
  const characterKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':characters'))
  const invalidatedCampaignIds = Array.from(
    new Set(
      payload.keys
        .filter(isCampaignKey)
        .map((key) => key.split(':')[1])
        .filter((id) => Boolean(id?.trim())),
    ),
  )
  const campaignRootInvalidationIds = payload.keys
    .filter((key) => key.startsWith('campaigns:') && key.split(':').length === 2)
    .map((key) => key.split(':')[1])
    .filter((id) => Boolean(id?.trim()))
  const pendingApplicationsCampaignIds = payload.keys
    .filter((key) => key.startsWith('campaigns:') && key.endsWith(':pending-applications'))
    .map((key) => key.split(':')[1])
  const invalidatedPublicProfileIds = payload.keys
    .filter((key) => key.startsWith('users:') && key.endsWith(':profile'))
    .map((key) => key.split(':')[1])
    .filter((id) => Boolean(id?.trim()))
  const userProfileKey = state.activeUserId ? `users:${state.activeUserId}:profile` : ''
  const currentUserScope = scopes.currentUserScope

  if (keys.has('campaigns:discover') && state.screen === 'Lista Campagne') {
    if (currentUserScope) {
      markDiscoverCampaignsCacheStale(currentUserScope)
    }
    void actions.loadDiscoverableCampaigns()
  }

  if (keys.has('campaigns:discover') && state.screen === 'Ingresso') {
    if (currentUserScope) {
      markDiscoverCampaignsCacheStale(currentUserScope)
      markPostLoginSummaryCacheStale(currentUserScope)
    }
    void actions.refreshPostLoginSummary()
  }

  if (userProfileKey && keys.has(userProfileKey)) {
    if (currentUserScope) {
      markProfileCacheStale(currentUserScope)
      if (state.activeUserId) {
        markPublicProfileCacheStale(currentUserScope, state.activeUserId)
      }
      markMembershipsCacheStale(currentUserScope)
      markRealmPermissionsCacheStale(currentUserScope)
      markPostLoginSummaryCacheStale(currentUserScope)
    }
    void actions.refreshProfile()
    if (state.screen === 'Ingresso') {
      void actions.refreshPostLoginSummary()
    }
  }

  if (state.isSystemSession) {
    if (state.systemAdminView === 'users' && keys.has('admin:users')) {
      if (currentUserScope) {
        markAdminUsersCacheStale(currentUserScope)
      }
      void actions.loadAdminUsers(state.adminUsersPageIndex)
    }
    if (state.systemAdminView === 'campaigns' && keys.has('admin:campaigns')) {
      if (currentUserScope) {
        markAdminCampaignsCacheStale(currentUserScope)
      }
      void actions.loadAdminCampaigns(state.adminCampaignsPageIndex)
    }
    if (state.systemAdminView === 'realms' && keys.has('admin:realms')) {
      if (currentUserScope) {
        markAdminRealmsCacheStale(currentUserScope)
      }
      void actions.loadAdminRealms(state.adminRealmsPageIndex)
    }
    if (state.systemAdminView === 'realmAccess' && (keys.has('admin:users') || keys.has('admin:realms'))) {
      if (currentUserScope) {
        markAdminUsersCacheStale(currentUserScope)
        markAdminRealmsCacheStale(currentUserScope)
        markAdminRealmUserRolesCacheStale(currentUserScope)
      }
      void actions.loadAdminRealmUserRoles()
    }
    if (state.systemAdminView === 'sheets' && keys.has('admin:catalogs')) {
      if (currentUserScope) {
        markAdminCatalogsCacheStale(currentUserScope)
        markCampaignModulesCacheStale(currentUserScope)
        markCampaignGameSystemsCacheStale(currentUserScope)
      }
      void actions.loadAdminSheetCatalogs()
    }
  }

  if (currentUserScope) {
    for (const invalidatedUserId of invalidatedPublicProfileIds) {
      markPublicProfileCacheStale(currentUserScope, invalidatedUserId)
    }
    for (const invalidatedCampaignId of invalidatedCampaignIds) {
      if (payload.keys.some((key) => key === `campaigns:${invalidatedCampaignId}` || key.startsWith(`campaigns:${invalidatedCampaignId}:`))) {
        markCampaignDetailsCacheStale(currentUserScope, invalidatedCampaignId)
      }
    }
    for (const invalidatedCampaignId of campaignRootInvalidationIds) {
      markCampaignMembersCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignMembersForManagementCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignMemberGroupCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignRoomsCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignPermissionsCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignCharacterDetailsCacheStale(currentUserScope, invalidatedCampaignId)
      markCampaignCharacterSheetsCacheStale(currentUserScope, invalidatedCampaignId)
    }
    if (missionKeyMatch) {
      for (const invalidatedCampaignId of invalidatedCampaignIds) {
        markCampaignMissionsCacheStale(currentUserScope, invalidatedCampaignId)
        markCampaignMissionParticipantsCacheStale(currentUserScope, invalidatedCampaignId)
      }
    }
    if (characterKeyMatch) {
      for (const invalidatedCampaignId of invalidatedCampaignIds) {
        markCampaignCharactersCacheStale(currentUserScope, invalidatedCampaignId)
        markCampaignCharacterDetailsCacheStale(currentUserScope, invalidatedCampaignId)
        markCampaignCharacterSheetsCacheStale(currentUserScope, invalidatedCampaignId)
      }
    }
    for (const pendingCampaignId of pendingApplicationsCampaignIds) {
      markPendingApplicationsCacheStale(currentUserScope, pendingCampaignId)
    }
  }

  if (pendingApplicationsCampaignIds.length > 0) {
    for (const targetCampaignId of pendingApplicationsCampaignIds) {
      void actions.refreshPendingApplicationsForCampaign(targetCampaignId)
    }
    if (state.campaignId.trim() && pendingApplicationsCampaignIds.includes(state.campaignId)) {
      void actions.loadPendingForActiveCampaign()
    }
    if (state.screen === 'Approvazione Accessi') return
  }

  if (state.screen === 'Missioni' && chatKeyMatch) {
    if (currentUserScope) {
      for (const invalidatedCampaignId of invalidatedCampaignIds) {
        markCampaignChatGroupCacheStale(currentUserScope, invalidatedCampaignId)
      }
    }
    void actions.refreshMissionChat()
    return
  }

  if (state.screen === 'Missioni' && (campaignKeyMatch || missionKeyMatch || characterKeyMatch)) {
    void actions.refreshMissions({ clearSelection: true })
    return
  }

  if (!campaignKeyMatch) return

  if (state.screen === 'Scheda PG' && characterKeyMatch) {
    void actions.refreshCharacterBlock()
    return
  }

  if (state.screen === 'Gestione Personaggi' && characterKeyMatch) {
    void actions.loadCharactersForManagement()
    return
  }

  if (state.screen === 'Approvazione Accessi') {
    void actions.refreshCampaignBlock()
    return
  }

  if (state.screen === 'Scheda Campagna' || state.screen === 'Gestione Campagna' || state.screen === 'Stanze') {
    void actions.refreshCampaignBlock()
  }
}
