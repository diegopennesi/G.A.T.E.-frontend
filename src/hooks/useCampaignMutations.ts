import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../services/queryClient'
import { queryKeys } from '../services/queryKeys'
import {
  approveApplication,
  applyToCampaign,
  applyToCampaignViaInviteCode,
  applyToCampaignViaInviteToken,
  cancelMission,
  createMission,
  joinMission,
  leaveMission,
  rejectApplication,
  sendMissionChatMessage,
  updateMission,
  updateMissionParticipationType,
} from '../services/gateApi'

type MutationDeps = {
  campaignId: string
  selectedMissionId: string
  selectedMissionChatContext: { campaignId: string; missionId: string } | null
  selectedMissionCharacterId: string
  refreshProfile: (options?: { force?: boolean }) => Promise<void>
  loadDiscoverableCampaigns: (options?: { force?: boolean }) => Promise<void>
  loadPostLoginCampaignSummary: (options?: { force?: boolean }) => Promise<void>
  loadPendingForActiveCampaign: (options?: { force?: boolean }) => Promise<void>
  refreshMissions: (options?: { clearSelection?: boolean; force?: boolean }) => Promise<void>
  refreshMissionChat: () => Promise<void>
  setSelectedMissionId: (value: string) => void
  setSelectedMissionChatContext: (value: { campaignId: string; missionId: string } | null) => void
}

export function useCampaignMutations(deps: MutationDeps) {
  const invalidateBootstrap = () => queryClient.invalidateQueries({ queryKey: ['bootstrap'], exact: false })
  const invalidateCampaign = (campaignId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.campaignDetails(campaignId), exact: false })
  const invalidateCampaignSideData = (campaignId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembersForManagement(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignPendingApplications(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMissions(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacters(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignRooms(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId, 'permissions'], exact: false }),
    ])

  const applyInviteMutation = useMutation({
    mutationFn: async (inviteValue: string) => {
      const trimmed = inviteValue.trim()
      if (!trimmed) throw new Error('Inserisci un codice o token invito.')
      if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
        return applyToCampaignViaInviteCode(trimmed)
      }
      return applyToCampaignViaInviteToken(trimmed)
    },
    onSuccess: async () => {
      await invalidateBootstrap()
      await Promise.all([
        deps.refreshProfile({ force: true }),
        deps.loadDiscoverableCampaigns({ force: true }),
        deps.loadPostLoginCampaignSummary({ force: true }),
      ])
    },
  })

  const applyCurrentCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => applyToCampaign(campaignId),
    onSuccess: async (_value, campaignId) => {
      await invalidateBootstrap()
      await Promise.all([
        invalidateCampaign(campaignId),
        invalidateCampaignSideData(campaignId),
        deps.refreshProfile({ force: true }),
        deps.loadDiscoverableCampaigns({ force: true }),
        deps.loadPostLoginCampaignSummary({ force: true }),
      ])
    },
  })

  const approvePendingMutation = useMutation({
    mutationFn: (userId: string) => approveApplication(deps.campaignId, userId),
    onSuccess: async () => {
      await invalidateCampaignSideData(deps.campaignId)
      await invalidateBootstrap()
      await deps.loadPendingForActiveCampaign({ force: true })
      await deps.refreshProfile({ force: true })
    },
  })

  const rejectPendingMutation = useMutation({
    mutationFn: (userId: string) => rejectApplication(deps.campaignId, userId),
    onSuccess: async () => {
      await invalidateCampaignSideData(deps.campaignId)
      await deps.loadPendingForActiveCampaign({ force: true })
    },
  })

  const createMissionMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createMission>[1]) => createMission(deps.campaignId, payload),
    onSuccess: async (created) => {
      deps.setSelectedMissionId(created.id)
      await invalidateCampaignSideData(deps.campaignId)
      await deps.refreshMissions({ force: true })
    },
  })

  const updateMissionMutation = useMutation({
    mutationFn: ({ missionId, payload }: { missionId: string; payload: Parameters<typeof updateMission>[2] }) =>
      updateMission(deps.campaignId, missionId, payload),
    onSuccess: async (_value, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(deps.campaignId, variables.missionId), exact: false })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignMissions(deps.campaignId), exact: false })
      await deps.refreshMissions({ force: true })
    },
  })

  const cancelMissionMutation = useMutation({
    mutationFn: (missionId: string) => cancelMission(deps.campaignId, missionId),
    onSuccess: async (_value, missionId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(deps.campaignId, missionId), exact: false })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignMissions(deps.campaignId), exact: false })
      await deps.refreshMissions({ force: true })
    },
  })

  const joinMissionMutation = useMutation({
    mutationFn: async ({ missionId, participationType }: { missionId: string; participationType: Parameters<typeof joinMission>[2]['participationType'] }) => {
      if (!deps.selectedMissionCharacterId) {
        throw new Error('Non hai un PG attivo nella campagna della missione.')
      }
      return joinMission(deps.campaignId, missionId, {
        characterId: deps.selectedMissionCharacterId,
        participationType,
      })
    },
    onSuccess: async (_participant, variables) => {
      deps.setSelectedMissionId(variables.missionId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(deps.campaignId, variables.missionId), exact: false })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignMissions(deps.campaignId), exact: false })
      await deps.refreshMissions({ force: true })
    },
  })

  const leaveMissionMutation = useMutation({
    mutationFn: (missionId: string) => leaveMission(deps.campaignId, missionId),
    onSuccess: async (_value, missionId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(deps.campaignId, missionId), exact: false })
      await deps.refreshMissions({ force: true })
    },
  })

  const updateMissionParticipationTypeMutation = useMutation({
    mutationFn: ({ missionId, participationType }: { missionId: string; participationType: Parameters<typeof updateMissionParticipationType>[2]['participationType'] }) =>
      updateMissionParticipationType(deps.campaignId, missionId, { participationType }),
    onSuccess: async (_value, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionParticipants(deps.campaignId, variables.missionId), exact: false })
      await deps.refreshMissions({ force: true })
    },
  })

  const sendMissionChatMessageMutation = useMutation({
    mutationFn: ({ campaignId, missionId, body }: { campaignId: string; missionId: string; body: string }) =>
      sendMissionChatMessage(campaignId, missionId, body),
    onSuccess: async (_message, variables) => {
      deps.setSelectedMissionChatContext({ campaignId: variables.campaignId, missionId: variables.missionId })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignChat(variables.campaignId, variables.missionId), exact: false })
      await deps.refreshMissionChat()
    },
  })

  return {
    applyInviteAccess: (inviteValue: string) => applyInviteMutation.mutateAsync(inviteValue),
    applyCurrentCampaign: (campaignId: string) => applyCurrentCampaignMutation.mutateAsync(campaignId),
    approvePendingForActiveCampaign: (userId: string) => approvePendingMutation.mutateAsync(userId),
    rejectPendingForActiveCampaign: (userId: string) => rejectPendingMutation.mutateAsync(userId),
    createMission: (payload: Parameters<typeof createMission>[1]) => createMissionMutation.mutateAsync(payload),
    updateMission: (missionId: string, payload: Parameters<typeof updateMission>[2]) =>
      updateMissionMutation.mutateAsync({ missionId, payload }),
    cancelMission: (missionId: string) => cancelMissionMutation.mutateAsync(missionId),
    joinMission: (missionId: string, participationType: Parameters<typeof joinMission>[2]['participationType']) =>
      joinMissionMutation.mutateAsync({ missionId, participationType }),
    leaveMission: (missionId: string) => leaveMissionMutation.mutateAsync(missionId),
    updateMissionParticipationType: (missionId: string, participationType: Parameters<typeof updateMissionParticipationType>[2]['participationType']) =>
      updateMissionParticipationTypeMutation.mutateAsync({ missionId, participationType }),
    sendMissionChatMessage: (campaignId: string, missionId: string, body: string) =>
      sendMissionChatMessageMutation.mutateAsync({ campaignId, missionId, body }),
  }
}
