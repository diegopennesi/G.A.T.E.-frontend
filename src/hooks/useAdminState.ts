import { useState } from 'react'
import type {
  AdminCampaignPage,
  AdminCampaignUpdateRequest,
  AdminRealmCreateRequest,
  AdminRealmListItem,
  AdminRealmPage,
  AdminRealmUserRoleResponse,
  AdminUserPage,
  AdminUserUpdateRequest,
  CampaignCatalogEntry,
  RealmRole,
  SheetTypeCatalogEntry,
} from '../types/domain'

function createDefaultAdminRealmDraft(): AdminRealmCreateRequest {
  return {
    code: '',
    name: '',
    type: 'STORE',
    isActive: true,
    logoUrl: '',
    allowUserCampaignCreation: true,
    hosts: [],
  }
}

export function useAdminState() {
  const [adminUsersPage, setAdminUsersPage] = useState<AdminUserPage | null>(null)
  const [adminUsersPageIndex, setAdminUsersPageIndex] = useState(0)
  const [adminUsersSearch, setAdminUsersSearch] = useState('')
  const [adminUsersDrafts, setAdminUsersDrafts] = useState<Record<string, AdminUserUpdateRequest>>({})
  const [adminCampaignsPage, setAdminCampaignsPage] = useState<AdminCampaignPage | null>(null)
  const [adminCampaignsPageIndex, setAdminCampaignsPageIndex] = useState(0)
  const [adminCampaignsDrafts, setAdminCampaignsDrafts] = useState<Record<string, AdminCampaignUpdateRequest>>({})
  const [expandedAdminCampaignId, setExpandedAdminCampaignId] = useState('')
  const [adminRealmsPage, setAdminRealmsPage] = useState<AdminRealmPage | null>(null)
  const [adminRealmsPageIndex, setAdminRealmsPageIndex] = useState(0)
  const [adminRealmsSearch, setAdminRealmsSearch] = useState('')
  const [adminRealms, setAdminRealms] = useState<AdminRealmListItem[]>([])
  const [adminRealmUserRoles, setAdminRealmUserRoles] = useState<AdminRealmUserRoleResponse[]>([])
  const [adminRealmRoleDrafts, setAdminRealmRoleDrafts] = useState<Record<string, RealmRole>>({})
  const [selectedRealmAccessRealmId, setSelectedRealmAccessRealmId] = useState('')
  const [realmAccessSearch, setRealmAccessSearch] = useState('')
  const [realmAccessSearchResults, setRealmAccessSearchResults] = useState<AdminUserPage['items']>([])
  const [realmAccessSearchMessage, setRealmAccessSearchMessage] = useState('')
  const [systemSortBy, setSystemSortBy] = useState('profileName')
  const [systemSortDirection, setSystemSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedAdminRealmId, setSelectedAdminRealmId] = useState('')
  const [adminRealmDraft, setAdminRealmDraft] = useState<AdminRealmCreateRequest>(createDefaultAdminRealmDraft())
  const [adminRealmHostsInput, setAdminRealmHostsInput] = useState('')
  const [adminGameSystems, setAdminGameSystems] = useState<CampaignCatalogEntry[]>([])
  const [adminSheetTypes, setAdminSheetTypes] = useState<SheetTypeCatalogEntry[]>([])
  const [adminSheetCatalogsLoaded, setAdminSheetCatalogsLoaded] = useState(false)
  const [systemAdminView, setSystemAdminView] = useState<'users' | 'campaigns' | 'realms' | 'realmAccess' | 'sheets'>('users')

  return {
    adminUsersPage,
    setAdminUsersPage,
    adminUsersPageIndex,
    setAdminUsersPageIndex,
    adminUsersSearch,
    setAdminUsersSearch,
    adminUsersDrafts,
    setAdminUsersDrafts,
    adminCampaignsPage,
    setAdminCampaignsPage,
    adminCampaignsPageIndex,
    setAdminCampaignsPageIndex,
    adminCampaignsDrafts,
    setAdminCampaignsDrafts,
    expandedAdminCampaignId,
    setExpandedAdminCampaignId,
    adminRealmsPage,
    setAdminRealmsPage,
    adminRealmsPageIndex,
    setAdminRealmsPageIndex,
    adminRealmsSearch,
    setAdminRealmsSearch,
    adminRealms,
    setAdminRealms,
    adminRealmUserRoles,
    setAdminRealmUserRoles,
    adminRealmRoleDrafts,
    setAdminRealmRoleDrafts,
    selectedRealmAccessRealmId,
    setSelectedRealmAccessRealmId,
    realmAccessSearch,
    setRealmAccessSearch,
    realmAccessSearchResults,
    setRealmAccessSearchResults,
    realmAccessSearchMessage,
    setRealmAccessSearchMessage,
    systemSortBy,
    setSystemSortBy,
    systemSortDirection,
    setSystemSortDirection,
    selectedAdminRealmId,
    setSelectedAdminRealmId,
    adminRealmDraft,
    setAdminRealmDraft,
    adminRealmHostsInput,
    setAdminRealmHostsInput,
    adminGameSystems,
    setAdminGameSystems,
    adminSheetTypes,
    setAdminSheetTypes,
    adminSheetCatalogsLoaded,
    setAdminSheetCatalogsLoaded,
    systemAdminView,
    setSystemAdminView,
    createDefaultAdminRealmDraft,
  }
}
