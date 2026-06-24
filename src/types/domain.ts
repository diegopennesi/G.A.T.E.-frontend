export type CharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type CampaignRole = 'GIOCATORE' | 'CO_MASTER' | 'MASTER' | 'SUPER_MASTER'
export type CampaignMemberStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'REJECTED' | 'BANNED'
export type CampaignCharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type MissionStatus = 'OPEN' | 'CLOSED' | 'CONFIRMED' | 'REOPENED' | 'CANCELLED'
export type MissionParticipationType = 'TITOLARE' | 'NON_TITOLARE'
export type RoomType = 'ROLEPLAY' | 'SPAM'
export type PlatformRole = 'USER' | 'ADMIN' | 'SYSTEM'
export type SheetEntityType = 'CHARACTER' | 'ARMY' | 'DECK'
export type InviteCapability = 'AUTOJOIN'
export type InviteResourceType = 'CAMPAIGN'

export interface SheetSchemaField {
  key?: string
  label?: string
  type?: string
  required?: boolean
  placeholder?: string | null
  helpText?: string | null
  defaultValue?: unknown
  options?: Array<unknown>
}

export interface SheetSchemaBlock {
  key?: string
  label?: string
  description?: string | null
  fields?: SheetSchemaField[]
}

export interface CampaignCatalogEntry {
  code: string
  label: string
  description: string | null
  active: boolean
  sortOrder: number
}

export interface SheetTypeCatalogEntry {
  code: string
  label: string
  description: string | null
  gameSystemCode: string
  entityType: SheetEntityType
  schemaVersion: number
  sortOrder: number
  active: boolean
  isDefault: boolean
  schemaJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AdminGameSystemUpsertRequest {
  code: string
  label: string
  description?: string
  active: boolean
  sortOrder: number
}

export interface AdminSheetTypeUpsertRequest {
  code: string
  label: string
  description?: string
  gameSystemCode: string
  entityType: SheetEntityType
  schemaVersion: number
  sortOrder: number
  active: boolean
  isDefault: boolean
  schemaJson: Record<string, unknown>
}

export interface CharacterSheetResponse {
  characterId: string
  campaignId: string
  gameSystemCode: string | null
  sheetTypeCode: string | null
  schemaVersion: number
  schemaJson: Record<string, unknown>
  dataJson: Record<string, unknown>
  hasTemplate: boolean
  editable: boolean
  updatedAt: string | null
}

export interface UpdateCharacterSheetRequest {
  dataJson: Record<string, unknown>
}

export interface UserProfile {
  id: string
  username: string | null
  platformRole?: PlatformRole | null
  profileName: string
  bio: string | null
  avatarUrl: string | null
  whatsapp: string | null
  socialLinks: Record<string, string>
  createdAt: string
}

export interface AdminUserListItem {
  id: string
  username: string
  profileName: string
  platformRole: PlatformRole
  isActive: boolean
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminUserUpdateRequest {
  platformRole: PlatformRole
  isActive: boolean
}

export interface AdminUserPage {
  items: AdminUserListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
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
  summary: string | null
  setting: string | null
  tone: string | null
  rules: string | null
  requirements: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  isActive: boolean
  isSearchable: boolean
  inviteCode: string
  gameSystem?: string | null
  allowedModules: string[]
  createdAt: string
}

export interface CampaignInviteCodeResponse {
  inviteCode: string
}

export interface CreateInviteTokenRequest {
  capabilities: InviteCapability[]
  expiresAt?: string | null
  maxUses?: number | null
}

export interface InviteTokenResponse {
  id: string
  resourceType: InviteResourceType
  resourceId: string
  token: string
  capabilities: InviteCapability[]
  createdByUserId: string
  expiresAt: string | null
  maxUses: number | null
  useCount: number
  isActive: boolean
  createdAt: string
}

export interface InviteTokenPreviewResponse {
  campaignId: string
  campaignName: string
  campaignSummary: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  gameSystem: string
  capabilities: InviteCapability[]
}

export interface CampaignMembershipResponse {
  userId: string
  campaignId: string
  characterId: string | null
  role: CampaignRole
  memberStatus: CampaignMemberStatus
  characterStatus: CampaignCharacterStatus | null
  moderationReason: string | null
  moderationByUserId: string | null
  moderationAt: string | null
}

export interface MyCampaignMembershipResponse {
  campaignId: string
  campaignName: string
  role: CampaignRole
  memberStatus: CampaignMemberStatus
  characterStatus: CampaignCharacterStatus | null
  moderationReason: string | null
  isFounder: boolean
}

export interface CampaignDiscoverResponse {
  id: string
  name: string
  description: string | null
  summary: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  isActive: boolean
  isSearchable: boolean
  inviteCode?: string
  gameSystem?: string | null
  createdAt: string
  membershipStatus: CampaignMemberStatus | null
  membershipRole: CampaignRole | null
  moderationReason: string | null
}

export interface CampaignInvitePreviewResponse {
  id: string
  name: string
  description: string | null
  summary: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  isActive: boolean
  gameSystem?: string | null
  createdAt: string
}

export interface AdminCampaignListItem {
  id: string
  name: string
  founderId: string
  founderProfileName: string
  isOpen: boolean
  isActive: boolean
  isSearchable: boolean
  gameSystem: string
  allowedModules: string[]
  createdAt: string
}

export interface AdminCampaignPage {
  items: AdminCampaignListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}

export interface AdminCampaignUpdateRequest {
  isOpen: boolean
  isActive: boolean
  isSearchable: boolean
  gameSystem: string
  allowedModules: string[]
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
  quorum: number | null
  maxParticipants: number | null
  participantCount: number
  autoReopenOnDrop: boolean
  createdAt: string
}

export interface MissionParticipantResponse {
  missionId: string
  userId: string
  characterId: string
  participationType: MissionParticipationType
  priorityScore: number
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
