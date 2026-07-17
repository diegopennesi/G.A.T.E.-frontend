import type { CampaignDiscoverResponse, CampaignResponse, MyCampaignMembershipResponse } from '../../../types/domain'

type BuildCampaignsForListArgs = {
  discoverableCampaigns: CampaignDiscoverResponse[]
  myCampaigns: MyCampaignMembershipResponse[]
  campaignDetailsById: Record<string, CampaignResponse>
}

export function buildCampaignsForList({
  discoverableCampaigns,
  myCampaigns,
  campaignDetailsById,
}: BuildCampaignsForListArgs): CampaignDiscoverResponse[] {
  const byId = new Map<string, CampaignDiscoverResponse>()

  for (const item of discoverableCampaigns) {
    byId.set(item.id, item)
  }

  for (const membership of myCampaigns) {
    const existing = byId.get(membership.campaignId)
    const detail = campaignDetailsById[membership.campaignId]

    if (existing) {
      byId.set(membership.campaignId, {
        ...existing,
        isOpen: detail?.isOpen ?? existing.isOpen,
        isActive: detail?.isActive ?? existing.isActive,
        isSearchable: detail?.isSearchable ?? existing.isSearchable,
        membershipStatus: membership.memberStatus,
        membershipRole: membership.role,
        moderationReason: membership.moderationReason,
        name: detail?.name || existing.name || membership.campaignName,
        description: detail?.description ?? existing.description,
        summary: detail?.summary ?? existing.summary,
        coverImageUrl: detail?.coverImageUrl ?? existing.coverImageUrl,
        founderId: detail?.founderId || existing.founderId,
        autoJoinEnabled: detail?.autoJoinEnabled ?? existing.autoJoinEnabled,
        gameSystem: detail?.gameSystem ?? existing.gameSystem,
        createdAt: detail?.createdAt || existing.createdAt,
      })
      continue
    }

    byId.set(membership.campaignId, {
      id: membership.campaignId,
      name: detail?.name || membership.campaignName,
      description: detail?.description ?? null,
      summary: detail?.summary ?? null,
      coverImageUrl: detail?.coverImageUrl ?? null,
      founderId: detail?.founderId || '',
      isOpen: detail?.isOpen ?? false,
      isActive: detail?.isActive ?? false,
      isSearchable: detail?.isSearchable ?? false,
      autoJoinEnabled: detail?.autoJoinEnabled ?? false,
      inviteCode: detail?.inviteCode || '',
      gameSystem: detail?.gameSystem ?? null,
      createdAt: detail?.createdAt || '',
      membershipStatus: membership.memberStatus,
      membershipRole: membership.role,
      moderationReason: membership.moderationReason,
    })
  }

  return Array.from(byId.values()).filter((item) => item.isActive)
}
