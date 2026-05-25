export type CharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'

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
