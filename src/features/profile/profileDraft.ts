import type { UserProfile } from '../../types/domain'
export type ProfileDraft = {
  profileName: string
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
  bio: '',
  avatarUrl: null,
  whatsapp: '',
  socialLinks: {},
  createdAt: '',
}

export function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    profileName: profile.profileName || '',
    bio: profile.bio || '',
    whatsapp: profile.whatsapp || '',
    instagram: profile.socialLinks.instagram || '',
    otherSocial: profile.socialLinks.other || '',
  }
}


