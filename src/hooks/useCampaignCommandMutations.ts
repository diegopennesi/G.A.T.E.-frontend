import { useMutation } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'
import { queryClient } from '../services/queryClient'
import { queryKeys } from '../services/queryKeys'
import { createCampaign, createInviteToken, createRoom, deactivateCampaign, transferOwnership, updateCampaign } from '../services/gateApi'
import type { CampaignResponse, CreateInviteTokenRequest } from '../types/domain'
import type { Screen } from '../types/ui'

type CampaignCommandDeps = {
  campaignId: string
  currentCampaign: CampaignResponse | null
  setCampaign: (value: CampaignResponse | null) => void
  setCampaignDetailsById: Dispatch<SetStateAction<Record<string, CampaignResponse>>>
  setMyCampaigns: Dispatch<SetStateAction<any[]>>
  setRooms: Dispatch<SetStateAction<any[]>>
  setCanManageCampaignMembers: (value: boolean) => void
  setScreen: (value: Screen) => void
  refreshProfile: (options?: { force?: boolean }) => Promise<void>
  loadDiscoverableCampaigns: (options?: { force?: boolean }) => Promise<void>
  loadPostLoginCampaignSummary: (options?: { force?: boolean }) => Promise<void>
  rememberCampaignId: (campaignId: string) => void
  rememberCampaignMeta: (campaignId: string, campaignName: string) => void
  clearActiveCampaignContext: () => void
}

export function useCampaignCommandMutations(deps: CampaignCommandDeps) {
  const invalidateBootstrap = () => queryClient.invalidateQueries({ queryKey: ['bootstrap'], exact: false })
  const invalidateCampaign = (campaignId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignDetails(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembersForManagement(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignRooms(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacters(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMissions(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'permissions'], exact: false }),
    ])

  const createCampaignMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createCampaign>[0]) => createCampaign(payload),
    onSuccess: async (created) => {
      deps.rememberCampaignId(created.id)
      deps.rememberCampaignMeta(created.id, created.name)
      deps.setCampaign(created)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [created.id]: created }))
      deps.setCanManageCampaignMembers(true)
      await invalidateBootstrap()
      await Promise.all([
        deps.loadDiscoverableCampaigns({ force: true }),
        deps.loadPostLoginCampaignSummary({ force: true }),
        invalidateCampaign(created.id),
      ])
      deps.setScreen('Scheda Campagna')
    },
  })

  const saveCampaignMutation = useMutation({
    mutationFn: ({ campaignId, payload }: { campaignId: string; payload: Parameters<typeof updateCampaign>[1] }) =>
      updateCampaign(campaignId, payload),
    onMutate: async ({ campaignId, payload }) => {
      if (!deps.currentCampaign || deps.currentCampaign.id !== campaignId) {
        return { previousCampaign: null as CampaignResponse | null }
      }
      const previousCampaign = deps.currentCampaign
      const optimisticCampaign: CampaignResponse = {
        ...previousCampaign,
        name: payload.name,
        description: payload.description ?? previousCampaign.description,
        summary: payload.summary ?? previousCampaign.summary,
        setting: payload.setting ?? previousCampaign.setting,
        tone: payload.tone ?? previousCampaign.tone,
        rules: payload.rules ?? previousCampaign.rules,
        requirements: payload.requirements ?? previousCampaign.requirements,
        coverImageUrl: payload.coverImageUrl ?? previousCampaign.coverImageUrl,
        isOpen: payload.isOpen,
        isActive: previousCampaign.isActive,
        isSearchable: payload.isSearchable,
        autoJoinEnabled: payload.autoJoinEnabled ?? previousCampaign.autoJoinEnabled,
        allowedModules: payload.allowedModules ? [...payload.allowedModules] : [...previousCampaign.allowedModules],
        missionRules: payload.missionRules
          ? payload.missionRules.map((update) => {
              const current = previousCampaign.missionRules?.find((rule) => rule.code === update.code)
              return current
                ? { ...current, campaignEnabled: update.enabled, effectiveEnabled: current.globallyActive && update.enabled, configJson: update.configJson ?? current.configJson }
                : current
            }).filter(Boolean) as CampaignResponse['missionRules']
          : previousCampaign.missionRules,
      }
      queryClient.setQueryData(queryKeys.campaignDetails(campaignId), optimisticCampaign)
      deps.setCampaign(optimisticCampaign)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [optimisticCampaign.id]: optimisticCampaign }))
      return { previousCampaign }
    },
    onError: (_error, variables, context) => {
      const previousCampaign = context?.previousCampaign
      if (!previousCampaign) return
      queryClient.setQueryData(queryKeys.campaignDetails(variables.campaignId), previousCampaign)
      deps.setCampaign(previousCampaign)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [previousCampaign.id]: previousCampaign }))
    },
    onSuccess: async (updated) => {
      deps.setCampaign(updated)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
      deps.rememberCampaignMeta(updated.id, updated.name)
      deps.setMyCampaigns((prev: any[]) => prev.map((item) => (item.campaignId === updated.id ? { ...item, campaignName: updated.name } : item)))
      await invalidateBootstrap()
      await invalidateCampaign(updated.id)
      deps.setScreen('Lista Campagne')
    },
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: ({ campaignId, newOwnerId }: { campaignId: string; newOwnerId: string }) =>
      transferOwnership(campaignId, newOwnerId),
    onSuccess: (updated) => {
      deps.setCampaign(updated)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
      void invalidateBootstrap()
      void invalidateCampaign(updated.id)
    },
  })

  const deactivateCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deactivateCampaign(campaignId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.campaignDetails(updated.id), updated)
      queryClient.removeQueries({ queryKey: ['bootstrap'], exact: false })
      deps.setCampaignDetailsById((prev) => {
        const next = { ...prev }
        delete next[updated.id]
        return next
      })
      deps.setMyCampaigns((prev: any[]) => prev.filter((item) => item.campaignId !== updated.id))
      deps.clearActiveCampaignContext()
      await invalidateBootstrap()
      await Promise.all([
        deps.refreshProfile({ force: true }),
        deps.loadDiscoverableCampaigns({ force: true }),
        deps.loadPostLoginCampaignSummary({ force: true }),
        invalidateCampaign(updated.id),
      ])
    },
  })

  const createInviteTokenMutation = useMutation({
    mutationFn: ({ campaignId, payload }: { campaignId: string; payload: CreateInviteTokenRequest }) =>
      createInviteToken(campaignId, payload),
    onSuccess: async (_created, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignInviteTokens(variables.campaignId), exact: false })
    },
  })

  const createRoomMutation = useMutation({
    mutationFn: ({ campaignId, payload }: { campaignId: string; payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number } }) =>
      createRoom(campaignId, payload),
    onSuccess: async (created) => {
      deps.setRooms((prev: any[]) => [created, ...prev])
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignRooms(created.campaignId), exact: false })
    },
  })

  return {
    createCampaign: (payload: Parameters<typeof createCampaign>[0]) => createCampaignMutation.mutateAsync(payload),
    saveCampaign: (campaignId: string, payload: Parameters<typeof updateCampaign>[1]) =>
      saveCampaignMutation.mutateAsync({ campaignId, payload }),
    transferCampaignOwnership: (campaignId: string, newOwnerId: string) =>
      transferOwnershipMutation.mutateAsync({ campaignId, newOwnerId }),
    deactivateCampaign: (campaignId: string) => deactivateCampaignMutation.mutateAsync(campaignId),
    createCampaignInviteToken: (campaignId: string, payload: CreateInviteTokenRequest) =>
      createInviteTokenMutation.mutateAsync({ campaignId, payload }),
    createRoom: (
      campaignId: string,
      payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number },
    ) => createRoomMutation.mutateAsync({ campaignId, payload }),
  }
}
