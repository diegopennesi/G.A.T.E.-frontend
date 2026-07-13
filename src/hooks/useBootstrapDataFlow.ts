import { useCallback, useRef } from 'react'
import { queryClient } from '../services/queryClient'
import { bootstrapQueries } from '../services/queries/bootstrapQueries'
import { isUnauthorized, toMessage } from '../shared/utils'
import type {
  CampaignResponse,
  CampaignDiscoverResponse,
  CurrentRealmPermissionsResponse,
  MyCampaignMembershipResponse,
  PostLoginCampaignEntryResponse,
  UserProfile,
} from '../types/domain'

type BootstrapScope = { userId: string; realmCode?: string | null }

type BootstrapDataFlowDeps = {
  realmCode: string
  activeUserId: string | null
  campaignId: string
  profileId: string | null
  bootstrapScope: (userId: string) => BootstrapScope
  run: (label: string, task: () => Promise<void>) => Promise<void>
  setProfile: (profile: UserProfile | null) => void
  setMyCampaigns: (campaigns: MyCampaignMembershipResponse[]) => void
  setCampaignMembershipsLoaded: (loaded: boolean) => void
  setCampaign: (campaign: CampaignResponse | null) => void
  setRealmPermissions: (permissions: CurrentRealmPermissionsResponse | null) => void
  setDiscoverableCampaigns: (campaigns: CampaignDiscoverResponse[]) => void
  setPostLoginLoading: (loading: boolean) => void
  setPostLoginError: (message: string) => void
  setPostLoginCanCreateCampaign: (value: boolean) => void
  setPostLoginCampaigns: (campaigns: PostLoginCampaignEntryResponse[]) => void
  setError: (message: string) => void
  addEvent: (message: string, kind: 'error' | 'info' | 'ok') => void
  handleLogout: () => void
  clearCampaignWorkspace: () => void
  rememberCampaignId: (id: string, userId?: string | null) => void
}

export function useBootstrapDataFlow(deps: BootstrapDataFlowDeps) {
  const refreshProfileInFlightRef = useRef<Promise<void> | null>(null)
  const postLoginSummaryInFlightRef = useRef<Promise<void> | null>(null)
  const postLoginSummaryQueuedRefreshRef = useRef(false)

  const refreshProfile = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (refreshProfileInFlightRef.current) {
        await refreshProfileInFlightRef.current
        return
      }

      await deps.run('Profilo caricato', async () => {
        const request = (async () => {
          const me = await queryClient.fetchQuery({
            ...bootstrapQueries.profile({ userId: deps.activeUserId || 'anonymous', realmCode: deps.realmCode }),
            staleTime: options.force ? 0 : undefined,
          })
          const mine = await queryClient.fetchQuery({
            ...bootstrapQueries.memberships({ userId: me.id, realmCode: deps.realmCode }),
            staleTime: options.force ? 0 : undefined,
          })
          queryClient.setQueryData(bootstrapQueries.profile({ userId: me.id, realmCode: deps.realmCode }).queryKey, me)
          queryClient.setQueryData(bootstrapQueries.memberships({ userId: me.id, realmCode: deps.realmCode }).queryKey, mine)
          deps.setProfile(me)
          deps.setMyCampaigns(mine)
          deps.setCampaignMembershipsLoaded(true)

          if (mine.length === 0 && deps.campaignId) {
            deps.rememberCampaignId('', me.id)
            deps.setCampaign(null)
            deps.clearCampaignWorkspace()
          }
        })()

        refreshProfileInFlightRef.current = request
        try {
          await request
        } finally {
          refreshProfileInFlightRef.current = null
        }
      })
    },
    [deps],
  )

  const loadCurrentRealmPermissions = useCallback(
    async (options: { force?: boolean } = {}) => {
      try {
        if (!deps.profileId) return
        const response = await queryClient.fetchQuery({
          ...bootstrapQueries.realmPermissions({ userId: deps.profileId, realmCode: deps.realmCode }),
          staleTime: options.force ? 0 : undefined,
        })
        deps.setRealmPermissions(response)
      } catch (err) {
        const message = toMessage(err)
        deps.setError(message)
        deps.addEvent(`Permessi realm: ${message}`, 'error')
        if (isUnauthorized(err)) {
          deps.handleLogout()
        }
      }
    },
    [deps],
  )

  const loadDiscoverableCampaigns = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!deps.activeUserId) return
      const list = await queryClient.fetchQuery({
        ...bootstrapQueries.discoverCampaigns({ userId: deps.activeUserId, realmCode: deps.realmCode }),
        staleTime: options.force ? 0 : undefined,
      })
      deps.setDiscoverableCampaigns(list)
    },
    [deps],
  )

  const loadPostLoginCampaignSummary = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!deps.activeUserId) return
      if (postLoginSummaryInFlightRef.current) {
        postLoginSummaryQueuedRefreshRef.current = true
        await postLoginSummaryInFlightRef.current
        if (postLoginSummaryQueuedRefreshRef.current) {
          postLoginSummaryQueuedRefreshRef.current = false
          await loadPostLoginCampaignSummary({ force: true })
        }
        return
      }

      const request = (async () => {
        deps.setPostLoginLoading(true)
        deps.setPostLoginError('')
        try {
          const summary = await queryClient.fetchQuery({
            ...bootstrapQueries.postLoginSummary({ userId: deps.activeUserId as string, realmCode: deps.realmCode }),
            staleTime: options.force ? 0 : undefined,
          })
          deps.setPostLoginCanCreateCampaign(summary.canCreateCampaign)
          deps.setPostLoginCampaigns(summary.campaigns)
        } catch (err) {
          const message = toMessage(err)
          deps.setPostLoginError(message)
          deps.addEvent(`Ingresso: ${message}`, 'error')
          if (isUnauthorized(err)) {
            deps.handleLogout()
          }
        } finally {
          deps.setPostLoginLoading(false)
        }
      })()

      postLoginSummaryInFlightRef.current = request
      try {
        await request
      } finally {
        postLoginSummaryInFlightRef.current = null
        if (postLoginSummaryQueuedRefreshRef.current) {
          postLoginSummaryQueuedRefreshRef.current = false
          await loadPostLoginCampaignSummary({ force: true })
        }
      }
    },
    [deps],
  )

  return {
    refreshProfile,
    loadCurrentRealmPermissions,
    loadDiscoverableCampaigns,
    loadPostLoginCampaignSummary,
  }
}
