import type { AuthMode, Screen } from '../types/ui'
import { SCREEN_PATH_SEGMENTS } from '../types/ui'

export const DEFAULT_REALM_CODE = 'gate'

const SCREEN_BY_PATH_SEGMENT = Object.fromEntries(
  Object.entries(SCREEN_PATH_SEGMENTS).map(([screen, segment]) => [segment, screen as Screen]),
) as Record<string, Screen>

export function resolveRealmContextFromPath(pathname: string): {
  realmCode: string
  authMode: AuthMode
  screen: Screen | null
} {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'homepage' && segments[1]) {
    if (segments[2] === 'app') {
      return {
        realmCode: segments[1].trim().toLowerCase(),
        authMode: 'login',
        screen: (segments[3] && SCREEN_BY_PATH_SEGMENT[segments[3]]) || 'Profilo',
      }
    }
    const nextSegment = segments[2]
    const authMode: AuthMode =
      nextSegment === 'register' || nextSegment === 'recover' || nextSegment === 'login' ? nextSegment : 'login'
    return {
      realmCode: segments[1].trim().toLowerCase(),
      authMode,
      screen: null,
    }
  }
  return { realmCode: DEFAULT_REALM_CODE, authMode: 'login', screen: null }
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
  const normalizedRealmCode = realmCode.trim().toLowerCase() || DEFAULT_REALM_CODE
  if (!isAuthenticated) {
    return `/homepage/${encodeURIComponent(normalizedRealmCode)}/${authMode}`
  }
  return `/homepage/${encodeURIComponent(normalizedRealmCode)}/app/${SCREEN_PATH_SEGMENTS[screen]}`
}
