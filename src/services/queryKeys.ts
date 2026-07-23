export const queryKeys = {
  bootstrap: (scope: { userId: string; realmCode?: string | null }) => [
    'bootstrap',
    {
      userId: scope.userId.trim(),
      realmCode: scope.realmCode?.trim().toLowerCase() || '',
    },
  ] as const,
  publicRealmBranding: (realmCode: string) => ['public-realm-branding', realmCode.trim().toLowerCase()] as const,
  discoverCampaigns: (openOnly = false) => ['discover-campaigns', { openOnly }] as const,
  campaignDetails: (campaignId: string) => ['campaigns', campaignId, 'details'] as const,
  campaignMembers: (campaignId: string) => ['campaigns', campaignId, 'members'] as const,
  campaignMembersForManagement: (campaignId: string) => ['campaigns', campaignId, 'members-management'] as const,
  campaignMember: (campaignId: string, userId: string) => ['campaigns', campaignId, 'member', userId] as const,
  campaignCharacters: (campaignId: string) => ['campaigns', campaignId, 'characters'] as const,
  campaignCharacterDetail: (campaignId: string, characterId: string) =>
    ['campaigns', campaignId, 'characters', characterId, 'detail'] as const,
  campaignCharacterSheet: (campaignId: string, characterId: string) =>
    ['campaigns', campaignId, 'characters', characterId, 'sheet'] as const,
  campaignCharacterSheetHistory: (campaignId: string, characterId: string) =>
    ['campaigns', campaignId, 'characters', characterId, 'sheet-history'] as const,
  campaignPendingSheetReviews: (campaignId: string) => ['campaigns', campaignId, 'sheet-reviews', 'pending'] as const,
  campaignMissions: (campaignId: string, since?: string) =>
    ['campaigns', campaignId, 'missions', { since: since?.trim() || '' }] as const,
  campaignPendingApplications: (campaignId: string) => ['campaigns', campaignId, 'pending-applications'] as const,
  campaignInviteTokens: (campaignId: string) => ['campaigns', campaignId, 'invite-tokens'] as const,
  missionParticipants: (campaignId: string, missionId: string) =>
    ['campaigns', campaignId, 'missions', missionId, 'participants'] as const,
  campaignChat: (campaignId: string, missionId: string) => ['campaigns', campaignId, 'missions', missionId, 'chat'] as const,
  campaignRooms: (campaignId: string) => ['campaigns', campaignId, 'rooms'] as const,
  campaignPermission: (campaignId: string, action: string) => ['campaigns', campaignId, 'permissions', action] as const,
  campaignModules: () => ['campaign-modules'] as const,
  campaignGameSystems: () => ['campaign-game-systems'] as const,
  publicProfile: (targetUserId: string) => ['users', targetUserId, 'profile'] as const,
  adminUsers: (page = 0, query?: string) => ['admin', 'users', { page, query: query?.trim() || '' }] as const,
  adminCampaigns: (page = 0) => ['admin', 'campaigns', { page }] as const,
  adminRealms: (page = 0, query?: string) => ['admin', 'realms', { page, query: query?.trim() || '' }] as const,
  adminRealmUserRoles: (realmId: string) => ['admin', 'realm-user-roles', realmId] as const,
  adminGameSystems: () => ['admin', 'catalogs', 'game-systems'] as const,
  adminSheetTypes: () => ['admin', 'catalogs', 'sheet-types'] as const,
  adminMissionRules: () => ['admin', 'catalogs', 'mission-rules'] as const,
  adminGameSystemRules: () => ['admin', 'catalogs', 'game-system-rules'] as const,
} as const
