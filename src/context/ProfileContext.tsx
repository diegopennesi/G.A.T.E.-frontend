/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession, UserProfile } from '../types/domain'
import type { ProfileDraft } from '../features/profile/pages/ProfilePages'

export type ProfileContextValue = {
  profile: UserProfile | null
  handleAuth: (session: AuthSession) => Promise<void>
  saveProfile: (draft: ProfileDraft) => Promise<void>
  changePassword: (params: { currentPassword: string; newPassword: string }) => Promise<void>
  logout: () => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ value, children }: { value: ProfileContextValue; children: ReactNode }) {
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfileContext() {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('ProfileContext non disponibile')
  return value
}
