import type { UserProfile } from '../../types/domain'
export type ProfileDraft = {
  profileName: string
  email: string
  bio: string
  whatsapp: string
  instagram: string
  otherSocial: string
}

export const EMPTY_PROFILE: UserProfile = {
  id: '',
  username: '',
  platformRole: 'USER',
  profileName: '',
  email: '',
  bio: '',
  avatarUrl: null,
  whatsapp: '',
  socialLinks: {},
  createdAt: '',
}

export function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    profileName: profile.profileName || '',
    email: profile.email || '',
    bio: profile.bio || '',
    whatsapp: profile.whatsapp || '',
    instagram: profile.socialLinks.instagram || '',
    otherSocial: profile.socialLinks.other || '',
  }
}


