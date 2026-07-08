/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AuthMode } from '../types/ui'
import type { CurrentRealmPermissionsResponse } from '../types/domain'
import type { RealmAvailability } from '../hooks/useRealmState'

export type RealmContextValue = {
  realmCode: string
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  realmName: string
  logoUrl: string | null
  availability: RealmAvailability
  availabilityMessage: string
  realmPermissions: CurrentRealmPermissionsResponse | null
}

const RealmContext = createContext<RealmContextValue | null>(null)

export function RealmProvider({ value, children }: { value: RealmContextValue; children: ReactNode }) {
  return <RealmContext.Provider value={value}>{children}</RealmContext.Provider>
}

export function useRealmContext() {
  const value = useContext(RealmContext)
  if (!value) throw new Error('RealmContext non disponibile')
  return value
}
