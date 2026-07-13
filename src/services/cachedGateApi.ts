import type {
  CampaignApplicationResponse,
  CampaignCatalogEntry,
  AdminCampaignPage,
  AdminRealmPage,
  AdminRealmUserRoleResponse,
  AdminUserPage,
  CampaignMembershipResponse,
  CampaignResponse,
  Character,
  CampaignDiscoverResponse,
  CurrentRealmPermissionsResponse,
  MissionParticipantResponse,
  MissionResponse,
  MyCampaignMembershipResponse,
  PostLoginCampaignSummaryResponse,
  SheetTypeCatalogEntry,
  UserProfile,
  PublicRealmBrandingResponse,
} from '../types/domain'
import {
  getCampaign,
  getCampaignMember,
  getCampaignMembers,
  checkPermission,
  discoverCampaigns,
  getCurrentRealmPermissions,
  getMe,
  getCharacter,
  getCharacterSheet,
  getMissionChat,
  getPublicProfile,
  getPublicRealmBranding,
  getPostLoginCampaignSummary,
  listAdminCampaigns,
  listAdminGameSystems,
  listAdminRealmUserRoles,
  listAdminRealms,
  listAdminSheetTypes,
  listAdminUsers,
  listCampaignGameSystems,
  listCampaignModules,
  listCharacters,
  listCampaignMembersForManagement,
  listMissionParticipants,
  listMissions,
  listMyCampaignMemberships,
  listPendingApplications,
  listRooms,
} from './gateApi'
import { clearScopedCache, loadScopedCache, markScopedCacheGroupStale, markScopedCacheStale, writeScopedCache } from './scopedCache'

const SLICE_KEYS = {
  profile: 'profile',
  memberships: 'campaign-memberships',
  realmPermissions: 'realm-permissions',
  postLoginSummary: 'post-login-summary',
  discoverCampaigns: (openOnly: boolean) => `discover-campaigns:${openOnly ? 'open' : 'all'}`,
  campaignDetails: (campaignId: string) => `campaign-details:${campaignId}`,
  campaignMembers: (campaignId: string) => `campaign-members:${campaignId}`,
  campaignMembersForManagement: (campaignId: string) => `campaign-members-management:${campaignId}`,
  campaignMember: (campaignId: string, userId: string) => `campaign-member:${campaignId}:${userId}`,
  campaignCharacters: (campaignId: string) => `campaign-characters:${campaignId}`,
  campaignCharacterDetail: (campaignId: string, characterId: string) => `campaign-character-detail:${campaignId}:${characterId}`,
  campaignCharacterSheet: (campaignId: string, characterId: string) => `campaign-character-sheet:${campaignId}:${characterId}`,
  campaignMissions: (campaignId: string) => `campaign-missions:${campaignId}`,
  campaignPendingApplications: (campaignId: string) => `campaign-pending-applications:${campaignId}`,
  missionParticipants: (campaignId: string, missionId: string) => `mission-participants:${campaignId}:${missionId}`,
  campaignChat: (campaignId: string, missionId: string) => `campaign-chat:${campaignId}:${missionId}`,
  publicProfile: (targetUserId: string) => `public-profile:${targetUserId}`,
  campaignRooms: (campaignId: string) => `campaign-rooms:${campaignId}`,
  campaignPermission: (campaignId: string, action: string) => `campaign-permission:${campaignId}:${action}`,
  campaignModules: 'campaign-modules',
  campaignGameSystems: 'campaign-game-systems',
  publicRealmBranding: 'public-realm-branding',
  adminUsers: (page: number, query: string) => `admin-users:${page}:${query || '*'}`,
  adminCampaigns: (page: number) => `admin-campaigns:${page}`,
  adminRealms: (page: number, query: string) => `admin-realms:${page}:${query || '*'}`,
  adminRealmUserRoles: (realmId: string) => `admin-realm-user-roles:${realmId}`,
  adminGameSystems: 'admin-game-systems',
  adminSheetTypes: 'admin-sheet-types',
} as const

type UserScope = {
  userId: string
  realmCode?: string | null
}

export function primeCachedProfile(scope: UserScope, profile: UserProfile): void {
  writeScopedCache(SLICE_KEYS.profile, scope, profile)
}

export function primeCachedMemberships(scope: UserScope, memberships: MyCampaignMembershipResponse[]): void {
  writeScopedCache(SLICE_KEYS.memberships, scope, memberships)
}

export function primeCachedCampaignDetails(scope: UserScope, campaign: CampaignResponse): void {
  writeScopedCache(SLICE_KEYS.campaignDetails(campaign.id), scope, campaign)
}

export async function loadCachedProfile(scope: UserScope, options: { force?: boolean } = {}): Promise<UserProfile> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.profile,
    scope,
    force: options.force,
    loader: () => getMe(),
  })
}

export async function loadCachedMemberships(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<MyCampaignMembershipResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.memberships,
    scope,
    force: options.force,
    loader: () => listMyCampaignMemberships(),
  })
}

export async function loadCachedRealmPermissions(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<CurrentRealmPermissionsResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.realmPermissions,
    scope,
    force: options.force,
    loader: () => getCurrentRealmPermissions(),
  })
}

export async function loadCachedPublicRealmBranding(
  scope: UserScope,
  realmCode: string,
  options: { force?: boolean } = {},
): Promise<PublicRealmBrandingResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.publicRealmBranding,
    scope,
    force: options.force,
    loader: () => getPublicRealmBranding(realmCode),
  })
}

export async function loadCachedAdminUsers(
  scope: UserScope,
  page = 0,
  query?: string,
  options: { force?: boolean } = {},
): Promise<AdminUserPage> {
  const normalizedQuery = query?.trim() || ''
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminUsers(page, normalizedQuery),
    scope,
    force: options.force,
    loader: () => listAdminUsers(page, normalizedQuery),
  })
}

export async function loadCachedAdminCampaigns(
  scope: UserScope,
  page = 0,
  options: { force?: boolean } = {},
): Promise<AdminCampaignPage> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminCampaigns(page),
    scope,
    force: options.force,
    loader: () => listAdminCampaigns(page),
  })
}

export async function loadCachedAdminRealms(
  scope: UserScope,
  page = 0,
  query?: string,
  options: { force?: boolean } = {},
): Promise<AdminRealmPage> {
  const normalizedQuery = query?.trim() || ''
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminRealms(page, normalizedQuery),
    scope,
    force: options.force,
    loader: () => listAdminRealms(page, normalizedQuery),
  })
}

export async function loadCachedAdminRealmUserRoles(
  scope: UserScope,
  realmId: string,
  options: { force?: boolean } = {},
): Promise<AdminRealmUserRoleResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminRealmUserRoles(realmId),
    scope,
    force: options.force,
    loader: () => listAdminRealmUserRoles({ realmId }),
  })
}

export async function loadCachedAdminGameSystems(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<CampaignCatalogEntry[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminGameSystems,
    scope,
    force: options.force,
    loader: () => listAdminGameSystems(),
  })
}

export async function loadCachedAdminSheetTypes(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<SheetTypeCatalogEntry[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.adminSheetTypes,
    scope,
    force: options.force,
    loader: () => listAdminSheetTypes(),
  })
}

export async function loadCachedPostLoginSummary(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<PostLoginCampaignSummaryResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.postLoginSummary,
    scope,
    force: options.force,
    loader: () => getPostLoginCampaignSummary(),
  })
}

export async function loadCachedDiscoverCampaigns(
  scope: UserScope,
  options: { force?: boolean; openOnly?: boolean } = {},
): Promise<CampaignDiscoverResponse[]> {
  const openOnly = options.openOnly ?? false
  return loadScopedCache({
    sliceKey: SLICE_KEYS.discoverCampaigns(openOnly),
    scope,
    force: options.force,
    loader: () => discoverCampaigns(openOnly),
  })
}

export async function loadCachedCampaignDetails(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<CampaignResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignDetails(campaignId),
    scope,
    force: options.force,
    loader: () => getCampaign(campaignId),
  })
}

export async function loadCachedCampaignMembers(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<CampaignMembershipResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignMembers(campaignId),
    scope,
    force: options.force,
    loader: () => getCampaignMembers(campaignId),
  })
}

export async function loadCachedCampaignMembersForManagement(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<CampaignMembershipResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignMembersForManagement(campaignId),
    scope,
    force: options.force,
    loader: () => listCampaignMembersForManagement(campaignId),
  })
}

export async function loadCachedCampaignMember(
  scope: UserScope,
  campaignId: string,
  userId: string,
  options: { force?: boolean } = {},
): Promise<CampaignMembershipResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignMember(campaignId, userId),
    scope,
    force: options.force,
    loader: () => getCampaignMember(campaignId, userId),
  })
}

export async function loadCachedCampaignCharacters(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<Character[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignCharacters(campaignId),
    scope,
    force: options.force,
    loader: () => listCharacters(campaignId),
  })
}

export async function loadCachedCharacterDetail(
  scope: UserScope,
  campaignId: string,
  characterId: string,
  options: { force?: boolean } = {},
): Promise<Character> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignCharacterDetail(campaignId, characterId),
    scope,
    force: options.force,
    loader: () => getCharacter(campaignId, characterId),
  })
}

export async function loadCachedCharacterSheet(
  scope: UserScope,
  campaignId: string,
  characterId: string,
  options: { force?: boolean } = {},
): Promise<import('../types/domain').CharacterSheetResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignCharacterSheet(campaignId, characterId),
    scope,
    force: options.force,
    loader: () => getCharacterSheet(campaignId, characterId),
  })
}

export async function loadCachedCampaignMissions(
  scope: UserScope,
  campaignId: string,
  since: string,
  options: { force?: boolean } = {},
): Promise<MissionResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignMissions(campaignId),
    scope,
    force: options.force,
    loader: () => listMissions(campaignId, since),
  })
}

export async function loadCachedPendingApplications(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<CampaignApplicationResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignPendingApplications(campaignId),
    scope,
    force: options.force,
    loader: () => listPendingApplications(campaignId),
  })
}

export async function loadCachedCampaignRooms(
  scope: UserScope,
  campaignId: string,
  options: { force?: boolean } = {},
): Promise<import('../types/domain').RoomResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignRooms(campaignId),
    scope,
    force: options.force,
    loader: () => listRooms(campaignId),
  })
}

export async function loadCachedCampaignPermission(
  scope: UserScope,
  campaignId: string,
  action: string,
  options: { force?: boolean } = {},
): Promise<import('../types/domain').CampaignPermissionResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignPermission(campaignId, action),
    scope,
    force: options.force,
    loader: () => checkPermission(campaignId, action),
  })
}

export async function loadCachedCampaignModules(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<CampaignCatalogEntry[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignModules,
    scope,
    force: options.force,
    loader: () => listCampaignModules(),
  })
}

export async function loadCachedCampaignGameSystems(
  scope: UserScope,
  options: { force?: boolean } = {},
): Promise<CampaignCatalogEntry[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignGameSystems,
    scope,
    force: options.force,
    loader: () => listCampaignGameSystems(),
  })
}

export async function loadCachedMissionParticipants(
  scope: UserScope,
  campaignId: string,
  missionId: string,
  options: { force?: boolean } = {},
): Promise<MissionParticipantResponse[]> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.missionParticipants(campaignId, missionId),
    scope,
    force: options.force,
    loader: () => listMissionParticipants(campaignId, missionId),
  })
}

export async function loadCachedMissionChat(
  scope: UserScope,
  campaignId: string,
  missionId: string,
  options: { force?: boolean } = {},
): Promise<import('../types/domain').MissionChatResponse> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.campaignChat(campaignId, missionId),
    scope,
    force: options.force,
    loader: () => getMissionChat(campaignId, missionId),
  })
}

export async function loadCachedPublicProfile(
  scope: UserScope,
  targetUserId: string,
  options: { force?: boolean } = {},
): Promise<UserProfile> {
  return loadScopedCache({
    sliceKey: SLICE_KEYS.publicProfile(targetUserId),
    scope,
    force: options.force,
    loader: () => getPublicProfile(targetUserId),
  })
}

export function markProfileCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.profile, scope)
}

export function markMembershipsCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.memberships, scope)
}

export function markRealmPermissionsCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.realmPermissions, scope)
}

export function markPostLoginSummaryCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.postLoginSummary, scope)
}

export function markDiscoverCampaignsCacheStale(scope: UserScope, openOnly = false): void {
  markScopedCacheStale(SLICE_KEYS.discoverCampaigns(openOnly), scope)
}

export function markCampaignDetailsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignDetails(campaignId), scope)
}

export function markCampaignMembersCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignMembers(campaignId), scope)
}

export function markCampaignMembersForManagementCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignMembersForManagement(campaignId), scope)
}

export function markCampaignMemberCacheStale(scope: UserScope, campaignId: string, userId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignMember(campaignId, userId), scope)
}

export function markCampaignMemberGroupCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheGroupStale(SLICE_KEYS.campaignMember(campaignId, ''), scope)
}

export function markCampaignCharactersCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignCharacters(campaignId), scope)
}

export function markCampaignCharacterDetailCacheStale(scope: UserScope, campaignId: string, characterId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignCharacterDetail(campaignId, characterId), scope)
}

export function markCampaignCharacterSheetCacheStale(scope: UserScope, campaignId: string, characterId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignCharacterSheet(campaignId, characterId), scope)
}

export function markCampaignMissionsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignMissions(campaignId), scope)
}

export function markPendingApplicationsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignPendingApplications(campaignId), scope)
}

export function markCampaignRoomsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignRooms(campaignId), scope)
}

export function markCampaignPermissionCacheStale(scope: UserScope, campaignId: string, action: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignPermission(campaignId, action), scope)
}

export function markCampaignPermissionsCacheStale(scope: UserScope, campaignId: string): void {
  for (const action of [
    'PROMOTE_CO_MASTER_OR_MASTER',
    'CREATE_ROOM',
    'APPROVE_OR_REJECT_APPLICATIONS',
    'TRANSFER_OWNERSHIP',
    'MANAGE_CAMPAIGN_SETTINGS',
  ]) {
    markScopedCacheStale(SLICE_KEYS.campaignPermission(campaignId, action), scope)
  }
}

export function markCampaignModulesCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.campaignModules, scope)
}

export function markCampaignGameSystemsCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.campaignGameSystems, scope)
}

export function markPublicRealmBrandingCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.publicRealmBranding, scope)
}

export function markAdminUsersCacheStale(scope: UserScope): void {
  markScopedCacheGroupStale('admin-users:', scope)
}

export function markAdminCampaignsCacheStale(scope: UserScope): void {
  markScopedCacheGroupStale('admin-campaigns:', scope)
}

export function markAdminRealmsCacheStale(scope: UserScope): void {
  markScopedCacheGroupStale('admin-realms:', scope)
}

export function markAdminRealmUserRolesCacheStale(scope: UserScope): void {
  markScopedCacheGroupStale('admin-realm-user-roles:', scope)
}

export function markAdminCatalogsCacheStale(scope: UserScope): void {
  markScopedCacheStale(SLICE_KEYS.adminGameSystems, scope)
  markScopedCacheStale(SLICE_KEYS.adminSheetTypes, scope)
}

export function markMissionParticipantsCacheStale(scope: UserScope, campaignId: string, missionId: string): void {
  markScopedCacheStale(SLICE_KEYS.missionParticipants(campaignId, missionId), scope)
}

export function markCampaignChatCacheStale(scope: UserScope, campaignId: string, missionId: string): void {
  markScopedCacheStale(SLICE_KEYS.campaignChat(campaignId, missionId), scope)
}

export function markCampaignMissionParticipantsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheGroupStale(SLICE_KEYS.missionParticipants(campaignId, ''), scope)
}

export function markCampaignCharacterDetailsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheGroupStale(SLICE_KEYS.campaignCharacterDetail(campaignId, ''), scope)
}

export function markCampaignCharacterSheetsCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheGroupStale(SLICE_KEYS.campaignCharacterSheet(campaignId, ''), scope)
}

export function markCampaignChatGroupCacheStale(scope: UserScope, campaignId: string): void {
  markScopedCacheGroupStale(SLICE_KEYS.campaignChat(campaignId, ''), scope)
}

export function markPublicProfileCacheStale(scope: UserScope, targetUserId: string): void {
  markScopedCacheStale(SLICE_KEYS.publicProfile(targetUserId), scope)
}

export function clearUserScopedBootstrapCache(scope: UserScope): void {
  clearScopedCache(SLICE_KEYS.profile, scope)
  clearScopedCache(SLICE_KEYS.memberships, scope)
  clearScopedCache(SLICE_KEYS.realmPermissions, scope)
  clearScopedCache(SLICE_KEYS.postLoginSummary, scope)
  clearScopedCache(SLICE_KEYS.discoverCampaigns(false), scope)
  clearScopedCache(SLICE_KEYS.discoverCampaigns(true), scope)
  clearScopedCache(SLICE_KEYS.campaignModules, scope)
  clearScopedCache(SLICE_KEYS.campaignGameSystems, scope)
  clearScopedCache(SLICE_KEYS.publicRealmBranding, { userId: '__realm__', realmCode: scope.realmCode })
  markAdminUsersCacheStale(scope)
  markAdminCampaignsCacheStale(scope)
  markAdminRealmsCacheStale(scope)
  markAdminRealmUserRolesCacheStale(scope)
  markAdminCatalogsCacheStale(scope)
}
