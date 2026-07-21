export type CharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type CampaignRole = 'GIOCATORE' | 'CO_MASTER' | 'MASTER' | 'SUPER_MASTER'
export type CampaignMemberStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | 'REJECTED' | 'BANNED'
export type CampaignCharacterStatus = 'ACTIVE' | 'RETIRED' | 'DEAD'
export type MissionStatus = 'OPEN' | 'CLOSED' | 'CONFIRMED' | 'REOPENED' | 'CANCELLED' | 'COMPLETED'
export type MissionStatusReason =
  | 'CONFIRMED_BY_QUORUM'
  | 'CONFIRMED_BY_MAX_PARTICIPANTS'
  | 'CONFIRMED_BY_DEADLINE'
  | 'CONFIRMED_BY_BENCH'
  | 'CLOSED_MANUALLY'
  | 'CLOSED_BY_DEADLINE'
  | 'REOPENED_MANUALLY'
  | 'REOPENED_BY_ROSTER_DROP'
  | 'CANCELLED_MANUALLY'
  | 'CANCELLED_NO_BENCH'
  | 'COMPLETED_MANUALLY'
export type MissionParticipationType = 'TITOLARE' | 'NON_TITOLARE'
export type RoomType = 'ROLEPLAY' | 'SPAM'
export type PlatformRole = 'USER' | 'ADMIN' | 'SYSTEM'
export type RealmRole = 'USER' | 'ADMIN'
export type SheetEntityType = 'CHARACTER' | 'ARMY' | 'DECK'
export type InviteCapability = 'AUTOJOIN'
export type InviteResourceType = 'CAMPAIGN'
export type RealmType = 'GATE_OPEN' | 'STORE' | 'ASSOCIATION' | 'PRIVATE_GROUP' | 'EVENT'

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
  missionRules?: CampaignMissionRuleResponse[]
}

export interface CampaignMissionRuleResponse {
  code: string
  label: string
  description: string | null
  globallyActive: boolean
  availableForGameSystem: boolean
  defaultEnabled: boolean
  campaignEnabled: boolean
  effectiveEnabled: boolean
  benchReasonCode: string
  defaultMessage: string
  configJson: Record<string, unknown>
}

export interface UpdateCampaignMissionRuleRequest {
  code: string
  enabled: boolean
  configJson?: Record<string, unknown>
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

export interface AdminMissionRuleResponse {
  code: string
  label: string
  description: string | null
  globallyActive: boolean
  benchReasonCode: string
  defaultMessage: string
  sortOrder: number
}

export interface AdminMissionRuleUpsertRequest {
  code: string
  label: string
  description?: string
  globallyActive: boolean
  benchReasonCode: string
  defaultMessage: string
  sortOrder: number
}

export interface AdminGameSystemRuleResponse {
  gameSystemCode: string
  ruleCode: string
  defaultEnabled: boolean
  configJson: Record<string, unknown>
}

export interface AdminGameSystemRuleUpsertRequest {
  gameSystemCode: string
  ruleCode: string
  defaultEnabled: boolean
  configJson: Record<string, unknown>
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

export interface RealmDomainResponse {
  id: string
  host: string
  isPrimary: boolean
  isActive: boolean
  verifiedAt: string | null
}

export interface AdminRealmListItem {
  id: string
  code: string
  name: string
  type: RealmType
  isActive: boolean
  logoUrl: string | null
  allowUserCampaignCreation: boolean
  hosts: RealmDomainResponse[]
  createdAt: string
  updatedAt: string
}

export interface AdminRealmPage {
  items: AdminRealmListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}

export interface AdminRealmCreateRequest {
  code: string
  name: string
  type: RealmType
  isActive: boolean
  logoUrl?: string | null
  allowUserCampaignCreation: boolean
  hosts: string[]
}

export interface AdminRealmUpdateRequest {
  code: string
  name: string
  type: RealmType
  isActive: boolean
  logoUrl?: string | null
  allowUserCampaignCreation: boolean
}

export interface PublicRealmBrandingResponse {
  code: string
  name: string
  type: RealmType
  logoUrl: string | null
  allowUserCampaignCreation: boolean
}

export interface RealmPermissionFlags {
  createCampaign: boolean
  manageRealm: boolean
  manageRealmUsers: boolean
  viewRealmAdmin: boolean
}

export interface CurrentRealmPermissionsResponse {
  realmId: string
  realmCode: string
  platformRole: PlatformRole
  realmRole: RealmRole
  explicitRealmAccess: boolean
  permissions: RealmPermissionFlags
}

export interface AdminRealmUserRoleResponse {
  id: string
  realmId: string
  realmCode: string
  realmName: string
  userId: string
  username: string
  profileName: string
  role: RealmRole
  isPrivilegeActive: boolean
  lastUpdate: string
  createdAt: string
  updatedAt: string
}

export interface AdminRealmUserRoleUpsertRequest {
  realmId: string
  userId: string
  role: RealmRole
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
  autoJoinEnabled: boolean
  inviteCode: string
  gameSystem?: string | null
  allowedModules: string[]
  missionRules?: CampaignMissionRuleResponse[]
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
  joinedAt: string | null
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
  autoJoinEnabled: boolean
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
  autoJoinEnabled: boolean
  gameSystem?: string | null
  createdAt: string
}

export interface PostLoginCampaignEntryResponse {
  id: string
  name: string
  summary: string | null
  description: string | null
  founderId: string
  isOpen: boolean
  isActive: boolean
  isVisible: boolean
  autoJoinEnabled: boolean
  gameSystem?: string | null
  createdAt: string
  membershipStatus: CampaignMemberStatus | null
  membershipRole: CampaignRole | null
  moderationReason: string | null
}

export interface PostLoginCampaignSummaryResponse {
  canCreateCampaign: boolean
  campaigns: PostLoginCampaignEntryResponse[]
}

export interface AdminCampaignListItem {
  id: string
  name: string
  realmId: string
  realmCode: string
  realmName: string
  founderId: string
  founderProfileName: string
  isOpen: boolean
  isActive: boolean
  isSearchable: boolean
  autoJoinEnabled: boolean
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
  autoJoinEnabled?: boolean
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
  statusReason: MissionStatusReason | null
  isMultiSession: boolean
  sessionAt: string | null
  closesAt: string | null
  quorum: number | null
  maxParticipants: number | null
  minCharacterLevel: number | null
  maxCharacterLevel: number | null
  participantCount: number
  autoReopenOnDrop: boolean
  createdAt: string
}

export interface MissionParticipantResponse {
  missionId: string
  userId: string
  characterId: string
  characterLevel: number | null
  participationType: MissionParticipationType
  benchReasonCode: string | null
  benchReasonMessage: string | null
  priorityScore: number
  joinedAt: string
}

export type ChatRoomType = 'MISSION_CHAT' | 'CAMPAIGN_SPAM' | 'ROLEPLAY_ROOM'

export interface ChatRoomResponse {
  id: string
  campaignId: string
  roomType: ChatRoomType
  missionId: string | null
  title: string
  slowmodeSeconds: number
  maxPersistedMessages: number | null
  pruneAfterHours: number | null
  isActive: boolean
  createdAt: string
}

export interface ChatMessageResponse {
  id: string
  roomId: string
  authorUserId: string
  authorName: string
  authorProfileName: string
  authorCharacterName: string | null
  authorBadge: string
  body: string
  createdAt: string
}

export interface MissionChatResponse {
  room: ChatRoomResponse
  messages: ChatMessageResponse[]
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
