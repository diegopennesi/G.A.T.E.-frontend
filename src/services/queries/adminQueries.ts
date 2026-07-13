import { queryOptions } from '@tanstack/react-query'
import {
  listAdminCampaigns,
  listAdminGameSystems,
  listAdminRealmUserRoles,
  listAdminRealms,
  listAdminSheetTypes,
  listAdminUsers,
} from '../gateApi'
import { queryKeys } from '../queryKeys'

export const adminQueries = {
  users: (page = 0, query?: string) =>
    queryOptions({
      queryKey: queryKeys.adminUsers(page, query),
      queryFn: () => listAdminUsers(page, query),
    }),
  campaigns: (page = 0) =>
    queryOptions({
      queryKey: queryKeys.adminCampaigns(page),
      queryFn: () => listAdminCampaigns(page),
    }),
  realms: (page = 0, query?: string) =>
    queryOptions({
      queryKey: queryKeys.adminRealms(page, query),
      queryFn: () => listAdminRealms(page, query),
    }),
  realmUserRoles: (realmId: string) =>
    queryOptions({
      queryKey: queryKeys.adminRealmUserRoles(realmId),
      queryFn: () => listAdminRealmUserRoles({ realmId }),
    }),
  gameSystems: () =>
    queryOptions({
      queryKey: queryKeys.adminGameSystems(),
      queryFn: () => listAdminGameSystems(),
    }),
  sheetTypes: () =>
    queryOptions({
      queryKey: queryKeys.adminSheetTypes(),
      queryFn: () => listAdminSheetTypes(),
    }),
} as const
