import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../services/queryClient'
import { queryKeys } from '../services/queryKeys'
import {
  deactivateAdminCampaign,
  createAdminGameSystem,
  createAdminMissionRule,
  createAdminRealm,
  createAdminSheetType,
  updateAdminCampaign,
  updateAdminGameSystem,
  updateAdminMissionRule,
  updateAdminRealm,
  updateAdminSheetType,
  updateAdminUser,
  upsertAdminGameSystemRule,
  upsertAdminRealmUserRole,
} from '../services/gateApi'
import type {
  AdminGameSystemUpsertRequest,
  AdminGameSystemRuleUpsertRequest,
  AdminMissionRuleUpsertRequest,
  AdminRealmCreateRequest,
  AdminSheetTypeUpsertRequest,
  RealmRole,
} from '../types/domain'

type AdminMutationsDeps = {
  adminRealmRoleDrafts: Record<string, string>
  adminUsersDrafts: Record<string, unknown>
  adminUsersPageIndex: number
  adminUsersSearch: string
  adminCampaignsDrafts: Record<string, unknown>
  adminCampaignsPageIndex: number
  adminRealmsPageIndex: number
  adminRealmsSearch: string
  adminRealmDraft: AdminRealmCreateRequest
  adminRealmHostsInput: string
  currentCampaignId: string
  clearActiveCampaignContext: () => void
  loadDiscoverableCampaigns: (options?: { force?: boolean }) => Promise<void>
  loadPostLoginCampaignSummary: (options?: { force?: boolean }) => Promise<void>
  setAdminRealmDraft: (value: AdminRealmCreateRequest) => void
  setAdminRealmHostsInput: (value: string) => void
  setSelectedAdminRealmId: (value: string) => void
  loadAdminRealmUserRoles: (realmId: string) => Promise<void>
  loadAdminUsers: (page: number, query?: string) => Promise<void>
  loadAdminCampaigns: (page: number) => Promise<void>
  loadAdminSheetCatalogs: () => Promise<void>
  loadAdminRealms: (page?: number, query?: string) => Promise<void>
}

export function useAdminMutations(deps: AdminMutationsDeps) {
  const invalidateAdminUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers(deps.adminUsersPageIndex, deps.adminUsersSearch), exact: false })
  const invalidateAdminCampaigns = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.adminCampaigns(deps.adminCampaignsPageIndex), exact: false })
  const invalidateAdminRealms = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.adminRealms(deps.adminRealmsPageIndex, deps.adminRealmsSearch), exact: false })
  const invalidateAdminCatalogs = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGameSystems(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSheetTypes(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMissionRules(), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGameSystemRules(), exact: false }),
    ])

  const saveAdminRealmUserRoleMutation = useMutation({
    mutationFn: ({ realmId, userId }: { realmId: string; userId: string }) => {
      const role = deps.adminRealmRoleDrafts[`${realmId}:${userId}`] || 'USER'
      return upsertAdminRealmUserRole({ realmId, userId, role: role as RealmRole })
    },
    onSuccess: async (_value, variables) => {
      await deps.loadAdminRealmUserRoles(variables.realmId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRealmUserRoles(variables.realmId), exact: false })
    },
  })

  const saveAdminUserMutation = useMutation({
    mutationFn: ({ userId, draft }: { userId: string; draft: unknown }) => updateAdminUser(userId, draft as Parameters<typeof updateAdminUser>[1]),
    onSuccess: async () => {
      await invalidateAdminUsers()
      await deps.loadAdminUsers(deps.adminUsersPageIndex, deps.adminUsersSearch)
    },
  })

  const saveAdminCampaignMutation = useMutation({
    mutationFn: ({ campaignId, draft }: { campaignId: string; draft: unknown }) => updateAdminCampaign(campaignId, draft as Parameters<typeof updateAdminCampaign>[1]),
    onSuccess: async () => {
      await invalidateAdminCampaigns()
      await deps.loadAdminCampaigns(deps.adminCampaignsPageIndex)
    },
  })

  const deactivateAdminCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => deactivateAdminCampaign(campaignId),
    onSuccess: async (updated, campaignId) => {
      if (campaignId === deps.currentCampaignId && updated.isActive === false) {
        deps.clearActiveCampaignContext()
      }
      await Promise.all([
        invalidateAdminCampaigns(),
        deps.loadAdminCampaigns(deps.adminCampaignsPageIndex),
        deps.loadDiscoverableCampaigns({ force: true }),
        deps.loadPostLoginCampaignSummary({ force: true }),
      ])
    },
  })

  const saveAdminGameSystemMutation = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: AdminGameSystemUpsertRequest }) => updateAdminGameSystem(code, payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const createAdminGameSystemMutation = useMutation({
    mutationFn: (payload: AdminGameSystemUpsertRequest) => createAdminGameSystem(payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const saveAdminSheetTypeMutation = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: AdminSheetTypeUpsertRequest }) => updateAdminSheetType(code, payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const createAdminSheetTypeMutation = useMutation({
    mutationFn: (payload: AdminSheetTypeUpsertRequest) => createAdminSheetType(payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const saveAdminMissionRuleMutation = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: AdminMissionRuleUpsertRequest }) => updateAdminMissionRule(code, payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const createAdminMissionRuleMutation = useMutation({
    mutationFn: (payload: AdminMissionRuleUpsertRequest) => createAdminMissionRule(payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const saveAdminGameSystemRuleMutation = useMutation({
    mutationFn: (payload: AdminGameSystemRuleUpsertRequest) => upsertAdminGameSystemRule(payload),
    onSuccess: async () => {
      await invalidateAdminCatalogs()
      await deps.loadAdminSheetCatalogs()
    },
  })

  const createAdminRealmMutation = useMutation({
    mutationFn: () => {
      const hosts = deps.adminRealmHostsInput
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean)

      return createAdminRealm({
        ...deps.adminRealmDraft,
        code: deps.adminRealmDraft.code.trim().toLowerCase(),
        name: deps.adminRealmDraft.name.trim(),
        logoUrl: deps.adminRealmDraft.logoUrl?.trim() || null,
        hosts,
      })
    },
    onSuccess: async () => {
      deps.setAdminRealmDraft({
        code: '',
        name: '',
        type: 'STORE',
        isActive: true,
        logoUrl: '',
        allowUserCampaignCreation: true,
        hosts: [],
      })
      deps.setSelectedAdminRealmId('')
      deps.setAdminRealmHostsInput('')
      await invalidateAdminRealms()
      await deps.loadAdminRealms(deps.adminRealmsPageIndex, deps.adminRealmsSearch)
    },
  })

  const saveAdminRealmMutation = useMutation({
    mutationFn: (realmId: string) =>
      updateAdminRealm(realmId, {
        code: deps.adminRealmDraft.code.trim().toLowerCase(),
        name: deps.adminRealmDraft.name.trim(),
        type: deps.adminRealmDraft.type,
        isActive: deps.adminRealmDraft.isActive,
        logoUrl: deps.adminRealmDraft.logoUrl?.trim() || null,
        allowUserCampaignCreation: deps.adminRealmDraft.allowUserCampaignCreation,
      }),
    onSuccess: async () => {
      deps.setSelectedAdminRealmId('')
      deps.setAdminRealmDraft({
        code: '',
        name: '',
        type: 'STORE',
        isActive: true,
        logoUrl: '',
        allowUserCampaignCreation: true,
        hosts: [],
      })
      deps.setAdminRealmHostsInput('')
      await invalidateAdminRealms()
      await deps.loadAdminRealms(deps.adminRealmsPageIndex, deps.adminRealmsSearch)
    },
  })

  return {
    saveAdminRealmUserRole: (realmId: string, userId: string) =>
      saveAdminRealmUserRoleMutation.mutateAsync({ realmId, userId }),
    saveAdminUser: (userId: string, draft: unknown) =>
      saveAdminUserMutation.mutateAsync({ userId, draft }),
    saveAdminCampaign: (campaignId: string, draft: unknown) =>
      saveAdminCampaignMutation.mutateAsync({ campaignId, draft }),
    deactivateAdminCampaign: (campaignId: string) =>
      deactivateAdminCampaignMutation.mutateAsync(campaignId),
    saveAdminGameSystem: (code: string, payload: AdminGameSystemUpsertRequest) =>
      saveAdminGameSystemMutation.mutateAsync({ code, payload }),
    createAdminGameSystemEntry: (payload: AdminGameSystemUpsertRequest) =>
      createAdminGameSystemMutation.mutateAsync(payload),
    saveAdminSheetType: (code: string, payload: AdminSheetTypeUpsertRequest) =>
      saveAdminSheetTypeMutation.mutateAsync({ code, payload }),
    createAdminSheetTypeEntry: (payload: AdminSheetTypeUpsertRequest) =>
      createAdminSheetTypeMutation.mutateAsync(payload),
    saveAdminMissionRule: (code: string, payload: AdminMissionRuleUpsertRequest) =>
      saveAdminMissionRuleMutation.mutateAsync({ code, payload }),
    createAdminMissionRuleEntry: (payload: AdminMissionRuleUpsertRequest) =>
      createAdminMissionRuleMutation.mutateAsync(payload),
    saveAdminGameSystemRule: (payload: AdminGameSystemRuleUpsertRequest) =>
      saveAdminGameSystemRuleMutation.mutateAsync(payload),
    createAdminRealmEntry: () => createAdminRealmMutation.mutateAsync(),
    saveAdminRealm: (realmId: string) => saveAdminRealmMutation.mutateAsync(realmId),
  }
}
