import { getRealmCode } from './apiClient'
import { readStoredJson } from '../shared/utils'

type CacheScope = {
  realmCode?: string | null
  userId: string
}

type CacheEntry<T> = {
  data: T
  updatedAt: number
  stale: boolean
}

type LoadScopedCacheOptions<T> = {
  sliceKey: string
  scope: CacheScope
  force?: boolean
  loader: () => Promise<T>
}

const CACHE_PREFIX = 'gate_query_cache'
const inFlightRequests = new Map<string, Promise<unknown>>()
const scopedCacheRevisions = new Map<string, number>()

function normalizeRealmCode(value?: string | null): string {
  return value?.trim().toLowerCase() || getRealmCode()?.trim().toLowerCase() || 'gate'
}

function storageKey(sliceKey: string, scope: CacheScope): string {
  return `${CACHE_PREFIX}:${normalizeRealmCode(scope.realmCode)}:${scope.userId}:${sliceKey}`
}

function storagePrefix(sliceKeyPrefix: string, scope: CacheScope): string {
  return `${CACHE_PREFIX}:${normalizeRealmCode(scope.realmCode)}:${scope.userId}:${sliceKeyPrefix}`
}

function cacheKey(sliceKey: string, scope: CacheScope): string {
  return storageKey(sliceKey, scope)
}

function bumpCacheRevision(key: string): void {
  scopedCacheRevisions.set(key, (scopedCacheRevisions.get(key) || 0) + 1)
}

function readCacheRevision(key: string): number {
  return scopedCacheRevisions.get(key) || 0
}

export function readScopedCache<T>(sliceKey: string, scope: CacheScope): CacheEntry<T> | null {
  const entry = readStoredJson<CacheEntry<T> | null>(localStorage, storageKey(sliceKey, scope), null)
  if (!entry) return null
  if (typeof entry.updatedAt !== 'number' || typeof entry.stale !== 'boolean') return null
  return entry
}

export function writeScopedCache<T>(sliceKey: string, scope: CacheScope, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    updatedAt: Date.now(),
    stale: false,
  }
  localStorage.setItem(storageKey(sliceKey, scope), JSON.stringify(entry))
}

export function markScopedCacheStale(sliceKey: string, scope: CacheScope): void {
  bumpCacheRevision(cacheKey(sliceKey, scope))
  const existing = readScopedCache(sliceKey, scope)
  if (!existing) return
  localStorage.setItem(
    storageKey(sliceKey, scope),
    JSON.stringify({
      ...existing,
      stale: true,
    }),
  )
}

export function markScopedCacheGroupStale(sliceKeyPrefix: string, scope: CacheScope): void {
  const prefix = storagePrefix(sliceKeyPrefix, scope)
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith(prefix)) continue
    const existing = readStoredJson<CacheEntry<unknown> | null>(localStorage, key, null)
    if (!existing) continue
    bumpCacheRevision(key)
    localStorage.setItem(
      key,
      JSON.stringify({
        ...existing,
        stale: true,
      }),
    )
  }
}

export function clearScopedCache(sliceKey: string, scope: CacheScope): void {
  const key = storageKey(sliceKey, scope)
  localStorage.removeItem(key)
  scopedCacheRevisions.delete(key)
  inFlightRequests.delete(key)
}

export async function loadScopedCache<T>(options: LoadScopedCacheOptions<T>): Promise<T> {
  const key = storageKey(options.sliceKey, options.scope)
  let force = options.force ?? false

  while (true) {
    const cached = readScopedCache<T>(options.sliceKey, options.scope)
    if (!force && cached && !cached.stale) {
      return cached.data
    }

    const existingRequest = inFlightRequests.get(key) as Promise<T> | undefined
    if (existingRequest) {
      return existingRequest
    }

    const revisionAtStart = readCacheRevision(key)
    const request = (async () => {
      const data = await options.loader()
      if (readCacheRevision(key) !== revisionAtStart) {
        inFlightRequests.delete(key)
        return loadScopedCache({ ...options, force: true })
      }
      writeScopedCache(options.sliceKey, options.scope, data)
      return data
    })()

    inFlightRequests.set(key, request)
    try {
      return await request
    } finally {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key)
      }
      force = true
    }
  }
}
