import { useState } from 'react'
import type { UserProfile } from '../types/domain'

export function useProfileState() {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  return {
    profile,
    setProfile,
  }
}
