import type { QueryClient } from '@tanstack/react-query'
import type { ResourceInvalidationPayload } from '../types/realtime'
import { queryKeys } from './queryKeys'

type BootstrapScope = { userId: string; realmCode?: string | null }

function normalizeRealmCode(value?: string | null): string {
  return value?.trim().toLowerCase() || ''
}

function parseCampaignId(key: string): string | null {
  const match = key.match(/^campaigns:([^:]+)(?::.*)?$/)
  return match?.[1]?.trim() || null
}

function parseUserId(key: string): string | null {
  const match = key.match(/^users:([^:]+):profile$/)
  return match?.[1]?.trim() || null
}

function hasKey(payload: ResourceInvalidationPayload, value: string): boolean {
  return payload.keys.includes(value)
}

function invalidateBootstrap(queryClient: QueryClient, scope: BootstrapScope) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(scope), exact: false })
}

function invalidateCampaign(queryClient: QueryClient, campaignId: string) {
  void queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId], exact: false })
}

function invalidateAdmin(queryClient: QueryClient, root: 'users' | 'campaigns' | 'realms' | 'realm-user-roles' | 'catalogs') {
  void queryClient.invalidateQueries({ queryKey: ['admin', root], exact: false })
}

function invalidatePublicProfile(queryClient: QueryClient, userId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(userId), exact: false })
}

export function invalidateQueriesForResourceEvent(
  queryClient: QueryClient,
  payload: ResourceInvalidationPayload,
  scope: BootstrapScope | null,
) {
  const normalizedScope = scope
    ? { userId: scope.userId.trim(), realmCode: normalizeRealmCode(scope.realmCode) }
    : null

  if (!normalizedScope) return

  const keys = new Set(payload.keys)

  if (keys.has('campaigns:discover')) {
    invalidateBootstrap(queryClient, normalizedScope)
  }

  for (const key of payload.keys) {
    if (key.startsWith('users:') && key.endsWith(':profile')) {
      const userId = parseUserId(key)
      if (userId) {
        invalidateBootstrap(queryClient, normalizedScope)
        invalidatePublicProfile(queryClient, userId)
      }
      continue
    }

    if (key.startsWith('campaigns:')) {
      const campaignId = parseCampaignId(key)
      if (!campaignId) continue
      invalidateCampaign(queryClient, campaignId)
      if (key.endsWith(':missions') || key.endsWith(':chat') || key.endsWith(':characters') || key.endsWith(':pending-applications')) {
        invalidateCampaign(queryClient, campaignId)
      }
      continue
    }

    switch (key) {
      case 'admin:users':
        invalidateAdmin(queryClient, 'users')
        break
      case 'admin:campaigns':
        invalidateAdmin(queryClient, 'campaigns')
        break
      case 'admin:realms':
        invalidateAdmin(queryClient, 'realms')
        break
      case 'admin:realm-user-roles':
        invalidateAdmin(queryClient, 'realm-user-roles')
        break
      case 'admin:catalogs':
        invalidateAdmin(queryClient, 'catalogs')
        break
      default:
        break
    }
  }

  if (hasKey(payload, 'campaigns:discover')) {
    invalidateBootstrap(queryClient, normalizedScope)
  }
}
