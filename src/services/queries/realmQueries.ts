import { queryOptions } from '@tanstack/react-query'
import { getPublicRealmBranding } from '../gateApi'
import { queryKeys } from '../queryKeys'

export const realmQueries = {
  publicBranding: (realmCode: string) =>
    queryOptions({
      queryKey: queryKeys.publicRealmBranding(realmCode),
      queryFn: () => getPublicRealmBranding(realmCode),
    }),
} as const
