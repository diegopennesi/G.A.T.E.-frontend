import { useMutation } from '@tanstack/react-query'
import { bootstrapQueries } from '../services/queries/bootstrapQueries'
import { queryClient } from '../services/queryClient'
import { changePassword, updateMe } from '../services/gateApi'
import type { Screen } from '../types/ui'
import type { UserProfile } from '../types/domain'

type ProfileMutationsDeps = {
  realmCode: string
  currentProfile: UserProfile | null
  setProfile: (value: UserProfile | null) => void
  setScreen: (value: Screen) => void
}

export function useProfileMutations(deps: ProfileMutationsDeps) {
  const saveProfileMutation = useMutation({
    mutationFn: (draft: Parameters<typeof updateMe>[0]) => updateMe(draft),
    onMutate: async (draft) => {
      if (!deps.currentProfile) return { previousProfile: null as UserProfile | null }
      const previousProfile = deps.currentProfile
      const optimisticProfile: UserProfile = {
        ...previousProfile,
        profileName: draft.profileName,
        bio: draft.bio,
        whatsapp: draft.whatsapp,
        socialLinks: previousProfile.socialLinks,
      }
      queryClient.setQueryData(
        bootstrapQueries.profile({ userId: previousProfile.id, realmCode: deps.realmCode }).queryKey,
        optimisticProfile,
      )
      deps.setProfile(optimisticProfile)
      return { previousProfile }
    },
    onError: (_error, _draft, context) => {
      if (!context?.previousProfile) return
      queryClient.setQueryData(
        bootstrapQueries.profile({ userId: context.previousProfile.id, realmCode: deps.realmCode }).queryKey,
        context.previousProfile,
      )
      deps.setProfile(context.previousProfile)
    },
    onSuccess: (updated) => {
      deps.setProfile(updated)
      void queryClient.invalidateQueries({ queryKey: ['bootstrap'], exact: false })
      deps.setScreen('Profilo')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (params: Parameters<typeof changePassword>[0]) => changePassword(params),
    onSuccess: (session) => {
      deps.setProfile(session.user)
      void queryClient.invalidateQueries({ queryKey: ['bootstrap'], exact: false })
    },
  })

  return {
    saveProfile: (draft: Parameters<typeof updateMe>[0]) => saveProfileMutation.mutateAsync(draft),
    changePassword: (params: Parameters<typeof changePassword>[0]) => changePasswordMutation.mutateAsync(params),
  }
}
