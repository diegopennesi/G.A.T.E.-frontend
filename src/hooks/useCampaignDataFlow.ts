import { useCallback } from 'react'
import { ApiError } from '../services/apiClient'
import { queryClient } from '../services/queryClient'
import { campaignQueries } from '../services/queries/campaignQueries'
import { toMessage } from '../shared/utils'
import type {
  CampaignApplicationResponse,
  CampaignMembershipResponse,
  CampaignResponse,
  MissionChatResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
  RoomResponse,
} from '../types/domain'

type BootstrapScope = { userId: string; realmCode?: string | null }

type LoadCampaignBlockArgs = {
  campaignId: string
  force?: boolean
}

type CampaignDataFlowDeps = {
  activeUserId: string | null
  profileId: string | null
  bootstrapScope: (userId: string) => BootstrapScope
  run: (label: string, task: () => Promise<void>) => Promise<void>
  setCampaign: (value: CampaignResponse | null) => void
  setCampaignDetailsById: React.Dispatch<React.SetStateAction<Record<string, CampaignResponse>>>
  setMembers: (value: CampaignMembershipResponse[]) => void
  setCampaignMembersForManagement: (value: CampaignMembershipResponse[]) => void
  setCanManageCampaignMembers: (value: boolean) => void
  setPendingApplications: (value: CampaignApplicationResponse[]) => void
  setCharacters: React.Dispatch<React.SetStateAction<import('../types/domain').Character[]>>
  setMissions: React.Dispatch<React.SetStateAction<MissionResponse[]>>
  setRooms: (value: RoomResponse[]) => void
  setSelectedCharacterId: React.Dispatch<React.SetStateAction<string>>
  setSelectedMissionId: React.Dispatch<React.SetStateAction<string>>
  setMissionParticipantsById: React.Dispatch<React.SetStateAction<Record<string, MissionParticipantResponse[]>>>
  setMyMissionParticipationById: React.Dispatch<React.SetStateAction<Record<string, MissionParticipationType>>>
  setMissionParticipantCharacterLabelById: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setMemberNames: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setSelectedMissionChatContext: React.Dispatch<React.SetStateAction<{ campaignId: string; missionId: string } | null>>
  setMissionChat: React.Dispatch<React.SetStateAction<MissionChatResponse | null>>
  setMissionChatBusy: React.Dispatch<React.SetStateAction<boolean>>
  setMissionChatError: React.Dispatch<React.SetStateAction<string>>
  campaignId: string
  missionWindowSince: () => string
  resolveMemberNames: (userIds: string[]) => Promise<Record<string, string>>
  memberNames: Record<string, string>
  approvedCampaignMemberships: Array<{ campaignId: string }>
  activeCampaignCharacterId: string
  writePendingApplicationsForCampaign: (userId: string | null | undefined, campaignId: string, list: CampaignApplicationResponse[]) => void
}

export function useCampaignDataFlow(deps: CampaignDataFlowDeps) {
  const loadCampaignBlockFor = useCallback(
    async ({ campaignId, force = false }: LoadCampaignBlockArgs) => {
      const [
        campaignValue,
        memberValue,
        characterValue,
        missionValue,
        roomValue,
        canManageMembersPermission,
        pendingValue,
      ] = await Promise.all([
        queryClient.fetchQuery({
          ...campaignQueries.details(campaignId),
          staleTime: force ? 0 : undefined,
        }),
        queryClient.fetchQuery({
          ...campaignQueries.members(campaignId),
          staleTime: force ? 0 : undefined,
        }),
        queryClient.fetchQuery({
          ...campaignQueries.characters(campaignId),
          staleTime: force ? 0 : undefined,
        }),
        queryClient.fetchQuery({
          ...campaignQueries.missions(campaignId, deps.missionWindowSince()),
          staleTime: force ? 0 : undefined,
        }),
        queryClient.fetchQuery({
          ...campaignQueries.rooms(campaignId),
          staleTime: force ? 0 : undefined,
        }),
        queryClient
          .fetchQuery({
            ...campaignQueries.permission(campaignId, 'PROMOTE_CO_MASTER_OR_MASTER'),
            staleTime: force ? 0 : undefined,
          })
          .then((permission) => permission.allowed)
          .catch(() => false),
        queryClient
          .fetchQuery({
            ...campaignQueries.pendingApplications(campaignId),
            staleTime: force ? 0 : undefined,
          })
          .catch((err) => {
            if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return []
            throw err
          }),
      ])

      const memberManagementValue = canManageMembersPermission
        ? await queryClient
            .fetchQuery({
              ...campaignQueries.membersForManagement(campaignId),
              staleTime: force ? 0 : undefined,
            })
            .catch(() => [])
        : []

      deps.setCampaign(campaignValue)
      deps.setCampaignDetailsById((prev) => ({ ...prev, [campaignValue.id]: campaignValue }))
      deps.setMembers(memberValue)
      deps.setCampaignMembersForManagement(memberManagementValue)
      deps.setCanManageCampaignMembers(canManageMembersPermission)
      deps.setPendingApplications(pendingValue)
      deps.writePendingApplicationsForCampaign(deps.activeUserId, campaignId, pendingValue)
      deps.setCharacters(characterValue)
      deps.setMissions(missionValue.map((mission) => ({ ...mission, campaignId })))
      deps.setRooms(roomValue)
      deps.setSelectedCharacterId((prev) => prev || characterValue[0]?.id || '')
      deps.setSelectedMissionId('')
    },
    [deps],
  )

  const refreshCampaignBlock = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!deps.campaignId.trim()) return
      await deps.run('Dati campagna caricati', async () => {
        await loadCampaignBlockFor({ campaignId: deps.campaignId, force: options.force ?? true })
      })
    },
    [deps, loadCampaignBlockFor],
  )

  const refreshMissions = useCallback(
    async (options: { clearSelection?: boolean; force?: boolean } = {}) => {
      const approvedCampaignIds = deps.approvedCampaignMemberships.map((membership) => membership.campaignId)
      if (approvedCampaignIds.length === 0) {
        deps.setMissions([])
        deps.setSelectedMissionId('')
        deps.setMissionParticipantsById({})
        deps.setMyMissionParticipationById({})
        deps.setMissionParticipantCharacterLabelById({})
        return
      }

      const settled = await Promise.allSettled(
        approvedCampaignIds.map(async (targetCampaignId) => {
          const [missionRows, characterRows] = await Promise.all([
            queryClient.fetchQuery({
              ...campaignQueries.missions(targetCampaignId, deps.missionWindowSince()),
              staleTime: options.force ? 0 : undefined,
            }),
            queryClient
              .fetchQuery({
                ...campaignQueries.characters(targetCampaignId),
                staleTime: options.force ? 0 : undefined,
              })
              .catch(() => [] as import('../types/domain').Character[]),
          ])
          return {
            missions: missionRows.map((mission) => ({ ...mission, campaignId: targetCampaignId })),
            characters: characterRows,
          }
        }),
      )

      const combined = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.missions : []))
      const nextCharactersFromMissions = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.characters : []))
      const characterLabels = settled.reduce<Record<string, string>>((labels, result) => {
        if (result.status !== 'fulfilled') return labels
        for (const character of result.value.characters) {
          labels[character.id] = character.name
        }
        return labels
      }, {})

      const nextMissions = combined.sort((left, right) => {
        const leftClose = left.closesAt ? new Date(left.closesAt).getTime() : Number.POSITIVE_INFINITY
        const rightClose = right.closesAt ? new Date(right.closesAt).getTime() : Number.POSITIVE_INFINITY
        if (leftClose !== rightClose) return leftClose - rightClose
        return right.createdAt.localeCompare(left.createdAt)
      })

      deps.setCharacters((prev) => {
        const byId = new Map(prev.map((character) => [character.id, character]))
        for (const character of nextCharactersFromMissions) {
          byId.set(character.id, character)
        }
        return Array.from(byId.values())
      })
      deps.setMissions(nextMissions)
      deps.setSelectedMissionId((prev) => {
        if (options.clearSelection) return ''
        return nextMissions.some((item) => item.id === prev) ? prev : ''
      })

      const participantSettled = await Promise.allSettled(
        nextMissions.map(async (mission) => ({
          missionId: mission.id,
          participants: await queryClient.fetchQuery({
            ...campaignQueries.missionParticipants(mission.campaignId, mission.id),
            staleTime: options.force ? 0 : undefined,
          }),
        })),
      )

      const nextParticipantsById: Record<string, MissionParticipantResponse[]> = {}
      const nextMyParticipationById: Record<string, MissionParticipationType> = {}
      const participantUserIds = new Set<string>()

      for (const result of participantSettled) {
        if (result.status !== 'fulfilled') continue
        nextParticipantsById[result.value.missionId] = result.value.participants
        for (const participant of result.value.participants) {
          participantUserIds.add(participant.userId)
          if (participant.userId === deps.profileId) {
            nextMyParticipationById[result.value.missionId] = participant.participationType
          }
        }
      }

      deps.setMissionParticipantsById(nextParticipantsById)
      deps.setMyMissionParticipationById(nextMyParticipationById)
      deps.setMissionParticipantCharacterLabelById(characterLabels)

      const creatorUserIds = new Set(nextMissions.map((mission) => mission.createdBy).filter((userId) => userId !== deps.profileId && !deps.memberNames[userId]))
      const missingUserIds = Array.from(new Set([...participantUserIds, ...creatorUserIds])).filter(
        (userId) => userId !== deps.profileId && !deps.memberNames[userId],
      )
      if (missingUserIds.length > 0) {
        const resolvedNames = await deps.resolveMemberNames(missingUserIds)
        deps.setMemberNames((prev) => ({ ...prev, ...resolvedNames }))
      }
    },
    [deps],
  )

  const loadPendingForCampaign = useCallback(
    async (targetCampaignId: string, options: { force?: boolean } = {}) => {
      if (!targetCampaignId.trim()) return []
      const list = await queryClient.fetchQuery({
        ...campaignQueries.pendingApplications(targetCampaignId),
        staleTime: options.force ? 0 : undefined,
      })
      if (targetCampaignId === deps.campaignId) {
        deps.setPendingApplications(list)
      }
      deps.writePendingApplicationsForCampaign(deps.activeUserId, targetCampaignId, list)
      return list
    },
    [deps],
  )

  const loadPendingForActiveCampaign = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!deps.campaignId.trim()) return
      await loadPendingForCampaign(deps.campaignId, options)
    },
    [deps, loadPendingForCampaign],
  )

  const loadMissionChat = useCallback(
    async (targetCampaignId: string, missionId: string) => {
      deps.setMissionChatBusy(true)
      deps.setMissionChatError('')
      try {
        const value = await queryClient.fetchQuery({
          ...campaignQueries.missionChat(targetCampaignId, missionId),
          staleTime: 0,
        })
        deps.setSelectedMissionChatContext({ campaignId: targetCampaignId, missionId })
        deps.setMissionChat(value)
      } catch (err) {
        const message = toMessage(err)
        deps.setMissionChatError(message)
        throw err
      } finally {
        deps.setMissionChatBusy(false)
      }
    },
    [deps],
  )

  return {
    loadCampaignBlockFor,
    refreshCampaignBlock,
    refreshMissions,
    loadPendingForCampaign,
    loadPendingForActiveCampaign,
    loadMissionChat,
  }
}
