import type { QueryClient } from '@tanstack/react-query'

type CacheFirstQuery<T> = {
  queryKey: readonly unknown[]
  queryFn?: (...args: any[]) => T | Promise<T>
}

export function getFreshQueryData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): T | undefined {
  const state = queryClient.getQueryState(queryKey)
  const data = queryClient.getQueryData<T>(queryKey)
  if (data === undefined || state?.isInvalidated) {
    return undefined
  }
  return data
}

export async function readOrFetchQuery<T>(
  queryClient: QueryClient,
  query: CacheFirstQuery<T>,
  options: { force?: boolean } = {},
): Promise<T> {
  if (!options.force) {
    const cached = getFreshQueryData<T>(queryClient, query.queryKey)
    if (cached !== undefined) {
      return cached
    }
  }

  if (!query.queryFn) {
    throw new Error(`Missing queryFn for query key ${JSON.stringify(query.queryKey)}`)
  }

  return queryClient.fetchQuery({
    queryKey: query.queryKey,
    queryFn: query.queryFn as never,
    staleTime: options.force ? 0 : undefined,
  })
}
