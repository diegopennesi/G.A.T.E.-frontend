import { useState } from 'react'
import type { PublicRealmBrandingResponse, CurrentRealmPermissionsResponse } from '../types/domain'
import type { AuthMode, Screen } from '../types/ui'

export type InitialRealmContext = {
  realmCode: string
  authMode: AuthMode
  screen: Screen | null
}

export type RealmAvailability = 'loading' | 'ready' | 'unavailable'

export function useRealmState(initialContext: InitialRealmContext) {
  const [realmCode, setRealmCodeState] = useState(initialContext.realmCode)
  const [authMode, setAuthMode] = useState<AuthMode>(initialContext.authMode)
  const [realmBranding, setRealmBranding] = useState<PublicRealmBrandingResponse | null>(null)
  const [realmAvailability, setRealmAvailability] = useState<RealmAvailability>('loading')
  const [realmAvailabilityMessage, setRealmAvailabilityMessage] = useState('')
  const [realmPermissions, setRealmPermissions] = useState<CurrentRealmPermissionsResponse | null>(null)
  const [realmWelcome, setRealmWelcome] = useState<{ key: string; realmName: string; realmCode: string } | null>(null)

  return {
    realmCode,
    setRealmCodeState,
    authMode,
    setAuthMode,
    realmBranding,
    setRealmBranding,
    realmAvailability,
    setRealmAvailability,
    realmAvailabilityMessage,
    setRealmAvailabilityMessage,
    realmPermissions,
    setRealmPermissions,
    realmWelcome,
    setRealmWelcome,
  }
}
