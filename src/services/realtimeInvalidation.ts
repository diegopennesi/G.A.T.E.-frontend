import type { ResourceInvalidationPayload } from '../types/realtime'

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

export function applyRealtimeInvalidation(
  payload: ResourceInvalidationPayload,
  state: RealtimeInvalidationState,
  actions: RealtimeInvalidationActions,
): void {
  const keys = new Set(payload.keys)
  const currentCampaignKey = state.campaignId.trim() ? `campaigns:${state.campaignId}` : ''
  const campaignKeyMatch = currentCampaignKey
    ? payload.keys.some((key) => key === currentCampaignKey || key.startsWith(`${currentCampaignKey}:`))
    : false
  const missionKeyMatch = payload.keys.some((key) => /^campaigns:[^:]+:missions(?:$|:)/.test(key))
  const missionChatKeyMatch = payload.keys.some((key) => /^campaigns:[^:]+:missions:[^:]+:chat$/.test(key))
  const missionParticipantsKeyMatch = payload.keys.some((key) => /^campaigns:[^:]+:missions:[^:]+:participants$/.test(key))
  const characterKeyMatch = payload.keys.some((key) => /^campaigns:[^:]+:characters(?:$|:)/.test(key))
  const pendingApplicationsCampaignIds = payload.keys
    .filter((key) => key.startsWith('campaigns:') && key.endsWith(':pending-applications'))
    .map((key) => key.split(':')[1])
  const userProfileKey = state.activeUserId ? `users:${state.activeUserId}:profile` : ''

  if (keys.has('campaigns:discover') && state.screen === 'Lista Campagne') {
    void actions.loadDiscoverableCampaigns()
  }

  if (keys.has('campaigns:discover') && state.screen === 'Ingresso') {
    void actions.refreshPostLoginSummary()
  }

  if (userProfileKey && keys.has(userProfileKey)) {
    void actions.refreshProfile()
    if (state.screen === 'Ingresso') {
      void actions.refreshPostLoginSummary()
    }
  }

  if (state.isSystemSession) {
    if (state.systemAdminView === 'users' && keys.has('admin:users')) {
      void actions.loadAdminUsers(state.adminUsersPageIndex)
    }
    if (state.systemAdminView === 'campaigns' && keys.has('admin:campaigns')) {
      void actions.loadAdminCampaigns(state.adminCampaignsPageIndex)
    }
    if (state.systemAdminView === 'realms' && keys.has('admin:realms')) {
      void actions.loadAdminRealms(state.adminRealmsPageIndex)
    }
    if (
      state.systemAdminView === 'realmAccess' &&
      (keys.has('admin:users') || keys.has('admin:realms') || keys.has('admin:realm-user-roles'))
    ) {
      void actions.loadAdminRealmUserRoles()
    }
    if (state.systemAdminView === 'sheets' && keys.has('admin:catalogs')) {
      void actions.loadAdminSheetCatalogs()
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

  if (state.screen === 'Missioni' && missionChatKeyMatch) {
    void actions.refreshMissionChat()
    return
  }

  if (state.screen === 'Missioni' && (campaignKeyMatch || missionKeyMatch || missionParticipantsKeyMatch || characterKeyMatch)) {
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
