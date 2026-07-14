import { useCallback, useRef } from 'react'
import { getFreshQueryData, readOrFetchQuery } from '../services/queryCache'
import { queryClient } from '../services/queryClient'
import { bootstrapQueries } from '../services/queries/bootstrapQueries'
import { isUnauthorized, toMessage } from '../shared/utils'
import type {
  CampaignResponse,
  CampaignDiscoverResponse,
  CurrentRealmPermissionsResponse,
  MyCampaignMembershipResponse,
  PostLoginCampaignEntryResponse,
  PostLoginCampaignSummaryResponse,
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
  const {
    realmCode,
    activeUserId,
    campaignId,
    profileId,
    run,
    setProfile,
    setMyCampaigns,
    setCampaignMembershipsLoaded,
    setCampaign,
    setRealmPermissions,
    setDiscoverableCampaigns,
    setPostLoginLoading,
    setPostLoginError,
    setPostLoginCanCreateCampaign,
    setPostLoginCampaigns,
    setError,
    addEvent,
    handleLogout,
    clearCampaignWorkspace,
    rememberCampaignId,
  } = deps
  const refreshProfileInFlightRef = useRef<Promise<void> | null>(null)
  const postLoginSummaryInFlightRef = useRef<Promise<void> | null>(null)
  const postLoginSummaryQueuedRefreshRef = useRef(false)

  const refreshProfile = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (refreshProfileInFlightRef.current) {
        await refreshProfileInFlightRef.current
        return
      }

      await run('Profilo caricato', async () => {
        const request = (async () => {
          const me = await queryClient.fetchQuery({
            ...bootstrapQueries.profile({ userId: activeUserId || 'anonymous', realmCode }),
            staleTime: options.force ? 0 : undefined,
          })
          const mine = await queryClient.fetchQuery({
            ...bootstrapQueries.memberships({ userId: me.id, realmCode }),
            staleTime: options.force ? 0 : undefined,
          })
          queryClient.setQueryData(bootstrapQueries.profile({ userId: me.id, realmCode }).queryKey, me)
          queryClient.setQueryData(bootstrapQueries.memberships({ userId: me.id, realmCode }).queryKey, mine)
          setProfile(me)
          setMyCampaigns(mine)
          setCampaignMembershipsLoaded(true)

          if (mine.length === 0 && campaignId) {
            rememberCampaignId('', me.id)
            setCampaign(null)
            clearCampaignWorkspace()
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
    [activeUserId, campaignId, clearCampaignWorkspace, realmCode, rememberCampaignId, run, setCampaign, setCampaignMembershipsLoaded, setMyCampaigns, setProfile],
  )

  const loadCurrentRealmPermissions = useCallback(
    async (options: { force?: boolean } = {}) => {
      try {
        if (!profileId) return
        const response = await readOrFetchQuery(
          queryClient,
          bootstrapQueries.realmPermissions({ userId: profileId, realmCode }),
          options,
        )
        setRealmPermissions(response)
      } catch (err) {
        const message = toMessage(err)
        setError(message)
        addEvent(`Permessi realm: ${message}`, 'error')
        if (isUnauthorized(err)) {
          handleLogout()
        }
      }
    },
    [addEvent, handleLogout, profileId, realmCode, setError, setRealmPermissions],
  )

  const loadDiscoverableCampaigns = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!activeUserId) return
      const list = await readOrFetchQuery(
        queryClient,
        bootstrapQueries.discoverCampaigns({ userId: activeUserId, realmCode }),
        options,
      )
      setDiscoverableCampaigns(list)
    },
    [activeUserId, realmCode, setDiscoverableCampaigns],
  )

  const loadPostLoginCampaignSummary = useCallback(
    async function loadPostLoginCampaignSummary(options: { force?: boolean } = {}) {
      if (!activeUserId) return
      const summaryQuery = bootstrapQueries.postLoginSummary({ userId: activeUserId as string, realmCode })
      const cachedSummary = getFreshQueryData<PostLoginCampaignSummaryResponse>(queryClient, summaryQuery.queryKey)
      if (postLoginSummaryInFlightRef.current) {
        postLoginSummaryQueuedRefreshRef.current = true
        await postLoginSummaryInFlightRef.current
        if (postLoginSummaryQueuedRefreshRef.current) {
          postLoginSummaryQueuedRefreshRef.current = false
          await loadPostLoginCampaignSummary({ force: true })
        }
        return
      }

      if (!options.force && cachedSummary) {
        setPostLoginCanCreateCampaign(cachedSummary.canCreateCampaign)
        setPostLoginCampaigns(cachedSummary.campaigns)
        return
      }

      const request = (async () => {
        setPostLoginLoading(true)
        setPostLoginError('')
        try {
          const summary = await readOrFetchQuery(queryClient, summaryQuery, options)
          setPostLoginCanCreateCampaign(summary.canCreateCampaign)
          setPostLoginCampaigns(summary.campaigns)
        } catch (err) {
          const message = toMessage(err)
          setPostLoginError(message)
          addEvent(`Ingresso: ${message}`, 'error')
          if (isUnauthorized(err)) {
            handleLogout()
          }
        } finally {
          setPostLoginLoading(false)
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
    [
      activeUserId,
      addEvent,
      handleLogout,
      realmCode,
      setPostLoginCanCreateCampaign,
      setPostLoginCampaigns,
      setPostLoginError,
      setPostLoginLoading,
    ],
  )

  return {
    refreshProfile,
    loadCurrentRealmPermissions,
    loadDiscoverableCampaigns,
    loadPostLoginCampaignSummary,
  }
}
