import { queryOptions } from '@tanstack/react-query'
import { getPublicProfile } from '../gateApi'
import { queryKeys } from '../queryKeys'

export const profileQueries = {
  publicProfile: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.publicProfile(userId),
      queryFn: () => getPublicProfile(userId),
    }),
} as const
