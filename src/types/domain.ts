export type CharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type CampaignRole = 'GIOCATORE' | 'CO_MASTER' | 'MASTER' | 'SUPER_MASTER'
export type CampaignMemberStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED'
export type CampaignCharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type MissionStatus = 'OPEN' | 'CLOSED' | 'CONFIRMED' | 'REOPENED'
export type MissionParticipationType = 'TITOLARE' | 'NON_TITOLARE'
export type RoomType = 'ROLEPLAY' | 'SPAM'

export interface UserProfile {
  id: string
  username: string | null
  profileName: string
  bio: string | null
  avatarUrl: string | null
  whatsapp: string | null
  socialLinks: Record<string, string>
  createdAt: string
}

export interface Character {
  id: string
  userId: string | null
  ownerProfileName: string | null
  name: string
  nickname: string | null
  portraitUrl: string | null
  isNpc: boolean
  campaignId: string | null
  characterStatus: CharacterStatus | null
  createdAt: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

export interface ErrorPayload {
  status: number
  error: string
  message: string
  fields?: Record<string, string>
}

export interface CampaignResponse {
  id: string
  name: string
  description: string | null
  founderId: string
  isOpen: boolean
  isSearchable: boolean
  allowedModules: string[]
  createdAt: string
}

export interface CampaignMembershipResponse {
  userId: string
  campaignId: string
  characterId: string | null
  role: CampaignRole
  memberStatus: CampaignMemberStatus
  characterStatus: CampaignCharacterStatus | null
}

export interface MyCampaignMembershipResponse {
  campaignId: string
  campaignName: string
  role: CampaignRole
  memberStatus: CampaignMemberStatus
  characterStatus: CampaignCharacterStatus | null
  isFounder: boolean
}

export interface CampaignDiscoverResponse {
  id: string
  name: string
  description: string | null
  founderId: string
  isOpen: boolean
  isSearchable: boolean
  createdAt: string
  membershipStatus: CampaignMemberStatus | null
  membershipRole: CampaignRole | null
}

export interface CampaignApplicationResponse {
  userId: string
  username: string
  profileName: string
  campaignId: string
  characterId: string | null
  role: CampaignRole
  memberStatus: CampaignMemberStatus
  characterStatus: CampaignCharacterStatus | null
  requestedAt: string
}

export interface CampaignPermissionResponse {
  campaignId: string
  action: string
  allowed: boolean
}

export interface MissionResponse {
  id: string
  campaignId: string
  title: string
  description: string | null
  createdBy: string
  status: MissionStatus
  isMultiSession: boolean
  sessionAt: string | null
  closesAt: string | null
  createdAt: string
}

export interface MissionParticipantResponse {
  missionId: string
  userId: string
  characterId: string
  participationType: MissionParticipationType
  joinedAt: string
}

export interface RoomResponse {
  id: string
  campaignId: string
  createdBy: string
  name: string
  type: RoomType
  ttlHours: number
  slowmodeSeconds: number
  isActive: boolean
  createdAt: string
}
