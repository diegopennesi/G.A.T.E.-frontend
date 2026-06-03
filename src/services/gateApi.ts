import { ApiError, apiRequest, clearTokens, setTokens } from './apiClient'
import type {
  CampaignApplicationResponse,
  CampaignDiscoverResponse,
  AuthSession,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
  CampaignResponse,
  Character,
  CharacterStatus,
  MyCampaignMembershipResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
  RoomResponse,
  UserProfile,
} from '../types/domain'

type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const data = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  })
  setTokens(data.accessToken, data.refreshToken)
  return data
}

export async function register(params: {
  username: string
  password: string
  profileName?: string
  bio?: string
}): Promise<AuthSession> {
  const data = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      username: params.username,
      password: params.password,
      profileName: params.profileName || undefined,
      bio: params.bio || undefined,
      socialLinks: {},
    },
  })
  setTokens(data.accessToken, data.refreshToken)
  return data
}

export function logout() {
  clearTokens()
}

export async function getMe(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me')
}

export async function updateMe(payload: {
  profileName: string
  bio: string
  whatsapp: string
  instagram: string
  otherSocial: string
}): Promise<UserProfile> {
  const socialLinks: Record<string, string> = {}
  if (payload.instagram.trim()) socialLinks.instagram = payload.instagram.trim()
  if (payload.otherSocial.trim()) socialLinks.other = payload.otherSocial.trim()

  return apiRequest<UserProfile>('/users/me', {
    method: 'PATCH',
    body: {
      profileName: payload.profileName.trim(),
      bio: payload.bio.trim() || null,
      whatsapp: payload.whatsapp.trim() || null,
      socialLinks,
    },
  })
}

export async function getPublicProfile(userId: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/users/${userId}`)
}

export async function createCampaign(payload: {
  name: string
  description?: string
  summary?: string
  setting?: string
  tone?: string
  rules?: string
  requirements?: string
  coverImageUrl?: string
  isOpen?: boolean
  isSearchable?: boolean
  allowedModules?: string[]
}): Promise<CampaignResponse> {
  return apiRequest<CampaignResponse>('/campaigns', {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      description: payload.description || null,
      summary: payload.summary || null,
      setting: payload.setting || null,
      tone: payload.tone || null,
      rules: payload.rules || null,
      requirements: payload.requirements || null,
      coverImageUrl: payload.coverImageUrl || null,
      isOpen: payload.isOpen ?? true,
      isSearchable: payload.isSearchable ?? true,
      allowedModules: payload.allowedModules ?? [],
    },
  })
}

export async function getCampaign(campaignId: string): Promise<CampaignResponse> {
  return apiRequest<CampaignResponse>(`/campaigns/${campaignId}`)
}

export async function updateCampaign(
  campaignId: string,
  payload: {
    name: string
    description?: string
    summary?: string
    setting?: string
    tone?: string
    rules?: string
    requirements?: string
    coverImageUrl?: string
    isOpen: boolean
    isSearchable: boolean
    allowedModules?: string[]
  },
): Promise<CampaignResponse> {
  return apiRequest<CampaignResponse>(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: {
      name: payload.name.trim(),
      description: payload.description || null,
      summary: payload.summary || null,
      setting: payload.setting || null,
      tone: payload.tone || null,
      rules: payload.rules || null,
      requirements: payload.requirements || null,
      coverImageUrl: payload.coverImageUrl || null,
      isOpen: payload.isOpen,
      isSearchable: payload.isSearchable,
      allowedModules: payload.allowedModules ?? [],
    },
  })
}

export async function discoverCampaigns(openOnly = false): Promise<CampaignDiscoverResponse[]> {
  return apiRequest<CampaignDiscoverResponse[]>(`/campaigns/discover?openOnly=${openOnly ? 'true' : 'false'}`)
}

export async function listCampaignModules(): Promise<string[]> {
  return apiRequest<string[]>('/campaigns/modules')
}

export async function applyToCampaign(
  campaignId: string,
  characterId?: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/apply`, {
    method: 'POST',
    body: { characterId: characterId || null },
  })
}

export async function approveApplication(
  campaignId: string,
  applicantUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(
    `/campaigns/${campaignId}/applications/${applicantUserId}/approve`,
    { method: 'POST', body: {} },
  )
}

export async function rejectApplication(
  campaignId: string,
  applicantUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(
    `/campaigns/${campaignId}/applications/${applicantUserId}/reject`,
    { method: 'POST', body: {} },
  )
}

export async function listPendingApplications(campaignId: string): Promise<CampaignApplicationResponse[]> {
  return apiRequest<CampaignApplicationResponse[]>(`/campaigns/${campaignId}/applications/pending`)
}

export async function getCampaignMembers(campaignId: string): Promise<CampaignMembershipResponse[]> {
  return apiRequest<CampaignMembershipResponse[]>(`/campaigns/${campaignId}/members`)
}

export async function listCampaignMembersForManagement(campaignId: string): Promise<CampaignMembershipResponse[]> {
  return apiRequest<CampaignMembershipResponse[]>(`/campaigns/${campaignId}/members/all`)
}

export async function getCampaignMember(campaignId: string, memberUserId: string): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}`)
}

export async function updateCampaignMemberRole(
  campaignId: string,
  memberUserId: string,
  role: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

export async function banCampaignMember(
  campaignId: string,
  memberUserId: string,
  reason: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/ban`, {
    method: 'POST',
    body: { reason },
  })
}

export async function suspendCampaignMember(
  campaignId: string,
  memberUserId: string,
  reason: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/suspend`, {
    method: 'POST',
    body: { reason },
  })
}

export async function unsuspendCampaignMember(
  campaignId: string,
  memberUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/unsuspend`, {
    method: 'POST',
    body: {},
  })
}

export async function unbanCampaignMember(
  campaignId: string,
  memberUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/unban`, {
    method: 'POST',
    body: {},
  })
}

export async function approveCampaignMember(
  campaignId: string,
  memberUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/approve`, {
    method: 'POST',
    body: {},
  })
}

export async function rejectCampaignMember(
  campaignId: string,
  memberUserId: string,
): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/${memberUserId}/reject`, {
    method: 'POST',
    body: {},
  })
}

export async function listMyCampaignMemberships(): Promise<MyCampaignMembershipResponse[]> {
  try {
    return await apiRequest<MyCampaignMembershipResponse[]>('/campaigns/me/memberships')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return apiRequest<MyCampaignMembershipResponse[]>('/users/me/campaign-memberships')
    }
    throw error
  }
}

export async function checkPermission(
  campaignId: string,
  action: string,
): Promise<CampaignPermissionResponse> {
  return apiRequest<CampaignPermissionResponse>(`/campaigns/${campaignId}/permissions/${action}`)
}

export async function transferOwnership(
  campaignId: string,
  newOwnerUserId: string,
): Promise<CampaignResponse> {
  return apiRequest<CampaignResponse>(`/campaigns/${campaignId}/ownership/transfer`, {
    method: 'POST',
    body: { newOwnerUserId },
  })
}

export async function leaveCampaign(campaignId: string): Promise<CampaignMembershipResponse> {
  return apiRequest<CampaignMembershipResponse>(`/campaigns/${campaignId}/members/me/leave`, {
    method: 'POST',
    body: {},
  })
}

export async function listCharacters(campaignId: string): Promise<Character[]> {
  return apiRequest<Character[]>(`/campaigns/${campaignId}/characters`)
}

export async function getCharacter(campaignId: string, characterId: string): Promise<Character> {
  return apiRequest<Character>(`/campaigns/${campaignId}/characters/${characterId}`)
}

export async function createCharacter(
  campaignId: string,
  payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean },
): Promise<Character> {
  return apiRequest<Character>(`/campaigns/${campaignId}/characters`, {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      nickname: payload.nickname?.trim() || null,
      portraitUrl: payload.portraitUrl?.trim() || null,
      isNpc: payload.isNpc || false,
    },
  })
}

export async function updateCharacterStatus(
  campaignId: string,
  characterId: string,
  status: CharacterStatus,
): Promise<Character> {
  return apiRequest<Character>(`/campaigns/${campaignId}/characters/${characterId}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export async function listMissions(campaignId: string, since?: string): Promise<MissionResponse[]> {
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  return apiRequest<MissionResponse[]>(`/campaigns/${campaignId}/missions${query}`)
}

export async function createMission(
  campaignId: string,
  payload: {
    title: string
    description?: string
    isMultiSession?: boolean
    sessionAt?: string
    closesAt?: string
    quorum?: number | null
    maxParticipants?: number | null
    autoReopenOnDrop?: boolean
  },
): Promise<MissionResponse> {
  return apiRequest<MissionResponse>(`/campaigns/${campaignId}/missions`, {
    method: 'POST',
    body: {
      title: payload.title.trim(),
      description: payload.description || null,
      isMultiSession: payload.isMultiSession ?? false,
      sessionAt: payload.sessionAt || null,
      closesAt: payload.closesAt || null,
      quorum: payload.quorum ?? null,
      maxParticipants: payload.maxParticipants ?? null,
      autoReopenOnDrop: payload.autoReopenOnDrop ?? true,
    },
  })
}

export async function reopenMission(campaignId: string, missionId: string): Promise<MissionResponse> {
  return apiRequest<MissionResponse>(`/campaigns/${campaignId}/missions/${missionId}/reopen`, {
    method: 'POST',
    body: {},
  })
}

export async function closeMission(campaignId: string, missionId: string): Promise<MissionResponse> {
  return apiRequest<MissionResponse>(`/campaigns/${campaignId}/missions/${missionId}/close`, {
    method: 'POST',
    body: {},
  })
}

export async function updateMission(
  campaignId: string,
  missionId: string,
  payload: {
    title: string
    description?: string
    isMultiSession?: boolean
    sessionAt?: string
    closesAt?: string
    quorum?: number | null
    maxParticipants?: number | null
    autoReopenOnDrop?: boolean
  },
): Promise<MissionResponse> {
  return apiRequest<MissionResponse>(`/campaigns/${campaignId}/missions/${missionId}`, {
    method: 'PATCH',
    body: {
      title: payload.title.trim(),
      description: payload.description || null,
      isMultiSession: payload.isMultiSession ?? false,
      sessionAt: payload.sessionAt || null,
      closesAt: payload.closesAt || null,
      quorum: payload.quorum ?? null,
      maxParticipants: payload.maxParticipants ?? null,
      autoReopenOnDrop: payload.autoReopenOnDrop ?? true,
    },
  })
}

export async function cancelMission(campaignId: string, missionId: string): Promise<MissionResponse> {
  return apiRequest<MissionResponse>(`/campaigns/${campaignId}/missions/${missionId}/cancel`, {
    method: 'POST',
    body: {},
  })
}

export async function joinMission(
  campaignId: string,
  missionId: string,
  payload: { characterId: string; participationType: MissionParticipationType },
): Promise<MissionParticipantResponse> {
  return apiRequest<MissionParticipantResponse>(
    `/campaigns/${campaignId}/missions/${missionId}/participants/me/join`,
    {
      method: 'POST',
      body: payload,
    },
  )
}

export async function leaveMission(campaignId: string, missionId: string): Promise<MissionParticipantResponse> {
  return apiRequest<MissionParticipantResponse>(
    `/campaigns/${campaignId}/missions/${missionId}/participants/me/leave`,
    {
      method: 'POST',
      body: {},
    },
  )
}

export async function updateMissionParticipationType(
  campaignId: string,
  missionId: string,
  payload: { participationType: MissionParticipationType },
): Promise<MissionParticipantResponse> {
  return apiRequest<MissionParticipantResponse>(
    `/campaigns/${campaignId}/missions/${missionId}/participants/me/type`,
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export async function listRooms(campaignId: string): Promise<RoomResponse[]> {
  return apiRequest<RoomResponse[]>(`/campaigns/${campaignId}/rooms`)
}

export async function createRoom(
  campaignId: string,
  payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number },
): Promise<RoomResponse> {
  return apiRequest<RoomResponse>(`/campaigns/${campaignId}/rooms`, {
    method: 'POST',
    body: payload,
  })
}
