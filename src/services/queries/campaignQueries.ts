import { queryOptions } from '@tanstack/react-query'
import {
  checkPermission,
  getCampaign,
  getCampaignMembers,
  getMissionChat,
  listCampaignMembersForManagement,
  listCharacters,
  listMissionParticipants,
  listMissions,
  listPendingApplications,
  listRooms,
} from '../gateApi'
import { queryKeys } from '../queryKeys'

export const campaignQueries = {
  details: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignDetails(campaignId),
      queryFn: () => getCampaign(campaignId),
    }),
  members: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignMembers(campaignId),
      queryFn: () => getCampaignMembers(campaignId),
    }),
  membersForManagement: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignMembersForManagement(campaignId),
      queryFn: () => listCampaignMembersForManagement(campaignId),
    }),
  characters: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignCharacters(campaignId),
      queryFn: () => listCharacters(campaignId),
    }),
  missions: (campaignId: string, since: string) =>
    queryOptions({
      queryKey: queryKeys.campaignMissions(campaignId, since),
      queryFn: () => listMissions(campaignId, since),
    }),
  rooms: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignRooms(campaignId),
      queryFn: () => listRooms(campaignId),
    }),
  permission: (campaignId: string, action: string) =>
    queryOptions({
      queryKey: queryKeys.campaignPermission(campaignId, action),
      queryFn: () => checkPermission(campaignId, action),
    }),
  pendingApplications: (campaignId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignPendingApplications(campaignId),
      queryFn: () => listPendingApplications(campaignId),
    }),
  missionParticipants: (campaignId: string, missionId: string) =>
    queryOptions({
      queryKey: queryKeys.missionParticipants(campaignId, missionId),
      queryFn: () => listMissionParticipants(campaignId, missionId),
    }),
  missionChat: (campaignId: string, missionId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignChat(campaignId, missionId),
      queryFn: () => getMissionChat(campaignId, missionId),
    }),
} as const
