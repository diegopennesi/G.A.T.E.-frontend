import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../services/queryClient'
import { queryKeys } from '../services/queryKeys'
import {
  approveCampaignMember,
  banCampaignMember,
  suspendCampaignMember,
  unbanCampaignMember,
  unsuspendCampaignMember,
  updateCampaignMemberRole,
} from '../services/gateApi'
import type { CampaignMembershipResponse, CampaignRole } from '../types/domain'

type CampaignMemberMutationsDeps = {
  campaignId: string
  selectedCampaignMember: CampaignMembershipResponse | null
  refreshSelectedCampaignMember: () => Promise<void>
  refreshCampaignMembers: () => Promise<void>
  refreshCampaignMembersForManagement: () => Promise<void>
}

export function useCampaignMemberMutations(deps: CampaignMemberMutationsDeps) {
  const invalidateMembers = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(deps.campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembersForManagement(deps.campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignMember(deps.campaignId, deps.selectedCampaignMember?.userId || ''), exact: false }),
    ])

  const updateSelectedMemberRoleMutation = useMutation({
    mutationFn: (role: CampaignRole) => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return updateCampaignMemberRole(deps.campaignId, deps.selectedCampaignMember.userId, role)
    },
    onSuccess: async () => {
      await invalidateMembers()
      await Promise.all([deps.refreshSelectedCampaignMember(), deps.refreshCampaignMembers(), deps.refreshCampaignMembersForManagement()])
    },
  })

  const banSelectedMemberMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return banCampaignMember(deps.campaignId, deps.selectedCampaignMember.userId, reason)
    },
    onSuccess: async () => {
      await invalidateMembers()
      await Promise.all([deps.refreshSelectedCampaignMember(), deps.refreshCampaignMembers(), deps.refreshCampaignMembersForManagement()])
    },
  })

  const suspendSelectedMemberMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return suspendCampaignMember(deps.campaignId, deps.selectedCampaignMember.userId, reason)
    },
    onSuccess: async () => {
      await invalidateMembers()
      await Promise.all([deps.refreshSelectedCampaignMember(), deps.refreshCampaignMembers(), deps.refreshCampaignMembersForManagement()])
    },
  })

  const unsuspendSelectedMemberMutation = useMutation({
    mutationFn: () => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return unsuspendCampaignMember(deps.campaignId, deps.selectedCampaignMember.userId)
    },
    onSuccess: async () => {
      await invalidateMembers()
      await Promise.all([deps.refreshSelectedCampaignMember(), deps.refreshCampaignMembers(), deps.refreshCampaignMembersForManagement()])
    },
  })

  const unbanSelectedMemberMutation = useMutation({
    mutationFn: () => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return unbanCampaignMember(deps.campaignId, deps.selectedCampaignMember.userId)
    },
    onSuccess: async () => {
      await invalidateMembers()
      await Promise.all([deps.refreshSelectedCampaignMember(), deps.refreshCampaignMembers(), deps.refreshCampaignMembersForManagement()])
    },
  })

  const approveSelectedMemberMutation = useMutation({
    mutationFn: () => {
      if (!deps.selectedCampaignMember) throw new Error('Nessun membro selezionato.')
      return approveCampaignMember(deps.campaignId, deps.selectedCampaignMember.userId)
    },
    onSuccess: async () => {
      await Promise.all([
        deps.refreshSelectedCampaignMember(),
        deps.refreshCampaignMembers(),
        deps.refreshCampaignMembersForManagement(),
      ])
    },
  })

  return {
    updateSelectedMemberRole: (role: CampaignRole) => updateSelectedMemberRoleMutation.mutateAsync(role),
    banSelectedMember: (reason: string) => banSelectedMemberMutation.mutateAsync(reason),
    suspendSelectedMember: (reason: string) => suspendSelectedMemberMutation.mutateAsync(reason),
    unsuspendSelectedMember: () => unsuspendSelectedMemberMutation.mutateAsync(),
    unbanSelectedMember: () => unbanSelectedMemberMutation.mutateAsync(),
    approveSelectedMember: () => approveSelectedMemberMutation.mutateAsync(),
  }
}
