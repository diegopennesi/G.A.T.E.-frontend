import type { AuthMode, Screen } from '../types/ui'
import { SCREEN_PATH_SEGMENTS } from '../types/ui'

export const DEFAULT_REALM_CODE = 'gate'
export type RealmRouteBranch = 'auth' | 'app' | 'site'

// Router manuale intenzionale.
// Il progetto non usa react-router-dom per scelta architetturale: il path FE
// rappresenta anche il contesto realm e deve restare controllato da queste
// funzioni pure, senza introdurre una dipendenza di routing esterna.
const SCREEN_BY_PATH_SEGMENT = Object.fromEntries(
  Object.entries(SCREEN_PATH_SEGMENTS).map(([screen, segment]) => [segment, screen as Screen]),
) as Record<string, Screen>

export function resolveRealmContextFromPath(pathname: string): {
  realmCode: string
  authMode: AuthMode
  screen: Screen | null
  branch: RealmRouteBranch
  sitePathSegments: string[]
} {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'homepage' && segments[1]) {
    if (segments[2] === 'app') {
      return {
        realmCode: segments[1].trim().toLowerCase(),
        authMode: 'login',
        screen: (segments[3] && SCREEN_BY_PATH_SEGMENT[segments[3]]) || 'Profilo',
        branch: 'app',
        sitePathSegments: [],
      }
    }
    if (segments[2] === 'site') {
      const nextSegment = segments[3]
      const authMode: AuthMode =
        nextSegment === 'register' || nextSegment === 'recover' || nextSegment === 'login' ? nextSegment : 'login'
      return {
        realmCode: segments[1].trim().toLowerCase(),
        authMode,
        screen: null,
        branch: 'site',
        sitePathSegments: segments.slice(3),
      }
    }
    const nextSegment = segments[2]
    const authMode: AuthMode =
      nextSegment === 'register' || nextSegment === 'recover' || nextSegment === 'login' ? nextSegment : 'login'
    return {
      realmCode: segments[1].trim().toLowerCase(),
      authMode,
      screen: null,
      branch: 'auth',
      sitePathSegments: [],
    }
  }
  return { realmCode: DEFAULT_REALM_CODE, authMode: 'login', screen: null, branch: 'auth', sitePathSegments: [] }
}

export function buildPathForState({
  realmCode,
  authMode,
  screen,
  isAuthenticated,
}: {
  realmCode: string
  authMode: AuthMode
  screen: Screen
  isAuthenticated: boolean
}): string {
  const normalizedRealmCode = normalizeRealmCode(realmCode)
  if (!isAuthenticated) {
    return `/homepage/${encodeURIComponent(normalizedRealmCode)}/${authMode}`
  }
  return `/homepage/${encodeURIComponent(normalizedRealmCode)}/app/${SCREEN_PATH_SEGMENTS[screen]}`
}

export function buildSitePath(realmCode: string, ...segments: string[]): string {
  const normalizedRealmCode = normalizeRealmCode(realmCode)
  const normalizedSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(encodeURIComponent)
  const suffix = normalizedSegments.length ? `/${normalizedSegments.join('/')}` : ''
  return `/homepage/${encodeURIComponent(normalizedRealmCode)}/site${suffix}`
}

export function buildSiteAuthPath(realmCode: string, authMode: AuthMode): string {
  return buildSitePath(realmCode, authMode)
}

function normalizeRealmCode(realmCode: string) {
  return realmCode.trim().toLowerCase() || DEFAULT_REALM_CODE
}
