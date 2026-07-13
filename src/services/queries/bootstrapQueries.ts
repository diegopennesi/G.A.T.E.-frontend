import { queryOptions } from '@tanstack/react-query'
import {
  discoverCampaigns,
  getCurrentRealmPermissions,
  getMe,
  getPostLoginCampaignSummary,
  listMyCampaignMemberships,
} from '../gateApi'
import { queryKeys } from '../queryKeys'

export const bootstrapQueries = {
  profile: (scope: { userId: string; realmCode?: string | null }) =>
    queryOptions({
      queryKey: [...queryKeys.bootstrap(scope), 'profile'] as const,
      queryFn: getMe,
    }),
  memberships: (scope: { userId: string; realmCode?: string | null }) =>
    queryOptions({
      queryKey: [...queryKeys.bootstrap(scope), 'memberships'] as const,
      queryFn: listMyCampaignMemberships,
    }),
  realmPermissions: (scope: { userId: string; realmCode?: string | null }) =>
    queryOptions({
      queryKey: [...queryKeys.bootstrap(scope), 'realm-permissions'] as const,
      queryFn: getCurrentRealmPermissions,
    }),
  postLoginSummary: (scope: { userId: string; realmCode?: string | null }) =>
    queryOptions({
      queryKey: [...queryKeys.bootstrap(scope), 'post-login-summary'] as const,
      queryFn: getPostLoginCampaignSummary,
    }),
  discoverCampaigns: (scope: { userId: string; realmCode?: string | null }, openOnly = false) =>
    queryOptions({
      queryKey: [...queryKeys.bootstrap(scope), 'discover-campaigns', { openOnly }] as const,
      queryFn: () => discoverCampaigns(openOnly),
    }),
} as const
