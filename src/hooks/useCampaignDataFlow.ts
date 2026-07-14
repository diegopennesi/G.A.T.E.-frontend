import { useCallback } from 'react'
import { ApiError } from '../services/apiClient'
import { checkPermission, listCampaignMembersForManagement, listPendingApplications } from '../services/gateApi'
import { readOrFetchQuery } from '../services/queryCache'
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
  const readMembersForManagement = useCallback(
    async (campaignId: string, options: { force?: boolean } = {}) => {
      const query = campaignQueries.membersForManagement(campaignId)
      return readOrFetchQuery(
        queryClient,
        {
          ...query,
          queryFn: () => listCampaignMembersForManagement(campaignId),
        },
        options,
      ).catch(() => [])
    },
    [],
  )

  const readPendingApplications = useCallback(
    async (campaignId: string, options: { force?: boolean } = {}) => {
      const query = campaignQueries.pendingApplications(campaignId)
      return readOrFetchQuery(
        queryClient,
        {
          ...query,
          queryFn: () => listPendingApplications(campaignId),
        },
        options,
      ).catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          queryClient.setQueryData(query.queryKey, [])
          return []
        }
        throw err
      })
    },
    [],
  )

  const loadCampaignBlockFor = useCallback(
    async ({ campaignId, force = false }: LoadCampaignBlockArgs) => {
      const detailsQuery = campaignQueries.details(campaignId)
      const membersQuery = campaignQueries.members(campaignId)
      const charactersQuery = campaignQueries.characters(campaignId)
      const missionsQuery = campaignQueries.missions(campaignId, deps.missionWindowSince())
      const roomsQuery = campaignQueries.rooms(campaignId)
      const permissionQuery = campaignQueries.permission(campaignId, 'PROMOTE_CO_MASTER_OR_MASTER')

      const [
        campaignValue,
        memberValue,
        characterValue,
        missionValue,
        roomValue,
        permissionValue,
      ] = await Promise.all([
        readOrFetchQuery(queryClient, detailsQuery, { force }),
        readOrFetchQuery(queryClient, membersQuery, { force }),
        readOrFetchQuery(queryClient, charactersQuery, { force }),
        readOrFetchQuery(queryClient, missionsQuery, { force }),
        readOrFetchQuery(queryClient, roomsQuery, { force }),
        readOrFetchQuery(
          queryClient,
          {
            ...permissionQuery,
            queryFn: () => checkPermission(campaignId, 'PROMOTE_CO_MASTER_OR_MASTER'),
          },
          { force },
        ).catch(() => ({
          campaignId,
          action: 'PROMOTE_CO_MASTER_OR_MASTER',
          allowed: false,
        })),
      ])

      const canManageMembersPermission = permissionValue.allowed
      const pendingValue = canManageMembersPermission ? await readPendingApplications(campaignId, { force }) : []
      const memberManagementValue = canManageMembersPermission ? await readMembersForManagement(campaignId, { force }) : []

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
    [deps, readMembersForManagement, readPendingApplications],
  )

  const refreshCampaignBlock = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!deps.campaignId.trim()) return
      await deps.run('Dati campagna caricati', async () => {
        await loadCampaignBlockFor({ campaignId: deps.campaignId, force: options.force ?? false })
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
            readOrFetchQuery(
              queryClient,
              campaignQueries.missions(targetCampaignId, deps.missionWindowSince()),
              options,
            ),
            readOrFetchQuery(
              queryClient,
              campaignQueries.characters(targetCampaignId),
              options,
            ).catch(() => [] as import('../types/domain').Character[]),
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
          participants: await readOrFetchQuery(
            queryClient,
            campaignQueries.missionParticipants(mission.campaignId, mission.id),
            options,
          ),
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
      const list = await readPendingApplications(targetCampaignId, options)
      if (targetCampaignId === deps.campaignId) {
        deps.setPendingApplications(list)
      }
      deps.writePendingApplicationsForCampaign(deps.activeUserId, targetCampaignId, list)
      return list
    },
    [deps, readPendingApplications],
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
        const value = await readOrFetchQuery(
          queryClient,
          campaignQueries.missionChat(targetCampaignId, missionId),
        )
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
