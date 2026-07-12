import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AuthScreen } from './features/auth'
import {
  ApprovalPage, CreateCampaignPage,
  CampaignListPage, PostLoginLandingPage, CampaignDetailPage, CampaignManagementPage, CampaignMemberProfilePage,
  LeaveCampaignModal,
} from './features/campaigns'
import { CreateCharacterPage, SelectCharacterPage, CharacterListPage, CharacterDetailPage } from './features/characters'
import { MissionsPage } from './features/missions'
import { LogPage } from './features/notifications'
import { EditProfilePage, ProfilePage } from './features/profile'
import { RoomsPage } from './features/rooms'
import { SystemCatalogsPage } from './features/admin'
import {
  AdminProvider,
  CampaignProvider,
  CharacterProvider,
  MissionProvider,
  ProfileProvider,
  RealmProvider,
  UiProvider,
} from './context'
import { useAdminState } from './hooks/useAdminState'
import { useCampaignState } from './hooks/useCampaignState'
import { useCharacterState } from './hooks/useCharacterState'
import { useMissionState } from './hooks/useMissionState'
import { useProfileState } from './hooks/useProfileState'
import { useRealmState } from './hooks/useRealmState'
import { useUiState } from './hooks/useUiState'
import { DataTable, Icon, RealmStatusScreen, SearchableSelect } from './shared/components'
import { resolveRealmContextFromPath, buildPathForState } from './shared/routing'
import { ApiError, getAccessToken, setRealmCode } from './services/apiClient'
import {
  toMessage,
  isUnauthorized,
  catalogEntryLabel,
  catalogEntryDescription,
  formatShortDate,
  compareSortableValues,
  scopedStorageKey,
  readStoredJson,
  platformRoleLabel,
} from './shared/utils'
import type { Screen, BreadcrumbItem, EffectiveThemeMode, InviteAccessPreview } from './types/ui'
import { SCREEN_LABELS, SCREEN_ICONS, NAVIGATION_SECTIONS } from './types/ui'
import {
  createAdminRealm,
  createAdminGameSystem,
  createAdminSheetType,
  getCurrentRealmPermissions,
  getPublicRealmBranding,
  listAdminRealmUserRoles,
  listAdminCampaigns,
  listAdminGameSystems,
  listAdminRealms,
  listAdminUsers,
  listAdminSheetTypes,
  approveCampaignMember,
  applyToCampaign,
  applyToCampaignViaInviteToken,
  approveApplication,
  changePassword,
  checkPermission,
  banCampaignMember,
  cancelMission,
  completeMission,
  createCampaign,
  createInviteToken,
  createCharacter,
  discoverCampaigns,
  createMission,
  createRoom,
  applyToCampaignViaInviteCode,
  getCampaign,
  getCampaignByInviteCode,
  getCampaignMember,
  getCampaignMembers,
  listCampaignGameSystems,
  listCampaignModules,
  listCampaignMembersForManagement,
  getPostLoginCampaignSummary,
  getCharacter,
  getCharacterSheet,
  previewInviteToken,
  getMe,
  getPublicProfile,
  leaveCampaign,
  leaveMission,
  listCharacters,
  listMissionParticipants,
  listMyCampaignMemberships,
  listPendingApplications,
  listMissions,
  listRooms,
  logout,
  rejectApplication,
  joinMission,
  getMissionChat,
  reopenMission,
  sendMissionChatMessage,
  updateMission,
  updateMissionParticipationType,
  updateAdminCampaign,
  updateAdminGameSystem,
  updateAdminRealm,
  upsertAdminRealmUserRole,
  updateAdminSheetType,
  updateAdminUser,
  suspendCampaignMember,
  transferOwnership,
  unbanCampaignMember,
  unsuspendCampaignMember,
  updateCampaign,
  updateCampaignMemberRole,
  updateCharacterStatus,
  updateCharacterSheet,
  updateMe,
} from './services/gateApi'
import { connectResourceInvalidationStream } from './services/realtime'
import type {
  AdminCampaignPage,
  AdminRealmListItem,
  AdminRealmUserRoleResponse,
  AdminUserPage,
  AuthSession,
  CampaignApplicationResponse,
  CampaignDiscoverResponse,
  CampaignMembershipResponse,
  CampaignRole,
  CampaignResponse,
  Character,
  CharacterStatus,
  CreateInviteTokenRequest,
  MyCampaignMembershipResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionStatus,
  PlatformRole,
  PublicRealmBrandingResponse,
  RealmRole,
  RealmType,
  AdminGameSystemUpsertRequest,
  AdminSheetTypeUpsertRequest,
  CampaignInvitePreviewResponse,
  InviteTokenPreviewResponse,
  PostLoginCampaignEntryResponse,
} from './types/domain'
import type { ResourceInvalidationPayload } from './types/realtime'

const CAMPAIGN_ID_KEY = 'gate_campaign_id'
const KNOWN_CAMPAIGNS_KEY = 'gate_known_campaign_ids'
const KNOWN_CAMPAIGN_META_KEY = 'gate_known_campaign_meta'
const THEME_KEY = 'gate_theme'
const PENDING_APPLICATIONS_CACHE_KEY = 'gate_pending_applications_cache'

const DEFAULT_APP_TITLE = 'Taverna del Codice'
const DEFAULT_FAVICON_URL = '/favicon.svg'


type KnownCampaignMeta = { id: string; name: string }
type MissionShareTarget = { campaignId: string; missionId: string }

function readPendingApplicationsCache(userId?: string | null): Record<string, CampaignApplicationResponse[]> {
  return readStoredJson(sessionStorage, scopedStorageKey(PENDING_APPLICATIONS_CACHE_KEY, userId), {})
}

function readPendingApplicationsForCampaign(userId: string | null | undefined, campaignId: string): CampaignApplicationResponse[] {
  if (!campaignId.trim()) return []
  return readPendingApplicationsCache(userId)[campaignId] || []
}

function writePendingApplicationsForCampaign(
  userId: string | null | undefined,
  campaignId: string,
  list: CampaignApplicationResponse[],
) {
  if (!campaignId.trim()) return
  const next = readPendingApplicationsCache(userId)
  next[campaignId] = list
  sessionStorage.setItem(scopedStorageKey(PENDING_APPLICATIONS_CACHE_KEY, userId), JSON.stringify(next))
}

const CAMPAIGN_ACTIVE_REQUIRED_SCREENS: Screen[] = [
  'Approvazione Accessi',
  'Gestione Personaggi',
  'Scheda PG',
  'Gestione Campagna',
  'Missioni',
  'Stanze',
  'Profilo Membro Campagna',
  'Seleziona PG',
  'Crea Personaggio',
]

const LEGACY_INVITE_CODE_REGEX = /^[0-9a-fA-F-]{36}$/

function isLegacyInviteCode(value: string) {
  return LEGACY_INVITE_CODE_REGEX.test(value.trim())
}

const ADMIN_PLATFORM_ROLES: PlatformRole[] = ['USER', 'ADMIN', 'SYSTEM']
const REALM_TYPE_OPTIONS: RealmType[] = ['STORE', 'ASSOCIATION', 'PRIVATE_GROUP', 'EVENT']
type SystemAdminView = 'users' | 'campaigns' | 'realms' | 'realmAccess' | 'sheets'

type RealtimeActionMap = {
  refreshProfile: () => Promise<void>
  refreshPostLoginSummary: () => Promise<void>
  refreshCampaignBlock: () => Promise<void>
  refreshCharacterBlock: () => Promise<void>
  refreshMissions: (options?: { clearSelection?: boolean }) => Promise<void>
  refreshMissionChat: () => Promise<void>
  loadDiscoverableCampaigns: () => Promise<void>
  loadCharactersForManagement: () => Promise<void>
  loadPendingForActiveCampaign: () => Promise<void>
  refreshPendingApplicationsForCampaign: (campaignId: string) => Promise<void>
  loadAdminUsers: (page: number, query?: string) => Promise<void>
  loadAdminCampaigns: (page: number) => Promise<void>
  loadAdminRealms: (page?: number, query?: string) => Promise<void>
  loadAdminRealmUserRoles: (realmId?: string) => Promise<void>
  loadAdminSheetCatalogs: () => Promise<void>
}

type RealtimeStateSnapshot = {
  screen: Screen
  campaignId: string
  activeUserId: string | null
  isSystemSession: boolean
  systemAdminView: SystemAdminView
  adminUsersPageIndex: number
  adminCampaignsPageIndex: number
  adminRealmsPageIndex: number
}

const CAMPAIGN_REQUIRED_TOOLTIP = 'Caricare prima la campagna'
const MODULE_REQUIRED_BY_SCREEN: Partial<Record<Screen, string>> = {
  Stanze: 'STANZE',
}

function App() {
  const initialRealmContext = useMemo(() => resolveRealmContextFromPath(window.location.pathname), [])
  const {
    screen,
    setScreen,
    busy,
    setBusy,
    error,
    setError,
    events,
    isSidebarOpen,
    setIsSidebarOpen,
    theme,
    setTheme,
    addEvent,
  } = useUiState(initialRealmContext.screen || 'Profilo')
  const { profile, setProfile } = useProfileState()
  const {
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
  } = useRealmState(initialRealmContext)
  const {
    campaignId,
    setCampaignId,
    knownCampaignIds,
    setKnownCampaignIds,
    knownCampaignMeta,
    setKnownCampaignMeta,
    myCampaigns,
    setMyCampaigns,
    discoverableCampaigns,
    setDiscoverableCampaigns,
    campaignDetailsById,
    setCampaignDetailsById,
    pendingApplications,
    setPendingApplications,
    campaign,
    setCampaign,
    members,
    setMembers,
    memberNames,
    setMemberNames,
    campaignMembersForManagement,
    setCampaignMembersForManagement,
    canManageCampaignMembers,
    setCanManageCampaignMembers,
    campaignFounderNames,
    setCampaignFounderNames,
    permissions,
    setPermissions,
    campaignModules,
    setCampaignModules,
    campaignGameSystems,
    setCampaignGameSystems,
    pendingApplicationsByCampaignId,
    setPendingApplicationsByCampaignId,
    selectedCampaignMember,
    setSelectedCampaignMember,
    selectedCampaignMemberProfile,
    setSelectedCampaignMemberProfile,
    rooms,
    setRooms,
    isLeaveCampaignOpen,
    setIsLeaveCampaignOpen,
  } = useCampaignState()
  const {
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
  } = useAdminState()
  const {
    characters,
    setCharacters,
    selectedCharacterId,
    setSelectedCharacterId,
    characterDetail,
    setCharacterDetail,
    characterSheetDetail,
    setCharacterSheetDetail,
  } = useCharacterState()
  const {
    missions,
    setMissions,
    selectedMissionId,
    setSelectedMissionId,
    missionParticipantsById,
    setMissionParticipantsById,
    myMissionParticipationById,
    setMyMissionParticipationById,
    missionParticipantCharacterLabelById,
    setMissionParticipantCharacterLabelById,
    selectedMissionChatContext,
    setSelectedMissionChatContext,
    missionChat,
    setMissionChat,
    missionChatBusy,
    setMissionChatBusy,
    missionChatError,
    setMissionChatError,
  } = useMissionState()
  const isSystemRole = profile?.platformRole === 'SYSTEM'
  const isSystemSession = isSystemRole
  const effectiveTheme: EffectiveThemeMode = isSystemRole ? 'sysadmin' : theme
  const welcomeProfileName = profile?.profileName?.trim() || profile?.username?.trim() || 'profilo'
  const activeUserId = profile?.id ?? null
  const brandTitle = realmBranding?.name || DEFAULT_APP_TITLE
  const brandLogoUrl = realmBranding?.logoUrl || null
  const [postLoginCampaigns, setPostLoginCampaigns] = useState<PostLoginCampaignEntryResponse[]>([])
  const [postLoginCanCreateCampaign, setPostLoginCanCreateCampaign] = useState(false)
  const [postLoginLoading, setPostLoginLoading] = useState(false)
  const [postLoginError, setPostLoginError] = useState('')
  const postLoginSummaryInFlightRef = useRef<Promise<void> | null>(null)
  const campaignSwitchSourceIdRef = useRef('')
  const missionShareTargetRef = useRef<MissionShareTarget | null>(null)
  const missionShareTargetAppliedRef = useRef(false)

  useEffect(() => {
    setRealmCode(realmCode)
  }, [realmCode])

  useEffect(() => {
    const syncRealmFromLocation = () => {
      const resolved = resolveRealmContextFromPath(window.location.pathname)
      setRealmCodeState(resolved.realmCode)
      setAuthMode(resolved.authMode)
      if (resolved.screen) {
        setScreen(resolved.screen)
      }
    }

    syncRealmFromLocation()
    window.addEventListener('popstate', syncRealmFromLocation)
    return () => window.removeEventListener('popstate', syncRealmFromLocation)
  }, [])

  useEffect(() => {
    const syncMissionShareTargetFromLocation = () => {
      const params = new URLSearchParams(window.location.search)
      const missionId = params.get('missionId')?.trim() || ''
      if (!missionId) {
        missionShareTargetRef.current = null
        missionShareTargetAppliedRef.current = false
        return
      }

      missionShareTargetRef.current = {
        campaignId: params.get('campaignId')?.trim() || '',
        missionId,
      }
      missionShareTargetAppliedRef.current = false
    }

    syncMissionShareTargetFromLocation()
    window.addEventListener('popstate', syncMissionShareTargetFromLocation)
    return () => window.removeEventListener('popstate', syncMissionShareTargetFromLocation)
  }, [])

  useEffect(() => {
    const nextPath = buildPathForState({
      realmCode,
      authMode,
      screen,
      isAuthenticated: Boolean(profile),
    })
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(window.history.state, '', nextPath)
    }
  }, [authMode, profile, realmCode, screen])

  useEffect(() => {
    let cancelled = false
    const iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null

    const applyBranding = (branding: PublicRealmBrandingResponse) => {
      const title = branding.name.trim() || DEFAULT_APP_TITLE
      document.title = title
      if (iconLink) {
        iconLink.href = branding.logoUrl?.trim() || DEFAULT_FAVICON_URL
      }
    }

    setRealmAvailability('loading')
    setRealmAvailabilityMessage('')

    void (async () => {
      try {
        const branding = await getPublicRealmBranding(realmCode)
        if (cancelled) return
        setRealmBranding(branding)
        setRealmAvailability('ready')
        setRealmAvailabilityMessage('')
        applyBranding(branding)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof ApiError && (err.status === 403 || err.status === 404)
          ? 'Questo realm non e attivo o non e disponibile.'
          : toMessage(err)
        setRealmBranding(null)
        setRealmAvailability('unavailable')
        setRealmAvailabilityMessage(message)
        document.title = `Realm ${realmCode} non disponibile`
        if (iconLink) {
          iconLink.href = DEFAULT_FAVICON_URL
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [realmCode])

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
    if (!isSystemRole) {
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [effectiveTheme, isSystemRole, theme])

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || null,
    [characters, selectedCharacterId],
  )
  const activeCampaignCharacterId = useMemo(() => {
    const currentUserId = profile?.id
    const activeCampaign = campaignId.trim()
    if (!currentUserId || !activeCampaign) return ''
    const activeCharacter = characters.find(
      (character) =>
        character.userId === currentUserId &&
        character.campaignId === activeCampaign &&
        character.characterStatus === 'ACTIVE' &&
        !character.isNpc,
    )
    return activeCharacter?.id || members.find((item) => item.userId === currentUserId && item.campaignId === activeCampaign)?.characterId || ''
  }, [campaignId, characters, members, profile?.id])

  const selectedMission = useMemo(
    () => missions.find((mission) => mission.id === selectedMissionId) || null,
    [missions, selectedMissionId],
  )
  const selectedMissionCharacterId = useMemo(() => {
    const currentUserId = profile?.id
    if (!currentUserId || !selectedMission) return activeCampaignCharacterId
    const participantCharacterId = (missionParticipantsById[selectedMission.id] || []).find(
      (participant) => participant.userId === currentUserId,
    )?.characterId
    if (participantCharacterId) return participantCharacterId

    const activeCharacter = characters.find(
      (character) =>
        character.userId === currentUserId &&
        character.campaignId === selectedMission.campaignId &&
        character.characterStatus === 'ACTIVE' &&
        !character.isNpc,
    )
    return activeCharacter?.id || activeCampaignCharacterId
  }, [activeCampaignCharacterId, characters, missionParticipantsById, profile?.id, selectedMission])
  const approvedCampaignMemberships = useMemo(
    () => myCampaigns.filter((item) => item.memberStatus === 'APPROVED'),
    [myCampaigns],
  )
  const approvedRoleByCampaignId = useMemo(() => {
    const map: Record<string, CampaignRole> = {}
    for (const membership of approvedCampaignMemberships) {
      map[membership.campaignId] = membership.role
    }
    return map
  }, [approvedCampaignMemberships])
  const activeCampaignRole = campaignId ? approvedRoleByCampaignId[campaignId] || null : null
  const campaignRoleRank: Record<CampaignRole, number> = {
    GIOCATORE: 1,
    CO_MASTER: 2,
    MASTER: 3,
    SUPER_MASTER: 4,
  }
  const activeCampaignHasMissionsModule = Boolean(campaign?.allowedModules?.includes('MISSIONI'))
  const canCreateMissions =
    activeCampaignHasMissionsModule &&
    (activeCampaignRole === 'CO_MASTER' || activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER')
  const canAccessCampaignManagement = activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER'
  const missionWindowSince = () => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const campaignsForList = useMemo(() => {
    const byId = new Map<string, CampaignDiscoverResponse>()
    for (const item of discoverableCampaigns) {
      byId.set(item.id, item)
    }

    for (const membership of myCampaigns) {
      const existing = byId.get(membership.campaignId)
      const detail = campaignDetailsById[membership.campaignId]
      if (existing) {
        byId.set(membership.campaignId, {
          ...existing,
          isOpen: detail?.isOpen ?? existing.isOpen,
          isActive: detail?.isActive ?? existing.isActive,
          isSearchable: detail?.isSearchable ?? existing.isSearchable,
          membershipStatus: membership.memberStatus,
          membershipRole: membership.role,
          moderationReason: membership.moderationReason,
          name: detail?.name || existing.name || membership.campaignName,
          description: detail?.description ?? existing.description,
          summary: detail?.summary ?? existing.summary,
          coverImageUrl: detail?.coverImageUrl ?? existing.coverImageUrl,
          founderId: detail?.founderId || existing.founderId,
          autoJoinEnabled: detail?.autoJoinEnabled ?? existing.autoJoinEnabled,
          gameSystem: detail?.gameSystem ?? existing.gameSystem,
          createdAt: detail?.createdAt || existing.createdAt,
        })
      } else {
        byId.set(membership.campaignId, {
          id: membership.campaignId,
          name: detail?.name || membership.campaignName,
          description: detail?.description ?? null,
          summary: detail?.summary ?? null,
          coverImageUrl: detail?.coverImageUrl ?? null,
          founderId: detail?.founderId || '',
          isOpen: detail?.isOpen ?? false,
          isActive: detail?.isActive ?? false,
          isSearchable: detail?.isSearchable ?? false,
          autoJoinEnabled: detail?.autoJoinEnabled ?? false,
          inviteCode: detail?.inviteCode || '',
          gameSystem: detail?.gameSystem ?? null,
          createdAt: detail?.createdAt || '',
          membershipStatus: membership.memberStatus,
          membershipRole: membership.role,
          moderationReason: membership.moderationReason,
        })
      }
    }

    return Array.from(byId.values())
  }, [campaignDetailsById, discoverableCampaigns, myCampaigns])
  const missionAlertsByCampaign = useMemo(() => {
    const map: Record<string, number> = {}
    for (const mission of missions) {
      if (mission.status !== 'OPEN' && mission.status !== 'REOPENED') continue
      map[mission.campaignId] = (map[mission.campaignId] || 0) + 1
    }
    return map
  }, [missions])
  const isCharacterScope = (value: Screen) =>
    value === 'Gestione Personaggi' || value === 'Scheda PG' || value === 'Crea Personaggio'

  const requiresCampaignSelection = (value: Screen) => CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(value)

  const rememberCampaignId = (id: string, userId: string | null | undefined = activeUserId) => {
    const trimmed = id.trim()
    setCampaignId(trimmed)
    const storageKey = scopedStorageKey(CAMPAIGN_ID_KEY, userId)
    if (trimmed) {
      localStorage.setItem(storageKey, trimmed)
      setKnownCampaignIds((prev) => {
        const next = Array.from(new Set([trimmed, ...prev]))
        localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGNS_KEY, userId), JSON.stringify(next))
        return next
      })
    } else {
      localStorage.removeItem(storageKey)
    }
  }

  const rememberCampaignMeta = (id: string, name: string, userId: string | null | undefined = activeUserId) => {
    setKnownCampaignMeta((prev) => {
      const next = [{ id, name }, ...prev.filter((item) => item.id !== id)]
      localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGN_META_KEY, userId), JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const target = missionShareTargetRef.current
    if (!target || missionShareTargetAppliedRef.current) return
    if (!profile || !activeUserId) return

    const targetCampaignId = target.campaignId.trim()
    const currentCampaignId = campaignId.trim()

    if (targetCampaignId && currentCampaignId !== targetCampaignId) {
      setCampaignId(targetCampaignId)
      const storageKey = scopedStorageKey(CAMPAIGN_ID_KEY, activeUserId)
      localStorage.setItem(storageKey, targetCampaignId)
      setKnownCampaignIds((prev) => {
        const next = Array.from(new Set([targetCampaignId, ...prev]))
        localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGNS_KEY, activeUserId), JSON.stringify(next))
        return next
      })
      if (screen !== 'Missioni') {
        setScreen('Missioni')
      }
      return
    }

    if (screen !== 'Missioni') {
      setScreen('Missioni')
      return
    }

    if (!missions.some((mission) => mission.id === target.missionId)) return

    setSelectedMissionId(target.missionId)
    missionShareTargetAppliedRef.current = true
  }, [activeUserId, campaignId, missions, profile, screen, setCampaignId, setKnownCampaignIds, setScreen, setSelectedMissionId])

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await task()
      addEvent(label, 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`${label}: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const runResult = async <T,>(label: string, task: () => Promise<T>): Promise<T> => {
    setBusy(true)
    setError('')
    try {
      const result = await task()
      addEvent(label, 'ok')
      return result
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`${label}: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
      throw err
    } finally {
      setBusy(false)
    }
  }

  const refreshProfile = async () => {
    await run('Profilo caricato', async () => {
      const me = await getMe()
      let mine: MyCampaignMembershipResponse[] = []
      try {
        mine = await listMyCampaignMemberships()
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) {
          throw err
        }
      }
      setProfile(me)
      setMyCampaigns(mine)

      if (mine.length === 0 && campaignId) {
        rememberCampaignId('', me.id)
        setCampaign(null)
        setMembers([])
        setCampaignMembersForManagement([])
        setCanManageCampaignMembers(false)
        setPendingApplications([])
        setSelectedCampaignMember(null)
        setSelectedCampaignMemberProfile(null)
        setCharacters([])
        setMissions([])
        setMissionParticipantsById({})
        setMyMissionParticipationById({})
        setMissionParticipantCharacterLabelById({})
        setRooms([])
      } else if (campaignId && !mine.some((item) => item.campaignId === campaignId && item.memberStatus === 'APPROVED')) {
        rememberCampaignId('', me.id)
        setCampaign(null)
        setMembers([])
        setCampaignMembersForManagement([])
        setCanManageCampaignMembers(false)
        setPendingApplications([])
        setSelectedCampaignMember(null)
        setSelectedCampaignMemberProfile(null)
        setCharacters([])
        setMissions([])
        setMissionParticipantsById({})
        setMyMissionParticipationById({})
        setMissionParticipantCharacterLabelById({})
        setRooms([])
      }
    })
  }

  const loadCampaignBlockFor = async (targetCampaignId: string) => {
    setPendingApplications(readPendingApplicationsForCampaign(activeUserId, targetCampaignId))
    const [
      campaignValue,
      memberValue,
      characterValue,
      missionValue,
      roomValue,
      canManageMembersPermission,
      pendingValue,
    ] = await Promise.all([
      getCampaign(targetCampaignId),
      getCampaignMembers(targetCampaignId),
      listCharacters(targetCampaignId),
      listMissions(targetCampaignId, missionWindowSince()),
      listRooms(targetCampaignId),
      checkPermission(targetCampaignId, 'PROMOTE_CO_MASTER_OR_MASTER')
        .then((permission) => permission.allowed)
        .catch(() => false),
      listPendingApplications(targetCampaignId)
        .catch((err) => {
          if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return []
          throw err
        }),
    ])
    const memberManagementValue = canManageMembersPermission
      ? await listCampaignMembersForManagement(targetCampaignId).catch(() => [])
      : []
    setCampaign(campaignValue)
    setCampaignDetailsById((prev) => ({ ...prev, [campaignValue.id]: campaignValue }))
    rememberCampaignMeta(campaignValue.id, campaignValue.name)
    setMembers(memberValue)
    setCampaignMembersForManagement(memberManagementValue)
    setCanManageCampaignMembers(canManageMembersPermission)
    setPendingApplications(pendingValue)
    writePendingApplicationsForCampaign(activeUserId, targetCampaignId, pendingValue)
    setCharacters(characterValue)
    setMissions(missionValue.map((mission) => ({ ...mission, campaignId: targetCampaignId })))
    setRooms(roomValue)
    setSelectedCharacterId((prev) => prev || characterValue[0]?.id || '')
    setSelectedMissionId('')
  }

  const normalizeLegacyInvitePreview = (preview: CampaignInvitePreviewResponse): InviteAccessPreview => ({
    campaignId: preview.id,
    campaignName: preview.name,
    campaignSummary: preview.summary || preview.description || null,
    coverImageUrl: preview.coverImageUrl,
    founderId: preview.founderId,
    isOpen: preview.isOpen,
    gameSystem: preview.gameSystem || null,
    capabilities: [],
    modeLabel: 'Richiesta manuale',
    modeTone: 'warning',
  })

  const normalizeTokenInvitePreview = (preview: InviteTokenPreviewResponse): InviteAccessPreview => {
    const autoJoin = preview.capabilities.includes('AUTOJOIN')
    return {
      campaignId: preview.campaignId,
      campaignName: preview.campaignName,
      campaignSummary: preview.campaignSummary,
      coverImageUrl: preview.coverImageUrl,
      founderId: preview.founderId,
      isOpen: preview.isOpen,
      gameSystem: preview.gameSystem,
      capabilities: preview.capabilities,
      modeLabel: autoJoin ? 'AUTOJOIN attivo' : 'Richiesta manuale',
      modeTone: autoJoin ? 'success' : 'warning',
    }
  }

  const previewInviteAccess = async (inviteValue: string): Promise<InviteAccessPreview> => {
    const trimmed = inviteValue.trim()
    if (!trimmed) {
      throw new Error('Inserisci un codice o token invito.')
    }
    if (isLegacyInviteCode(trimmed)) {
      const preview = await getCampaignByInviteCode(trimmed)
      return normalizeLegacyInvitePreview(preview)
    }
    const preview = await previewInviteToken(trimmed)
    return normalizeTokenInvitePreview(preview)
  }

  const applyInviteAccess = async (inviteValue: string) => {
    const trimmed = inviteValue.trim()
    if (!trimmed) {
      throw new Error('Inserisci un codice o token invito.')
    }
    if (isLegacyInviteCode(trimmed)) {
      await applyToCampaignViaInviteCode(trimmed)
    } else {
      await applyToCampaignViaInviteToken(trimmed)
    }
    const [discover, mine] = await Promise.all([discoverCampaigns(false), listMyCampaignMemberships()])
    setDiscoverableCampaigns(discover)
    setMyCampaigns(mine)
  }

  const refreshCampaignBlock = async () => {
    if (!campaignId.trim()) return
    await run('Dati campagna caricati', async () => {
      await loadCampaignBlockFor(campaignId)
    })
  }

  const loadCharacterDetailBlock = async (targetCampaignId: string, targetCharacterId: string) => {
    const [detailValue, sheetValue] = await Promise.all([
      getCharacter(targetCampaignId, targetCharacterId),
      getCharacterSheet(targetCampaignId, targetCharacterId),
    ])
    setCharacterDetail(detailValue)
    setCharacterSheetDetail(sheetValue)
  }

  const refreshCharacterBlock = async () => {
    const targetCampaignId = selectedCharacter?.campaignId || campaignId
    if (!targetCampaignId || !selectedCharacterId) return
    await run('Scheda personaggio caricata', async () => {
      await loadCharacterDetailBlock(targetCampaignId, selectedCharacterId)
    })
  }

  const loadAdminUsers = async (page: number, query = adminUsersSearch) => {
    setBusy(true)
    setError('')
    try {
      const response = await listAdminUsers(page, query)
      setAdminUsersPage(response)
      setAdminUsersPageIndex(response.page)
      setAdminUsersDrafts(
        Object.fromEntries(
          response.items.map((item) => [
            item.id,
            {
              platformRole: item.platformRole,
              isActive: item.isActive,
            },
          ]),
        ),
      )
      addEvent('Lista utenti caricata', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Lista utenti: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const loadAdminCampaigns = async (page: number) => {
    setBusy(true)
    setError('')
    try {
      const response = await listAdminCampaigns(page)
      setAdminCampaignsPage(response)
      setAdminCampaignsPageIndex(response.page)
      setAdminCampaignsDrafts(
        Object.fromEntries(
          response.items.map((item) => [
            item.id,
            {
              isOpen: item.isOpen,
              isActive: item.isActive,
              isSearchable: item.isSearchable,
              gameSystem: item.gameSystem,
              allowedModules: [...item.allowedModules],
            },
          ]),
        ),
      )
      addEvent('Lista campagne caricata', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Lista campagne: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const loadAdminRealms = async (page = 0, query = adminRealmsSearch) => {
    setBusy(true)
    setError('')
    try {
      const response = await listAdminRealms(page, query)
      const items = response.items ?? []
      setAdminRealmsPage(response)
      setAdminRealmsPageIndex(response.page)
      setAdminRealms(items)
      setSelectedRealmAccessRealmId((prev) => prev || items[0]?.id || '')
      addEvent('Lista realm caricata', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Lista realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const loadCurrentRealmPermissions = async () => {
    try {
      const response = await getCurrentRealmPermissions()
      setRealmPermissions(response)
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Permessi realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    }
  }

  const loadAdminRealmUserRoles = async (realmId?: string) => {
    const targetRealmId = realmId || selectedRealmAccessRealmId
    if (!targetRealmId) return
    setBusy(true)
    setError('')
    try {
      const response = await listAdminRealmUserRoles({ realmId: targetRealmId })
      setAdminRealmUserRoles(response)
      setAdminRealmRoleDrafts(
        Object.fromEntries(
          response.map((item) => [`${item.realmId}:${item.userId}`, item.isPrivilegeActive ? item.role : 'USER']),
        ),
      )
      addEvent('Accessi realm caricati', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Accessi realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const searchRealmAccessUser = async () => {
    const query = realmAccessSearch.trim()
    if (query.length < 3) {
      setRealmAccessSearchResults([])
      setRealmAccessSearchMessage('Inserisci almeno 3 caratteri.')
      return
    }

    setBusy(true)
    setError('')
    setRealmAccessSearchMessage('')
    try {
      const response = await listAdminUsers(0, query)
      setRealmAccessSearchResults(response.items)
      setRealmAccessSearchMessage(response.items.length === 0 ? 'Nessun profilo trovato.' : `${response.items.length} profili trovati.`)
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      setRealmAccessSearchMessage(message)
      addEvent(`Ricerca profilo: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const loadAdminSheetCatalogs = async () => {
    setBusy(true)
    setError('')
    setAdminSheetCatalogsLoaded(true)
    try {
      const [gameSystems, sheetTypes] = await Promise.all([listAdminGameSystems(), listAdminSheetTypes()])
      setAdminGameSystems(gameSystems)
      setAdminSheetTypes(sheetTypes)
      addEvent('Cataloghi schede caricati', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Cataloghi schede: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminRealmUserRole = async (realmId: string, userId: string) => {
    const key = `${realmId}:${userId}`
    const role = adminRealmRoleDrafts[key] || 'USER'

    setBusy(true)
    setError('')
    try {
      await upsertAdminRealmUserRole({ realmId, userId, role })
      await loadAdminRealmUserRoles(realmId)
      addEvent('Accesso realm aggiornato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento accesso realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminUser = async (userId: string) => {
    const draft = adminUsersDrafts[userId]
    if (!draft) return

    setBusy(true)
    setError('')
    try {
      await updateAdminUser(userId, draft)
      await loadAdminUsers(adminUsersPageIndex, adminUsersSearch)
      addEvent('Utente aggiornato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento utente: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminCampaign = async (campaignIdValue: string) => {
    const draft = adminCampaignsDrafts[campaignIdValue]
    if (!draft) return

    setBusy(true)
    setError('')
    try {
      await updateAdminCampaign(campaignIdValue, draft)
      await loadAdminCampaigns(adminCampaignsPageIndex)
      addEvent('Campagna aggiornata', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento campagna: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminGameSystem = async (code: string, payload: AdminGameSystemUpsertRequest) => {
    setBusy(true)
    setError('')
    try {
      await updateAdminGameSystem(code, payload)
      await loadAdminSheetCatalogs()
      addEvent('Sistema di gioco aggiornato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento sistema di gioco: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const createAdminGameSystemEntry = async (payload: AdminGameSystemUpsertRequest) => {
    setBusy(true)
    setError('')
    try {
      await createAdminGameSystem(payload)
      await loadAdminSheetCatalogs()
      addEvent('Sistema di gioco creato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Creazione sistema di gioco: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminSheetType = async (code: string, payload: AdminSheetTypeUpsertRequest) => {
    setBusy(true)
    setError('')
    try {
      await updateAdminSheetType(code, payload)
      await loadAdminSheetCatalogs()
      addEvent('Sheet type aggiornato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento sheet type: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const createAdminSheetTypeEntry = async (payload: AdminSheetTypeUpsertRequest) => {
    setBusy(true)
    setError('')
    try {
      await createAdminSheetType(payload)
      await loadAdminSheetCatalogs()
      addEvent('Sheet type creato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Creazione sheet type: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const createAdminRealmEntry = async () => {
    const hosts = adminRealmHostsInput
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean)

    setBusy(true)
    setError('')
    try {
      await createAdminRealm({
        ...adminRealmDraft,
        code: adminRealmDraft.code.trim().toLowerCase(),
        name: adminRealmDraft.name.trim(),
        logoUrl: adminRealmDraft.logoUrl?.trim() || null,
        hosts,
      })
      setAdminRealmDraft({
        code: '',
        name: '',
        type: 'STORE',
        isActive: true,
        logoUrl: '',
        allowUserCampaignCreation: true,
        hosts: [],
      })
      setSelectedAdminRealmId('')
      setAdminRealmHostsInput('')
      await loadAdminRealms(adminRealmsPageIndex, adminRealmsSearch)
      addEvent('Realm creato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Creazione realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const saveAdminRealm = async (realmId: string) => {
    if (!adminRealmDraft.name.trim()) return

    setBusy(true)
    setError('')
    try {
      await updateAdminRealm(realmId, {
        code: adminRealmDraft.code.trim().toLowerCase(),
        name: adminRealmDraft.name.trim(),
        type: adminRealmDraft.type,
        isActive: adminRealmDraft.isActive,
        logoUrl: adminRealmDraft.logoUrl?.trim() || null,
        allowUserCampaignCreation: adminRealmDraft.allowUserCampaignCreation,
      })
      setSelectedAdminRealmId('')
      setAdminRealmDraft({
        code: '',
        name: '',
        type: 'STORE',
        isActive: true,
        logoUrl: '',
        allowUserCampaignCreation: true,
        hosts: [],
      })
      setAdminRealmHostsInput('')
      await loadAdminRealms(adminRealmsPageIndex, adminRealmsSearch)
      addEvent('Realm aggiornato', 'ok')
    } catch (err) {
      const message = toMessage(err)
      setError(message)
      addEvent(`Aggiornamento realm: ${message}`, 'error')
      if (isUnauthorized(err)) {
        handleLogout()
      }
    } finally {
      setBusy(false)
    }
  }

  const selectAdminRealmForEdit = (realm: AdminRealmListItem) => {
    setSelectedAdminRealmId(realm.id)
    setAdminRealmDraft({
      code: realm.code,
      name: realm.name,
      type: realm.type,
      isActive: realm.isActive,
      logoUrl: realm.logoUrl || '',
      allowUserCampaignCreation: realm.allowUserCampaignCreation,
      hosts: [],
    })
    setAdminRealmHostsInput(realm.hosts.map((host) => host.host).join('\n'))
  }

  const resetAdminRealmForm = () => {
    setSelectedAdminRealmId('')
    setAdminRealmDraft({
      code: '',
      name: '',
      type: 'STORE',
      isActive: true,
      logoUrl: '',
      allowUserCampaignCreation: true,
      hosts: [],
    })
    setAdminRealmHostsInput('')
  }

  const openLeaveCampaignModal = () => {
    setIsLeaveCampaignOpen(true)
  }

  const closeLeaveCampaignModal = () => {
    setIsLeaveCampaignOpen(false)
  }

  const clearCampaignWorkspace = () => {
    setCampaign(null)
    setMembers([])
    setCampaignMembersForManagement([])
    setCanManageCampaignMembers(false)
    setPendingApplications([])
    setPermissions([])
    setCampaignModules([])
    setCampaignGameSystems([])
    setAdminUsersPage(null)
    setAdminUsersPageIndex(0)
    setAdminUsersDrafts({})
    setAdminCampaignsPage(null)
    setAdminCampaignsPageIndex(0)
    setAdminCampaignsDrafts({})
    setCharacters([])
    setSelectedCharacterId('')
    setCharacterDetail(null)
    setCharacterSheetDetail(null)
    setMissions([])
    setMissionParticipantsById({})
    setMyMissionParticipationById({})
    setMissionParticipantCharacterLabelById({})
    setSelectedMissionId('')
    setRooms([])
    setSelectedCampaignMember(null)
    setSelectedCampaignMemberProfile(null)
  }

  const leavePreviousCampaignIfNeeded = async (targetCampaignId: string) => {
    const pendingSourceCampaignId = campaignSwitchSourceIdRef.current.trim()
    const currentCampaignId = campaignId.trim()
    const sourceCampaignId =
      pendingSourceCampaignId || (currentCampaignId && currentCampaignId !== targetCampaignId ? currentCampaignId : '')

    if (sourceCampaignId && sourceCampaignId !== targetCampaignId) {
      await leaveCampaign(sourceCampaignId)
    }

    campaignSwitchSourceIdRef.current = ''
  }

  const activateCampaignAndNavigate = async (targetCampaignId: string, targetScreen: Screen) => {
    const latestCampaign = await getCampaign(targetCampaignId)
    if (!isSystemRole && !latestCampaign.isActive) {
      throw new Error('Campagna disattivata: non selezionabile come attiva')
    }
    await run('Cambio campagna', async () => {
      await leavePreviousCampaignIfNeeded(targetCampaignId)
      rememberCampaignId(targetCampaignId)
      setSelectedCampaignMember(null)
      setSelectedCampaignMemberProfile(null)
      setCharacterDetail(null)
      setCharacterSheetDetail(null)
      setSelectedCharacterId('')
      setSelectedMissionId('')
      await loadCampaignBlockFor(targetCampaignId)
      await refreshProfile()
      setScreen(targetScreen)
    })
  }

  const leaveActiveCampaign = async () => {
    if (!campaignId.trim()) return
    await run('Uscita dalla campagna completata', async () => {
      await leaveCampaign(campaignId)
      campaignSwitchSourceIdRef.current = ''
      rememberCampaignId('')
      clearCampaignWorkspace()
      setScreen('Ingresso')
      closeLeaveCampaignModal()
      await refreshProfile()
    })
  }

  const detachActiveCampaign = () => {
    if (!campaignId.trim()) return
    campaignSwitchSourceIdRef.current = campaignId
    rememberCampaignId('')
    clearCampaignWorkspace()
    setScreen('Ingresso')
  }

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Approvazione Accessi') return
    if (!campaignId.trim()) return
    if (!canAccessCampaignManagement) return

    let cancelled = false
    void (async () => {
      try {
        await run('Richieste pending caricate', async () => {
          await loadPendingForActiveCampaign()
        })
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Accessi: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, campaignId, canAccessCampaignManagement])

  useEffect(() => {
    if (!getAccessToken()) return
    if (!campaignId.trim()) return
    if (!canAccessCampaignManagement) return

    let cancelled = false
    void (async () => {
      try {
        await loadPendingForActiveCampaign()
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Accessi attivi: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [campaignId, canAccessCampaignManagement])

  const refreshMissions = async (options: { clearSelection?: boolean } = {}) => {
    const approvedCampaignIds = approvedCampaignMemberships.map((membership) => membership.campaignId)
    if (approvedCampaignIds.length === 0) {
      setMissions([])
      setSelectedMissionId('')
      setMissionParticipantsById({})
      setMyMissionParticipationById({})
      setMissionParticipantCharacterLabelById({})
      return
    }

    const settled = await Promise.allSettled(
      approvedCampaignIds.map(async (targetCampaignId) => {
        const [missionRows, characterRows] = await Promise.all([
          listMissions(targetCampaignId, missionWindowSince()),
          listCharacters(targetCampaignId).catch(() => []),
        ])
        return {
          missions: missionRows.map((mission) => ({ ...mission, campaignId: targetCampaignId })),
          characters: characterRows,
        }
      }),
    )

    const combined = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.missions : []))
    const nextCharactersFromMissions = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value.characters : []))
    const characterLabels = settled.reduce<Record<string, string>>((labels, result) => {
      if (result.status !== 'fulfilled') return labels
      for (const character of result.value.characters) {
        labels[character.id] = character.name
      }
      return labels
    }, {})
    const missionRank = (status: MissionStatus) => {
      switch (status) {
        case 'OPEN':
          return 0
        case 'REOPENED':
          return 1
        case 'CONFIRMED':
          return 2
        case 'CLOSED':
          return 3
        case 'COMPLETED':
          return 4
        case 'CANCELLED':
        default:
          return 5
      }
    }
    const nextMissions = combined.sort((left, right) => {
      const statusDelta = missionRank(left.status) - missionRank(right.status)
      if (statusDelta !== 0) return statusDelta
      const leftClose = left.closesAt ? new Date(left.closesAt).getTime() : Number.POSITIVE_INFINITY
      const rightClose = right.closesAt ? new Date(right.closesAt).getTime() : Number.POSITIVE_INFINITY
      if (leftClose !== rightClose) return leftClose - rightClose
      return right.createdAt.localeCompare(left.createdAt)
    })
    setMissions(nextMissions)
    setCharacters((prev) => {
      const byId = new Map(prev.map((character) => [character.id, character]))
      for (const character of nextCharactersFromMissions) {
        byId.set(character.id, character)
      }
      return Array.from(byId.values())
    })
    setSelectedMissionId((prev) => {
      if (options.clearSelection) return ''
      return nextMissions.some((item) => item.id === prev) ? prev : ''
    })

    const participantSettled = await Promise.allSettled(
      nextMissions.map(async (mission) => ({
        missionId: mission.id,
        participants: await listMissionParticipants(mission.campaignId, mission.id),
      })),
    )
    const nextParticipantsById: Record<string, MissionParticipantResponse[]> = {}
    const nextMyParticipationById: Record<string, MissionParticipationType> = {}
    const participantUserIds = new Set<string>()

    for (const result of participantSettled) {
      if (result.status !== 'fulfilled') continue
      nextParticipantsById[result.value.missionId] = result.value.participants
      for (const participant of result.value.participants) {
        participantUserIds.add(participant.userId)
        if (participant.userId === profile?.id) {
          nextMyParticipationById[result.value.missionId] = participant.participationType
        }
      }
    }

    setMissionParticipantsById(nextParticipantsById)
    setMyMissionParticipationById(nextMyParticipationById)
    setMissionParticipantCharacterLabelById(characterLabels)

    const creatorUserIds = new Set(
      nextMissions
        .map((mission) => mission.createdBy)
        .filter((userId) => userId !== profile?.id && !memberNames[userId]),
    )
    const missingUserIds = Array.from(new Set([...participantUserIds, ...creatorUserIds])).filter(
      (userId) => userId !== profile?.id && !memberNames[userId],
    )
    if (missingUserIds.length > 0) {
      const settledProfiles = await Promise.allSettled(missingUserIds.map((userId) => getPublicProfile(userId)))
      setMemberNames((prev) => {
        const next = { ...prev }
        for (let index = 0; index < settledProfiles.length; index += 1) {
          const userId = missingUserIds[index]
          const result = settledProfiles[index]
          if (result.status === 'fulfilled') {
            next[userId] = result.value.profileName || result.value.username || 'Profilo non disponibile'
          } else if (!next[userId]) {
            next[userId] = 'Profilo non disponibile'
          }
        }
        return next
      })
    }
  }

  const loadMissionChat = async (targetCampaignId: string, missionId: string) => {
    setMissionChatBusy(true)
    setMissionChatError('')
    try {
      const value = await getMissionChat(targetCampaignId, missionId)
      setSelectedMissionChatContext({ campaignId: targetCampaignId, missionId })
      setMissionChat(value)
    } catch (err) {
      const message = toMessage(err)
      setMissionChatError(message)
      throw err
    } finally {
      setMissionChatBusy(false)
    }
  }

  const refreshMissionChat = async () => {
    if (!selectedMissionChatContext) return
    await loadMissionChat(selectedMissionChatContext.campaignId, selectedMissionChatContext.missionId)
  }

  const loadDiscoverableCampaigns = async () => {
    const list = await discoverCampaigns(false)
    setDiscoverableCampaigns(list)
  }

  const loadPostLoginCampaignSummary = useCallback(async () => {
    if (!getAccessToken()) return
    if (postLoginSummaryInFlightRef.current) {
      await postLoginSummaryInFlightRef.current
      return
    }
    const request = (async () => {
      setPostLoginLoading(true)
      setPostLoginError('')
      try {
        const summary = await getPostLoginCampaignSummary()
        setPostLoginCanCreateCampaign(summary.canCreateCampaign)
        setPostLoginCampaigns(summary.campaigns)
      } catch (err) {
        const message = toMessage(err)
        setPostLoginError(message)
        if (isUnauthorized(err)) handleLogout()
      } finally {
        setPostLoginLoading(false)
        postLoginSummaryInFlightRef.current = null
      }
    })()
    postLoginSummaryInFlightRef.current = request
    await request
  }, [])

  useEffect(() => {
    if (!getAccessToken()) return
    const missingCampaignIds = myCampaigns
      .map((membership) => membership.campaignId)
      .filter((membershipCampaignId, index, all) => all.indexOf(membershipCampaignId) === index)
      .filter((membershipCampaignId) => !campaignDetailsById[membershipCampaignId])
    if (missingCampaignIds.length === 0) return

    let cancelled = false
    void (async () => {
      const settled = await Promise.allSettled(missingCampaignIds.map((membershipCampaignId) => getCampaign(membershipCampaignId)))
      if (cancelled) return
      setCampaignDetailsById((prev) => {
        const next = { ...prev }
        for (let index = 0; index < settled.length; index += 1) {
          const result = settled[index]
          if (result.status === 'fulfilled') {
            next[result.value.id] = result.value
          }
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [campaignDetailsById, myCampaigns])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Missioni') return

    let cancelled = false
    void (async () => {
      try {
        await refreshMissions({ clearSelection: true })
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Missioni caricate: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, approvedCampaignMemberships, campaignId])

  const loadCharactersForManagement = async () => {
    const approvedCampaignIds = approvedCampaignMemberships.map((item) => item.campaignId)
    if (approvedCampaignIds.length === 0) {
      setCharacters([])
      setSelectedCharacterId('')
      setCharacterDetail(null)
      setCharacterSheetDetail(null)
      return
    }

    const settled = await Promise.allSettled(
      approvedCampaignIds.map(async (targetCampaignId) => {
        const [memberRows, characterRows] = await Promise.all([
          getCampaignMembers(targetCampaignId),
          listCharacters(targetCampaignId),
        ])
        return { campaignId: targetCampaignId, members: memberRows, characters: characterRows }
      }),
    )

    const resolved = settled.filter(
      (item): item is PromiseFulfilledResult<{ campaignId: string; members: CampaignMembershipResponse[]; characters: Character[] }> =>
        item.status === 'fulfilled',
    )

    const nextCharacters: Character[] = []
    const userNamesToResolve = new Set<string>()

    for (const item of resolved) {
      const viewerRole = approvedRoleByCampaignId[item.value.campaignId] || null
      const memberRoleByUserId = new Map<string, CampaignRole>()
      for (const member of item.value.members) {
        memberRoleByUserId.set(member.userId, member.role)
        if (member.userId !== profile?.id) {
          userNamesToResolve.add(member.userId)
        }
      }

      for (const character of item.value.characters) {
        if (character.userId === profile?.id) {
          nextCharacters.push(character)
          continue
        }

        if (character.isNpc) {
          if (viewerRole === 'CO_MASTER' || viewerRole === 'MASTER' || viewerRole === 'SUPER_MASTER') {
            nextCharacters.push(character)
          }
          continue
        }

        const ownerRole = character.userId ? memberRoleByUserId.get(character.userId) || null : null
        if (!ownerRole || !viewerRole) continue

        if (viewerRole === 'SUPER_MASTER') {
          nextCharacters.push(character)
          continue
        }

        if (campaignRoleRank[viewerRole] > campaignRoleRank[ownerRole]) {
          nextCharacters.push(character)
        }
      }
    }

    nextCharacters.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    setCharacters(nextCharacters)

    const missingUserIds = Array.from(userNamesToResolve).filter((userId) => !memberNames[userId])
    if (missingUserIds.length > 0) {
      const settledProfiles = await Promise.allSettled(missingUserIds.map((userId) => getPublicProfile(userId)))
      setMemberNames((prev) => {
        const next = { ...prev }
        for (let index = 0; index < settledProfiles.length; index += 1) {
          const userId = missingUserIds[index]
          const result = settledProfiles[index]
          if (result.status === 'fulfilled') {
            next[userId] = result.value.profileName || result.value.username || 'Profilo non disponibile'
          } else if (!next[userId]) {
            next[userId] = 'Profilo non disponibile'
          }
        }
        return next
      })
    }

    setSelectedCharacterId((prev) => {
      if (activeCampaignCharacterId && nextCharacters.some((item) => item.id === activeCampaignCharacterId)) {
        return activeCampaignCharacterId
      }
      if (nextCharacters.some((item) => item.id === prev)) return prev
      return nextCharacters[0]?.id || ''
    })
  }

  const loadPendingForCampaign = async (targetCampaignId: string) => {
    if (!targetCampaignId.trim()) return
    const list = await listPendingApplications(targetCampaignId)
    setPendingApplicationsByCampaignId((prev) => ({
      ...prev,
      [targetCampaignId]: list,
    }))
    writePendingApplicationsForCampaign(activeUserId, targetCampaignId, list)
    if (targetCampaignId === campaignId) {
      setPendingApplications(list)
    }
    return list
  }

  async function loadPendingForActiveCampaign() {
    if (!campaignId.trim()) return
    await loadPendingForCampaign(campaignId)
  }

  const approvePendingForActiveCampaign = async (userId: string) => {
    if (!campaignId.trim()) return
    await approveApplication(campaignId, userId)
    await loadPendingForActiveCampaign()
  }

  const rejectPendingForActiveCampaign = async (userId: string) => {
    if (!campaignId.trim()) return
    await rejectApplication(campaignId, userId)
    await loadPendingForActiveCampaign()
  }

  useEffect(() => {
    if (!getAccessToken()) return
    // Auth bootstrap: profile state is loaded from the API after token storage is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshProfile()
  }, [])

  useEffect(() => {
    if (!getAccessToken()) return
    if (!isCharacterScope(screen)) return
    const missingIds = knownCampaignIds.filter((id) => !knownCampaignMeta.some((item) => item.id === id))
    if (missingIds.length === 0) return

    let cancelled = false
    void (async () => {
      const settled = await Promise.allSettled(missingIds.map((id) => getCampaign(id)))
      if (cancelled) return
      const resolved = settled
        .filter((item): item is PromiseFulfilledResult<CampaignResponse> => item.status === 'fulfilled')
        .map((item) => item.value)
      if (resolved.length > 0) {
        setKnownCampaignMeta((prev) => {
          const merged = [...prev]
          for (const campaignValue of resolved) {
            const index = merged.findIndex((item) => item.id === campaignValue.id)
            if (index >= 0) merged[index] = { id: campaignValue.id, name: campaignValue.name }
            else merged.push({ id: campaignValue.id, name: campaignValue.name })
          }
          localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGN_META_KEY, activeUserId), JSON.stringify(merged))
          return merged
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [knownCampaignIds, knownCampaignMeta, screen])

  useEffect(() => {
    const allMemberships = [...members, ...campaignMembersForManagement]
    const missingUserIds = allMemberships
      .map((member) => member.userId)
      .filter((userId, index, all) => all.indexOf(userId) === index)
      .filter((userId) => !memberNames[userId])
    if (missingUserIds.length === 0) return

    let cancelled = false
    void (async () => {
      const settled = await Promise.allSettled(missingUserIds.map((userId) => getPublicProfile(userId)))
      if (cancelled) return
      setMemberNames((prev) => {
        const next = { ...prev }
        for (let index = 0; index < settled.length; index += 1) {
          const userId = missingUserIds[index]
          const result = settled[index]
          if (result.status === 'fulfilled') {
            next[userId] = result.value.profileName || result.value.username || 'Profilo non disponibile'
          } else {
            next[userId] = 'Profilo non disponibile'
          }
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [members, campaignMembersForManagement, memberNames])

  useEffect(() => {
    const missingFounderIds = campaignsForList
      .map((campaignItem) => campaignItem.founderId)
      .filter((founderId, index, all) => founderId && all.indexOf(founderId) === index)
      .filter((founderId) => !campaignFounderNames[founderId])
    if (missingFounderIds.length === 0) return

    let cancelled = false
    void (async () => {
      const settled = await Promise.allSettled(missingFounderIds.map((founderId) => getPublicProfile(founderId)))
      if (cancelled) return
      setCampaignFounderNames((prev) => {
        const next = { ...prev }
        for (let index = 0; index < settled.length; index += 1) {
          const founderId = missingFounderIds[index]
          const result = settled[index]
          if (result.status === 'fulfilled') {
            next[founderId] = result.value.profileName || result.value.username || 'Profilo non disponibile'
          } else {
            next[founderId] = 'Profilo non disponibile'
          }
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [campaignsForList, campaignFounderNames])

  const activeCampaignListEntry = campaignId ? campaignsForList.find((item) => item.id === campaignId) : undefined
  const activeCampaignIsEnabled = isSystemRole || campaign?.isActive === true || activeCampaignListEntry?.isActive === true
  const hasActiveCampaign =
    activeCampaignIsEnabled &&
    (myCampaigns.some((item) => item.campaignId === campaignId && item.memberStatus === 'APPROVED') ||
      campaignsForList.some((item) => item.id === campaignId && item.membershipStatus === 'APPROVED'))
  useEffect(() => {
    if (isSystemRole) return
    if (!campaignId.trim()) return
    if (activeCampaignIsEnabled) return
    if (campaign?.isActive !== false && activeCampaignListEntry?.isActive !== false) return

    // Navigation guard: leave screens that require an active campaign.
    /* eslint-disable react-hooks/set-state-in-effect */
    rememberCampaignId('')
    clearCampaignWorkspace()
    if (screen !== 'Lista Campagne') {
      setScreen('Lista Campagne')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeCampaignIsEnabled, activeCampaignListEntry?.isActive, campaign?.isActive, campaignId, isSystemRole, screen])
  useEffect(() => {
    if (hasActiveCampaign) return
    if (!CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(screen)) return
    // Navigation guard: keep campaign-scoped screens behind an active campaign.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreen('Lista Campagne')
  }, [screen, hasActiveCampaign])

  useEffect(() => {
    if (screen !== 'Approvazione Accessi') return
    if (canAccessCampaignManagement) return
    // Navigation guard: access approval requires campaign management permissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreen('Scheda Campagna')
  }, [screen, canAccessCampaignManagement])

  useEffect(() => {
    if (screen !== 'Gestione Campagna') return
    if (canAccessCampaignManagement) return
    // Navigation guard: campaign management requires management permissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreen('Scheda Campagna')
  }, [screen, canAccessCampaignManagement])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Scheda Campagna') return
    if (!campaignId.trim()) return

    let cancelled = false
    void (async () => {
      try {
        await refreshCampaignBlock()
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Scheda campagna: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, campaignId])

  useEffect(() => {
    if (screen !== 'Scheda PG') return
    if (!selectedCharacterId) {
      // Navigation guard: character detail requires a selected character.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen('Gestione Personaggi')
      return
    }
    void refreshCharacterBlock()
  }, [screen, selectedCharacterId, campaignId])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Lista Campagne') return

    let cancelled = false
    void (async () => {
      try {
        const list = await discoverCampaigns(false)
        if (!cancelled) setDiscoverableCampaigns(list)
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Campagne disponibili: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Gestione Personaggi') return
    if (approvedCampaignMemberships.length === 0) return

    let cancelled = false
    void (async () => {
      try {
        await loadCharactersForManagement()
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Lista personaggi: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, approvedCampaignMemberships, campaignId])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Crea Campagna' && screen !== 'Gestione Campagna' && screen !== 'Scheda Campagna') return
    if (campaignModules.length > 0) return

    let cancelled = false
    void (async () => {
      try {
        const modulesResult = await listCampaignModules()
        if (cancelled) return
        setCampaignModules(modulesResult)
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Caricamento dati campagna: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, campaignModules.length])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Crea Campagna' && screen !== 'Ingresso') return
    if (campaignGameSystems.length > 0) return

    let cancelled = false
    void (async () => {
      try {
        const systemsResult = await listCampaignGameSystems()
        if (cancelled) return
        setCampaignGameSystems(systemsResult)
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Caricamento sistemi di gioco: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, campaignGameSystems.length])

  const handleAuth = async (session: AuthSession) => {
    setProfile(session.user)
    setError('')
    setPostLoginError('')
    addEvent('Autenticazione completata', 'ok')
    if (session.user.platformRole !== 'SYSTEM') {
      setScreen('Ingresso')
    }
    await refreshProfile()
  }

  function handleLogout() {
    logout()
    setProfile(null)
    setAuthMode('login')
    setScreen('Profilo')
    setCampaignId('')
    setKnownCampaignIds([])
    setKnownCampaignMeta([])
    setPendingApplications([])
    setCampaign(null)
    setMembers([])
    setCampaignMembersForManagement([])
    setPendingApplications([])
    setSelectedCampaignMember(null)
    setSelectedCampaignMemberProfile(null)
    setCampaignModules([])
    setCampaignGameSystems([])
    setAdminUsersPage(null)
    setAdminUsersPageIndex(0)
    setAdminUsersDrafts({})
    setAdminRealmUserRoles([])
    setAdminRealmRoleDrafts({})
    setSelectedRealmAccessRealmId('')
    setRealmAccessSearch('')
    setRealmAccessSearchResults([])
    setRealmAccessSearchMessage('')
    setRealmPermissions(null)
    setAdminRealms([])
    setSelectedAdminRealmId('')
    setCharacters([])
    setAdminGameSystems([])
    setAdminSheetTypes([])
    setAdminSheetCatalogsLoaded(false)
    setMissions([])
    setMissionParticipantsById({})
    setMyMissionParticipationById({})
    setMissionParticipantCharacterLabelById({})
    setRooms([])
    setPermissions([])
    setCharacterDetail(null)
    setCharacterSheetDetail(null)
    setSelectedCharacterId('')
    setSelectedMissionId('')
    setError('')
    setSystemAdminView('users')
    setPostLoginCampaigns([])
    setPostLoginCanCreateCampaign(false)
    setPostLoginLoading(false)
    setPostLoginError('')
    addEvent('Logout eseguito', 'info')
  }

  const realtimeActionsRef = useRef<RealtimeActionMap>({
    refreshProfile: async () => {},
    refreshPostLoginSummary: async () => {},
    refreshCampaignBlock: async () => {},
    refreshCharacterBlock: async () => {},
    refreshMissions: async () => {},
    refreshMissionChat: async () => {},
    loadDiscoverableCampaigns: async () => {},
    loadCharactersForManagement: async () => {},
    loadPendingForActiveCampaign: async () => {},
    refreshPendingApplicationsForCampaign: async () => {},
    loadAdminUsers: async () => {},
    loadAdminCampaigns: async () => {},
    loadAdminRealms: async () => {},
    loadAdminRealmUserRoles: async () => {},
    loadAdminSheetCatalogs: async () => {},
  })
  const realtimeStateRef = useRef<RealtimeStateSnapshot>({
    screen,
    campaignId,
    activeUserId,
    isSystemSession,
    systemAdminView,
    adminUsersPageIndex,
    adminCampaignsPageIndex,
    adminRealmsPageIndex,
  })

  useEffect(() => {
    realtimeActionsRef.current = {
      refreshProfile,
      refreshPostLoginSummary: loadPostLoginCampaignSummary,
      refreshCampaignBlock,
      refreshCharacterBlock,
      refreshMissions,
      refreshMissionChat,
      loadDiscoverableCampaigns,
      loadCharactersForManagement,
      loadPendingForActiveCampaign,
      refreshPendingApplicationsForCampaign: async (targetCampaignId: string) => {
        const membership = campaignsForList.find((item) => item.id === targetCampaignId)
        const canManageTarget =
          membership?.membershipStatus === 'APPROVED' &&
          (membership.membershipRole === 'CO_MASTER' ||
            membership.membershipRole === 'MASTER' ||
            membership.membershipRole === 'SUPER_MASTER')
        if (!canManageTarget) return
        await loadPendingForCampaign(targetCampaignId)
      },
      loadAdminUsers,
      loadAdminCampaigns,
      loadAdminRealms,
      loadAdminRealmUserRoles,
      loadAdminSheetCatalogs,
    }
    realtimeStateRef.current = {
      screen,
      campaignId,
      activeUserId,
      isSystemSession,
      systemAdminView,
      adminUsersPageIndex,
      adminCampaignsPageIndex,
      adminRealmsPageIndex,
    }
  }, [
    activeUserId,
    adminCampaignsPageIndex,
    adminRealmsPageIndex,
    adminUsersPageIndex,
    campaignId,
    isSystemSession,
    loadAdminCampaigns,
    loadAdminRealms,
    loadAdminRealmUserRoles,
    loadAdminSheetCatalogs,
    loadAdminUsers,
    loadCharactersForManagement,
    loadDiscoverableCampaigns,
    loadPendingForActiveCampaign,
    loadPendingForCampaign,
    refreshCampaignBlock,
    refreshCharacterBlock,
    refreshMissions,
    refreshMissionChat,
    refreshProfile,
    campaignsForList,
    screen,
    systemAdminView,
  ])

  const handleRealtimeInvalidation = useCallback((payload: ResourceInvalidationPayload) => {
    const snapshot = realtimeStateRef.current
    const keys = new Set(payload.keys)
    const currentCampaignKey = snapshot.campaignId.trim() ? `campaigns:${snapshot.campaignId}` : ''
    const campaignKeyMatch = currentCampaignKey
      ? payload.keys.some((key) => key === currentCampaignKey || key.startsWith(`${currentCampaignKey}:`))
      : false
    const missionKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':missions'))
    const chatKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':chat'))
    const characterKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':characters'))
    const pendingApplicationsCampaignIds = payload.keys
      .filter((key) => key.startsWith('campaigns:') && key.endsWith(':pending-applications'))
      .map((key) => key.split(':')[1])
    const userProfileKey = snapshot.activeUserId ? `users:${snapshot.activeUserId}:profile` : ''

    if (keys.has('campaigns:discover') && snapshot.screen === 'Lista Campagne') {
      void realtimeActionsRef.current.loadDiscoverableCampaigns()
    }

    if (keys.has('campaigns:discover') && snapshot.screen === 'Ingresso') {
      void realtimeActionsRef.current.refreshPostLoginSummary()
    }

    if (userProfileKey && keys.has(userProfileKey)) {
      void realtimeActionsRef.current.refreshProfile()
      if (snapshot.screen === 'Ingresso') {
        void realtimeActionsRef.current.refreshPostLoginSummary()
      }
    }

    if (snapshot.isSystemSession) {
      if (snapshot.systemAdminView === 'users' && keys.has('admin:users')) {
        void realtimeActionsRef.current.loadAdminUsers(snapshot.adminUsersPageIndex)
      }
      if (snapshot.systemAdminView === 'campaigns' && keys.has('admin:campaigns')) {
        void realtimeActionsRef.current.loadAdminCampaigns(snapshot.adminCampaignsPageIndex)
      }
      if (snapshot.systemAdminView === 'realms' && keys.has('admin:realms')) {
        void realtimeActionsRef.current.loadAdminRealms(snapshot.adminRealmsPageIndex)
      }
      if (snapshot.systemAdminView === 'realmAccess' && (keys.has('admin:users') || keys.has('admin:realms'))) {
        void realtimeActionsRef.current.loadAdminRealmUserRoles()
      }
      if (snapshot.systemAdminView === 'sheets' && keys.has('admin:catalogs')) {
        void realtimeActionsRef.current.loadAdminSheetCatalogs()
      }
    }

    if (pendingApplicationsCampaignIds.length > 0) {
      for (const targetCampaignId of pendingApplicationsCampaignIds) {
        void realtimeActionsRef.current.refreshPendingApplicationsForCampaign(targetCampaignId)
      }
      if (snapshot.campaignId.trim() && pendingApplicationsCampaignIds.includes(snapshot.campaignId)) {
        void realtimeActionsRef.current.loadPendingForActiveCampaign()
      }
      if (snapshot.screen === 'Approvazione Accessi') return
    }

    if (snapshot.screen === 'Missioni' && chatKeyMatch) {
      void realtimeActionsRef.current.refreshMissionChat()
      return
    }

    if (snapshot.screen === 'Missioni' && (campaignKeyMatch || missionKeyMatch || characterKeyMatch)) {
      void realtimeActionsRef.current.refreshMissions({ clearSelection: true })
      return
    }

    if (!campaignKeyMatch) return

    if (snapshot.screen === 'Scheda PG' && characterKeyMatch) {
      void realtimeActionsRef.current.refreshCharacterBlock()
      return
    }

    if (snapshot.screen === 'Gestione Personaggi' && characterKeyMatch) {
      void realtimeActionsRef.current.loadCharactersForManagement()
      return
    }

    if (snapshot.screen === 'Approvazione Accessi') {
      void realtimeActionsRef.current.refreshCampaignBlock()
      return
    }

    if (snapshot.screen === 'Scheda Campagna' || snapshot.screen === 'Gestione Campagna' || snapshot.screen === 'Stanze') {
      void realtimeActionsRef.current.refreshCampaignBlock()
    }
  }, [])

  useEffect(() => {
    if (!getAccessToken()) return

    return connectResourceInvalidationStream({
      onInvalidate: handleRealtimeInvalidation,
      onUnauthorized: handleLogout,
      onError: (message) => addEvent(`Realtime: ${message}`, 'info'),
    })
  }, [handleRealtimeInvalidation, activeUserId])

  useEffect(() => {
    if (!profile || !getAccessToken()) {
      setRealmPermissions(null)
      return
    }
    void loadCurrentRealmPermissions()
  }, [profile?.id, realmCode])

  useEffect(() => {
    if (!profile?.id || !getAccessToken()) return
    if (screen !== 'Ingresso') return
    void loadPostLoginCampaignSummary()
  }, [loadPostLoginCampaignSummary, profile?.id, screen])

  useEffect(() => {
    if (!isSystemSession) {
      // Session boundary cleanup: leaving SYSTEM mode clears admin-only state.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAdminUsersPage(null)
      setAdminUsersPageIndex(0)
      setAdminUsersSearch('')
      setAdminUsersDrafts({})
      setAdminCampaignsPage(null)
      setAdminCampaignsPageIndex(0)
      setAdminCampaignsDrafts({})
      setAdminRealmsPage(null)
      setAdminRealmsPageIndex(0)
      setAdminRealmsSearch('')
      setAdminRealms([])
      setSelectedAdminRealmId('')
      setAdminRealmUserRoles([])
      setAdminRealmRoleDrafts({})
      setSelectedRealmAccessRealmId('')
      setRealmAccessSearch('')
      setRealmAccessSearchResults([])
      setRealmAccessSearchMessage('')
      setAdminGameSystems([])
      setAdminSheetTypes([])
      setAdminSheetCatalogsLoaded(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    if (systemAdminView === 'users' && !adminUsersPage) {
      void loadAdminUsers(0)
    }
    if (systemAdminView === 'campaigns' && !adminCampaignsPage) {
      void loadAdminCampaigns(0)
    }
    if (systemAdminView === 'realms' && !adminRealmsPage) {
      void loadAdminRealms()
    }
    if (systemAdminView === 'realmAccess') {
      if (!adminRealmsPage) {
        void loadAdminRealms()
      } else {
        const targetRealmId = selectedRealmAccessRealmId || adminRealms[0]?.id || ''
        if (targetRealmId) {
          if (!selectedRealmAccessRealmId) setSelectedRealmAccessRealmId(targetRealmId)
          void loadAdminRealmUserRoles(targetRealmId)
        }
      }
    }
    if (systemAdminView === 'sheets' && !adminSheetCatalogsLoaded) {
      void loadAdminSheetCatalogs()
    }
  }, [isSystemSession, profile?.id, systemAdminView, adminRealms.length, adminRealmsPage, adminSheetCatalogsLoaded])

  useEffect(() => {
    if (!isSystemSession || systemAdminView !== 'campaigns') return
    if (campaignModules.length === 0) {
      void (async () => {
        try {
          const modulesResult = await listCampaignModules()
          setCampaignModules(modulesResult)
        } catch (err) {
          const message = toMessage(err)
          setError(message)
          addEvent(`Caricamento moduli: ${message}`, 'error')
          if (isUnauthorized(err)) handleLogout()
        }
      })()
    }
    if (campaignGameSystems.length === 0) {
      void (async () => {
        try {
          const systemsResult = await listCampaignGameSystems()
          setCampaignGameSystems(systemsResult)
        } catch (err) {
          const message = toMessage(err)
          setError(message)
          addEvent(`Caricamento sistemi di gioco: ${message}`, 'error')
          if (isUnauthorized(err)) handleLogout()
        }
      })()
    }
  }, [isSystemSession, systemAdminView, campaignModules.length, campaignGameSystems.length])

  useEffect(() => {
    if (!profile || !activeUserId) return

    const scopedCampaignKey = scopedStorageKey(CAMPAIGN_ID_KEY, activeUserId)
    const scopedKnownCampaignIdsKey = scopedStorageKey(KNOWN_CAMPAIGNS_KEY, activeUserId)
    const scopedKnownCampaignMetaKey = scopedStorageKey(KNOWN_CAMPAIGN_META_KEY, activeUserId)

    const scopedCampaignId = localStorage.getItem(scopedCampaignKey)
    const nextCampaignId = scopedCampaignId || ''

    const scopedKnownCampaignIds = readStoredJson<string[]>(localStorage, scopedKnownCampaignIdsKey, [])
    const nextKnownCampaignIds = scopedKnownCampaignIds

    const scopedKnownCampaignMeta = readStoredJson<KnownCampaignMeta[]>(localStorage, scopedKnownCampaignMetaKey, [])
    const nextKnownCampaignMeta = scopedKnownCampaignMeta

    const scopedPendingApplications = readPendingApplicationsCache(activeUserId)
    const nextPendingApplications = nextCampaignId ? scopedPendingApplications[nextCampaignId] || [] : []

    // Storage hydration: user-scoped campaign state is restored after auth resolves.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCampaignId(nextCampaignId)
    setKnownCampaignIds(nextKnownCampaignIds)
    setKnownCampaignMeta(nextKnownCampaignMeta)
    setPendingApplications(nextPendingApplications)
    setPendingApplicationsByCampaignId(scopedPendingApplications)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeUserId, profile])

  if (realmAvailability === 'loading') {
    return <RealmStatusScreen realmCode={realmCode} state="loading" />
  }

  if (realmAvailability === 'unavailable') {
    return <RealmStatusScreen realmCode={realmCode} state="unavailable" message={realmAvailabilityMessage} />
  }

  if (!profile) {
    return (
      <RealmProvider
        value={{
          realmCode,
          authMode,
          setAuthMode,
          realmName: brandTitle,
          logoUrl: brandLogoUrl,
          availability: realmAvailability,
          availabilityMessage: realmAvailabilityMessage,
          realmPermissions,
        }}
      >
        <ProfileProvider
          value={{
            profile,
            handleAuth,
            saveProfile: async () => undefined,
            changePassword: async () => undefined,
            logout: handleLogout,
          }}
        >
          <AuthScreen key={`${realmCode}:${authMode}`} />
        </ProfileProvider>
      </RealmProvider>
    )
  }

  if (screen === 'Ingresso') {
    return (
      <>
        <PostLoginLandingPage
          currentUserId={profile.id}
          profileName={welcomeProfileName}
          realmCode={realmCode}
          realmName={brandTitle}
          canCreateCampaign={postLoginCanCreateCampaign}
          campaigns={postLoginCampaigns}
          availableGameSystems={campaignGameSystems}
          loading={postLoginLoading}
          busy={busy}
          error={postLoginError}
          onRefresh={() => void loadPostLoginCampaignSummary()}
          onEnterCampaign={(targetCampaignId) => void activateCampaignAndNavigate(targetCampaignId, 'Scheda Campagna')}
          onApplyToCampaign={(targetCampaignId) => {
            void runResult('Richiesta accesso elaborata', async () => {
              const membership = await applyToCampaign(targetCampaignId)
              await Promise.all([refreshProfile(), loadPostLoginCampaignSummary()])
              return membership
            }).then((membership) => {
              if (membership.memberStatus === 'APPROVED') {
                void activateCampaignAndNavigate(targetCampaignId, 'Scheda Campagna')
              }
            }).catch(() => {})
          }}
          onCreateCampaign={() => setScreen('Crea Campagna')}
        />
      </>
    )
  }

  const canCreateCampaignInRealm = realmPermissions?.permissions.createCampaign ?? true

  const getMenuScreenState = (value: Screen) => {
    const moduleCode = MODULE_REQUIRED_BY_SCREEN[value]
    const hasRequiredModule = !moduleCode || (campaign?.allowedModules || []).includes(moduleCode)

    if (value === 'Crea Campagna' && !canCreateCampaignInRealm) {
      return {
        enabled: false,
        title: 'La creazione campagne e disabilitata per il tuo ruolo in questo realm',
        showOverlayX: false,
      }
    }

    if (value === 'Approvazione Accessi' && !canAccessCampaignManagement) {
      return {
        enabled: false,
        title: 'Non hai permessi per gestire gli accessi',
        showOverlayX: false,
      }
    }

    if (value === 'Gestione Campagna' && !canAccessCampaignManagement) {
      return {
        enabled: false,
        title: 'Non hai permessi per gestire la campagna',
        showOverlayX: false,
      }
    }

    if (value === 'Scheda Campagna' && !hasActiveCampaign) {
      return {
        enabled: false,
        title: CAMPAIGN_REQUIRED_TOOLTIP,
        showOverlayX: false,
      }
    }

    if (moduleCode && hasActiveCampaign && !hasRequiredModule) {
      return {
        enabled: false,
        title: 'Modulo non attivo per la campagna',
        showOverlayX: true,
      }
    }

    if (value === 'Scheda PG' && !selectedCharacter) {
      return {
        enabled: false,
        title: 'Seleziona prima un personaggio',
        showOverlayX: false,
      }
    }

    if (value === 'Profilo Membro Campagna' && !selectedCampaignMember) {
      return {
        enabled: false,
        title: 'Seleziona prima un membro',
        showOverlayX: false,
      }
    }

    if (requiresCampaignSelection(value) && !hasActiveCampaign) {
      return {
        enabled: false,
        title: CAMPAIGN_REQUIRED_TOOLTIP,
        showOverlayX: false,
      }
    }

    return {
      enabled: true,
      title:
        value === 'Approvazione Accessi' && pendingApplications.length > 0
          ? `${pendingApplications.length} richieste pending`
          : SCREEN_LABELS[value],
      showOverlayX: false,
    }
  }
  const activeCampaignMembership =
    myCampaigns.find((item) => item.campaignId === campaignId && item.memberStatus === 'APPROVED') ||
    (() => {
      const discovered = campaignsForList.find((item) => item.id === campaignId && item.membershipStatus === 'APPROVED')
      if (!discovered || !discovered.membershipRole) return undefined
      return {
        campaignId: discovered.id,
        campaignName: discovered.name,
        role: discovered.membershipRole,
        memberStatus: 'APPROVED' as const,
        characterStatus: null,
        moderationReason: discovered.moderationReason || null,
        isFounder: false,
      }
    })()
  const campaignNameById: Record<string, string> = {}
  for (const item of knownCampaignMeta) {
    campaignNameById[item.id] = item.name
  }
  for (const item of myCampaigns) {
    campaignNameById[item.campaignId] = item.campaignName
  }
  if (campaign?.id && campaign?.name) {
    campaignNameById[campaign.id] = campaign.name
  }
  const campaignGameSystemById: Record<string, string> = {}
  const campaignCanBeOpenedById: Record<string, boolean> = {}
  for (const item of campaignsForList) {
    if (item.gameSystem) {
      campaignGameSystemById[item.id] = catalogEntryLabel(campaignGameSystems, item.gameSystem) || item.gameSystem
    }
    campaignCanBeOpenedById[item.id] = item.membershipStatus === 'APPROVED' && item.isActive
  }
  if (campaign?.id && campaign?.gameSystem) {
    campaignGameSystemById[campaign.id] = catalogEntryLabel(campaignGameSystems, campaign.gameSystem) || campaign.gameSystem
  }
  const campaignNameForCharacter = (character: Character) => {
    if (!character.campaignId) return 'Campagna non assegnata'
    return campaignNameById[character.campaignId] || character.campaignId
  }
  const canOpenCharacterSheet = (character: Character) => {
    return characters.some((item) => item.id === character.id) || character.userId === profile?.id
  }
  const canMarkCharacterDead = (character: Character | null) => {
    if (!character?.campaignId) return false
    const role = approvedRoleByCampaignId[character.campaignId]
    return role === 'MASTER' || role === 'SUPER_MASTER'
  }
  const canReactivateCharacter = (character: Character | null) => {
    if (!character?.campaignId) return false
    const role = approvedRoleByCampaignId[character.campaignId]
    return role === 'MASTER' || role === 'SUPER_MASTER'
  }
  const ownerProfileLabel = (userId: string | null, ownerProfileName?: string | null) => {
    if (ownerProfileName && ownerProfileName.trim()) return ownerProfileName.trim()
    if (!userId) return 'NPC di campagna'
    if (userId === profile.id) return profile.profileName
    return memberNames[userId] || 'Profilo non disponibile'
  }
  const hasActivePlayerCharacterInActiveCampaign = characters.some(
    (character) =>
      !character.isNpc &&
      character.userId === profile.id &&
      character.campaignId === campaignId &&
      character.characterStatus === 'ACTIVE',
  )
  const canCreatePlayerCharacter = hasActiveCampaign && !hasActivePlayerCharacterInActiveCampaign
  const canCreateNpc =
    hasActiveCampaign &&
    (activeCampaignMembership?.role === 'CO_MASTER' ||
      activeCampaignMembership?.role === 'MASTER' ||
      activeCampaignMembership?.role === 'SUPER_MASTER')
  const canCreateRoom = hasActiveCampaign && (activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER')
  const activeCampaignLabel = campaign?.name || activeCampaignMembership?.campaignName || campaignId.trim() || 'campagna attiva'
  const selectedCharacterLabel = selectedCharacter?.name || characterDetail?.name || 'PG'
  const selectedMemberLabel =
    selectedCampaignMemberProfile?.profileName ||
    memberNames[selectedCampaignMember?.userId || ''] ||
    selectedCampaignMember?.userId ||
    'membro'
  const pageContext: {
    title: string
    subtitle: string
    breadcrumbs: BreadcrumbItem[]
    backTarget: Screen | null
  } = (() => {
    switch (screen) {
      case 'Profilo':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: 'Dati personali e impostazioni account',
          breadcrumbs: [{ label: SCREEN_LABELS[screen] }],
          backTarget: null as Screen | null,
        }
      case 'Modifica Profilo':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: 'Aggiorna i dati del tuo account',
          breadcrumbs: [
            { label: SCREEN_LABELS.Profilo, target: 'Profilo' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Profilo' as Screen,
        }
      case 'Lista Campagne':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: 'Elenco delle campagne disponibili e dei tuoi accessi',
          breadcrumbs: [{ label: SCREEN_LABELS[screen] }],
          backTarget: null as Screen | null,
        }
      case 'Crea Campagna':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: 'Nuova campagna con impostazioni iniziali chiare',
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Lista Campagne' as Screen,
        }
      case 'Scheda Campagna':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel },
          ],
          backTarget: 'Lista Campagne' as Screen,
        }
      case 'Approvazione Accessi':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Missioni':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Stanze':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Log':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: 'Cronologia locale delle azioni effettuate',
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Gestione Personaggi':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Scheda PG':
        return {
          title: selectedCharacterLabel,
          subtitle: 'Scheda personaggio',
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS['Gestione Personaggi'], target: 'Gestione Personaggi' },
            { label: selectedCharacterLabel },
          ],
          backTarget: 'Gestione Personaggi' as Screen,
        }
      case 'Gestione Campagna':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Profilo Membro Campagna':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: selectedMemberLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: 'Membri', target: 'Scheda Campagna' },
            { label: selectedMemberLabel },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Seleziona PG':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Scheda Campagna' as Screen,
        }
      case 'Crea Personaggio':
        return {
          title: SCREEN_LABELS[screen],
          subtitle: activeCampaignLabel,
          breadcrumbs: [
            { label: SCREEN_LABELS['Lista Campagne'], target: 'Lista Campagne' },
            { label: activeCampaignLabel, target: 'Scheda Campagna' },
            { label: SCREEN_LABELS['Gestione Personaggi'], target: 'Gestione Personaggi' },
            { label: SCREEN_LABELS[screen] },
          ],
          backTarget: 'Gestione Personaggi' as Screen,
        }
      default:
        return {
          title: SCREEN_LABELS[screen],
          subtitle: '',
          breadcrumbs: [{ label: SCREEN_LABELS[screen] }],
          backTarget: null as Screen | null,
      }
    }
  })()
  const goToScreen = (value: Screen) => {
    if (value === 'Missioni') {
      setSelectedMissionId('')
    }
    setScreen(value)
    setIsSidebarOpen(false)
  }

  const uiContextValue = {
    screen,
    setScreen,
    goToScreen,
    busy,
    error,
    events,
    isSidebarOpen,
    setIsSidebarOpen,
    theme,
    setTheme,
  }

  const profileContextValue = {
    profile,
    handleAuth,
    saveProfile: (draft: Parameters<typeof updateMe>[0]) =>
      run('Profilo aggiornato', async () => {
        const updated = await updateMe(draft)
        setProfile(updated)
        setScreen('Profilo')
      }),
    changePassword: (params: { currentPassword: string; newPassword: string }) =>
      run('Password aggiornata', async () => {
        const session = await changePassword(params)
        setProfile(session.user)
      }),
    logout: handleLogout,
  }

  const campaignContextValue = {
    campaigns: campaignsForList,
    founderNames: campaignFounderNames,
    missionAlertsByCampaign,
    pendingApplicationsByCampaignId,
    discoverCampaigns: () =>
      void run('Campagne disponibili caricate', async () => {
        const list = await discoverCampaigns(false)
        setDiscoverableCampaigns(list)
      }),
    openCampaign: (targetCampaignId: string) => void activateCampaignAndNavigate(targetCampaignId, 'Scheda Campagna'),
    applyCampaign: (targetCampaignId: string) =>
      void run('Richiesta accesso inviata', async () => {
        await applyToCampaign(targetCampaignId)
        const [discover, mine] = await Promise.all([discoverCampaigns(false), listMyCampaignMemberships()])
        setDiscoverableCampaigns(discover)
        setMyCampaigns(mine)
      }),
    applyInviteAccess: (inviteValue: string) => run('Richiesta accesso invito inviata', async () => applyInviteAccess(inviteValue)),
    previewInviteAccess,
    openCreateCampaign: () => setScreen('Crea Campagna'),
    canCreateCampaign: canCreateCampaignInRealm,
    activeCampaignName: campaign?.name || activeCampaignMembership?.campaignName || campaignId || '',
    campaign,
    currentUserId: profile?.id || '',
    isActiveCampaign: campaign?.id === campaignId,
    members: campaignMembersForManagement.length > 0 ? campaignMembersForManagement : members,
    memberNames,
    availableModules: campaignModules,
    availableGameSystems: campaignGameSystems,
    reloadCampaign: () => void refreshCampaignBlock(),
    openMember: (member: CampaignMembershipResponse) =>
      void run('Profilo membro caricato', async () => {
        if (!campaignId.trim()) return
        if (member.memberStatus === 'PENDING') {
          await loadPendingForActiveCampaign()
          setScreen('Approvazione Accessi')
          return
        }
        const [membership, profileValue] = await Promise.all([
          getCampaignMember(campaignId, member.userId),
          getPublicProfile(member.userId),
        ])
        setSelectedCampaignMember(membership)
        setSelectedCampaignMemberProfile(profileValue)
        setScreen('Profilo Membro Campagna')
      }),
    openManagement: () => {
      if (campaign?.id) void activateCampaignAndNavigate(campaign.id, 'Gestione Campagna')
    },
    openCharacters: () => {
      if (campaign?.id) void activateCampaignAndNavigate(campaign.id, 'Gestione Personaggi')
    },
    canManageMembers: canManageCampaignMembers,
    applyCurrentCampaign: () => {
      if (!campaign?.id) return
      void run('Apply campagna inviato', async () => {
        await applyToCampaign(campaign.id)
        const [discover, mine] = await Promise.all([discoverCampaigns(false), listMyCampaignMemberships()])
        setDiscoverableCampaigns(discover)
        setMyCampaigns(mine)
      })
    },
    activateCurrentCampaign: () => {
      if (campaign?.id) void activateCampaignAndNavigate(campaign.id, 'Scheda Campagna')
    },
    leaveCurrentCampaign: openLeaveCampaignModal,
    membershipStatus: campaign?.id ? campaignsForList.find((item) => item.id === campaign.id)?.membershipStatus || null : null,
    membershipRole: campaign?.id ? campaignsForList.find((item) => item.id === campaign.id)?.membershipRole || null : null,
    pendingApplications,
    loadPendingApplications: () =>
      void run('Richieste pending caricate', async () => {
        await loadPendingForActiveCampaign()
      }),
    approvePendingApplication: (userId: string) =>
      void run('Approvazione utente completata', async () => {
        await approvePendingForActiveCampaign(userId)
      }),
    rejectPendingApplication: (userId: string) =>
      void run('Rifiuto utente completato', async () => {
        await rejectPendingForActiveCampaign(userId)
      }),
    createCampaign: (payload: Parameters<typeof createCampaign>[0]) =>
      void run('Campagna creata', async () => {
        const created = await createCampaign(payload)
        rememberCampaignId(created.id)
        rememberCampaignMeta(created.id, created.name)
        setMyCampaigns((prev) => [
          {
            campaignId: created.id,
            campaignName: created.name,
            role: 'SUPER_MASTER',
            memberStatus: 'APPROVED',
            characterStatus: null,
            moderationReason: null,
            isFounder: true,
          },
          ...prev.filter((item) => item.campaignId !== created.id),
        ])
        setCampaign(created)
        setCanManageCampaignMembers(true)
        setScreen('Scheda Campagna')
      }),
    permissions,
    saveCampaign: (payload: Parameters<typeof updateCampaign>[1]) => {
      if (!campaign?.id) return
      void run('Campagna aggiornata', async () => {
        const updated = await updateCampaign(campaign.id, payload)
        setCampaign(updated)
        setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
        rememberCampaignMeta(updated.id, updated.name)
        setMyCampaigns((prev) => prev.map((item) => (item.campaignId === updated.id ? { ...item, campaignName: updated.name } : item)))
        setDiscoverableCampaigns((prev) =>
          prev.map((item) => (
            item.id === updated.id
              ? {
                  ...item,
                  name: updated.name,
                  summary: updated.summary,
                  description: updated.description,
                  isOpen: updated.isOpen,
                  isSearchable: updated.isSearchable,
                  autoJoinEnabled: updated.autoJoinEnabled,
                }
              : item
          )),
        )
        setScreen('Lista Campagne')
      })
    },
    refreshPermissionChecklist: () =>
      void run('Checklist permessi aggiornata', async () => {
        const actions = ['CREATE_ROOM', 'APPROVE_OR_REJECT_APPLICATIONS', 'TRANSFER_OWNERSHIP', 'MANAGE_CAMPAIGN_SETTINGS']
        const settled = await Promise.all(actions.map(async (actionValue) => checkPermission(campaignId, actionValue)))
        setPermissions(settled)
      }),
    transferCampaignOwnership: (newOwnerId: string) =>
      void run('Ownership trasferita', async () => {
        const updated = await transferOwnership(campaignId, newOwnerId)
        setCampaign(updated)
        setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
      }),
    createCampaignInviteToken: (payload: CreateInviteTokenRequest) =>
      runResult('Token invito creato', async () => {
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        return createInviteToken(campaignId, payload)
      }),
    selectedCampaignMember,
    selectedCampaignMemberProfile,
    refreshSelectedCampaignMember: () =>
      void run('Profilo membro aggiornato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [membership, allMembers] = await Promise.all([
          getCampaignMember(campaignId, selectedCampaignMember.userId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(membership)
        setCampaignMembersForManagement(allMembers)
      }),
    updateSelectedMemberRole: (role: CampaignRole) =>
      void run('Ruolo membro aggiornato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          updateCampaignMemberRole(campaignId, selectedCampaignMember.userId, role),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    banSelectedMember: (reason: string) =>
      void run('Membro bannato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          banCampaignMember(campaignId, selectedCampaignMember.userId, reason),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    suspendSelectedMember: (reason: string) =>
      void run('Membro sospeso', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          suspendCampaignMember(campaignId, selectedCampaignMember.userId, reason),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    unsuspendSelectedMember: () =>
      void run('Membro riattivato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          unsuspendCampaignMember(campaignId, selectedCampaignMember.userId),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    unbanSelectedMember: () =>
      void run('Membro sbloccato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          unbanCampaignMember(campaignId, selectedCampaignMember.userId),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    approveSelectedMember: () =>
      void run('Membro approvato', async () => {
        if (!campaignId.trim() || !selectedCampaignMember) return
        const [updated, approvedMembers, allMembers] = await Promise.all([
          approveCampaignMember(campaignId, selectedCampaignMember.userId),
          getCampaignMembers(campaignId),
          listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
        ])
        setSelectedCampaignMember(updated)
        setMembers(approvedMembers)
        setCampaignMembersForManagement(allMembers)
      }),
    rooms,
    canCreateRoom,
    createRoom: (payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number }) =>
      void run('Stanza creata', async () => {
        const created = await createRoom(campaignId, payload)
        setRooms((prev) => [created, ...prev])
      }),
    hasActiveCampaign,
    isLeaveCampaignOpen,
    leaveCampaignContext: {
      campaignName: activeCampaignLabel,
      characterWillBeRetired: activeCampaignMembership?.characterStatus === 'ACTIVE',
    },
    closeLeaveCampaignModal,
    confirmLeaveCampaign: () => void leaveActiveCampaign(),
  }

  const characterContextValue = {
    characters,
    selectedCharacterId,
    selectCharacter: (character: Character) => {
      if (!canOpenCharacterSheet(character)) {
        setError('Permesso negato: puoi aprire solo PG/NPC tuoi o con ruolo adeguato.')
        addEvent('Accesso Scheda PG negato per permessi', 'error')
        return
      }
      setSelectedCharacterId(character.id)
      setCharacterDetail(null)
      setCharacterSheetDetail(null)
      setScreen('Scheda PG')
    },
    canOpenCharacterSheet,
    ownerProfileLabel,
    campaignNameForCharacter,
    openCreateCharacter: () => setScreen('Crea Personaggio'),
    reloadCharacters: () =>
      void run('Lista personaggi caricata', async () => {
        await loadCharactersForManagement()
      }),
    selectedCharacter,
    characterDetail,
    characterSheetDetail,
    refreshCharacterDetail: () => void refreshCharacterBlock(),
    saveCharacterSheet: (dataJson: Record<string, unknown>) =>
      run('Scheda personaggio salvata', async () => {
        if (!selectedCharacterId) return
        const detailCampaignId = selectedCharacter?.campaignId || campaignId
        if (!detailCampaignId) return
        const updated = await updateCharacterSheet(detailCampaignId, selectedCharacterId, { dataJson })
        setCharacterSheetDetail(updated)
      }),
    canMarkCharacterDead,
    canReactivateCharacter,
    updateCharacterStatus: (status: CharacterStatus) =>
      void run('Stato personaggio aggiornato', async () => {
        if (!selectedCharacter) return
        const targetCampaignId = selectedCharacter.campaignId || campaignId
        if (!targetCampaignId) return
        const updated = await updateCharacterStatus(targetCampaignId, selectedCharacter.id, status)
        setCharacters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        setCharacterDetail(updated)
        await refreshMissions()
      }),
    preferredCharacterId: activeCampaignCharacterId,
    applyCharacterToCampaign: (characterId: string) =>
      void run('Apply con personaggio inviato', async () => {
        await applyToCampaign(campaignId, characterId)
      }),
    hasActiveCampaign,
    canCreatePlayerCharacter,
    canCreateNpc,
    createCharacter: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) =>
      void run('Personaggio creato', async () => {
        const created = await createCharacter(campaignId, payload)
        setCharacters((prev) => [created, ...prev])
        setSelectedCharacterId(created.id)
        setScreen('Gestione Personaggi')
      }),
  }

  const missionContextValue = {
    missions,
    selectedMission,
    canCreateMissions,
    activeCampaignId: campaignId.trim(),
    realmName: brandTitle,
    realmLogoUrl: brandLogoUrl,
    activeCampaignRole,
    activeCampaignCharacterId: selectedMissionCharacterId,
    campaignNameById,
    campaignGameSystemById,
    campaignCanBeOpenedById,
    missionParticipantsById,
    missionParticipantLabelByUserId: {
      ...memberNames,
      ...(profile?.id ? { [profile.id]: profile.profileName || profile.username || profile.id } : {}),
    },
    missionParticipantCharacterLabelById,
    myMissionParticipationById,
    currentUserId: profile?.id || '',
    selectedMissionChatId: selectedMissionChatContext?.missionId || null,
    missionChat,
    missionChatBusy,
    missionChatError,
    createMission: (payload: Parameters<typeof createMission>[1]) =>
      void run('Missione creata', async () => {
        const created = await createMission(campaignId, payload)
        setSelectedMissionId(created.id)
        await refreshMissions()
      }),
    selectMission: setSelectedMissionId,
    openMissionChat: (targetCampaignId: string, missionId: string) =>
      void run('Chat missione caricata', async () => {
        await loadMissionChat(targetCampaignId, missionId)
      }),
    closeMissionChat: () => {
      setSelectedMissionChatContext(null)
      setMissionChat(null)
      setMissionChatError('')
    },
    sendMissionChatMessage: (body: string) =>
      run('Messaggio missione inviato', async () => {
        if (!selectedMissionChatContext) return
        await sendMissionChatMessage(selectedMissionChatContext.campaignId, selectedMissionChatContext.missionId, body)
        await refreshMissionChat()
      }),
    joinMission: (missionId: string, participationType: MissionParticipationType) =>
      void run('Partecipazione missione aggiornata', async () => {
        if (!selectedMission) {
          throw new Error('Seleziona prima una missione.')
        }
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        if (!selectedMissionCharacterId) {
          throw new Error('Nessun personaggio attivo disponibile.')
        }
        let participant: MissionParticipantResponse
        try {
          participant = await joinMission(campaignId, missionId, {
            characterId: selectedMissionCharacterId,
            participationType,
          })
        } catch {
          participant = await updateMissionParticipationType(campaignId, missionId, {
            participationType,
          })
        }
        setMyMissionParticipationById((prev) => ({ ...prev, [missionId]: participant.participationType }))
        setMissionParticipantsById((prev) => {
          const current = prev[missionId] || []
          const withoutCurrentUser = current.filter((item) => item.userId !== participant.userId)
          return { ...prev, [missionId]: [...withoutCurrentUser, participant] }
        })
        await refreshMissions({ clearSelection: false })
        setSelectedMissionId(missionId)
      }),
    leaveMission: (missionId: string) =>
      void run('Uscita missione completata', async () => {
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        const participant = await leaveMission(campaignId, missionId)
        setMyMissionParticipationById((prev) => {
          const next = { ...prev }
          delete next[missionId]
          return next
        })
        setMissionParticipantsById((prev) => {
          const current = prev[missionId] || []
          return { ...prev, [missionId]: current.filter((item) => item.userId !== participant.userId) }
        })
        await refreshMissions()
      }),
    openMissionCampaign: (targetCampaignId: string) => void activateCampaignAndNavigate(targetCampaignId, 'Missioni'),
    browseCampaigns: () => setScreen('Lista Campagne'),
    openCreateCharacter: () => setScreen('Crea Personaggio'),
    updateMission: (missionId: string, payload: Parameters<typeof updateMission>[2]) =>
      void run('Missione aggiornata', async () => {
        if (!selectedMission) {
          throw new Error('Seleziona prima una missione.')
        }
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        const wasConfirmedBelowQuorum =
          selectedMission.status === 'CONFIRMED' &&
          typeof selectedMission.quorum === 'number' &&
          selectedMission.participantCount < selectedMission.quorum
        await updateMission(campaignId, missionId, payload)
        if (payload.autoReopenOnDrop === true && wasConfirmedBelowQuorum) {
          await reopenMission(campaignId, missionId)
        }
        await refreshMissions()
      }),
    completeMission: (missionId: string) =>
      void run('Missione completata', async () => {
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        await completeMission(campaignId, missionId)
        await refreshMissions()
      }),
    cancelMission: (missionId: string) =>
      void run('Missione cancellata', async () => {
        if (!campaignId.trim()) {
          throw new Error('Campagna non attiva.')
        }
        await cancelMission(campaignId, missionId)
        await refreshMissions()
      }),
  }

  const adminContextValue = {
    busy,
    gameSystems: adminGameSystems,
    sheetTypes: adminSheetTypes,
    refreshSystemCatalogs: () => void loadAdminSheetCatalogs(),
    createGameSystem: createAdminGameSystemEntry,
    saveGameSystem: saveAdminGameSystem,
    createSheetType: createAdminSheetTypeEntry,
    saveSheetType: saveAdminSheetType,
  }

  const systemUsers = adminUsersPage?.items ?? []
  const systemUsersTotal = adminUsersPage?.totalElements ?? 0
  const systemUsersPageLabel = adminUsersPage
    ? `Pagina ${adminUsersPage.page + 1} di ${Math.max(adminUsersPage.totalPages, 1)}`
    : 'Pagina 1 di 1'
  const systemCampaigns = adminCampaignsPage?.items ?? []
  const systemCampaignsTotal = adminCampaignsPage?.totalElements ?? 0
  const systemCampaignsPageLabel = adminCampaignsPage
    ? `Pagina ${adminCampaignsPage.page + 1} di ${Math.max(adminCampaignsPage.totalPages, 1)}`
    : 'Pagina 1 di 1'
  const systemRealmsTotal = adminRealmsPage?.totalElements ?? adminRealms.length
  const systemRealmsPageLabel = adminRealmsPage
    ? `Pagina ${adminRealmsPage.page + 1} di ${Math.max(adminRealmsPage.totalPages, 1)}`
    : 'Pagina 1 di 1'
  const selectedRealmAccessRealm = adminRealms.find((item) => item.id === selectedRealmAccessRealmId) || adminRealms[0] || null
  const adminRealmRoleByKey: Record<string, AdminRealmUserRoleResponse> = {}
  for (const item of adminRealmUserRoles) {
    adminRealmRoleByKey[`${item.realmId}:${item.userId}`] = item
  }
  const handleSystemSortChange = (sortKey: string) => {
    if (systemSortBy === sortKey) {
      setSystemSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSystemSortBy(sortKey)
    setSystemSortDirection('asc')
  }
  const sortedSystemUsers = [...systemUsers].sort((left, right) => {
    const value = (item: AdminUserPage['items'][number]) => {
      switch (systemSortBy) {
        case 'username':
          return item.username
        case 'platformRole':
          return item.platformRole
        case 'isActive':
          return item.isActive
        case 'createdAt':
          return item.createdAt
        default:
          return item.profileName
      }
    }
    return compareSortableValues(value(left), value(right), systemSortDirection)
  })
  const sortedSystemCampaigns = [...systemCampaigns].sort((left, right) => {
    const value = (item: AdminCampaignPage['items'][number]) => {
      switch (systemSortBy) {
        case 'realm':
          return `${item.realmName} ${item.realmCode}`
        case 'isActive':
          return item.isActive
        case 'isSearchable':
          return item.isSearchable
        case 'isOpen':
          return item.isOpen
        case 'createdAt':
          return item.createdAt
        default:
          return item.name
      }
    }
    return compareSortableValues(value(left), value(right), systemSortDirection)
  })
  const sortedAdminRealms = [...adminRealms].sort((left, right) => {
    const value = (item: AdminRealmListItem) => {
      switch (systemSortBy) {
        case 'code':
          return item.code
        case 'type':
          return item.type
        case 'isActive':
          return item.isActive
        case 'allowUserCampaignCreation':
          return item.allowUserCampaignCreation
        default:
          return item.name
      }
    }
    return compareSortableValues(value(left), value(right), systemSortDirection)
  })
  const activeRealmAdminRows = adminRealmUserRoles
    .filter((item) => item.isPrivilegeActive && item.role === 'ADMIN')
    .sort((left, right) => {
      const value = (item: AdminRealmUserRoleResponse) => {
        switch (systemSortBy) {
          case 'username':
            return item.username
          case 'lastUpdate':
            return item.lastUpdate
          default:
            return item.profileName
        }
      }
      return compareSortableValues(value(left), value(right), systemSortDirection)
    })
  const sortedRealmAccessSearchResults = [...realmAccessSearchResults].sort((left, right) => {
    const value = (item: AdminUserPage['items'][number]) => {
      switch (systemSortBy) {
        case 'username':
          return item.username
        case 'platformRole':
          return item.platformRole
        default:
          return item.profileName
      }
    }
    return compareSortableValues(value(left), value(right), systemSortDirection)
  })
  const systemViewMeta = (() => {
    switch (systemAdminView) {
      case 'users':
        return {
          kicker: 'Utenti',
          title: 'Anagrafica utenti',
          subtitle: 'Tabella compatta, 15 record per pagina, con ruoli e stato immediatamente visibili.',
          primaryMeta: `Totale ${systemUsersTotal}`,
          secondaryMeta: systemUsersPageLabel,
        }
      case 'campaigns':
        return {
          kicker: 'Campagne',
          title: 'Anagrafica campagne',
          subtitle: 'Tabella compatta, 15 record per pagina, con sistema di gioco, addon e stato della campagna.',
          primaryMeta: `Totale ${systemCampaignsTotal}`,
          secondaryMeta: systemCampaignsPageLabel,
        }
      case 'realms':
        return {
          kicker: 'Realm',
          title: 'Anagrafica realm',
          subtitle: 'Crea contenitori cliente e filtra per nome o codice. Anche qui massimo 15 record per pagina.',
          primaryMeta: `Totale ${systemRealmsTotal}`,
          secondaryMeta: systemRealmsPageLabel,
        }
      case 'realmAccess':
        return {
          kicker: 'Accessi',
          title: 'Permessi utenti per realm',
          subtitle: 'Assegna il ruolo operativo dell utente nel singolo realm senza cambiare il ruolo globale.',
          primaryMeta: `Realm ${adminRealms.length}`,
          secondaryMeta: `Admin ${activeRealmAdminRows.length}`,
        }
      case 'sheets':
        return {
          kicker: 'Schede',
          title: 'Catalogo schede di gioco',
          subtitle: 'Definisci i sistemi di gioco e i template scheda riusabili per ogni campaign module.',
          primaryMeta: `Sistemi ${adminGameSystems.length}`,
          secondaryMeta: `Schede ${adminSheetTypes.length}`,
        }
      default:
        return {
          kicker: 'SYSTEM',
          title: 'Dashboard sistema',
          subtitle: '',
          primaryMeta: '',
          secondaryMeta: '',
        }
    }
  })()

  if (isSystemSession) {
    return (
      <div className="app-shell system-shell">
        <aside className="sidebar-drawer is-open">
          <div className="sidebar-top">
            <div className="brand">
              <div className="brand-mark">
                {brandLogoUrl ? <img className="brand-logo-image" src={brandLogoUrl} alt={brandTitle} /> : <Icon name="fa-solid fa-shield-halved" />}
              </div>
              <div>
                <p className="brand-title">{brandTitle}</p>
                <p className="brand-subtitle">Console amministrativa</p>
              </div>
            </div>
          </div>

          <div className="sidebar-context">
            <p className="sidebar-user-kicker">Sessione sistema</p>
            <p className="sidebar-context-title">{profile?.profileName || 'SYSTEM'}</p>
            <p className="sidebar-context-meta">{profile?.username ? `@${profile.username}` : 'Account tecnico'}</p>
          </div>

          <div className="system-dashboard-copy">
            <p className="menu-group-label">Console</p>
            <p className="muted">Da qui gestirai utenti, campagne, realm, sistemi di gioco e cataloghi moduli.</p>
          </div>

          <div className="system-nav-tabs" role="tablist" aria-label="Selettore dashboard sistema">
            <button
              type="button"
              className={`system-nav-tab ${systemAdminView === 'users' ? 'is-active' : ''}`}
              onClick={() => {
                setSystemAdminView('users')
                if (!adminUsersPage) void loadAdminUsers(0)
              }}
            >
              Utenti
            </button>
            <button
              type="button"
              className={`system-nav-tab ${systemAdminView === 'campaigns' ? 'is-active' : ''}`}
              onClick={() => {
                setSystemAdminView('campaigns')
                if (!adminCampaignsPage) void loadAdminCampaigns(0)
              }}
            >
              Campagne
            </button>
            <button
              type="button"
              className={`system-nav-tab ${systemAdminView === 'realms' ? 'is-active' : ''}`}
              onClick={() => {
                setSystemAdminView('realms')
                if (!adminRealmsPage) void loadAdminRealms()
              }}
            >
              Realm
            </button>
            <button
              type="button"
              className={`system-nav-tab ${systemAdminView === 'realmAccess' ? 'is-active' : ''}`}
              onClick={() => {
                setSystemAdminView('realmAccess')
                if (!adminRealmsPage) {
                  void loadAdminRealms()
                } else {
                  const targetRealmId = selectedRealmAccessRealmId || adminRealms[0]?.id || ''
                  if (targetRealmId) {
                    setSelectedRealmAccessRealmId(targetRealmId)
                    void loadAdminRealmUserRoles(targetRealmId)
                  }
                }
              }}
            >
              Accessi realm
            </button>
            <button
              type="button"
              className={`system-nav-tab ${systemAdminView === 'sheets' ? 'is-active' : ''}`}
              onClick={() => {
                setSystemAdminView('sheets')
                if (!adminSheetCatalogsLoaded) void loadAdminSheetCatalogs()
              }}
            >
              Schede
            </button>
          </div>

          <div className="sidebar-footer">
            <button
              type="button"
              className="refresh-btn theme-toggle-btn sidebar-theme-toggle"
              disabled
            >
              <Icon name="fa-solid fa-shield-halved" />
              <span>Tema Sistema</span>
            </button>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              <Icon name="fa-solid fa-right-from-bracket" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="main system-main">
          <section className="panel system-landing-panel">
            <div className="system-panel-head">
              <div>
                <p className="menu-group-label">{systemViewMeta.kicker}</p>
                <h2>{systemViewMeta.title}</h2>
                <p className="muted">{systemViewMeta.subtitle}</p>
              </div>
              <div className="system-panel-meta">
                <span className="status status-neutral">{systemViewMeta.primaryMeta}</span>
                <span className="status status-info">{systemViewMeta.secondaryMeta}</span>
              </div>
            </div>

            {error && (
              <div className="system-inline-alert">
                <Icon name="fa-solid fa-triangle-exclamation" />
                <span>{error}</span>
              </div>
            )}

            {systemAdminView === 'users' ? (
              <>
                <div className="system-filter-bar">
                  <label>
                    Cerca profilo
                    <div className="inline-actions">
                      <input
                        value={adminUsersSearch}
                        placeholder="Nome profilo o username"
                        onChange={(event) => setAdminUsersSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void loadAdminUsers(0, adminUsersSearch)
                          }
                        }}
                      />
                      <button type="button" className="refresh-btn" disabled={busy} onClick={() => void loadAdminUsers(0, adminUsersSearch)}>
                        <Icon name="fa-solid fa-magnifying-glass" />
                        <span>Cerca</span>
                      </button>
                      <button
                        type="button"
                        className="refresh-btn"
                        disabled={busy || !adminUsersSearch.trim()}
                        onClick={() => {
                          setAdminUsersSearch('')
                          void loadAdminUsers(0, '')
                        }}
                      >
                        <Icon name="fa-solid fa-xmark" />
                        <span>Pulisci</span>
                      </button>
                    </div>
                  </label>
                </div>

                <DataTable
                  columns={[
                    { key: 'username', label: 'Username', sortKey: 'username' },
                    { key: 'profileName', label: 'Profilo', sortKey: 'profileName' },
                    { key: 'platformRole', label: 'Ruolo', sortKey: 'platformRole' },
                    { key: 'isActive', label: 'Stato', sortKey: 'isActive' },
                    { key: 'actions', label: '' },
                  ]}
                  rows={sortedSystemUsers}
                  getRowKey={(item) => item.id}
                  emptyMessage={busy ? 'Caricamento utenti...' : 'Nessun utente trovato.'}
                  sortBy={systemSortBy}
                  sortDirection={systemSortDirection}
                  onSortChange={handleSystemSortChange}
                  renderRow={(item) => {
                    const draft = adminUsersDrafts[item.id] || {
                      platformRole: item.platformRole,
                      isActive: item.isActive,
                    }
                    const isDirty = draft.platformRole !== item.platformRole || draft.isActive !== item.isActive

                    return (
                      <tr>
                        <td>
                          <div className="system-user-primary">
                            <span className="system-user-username">@{item.username}</span>
                            <span className="system-user-id">{item.id}</span>
                          </div>
                        </td>
                        <td>
                          <div className="system-user-secondary">
                            <span>{item.profileName}</span>
                            <span className="system-user-id">Creato {formatShortDate(item.createdAt)}</span>
                          </div>
                        </td>
                        <td>
                          <select
                            className="system-inline-select"
                            value={draft.platformRole}
                            onChange={(event) =>
                              setAdminUsersDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  platformRole: event.target.value as PlatformRole,
                                },
                              }))
                            }
                          >
                            {ADMIN_PLATFORM_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {platformRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <label
                            className="switch system-user-switch"
                            aria-label={`${item.username} ${draft.isActive ? 'attivo' : 'disattivo'}`}
                          >
                            <input
                              type="checkbox"
                              checked={draft.isActive}
                              onChange={(event) =>
                                setAdminUsersDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...draft,
                                    isActive: event.target.checked,
                                  },
                                }))
                              }
                            />
                            <span className="switch-track" aria-hidden="true">
                              <span className="switch-thumb" />
                            </span>
                          </label>
                        </td>
                        <td>
                          <div className="system-row-actions">
                            <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>
                              {isDirty ? 'Da salvare' : 'Salvato'}
                            </span>
                            <button
                              type="button"
                              className="refresh-btn"
                              disabled={busy || !isDirty}
                              onClick={() => void saveAdminUser(item.id)}
                            >
                              <Icon name="fa-solid fa-floppy-disk" />
                              <span>Salva</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }}
                />

                <div className="system-pagination">
                  <p className="muted">
                    Mostrati {systemUsers.length} utenti su {systemUsersTotal}
                  </p>
                  <div className="system-pagination-controls">
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminUsersPage || adminUsersPage.first}
                      onClick={() => void loadAdminUsers(Math.max(adminUsersPageIndex - 1, 0), adminUsersSearch)}
                    >
                      <Icon name="fa-solid fa-chevron-left" />
                      <span>Precedente</span>
                    </button>
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminUsersPage || adminUsersPage.last}
                      onClick={() => void loadAdminUsers(adminUsersPageIndex + 1, adminUsersSearch)}
                    >
                      <span>Successiva</span>
                      <Icon name="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                </div>
              </>
            ) : systemAdminView === 'campaigns' ? (
              <>
                <div className="system-table-wrap">
                  <table className="system-users-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'name' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('name')}>
                            <span>Campagna</span>
                            <Icon name={systemSortBy === 'name' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'realm' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('realm')}>
                            <span>Realm</span>
                            <Icon name={systemSortBy === 'realm' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'isActive' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('isActive')}>
                            <span>Stato</span>
                            <Icon name={systemSortBy === 'isActive' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                        <th>Moduli</th>
                        <th aria-label="Azioni" />
                      </tr>
                    </thead>
                    <tbody>
                      {busy && systemCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Caricamento campagne...</td>
                        </tr>
                      ) : systemCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Nessuna campagna trovata.</td>
                        </tr>
                      ) : (
                        sortedSystemCampaigns.map((item) => {
                          const draft = adminCampaignsDrafts[item.id] || {
                            isOpen: item.isOpen,
                            isActive: item.isActive,
                            isSearchable: item.isSearchable,
                            gameSystem: item.gameSystem,
                            allowedModules: [...item.allowedModules],
                          }
                          const draftModules = [...draft.allowedModules].sort().join('|')
                          const itemModules = [...item.allowedModules].sort().join('|')
                          const isDirty =
                            draft.isOpen !== item.isOpen ||
                            draft.isActive !== item.isActive ||
                            draft.isSearchable !== item.isSearchable ||
                            draft.gameSystem !== item.gameSystem ||
                            draftModules !== itemModules
                          const isExpanded = expandedAdminCampaignId === item.id
                          const visibleModules =
                            campaignModules.length > 0
                              ? campaignModules
                              : item.allowedModules.map((code) => ({ code, label: code, description: null, active: true, sortOrder: 0 }))

                          return (
                            <Fragment key={item.id}>
                              <tr key={item.id} className={isExpanded ? 'is-selected' : ''}>
                                <td>
                                  <div className="system-user-primary">
                                    <span className="system-user-username">{item.name}</span>
                                    <span className="system-user-id">Founder {item.founderProfileName}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="system-user-secondary">
                                    <span>{item.realmName}</span>
                                    <span className="system-user-id">{item.realmCode}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="inline-actions">
                                    <span className={`status ${item.isOpen ? 'status-success' : 'status-neutral'}`}>{item.isOpen ? 'Aperta' : 'Chiusa'}</span>
                                    <span className={`status ${item.isActive ? 'status-success' : 'status-warning'}`}>{item.isActive ? 'Attiva' : 'Spenta'}</span>
                                    <span className={`status ${item.isSearchable ? 'status-success' : 'status-neutral'}`}>{item.isSearchable ? 'Ricercabile' : 'Nascosta'}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="status status-info">{item.allowedModules.length} moduli</span>
                                </td>
                                <td>
                                  <div className="system-row-actions">
                                    <button
                                      type="button"
                                      className="refresh-btn"
                                      onClick={() =>
                                        setExpandedAdminCampaignId((prev) => (prev === item.id ? '' : item.id))
                                      }
                                    >
                                      <Icon name={isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-pen-to-square'} />
                                      <span>{isExpanded ? 'Chiudi' : 'Modifica'}</span>
                                    </button>
                                    <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>
                                      {isDirty ? 'Da salvare' : 'Salvato'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="system-detail-cell">
                                    <div className="system-campaign-detail">
                                      <div className="system-campaign-detail-head">
                                        <div>
                                          <p className="menu-group-label">Dettaglio campagna</p>
                                          <h4>{item.name}</h4>
                                          <p className="muted">
                                            Realm {item.realmName} · {item.realmCode} · Founder {item.founderProfileName}
                                          </p>
                                        </div>
                                        <div className="system-row-actions">
                                          <button
                                            type="button"
                                            className="refresh-btn"
                                            disabled={busy || !isDirty}
                                            onClick={() => void saveAdminCampaign(item.id)}
                                          >
                                            <Icon name="fa-solid fa-floppy-disk" />
                                            <span>Salva modifiche</span>
                                          </button>
                                        </div>
                                      </div>

                                      <table className="system-users-table system-campaign-config-table">
                                        <thead>
                                          <tr>
                                            <th>Parametro</th>
                                            <th>Valore</th>
                                            <th>Dettaglio</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td>Sistema di gioco</td>
                                            <td>
                                              <select
                                                className="system-inline-select"
                                                value={draft.gameSystem}
                                                onChange={(event) =>
                                                  setAdminCampaignsDrafts((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...draft,
                                                      gameSystem: event.target.value,
                                                    },
                                                  }))
                                                }
                                              >
                                                {(campaignGameSystems.length > 0 ? campaignGameSystems : [{ code: item.gameSystem, label: item.gameSystem, description: null, active: true, sortOrder: 0 }]).map((system) => (
                                                  <option key={system.code} value={system.code}>
                                                    {catalogEntryLabel(campaignGameSystems, system.code) || system.label || system.code}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                            <td className="data-table-secondary">Definisce il template scheda e le regole base.</td>
                                          </tr>
                                          <tr>
                                            <td>Aperta</td>
                                            <td>
                                              <button
                                                type="button"
                                                className={`segmented-btn system-status-toggle-btn ${draft.isOpen ? 'is-active' : ''}`}
                                                aria-pressed={draft.isOpen}
                                                onClick={() =>
                                                  setAdminCampaignsDrafts((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...draft,
                                                      isOpen: !draft.isOpen,
                                                    },
                                                  }))
                                                }
                                              >
                                                <Icon name={draft.isOpen ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'} />
                                                <span>{draft.isOpen ? 'Aperta' : 'Chiusa'}</span>
                                              </button>
                                            </td>
                                            <td className="data-table-secondary">Può ricevere applicazioni e accessi.</td>
                                          </tr>
                                          <tr>
                                            <td>Attiva</td>
                                            <td>
                                              <button
                                                type="button"
                                                className={`segmented-btn system-status-toggle-btn ${draft.isActive ? 'is-active' : ''}`}
                                                aria-pressed={draft.isActive}
                                                onClick={() =>
                                                  setAdminCampaignsDrafts((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...draft,
                                                      isActive: !draft.isActive,
                                                    },
                                                  }))
                                                }
                                              >
                                                <Icon name={draft.isActive ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'} />
                                                <span>{draft.isActive ? 'Attiva' : 'Spenta'}</span>
                                              </button>
                                            </td>
                                            <td className="data-table-secondary">Controlla se la campagna è disponibile nel sistema.</td>
                                          </tr>
                                          <tr>
                                            <td>Cercabile</td>
                                            <td>
                                              <button
                                                type="button"
                                                className={`segmented-btn system-status-toggle-btn ${draft.isSearchable ? 'is-active' : ''}`}
                                                aria-pressed={draft.isSearchable}
                                                onClick={() =>
                                                  setAdminCampaignsDrafts((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      ...draft,
                                                      isSearchable: !draft.isSearchable,
                                                    },
                                                  }))
                                                }
                                              >
                                                <Icon name={draft.isSearchable ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'} />
                                                <span>{draft.isSearchable ? 'Ricercabile' : 'Nascosta'}</span>
                                              </button>
                                            </td>
                                            <td className="data-table-secondary">Visibile nelle ricerche e nei cataloghi pubblici.</td>
                                          </tr>
                                        </tbody>
                                      </table>

                                      <div className="divider" />
                                      <div className="row-between">
                                        <div>
                                          <p className="section-title">Moduli campagna</p>
                                          <p className="muted">Lista espandibile di configurazioni. La struttura resta scalabile quando i moduli aumentano.</p>
                                        </div>
                                        <span className="readonly-chip">{draft.allowedModules.length}/{visibleModules.length} attivi</span>
                                      </div>
                                      <table className="system-users-table system-campaign-modules-table">
                                        <thead>
                                          <tr>
                                            <th>Modulo</th>
                                            <th>Descrizione</th>
                                            <th>Stato</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {visibleModules.map((module) => {
                                            const enabled = draft.allowedModules.includes(module.code)
                                            return (
                                              <tr key={module.code}>
                                                <td>{catalogEntryLabel(campaignModules, module.code) || module.label || module.code}</td>
                                                <td className="data-table-secondary">
                                                  {catalogEntryDescription(campaignModules, module.code) || module.description || 'Addon campagna'}
                                                </td>
                                                <td>
                                                  <label className="switch system-user-switch" aria-label={`${module.code} ${enabled ? 'attivo' : 'disattivo'}`}>
                                                    <input
                                                      type="checkbox"
                                                      checked={enabled}
                                                      onChange={(event) =>
                                                        setAdminCampaignsDrafts((prev) => {
                                                          const current = prev[item.id] || draft
                                                          const nextModules = event.target.checked
                                                            ? Array.from(new Set([...current.allowedModules, module.code]))
                                                            : current.allowedModules.filter((code) => code !== module.code)
                                                          return {
                                                            ...prev,
                                                            [item.id]: {
                                                              ...current,
                                                              allowedModules: nextModules,
                                                            },
                                                          }
                                                        })
                                                      }
                                                    />
                                                    <span className="switch-track" aria-hidden="true">
                                                      <span className="switch-thumb" />
                                                    </span>
                                                  </label>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="system-pagination">
                  <p className="muted">
                    Mostrate {systemCampaigns.length} campagne su {systemCampaignsTotal}
                  </p>
                  <div className="system-pagination-controls">
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminCampaignsPage || adminCampaignsPage.first}
                      onClick={() => void loadAdminCampaigns(Math.max(adminCampaignsPageIndex - 1, 0))}
                    >
                      <Icon name="fa-solid fa-chevron-left" />
                      <span>Precedente</span>
                    </button>
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminCampaignsPage || adminCampaignsPage.last}
                      onClick={() => void loadAdminCampaigns(adminCampaignsPageIndex + 1)}
                    >
                      <span>Successiva</span>
                      <Icon name="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                </div>
              </>
            ) : systemAdminView === 'realms' ? (
              <>
                <div className="system-panel-head">
                  <div>
                    <p className="menu-group-label">{selectedAdminRealmId ? 'Modifica realm' : 'Nuovo realm'}</p>
                    <h3>{selectedAdminRealmId ? 'Aggiornamento cliente' : 'Registrazione cliente'}</h3>
                    <p className="muted">Form unico per creazione e modifica. La tabella sotto serve solo da elenco e selezione.</p>
                  </div>
                </div>
                <div className="form-grid two-cols">
                  <label>
                    Codice
                    <input
                      value={adminRealmDraft.code}
                      placeholder="dragonlegend"
                      onChange={(event) =>
                        setAdminRealmDraft((prev) => ({
                          ...prev,
                          code: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Nome
                    <input
                      value={adminRealmDraft.name}
                      placeholder="Dragon Legend"
                      onChange={(event) =>
                        setAdminRealmDraft((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="full-span">
                    Logo URL
                    <input
                      value={adminRealmDraft.logoUrl || ''}
                      placeholder="https://cdn.example.com/dragonlegend-logo.png"
                      onChange={(event) =>
                        setAdminRealmDraft((prev) => ({
                          ...prev,
                          logoUrl: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={adminRealmDraft.type}
                      onChange={(event) =>
                        setAdminRealmDraft((prev) => ({
                          ...prev,
                          type: event.target.value as RealmType,
                        }))
                      }
                    >
                      {REALM_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="switch system-user-switch" aria-label="Realm attivo">
                    <span className="system-status-copy">
                      <strong>{adminRealmDraft.isActive ? 'Attivo' : 'Spento'}</strong>
                      <small>{adminRealmDraft.isActive ? 'Il realm e disponibile.' : 'Il realm non e disponibile.'}</small>
                    </span>
                    <span>
                      <input
                        type="checkbox"
                        checked={adminRealmDraft.isActive}
                        onChange={(event) =>
                          setAdminRealmDraft((prev) => ({
                            ...prev,
                            isActive: event.target.checked,
                          }))
                        }
                      />
                      <span className="switch-track" aria-hidden="true">
                        <span className="switch-thumb" />
                      </span>
                    </span>
                  </label>
                  <label className="switch system-user-switch" aria-label="Creazione campagne utente">
                    <span className="system-status-copy">
                      <strong>{adminRealmDraft.allowUserCampaignCreation ? 'USER crea campagne' : 'Solo ADMIN realm'}</strong>
                      <small>
                        {adminRealmDraft.allowUserCampaignCreation
                          ? 'Gli utenti normali possono aprire campagne.'
                          : 'La creazione campagne richiede ADMIN nel realm.'}
                      </small>
                    </span>
                    <span>
                      <input
                        type="checkbox"
                        checked={adminRealmDraft.allowUserCampaignCreation}
                        onChange={(event) =>
                          setAdminRealmDraft((prev) => ({
                            ...prev,
                            allowUserCampaignCreation: event.target.checked,
                          }))
                        }
                      />
                      <span className="switch-track" aria-hidden="true">
                        <span className="switch-thumb" />
                      </span>
                    </span>
                  </label>
                  <label className="full-span">
                    Host registrati
                    <textarea
                      rows={3}
                      value={adminRealmHostsInput}
                      disabled={Boolean(selectedAdminRealmId)}
                      placeholder={'dragonlegend.gate.app\napp.dragonlegend.it'}
                      onChange={(event) => setAdminRealmHostsInput(event.target.value)}
                    />
                  </label>
                </div>
                <div className="system-row-actions">
                  <span className="status status-info">
                    {selectedAdminRealmId ? 'In modifica, codice e host restano bloccati in questo step.' : 'Route FE e host BE devono convergere sullo stesso realm.'}
                  </span>
                  <button
                    type="button"
                    className="refresh-btn"
                    disabled={busy}
                    onClick={resetAdminRealmForm}
                  >
                    <Icon name="fa-solid fa-rotate-left" />
                    <span>Nuovo</span>
                  </button>
                  <button
                    type="button"
                    className="refresh-btn"
                    disabled={busy || !adminRealmDraft.code.trim() || !adminRealmDraft.name.trim()}
                    onClick={() => void (selectedAdminRealmId ? saveAdminRealm(selectedAdminRealmId) : createAdminRealmEntry())}
                  >
                    <Icon name={selectedAdminRealmId ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-plus'} />
                    <span>{selectedAdminRealmId ? 'Salva realm' : 'Crea realm'}</span>
                  </button>
                </div>

                <div className="system-filter-bar">
                  <label>
                    Cerca realm
                    <div className="inline-actions">
                      <input
                        value={adminRealmsSearch}
                        placeholder="Nome realm o codice"
                        onChange={(event) => setAdminRealmsSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void loadAdminRealms(0, adminRealmsSearch)
                          }
                        }}
                      />
                      <button type="button" className="refresh-btn" disabled={busy} onClick={() => void loadAdminRealms(0, adminRealmsSearch)}>
                        <Icon name="fa-solid fa-magnifying-glass" />
                        <span>Cerca</span>
                      </button>
                      <button
                        type="button"
                        className="refresh-btn"
                        disabled={busy || !adminRealmsSearch.trim()}
                        onClick={() => {
                          setAdminRealmsSearch('')
                          void loadAdminRealms(0, '')
                        }}
                      >
                        <Icon name="fa-solid fa-xmark" />
                        <span>Pulisci</span>
                      </button>
                    </div>
                  </label>
                </div>

                <div className="system-table-wrap">
                  <table className="system-users-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'name' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('name')}>
                            <span>Realm</span>
                            <Icon name={systemSortBy === 'name' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                        <th>Logo</th>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'type' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('type')}>
                            <span>Tipo</span>
                            <Icon name={systemSortBy === 'type' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                        <th>Host</th>
                        <th>
                          <button type="button" className={`data-table-sort-btn ${systemSortBy === 'isActive' ? 'is-active' : ''}`} onClick={() => handleSystemSortChange('isActive')}>
                            <span>Stato</span>
                            <Icon name={systemSortBy === 'isActive' ? systemSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-sort'} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {busy && adminRealms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Caricamento realm...</td>
                        </tr>
                      ) : adminRealms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Nessun realm trovato.</td>
                        </tr>
                      ) : (
                        sortedAdminRealms.map((item) => (
                          <tr
                            key={item.id}
                            className={`is-selectable ${selectedAdminRealmId === item.id ? 'is-selected' : ''}`}
                            onClick={() => selectAdminRealmForEdit(item)}
                          >
                            <td>
                              <div className="system-user-primary">
                                <span className="system-user-username">{item.name}</span>
                                <span className="system-user-id">{item.code}</span>
                              </div>
                            </td>
                            <td>
                              {item.logoUrl ? (
                                <img className="realm-admin-logo-preview" src={item.logoUrl} alt={item.name} />
                              ) : (
                                <span className="muted">Default</span>
                              )}
                            </td>
                            <td>
                              <span className="status status-neutral">{item.type}</span>
                            </td>
                            <td>
                              <div className="system-user-secondary">
                                {item.hosts.length === 0 ? (
                                  <span className="muted">Nessun host</span>
                                ) : (
                                  item.hosts.map((host) => (
                                    <span key={host.id} className="system-user-id">
                                      {host.host}
                                      {host.isPrimary ? ' [primary]' : ''}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`status ${item.isActive ? 'status-success' : 'status-warning'}`}>
                                {item.isActive ? 'Attivo' : 'Spento'}
                              </span>
                              <span className={`status ${item.allowUserCampaignCreation ? 'status-success' : 'status-warning'}`}>
                                {item.allowUserCampaignCreation ? 'USER crea campagne' : 'Solo ADMIN crea campagne'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="system-pagination">
                  <p className="muted">
                    Mostrati {adminRealms.length} realm su {systemRealmsTotal}
                  </p>
                  <div className="system-pagination-controls">
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminRealmsPage || adminRealmsPage.first}
                      onClick={() => void loadAdminRealms(Math.max(adminRealmsPageIndex - 1, 0), adminRealmsSearch)}
                    >
                      <Icon name="fa-solid fa-chevron-left" />
                      <span>Precedente</span>
                    </button>
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminRealmsPage || adminRealmsPage.last}
                      onClick={() => void loadAdminRealms(adminRealmsPageIndex + 1, adminRealmsSearch)}
                    >
                      <span>Successiva</span>
                      <Icon name="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                </div>
              </>
            ) : systemAdminView === 'realmAccess' ? (
              <>
                <div className="system-panel-head">
                  <div>
                    <p className="menu-group-label">Realm operativo</p>
                    <h3>{selectedRealmAccessRealm?.name || 'Seleziona un realm'}</h3>
                    <p className="muted">Il ruolo qui vale solo nel realm selezionato. Non modifica il ruolo piattaforma.</p>
                  </div>
                  <div className="system-panel-meta">
                    <SearchableSelect
                      key={`${selectedRealmAccessRealm?.id || 'empty'}-${adminRealms.length}`}
                      className="system-panel-searchable-select"
                      value={selectedRealmAccessRealm?.id || ''}
                      placeholder="Cerca realm"
                      minQueryLength={3}
                      options={adminRealms.map((realm) => ({
                        value: realm.id,
                        label: `${realm.name} (${realm.code})`,
                        description: realm.type,
                      }))}
                      onChange={(nextRealmId) => {
                        setSelectedRealmAccessRealmId(nextRealmId)
                        void loadAdminRealmUserRoles(nextRealmId)
                      }}
                    />
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !selectedRealmAccessRealm}
                      onClick={() => selectedRealmAccessRealm && void loadAdminRealmUserRoles(selectedRealmAccessRealm.id)}
                    >
                      <Icon name="fa-solid fa-rotate" />
                      <span>Aggiorna</span>
                    </button>
                  </div>
                </div>

                <div className="form-grid two-cols">
                  <label className="full-span">
                    Cerca profilo
                    <div className="inline-actions">
                      <input
                        value={realmAccessSearch}
                        placeholder="Nome profilo o username"
                        onChange={(event) => setRealmAccessSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void searchRealmAccessUser()
                          }
                        }}
                      />
                      <button type="button" className="refresh-btn" disabled={busy} onClick={() => void searchRealmAccessUser()}>
                        <Icon name="fa-solid fa-magnifying-glass" />
                        <span>Cerca</span>
                      </button>
                    </div>
                  </label>
                  {realmAccessSearchMessage && <p className="muted full-span">{realmAccessSearchMessage}</p>}
                </div>

                <DataTable
                  columns={[
                    { key: 'profileName', label: 'Admin realm', sortKey: 'profileName' },
                    { key: 'username', label: 'Username', sortKey: 'username' },
                    { key: 'role', label: 'Ruolo' },
                    { key: 'lastUpdate', label: 'Update', sortKey: 'lastUpdate' },
                    { key: 'actions', label: '' },
                  ]}
                  rows={activeRealmAdminRows}
                  getRowKey={(item) => item.id}
                  emptyMessage={selectedRealmAccessRealm ? 'Nessun admin attivo su questo realm.' : 'Nessun realm disponibile.'}
                  sortBy={systemSortBy}
                  sortDirection={systemSortDirection}
                  onSortChange={handleSystemSortChange}
                  renderRow={(assignment) => {
                    const key = `${assignment.realmId}:${assignment.userId}`
                    const draftRole = adminRealmRoleDrafts[key] || assignment.role
                    const isDirty = draftRole !== assignment.role
                    return (
                      <tr>
                        <td>{assignment.profileName}</td>
                        <td>@{assignment.username}</td>
                        <td>
                          <select
                            className="system-inline-select"
                            value={draftRole}
                            onChange={(event) =>
                              setAdminRealmRoleDrafts((prev) => ({
                                ...prev,
                                [key]: event.target.value as RealmRole,
                              }))
                            }
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td>{formatShortDate(assignment.lastUpdate)}</td>
                        <td>
                          <button
                            type="button"
                            className="refresh-btn"
                            disabled={busy || !isDirty}
                            onClick={() => void saveAdminRealmUserRole(assignment.realmId, assignment.userId)}
                          >
                            <Icon name="fa-solid fa-floppy-disk" />
                            <span>Salva</span>
                          </button>
                        </td>
                      </tr>
                    )
                  }}
                />

                {realmAccessSearchResults.length > 0 && selectedRealmAccessRealm && (
                  <DataTable
                    columns={[
                      { key: 'profileName', label: 'Profilo', sortKey: 'profileName' },
                      { key: 'username', label: 'Username', sortKey: 'username' },
                      { key: 'platformRole', label: 'Globale' },
                      { key: 'realmRole', label: 'Ruolo realm' },
                      { key: 'actions', label: '' },
                    ]}
                    rows={sortedRealmAccessSearchResults}
                    getRowKey={(item) => item.id}
                    emptyMessage="Nessun profilo trovato."
                    sortBy={systemSortBy}
                    sortDirection={systemSortDirection}
                    onSortChange={handleSystemSortChange}
                    renderRow={(item) => {
                      const key = `${selectedRealmAccessRealm.id}:${item.id}`
                      const assignment = adminRealmRoleByKey[key]
                      const currentRole = assignment?.isPrivilegeActive ? assignment.role : 'USER'
                      const draftRole = adminRealmRoleDrafts[key] || currentRole
                      const isDirty = draftRole !== currentRole
                      return (
                        <tr>
                          <td>{item.profileName}</td>
                          <td>@{item.username}</td>
                          <td>{platformRoleLabel(item.platformRole)}</td>
                          <td>
                            <select
                              className="system-inline-select"
                              value={draftRole}
                              onChange={(event) =>
                                setAdminRealmRoleDrafts((prev) => ({
                                  ...prev,
                                  [key]: event.target.value as RealmRole,
                                }))
                              }
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <span className={`status ${assignment?.isPrivilegeActive ? 'status-success' : assignment ? 'status-warning' : 'status-neutral'}`}>
                              {assignment?.isPrivilegeActive ? 'Admin attivo' : assignment ? 'Disattivato' : 'Default USER'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="refresh-btn"
                              disabled={busy || !isDirty}
                              onClick={() => void saveAdminRealmUserRole(selectedRealmAccessRealm.id, item.id)}
                            >
                              <Icon name="fa-solid fa-floppy-disk" />
                              <span>Salva</span>
                            </button>
                          </td>
                        </tr>
                      )
                    }}
                  />
                )}
              </>
            ) : (
              <AdminProvider value={adminContextValue}>
                <SystemCatalogsPage />
              </AdminProvider>
            )}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Chiudi menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar-drawer ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <button type="button" className="drawer-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="sidebar-context">
          <p className="sidebar-user-kicker">Campagna attiva</p>
          <p className="sidebar-context-title">{hasActiveCampaign ? activeCampaignLabel : 'Nessuna campagna attiva'}</p>
          {hasActiveCampaign && (
            <button type="button" className="danger-btn sidebar-context-action" onClick={detachActiveCampaign}>
              <Icon name="fa-right-left" />
              <span>Cambia campagna</span>
            </button>
          )}
        </div>

        <nav className="menu" aria-label="Navigazione principale">
          {NAVIGATION_SECTIONS.map((section) => {
            const visibleItems = section.items
              .map((item) => ({ item, state: getMenuScreenState(item) }))
              .filter(({ state }) => state.enabled)

            if (visibleItems.length === 0) return null

            return (
              <section key={section.label} className="menu-section">
                <div className="menu-section-head">
                  <div>
                    <p className="menu-group-label">{section.label}</p>
                    <p className="menu-section-description">{section.description}</p>
                  </div>
                </div>
                <div className={`menu-section-grid ${section.label === 'Strumenti' ? 'is-compact' : ''}`}>
                  {visibleItems.map(({ item, state: itemState }) => (
                    <button
                      key={item}
                      type="button"
                      className={`menu-item ${screen === item ? 'is-active' : ''} ${requiresCampaignSelection(item) && !hasActiveCampaign ? 'is-gated' : ''} ${MODULE_REQUIRED_BY_SCREEN[item] && hasActiveCampaign && !(campaign?.allowedModules || []).includes(MODULE_REQUIRED_BY_SCREEN[item]!) ? 'is-module-disabled' : ''}`}
                      onClick={() => {
                        if (item === 'Lista Campagne' && hasActiveCampaign) {
                          goToScreen('Scheda Campagna')
                          return
                        }
                        goToScreen(item)
                      }}
                      title={itemState.title}
                      aria-current={screen === item ? 'page' : undefined}
                    >
                      <span className="menu-item-icon">
                        <Icon name={SCREEN_ICONS[item]} />
                        {itemState.showOverlayX && (
                          <span className="menu-item-overlay" aria-hidden="true">
                            <Icon name="fa-solid fa-xmark" />
                          </span>
                        )}
                        {item === 'Approvazione Accessi' && pendingApplications.length > 0 && (
                          <span className="menu-item-badge" aria-hidden="true">
                            {pendingApplications.length}
                          </span>
                        )}
                      </span>
                      <span className="menu-item-text">{SCREEN_LABELS[item]}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-context sidebar-realm-login">
            <p className="sidebar-user-kicker">Reame di login</p>
            <div className="sidebar-realm-login-row">
              <span className="sidebar-realm-login-icon" aria-hidden="true">
                <Icon name="lucide:LogIn" />
              </span>
              <div className="sidebar-realm-login-copy">
                <p className="sidebar-context-title">{brandTitle}</p>
                <p className="sidebar-context-meta">{realmCode}</p>
              </div>
            </div>
          </div>
          {!isSystemRole && (
            <button
              type="button"
              className="refresh-btn theme-toggle-btn sidebar-theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Icon name={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
              <span>{theme === 'light' ? 'Tema scuro' : 'Tema chiaro'}</span>
            </button>
          )}
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <Icon name="fa-solid fa-right-from-bracket" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title-row">
            <button type="button" className="menu-trigger" aria-label="Apri menu" onClick={() => setIsSidebarOpen(true)}>
              <Icon name="fa-solid fa-bars" />
            </button>
            <div className="page-heading">
              <nav className="breadcrumbs" aria-label="Percorso">
                {pageContext.breadcrumbs.map((crumb, index) => {
                  const isLast = index === pageContext.breadcrumbs.length - 1
                  const target = crumb.target
                  if (target && !isLast) {
                    return (
                      [
                        <button key={`${crumb.label}-${index}`} type="button" className="breadcrumb-link" onClick={() => goToScreen(target)}>
                          {crumb.label}
                        </button>,
                        <span key={`separator-${crumb.label}-${index}`} className="breadcrumb-separator" aria-hidden="true">
                          <Icon name="fa-solid fa-chevron-right" />
                        </span>,
                      ]
                    )
                  }
                  return (
                    <span key={`${crumb.label}-${index}`} className={`breadcrumb-current ${isLast ? 'is-current' : ''}`}>
                      {crumb.label}
                    </span>
                  )
                })}
              </nav>
            </div>
          </div>
        </header>

        {error && <section className="panel error">{error}</section>}

        {screen === 'Lista Campagne' && (
          <CampaignProvider value={campaignContextValue}>
            <CampaignListPage />
          </CampaignProvider>
        )}

        {screen === 'Crea Campagna' && (
          <CampaignProvider value={campaignContextValue}>
            <CreateCampaignPage />
          </CampaignProvider>
        )}

        {screen === 'Scheda Campagna' && (
          <CampaignProvider value={campaignContextValue}>
            <CampaignDetailPage />
          </CampaignProvider>
        )}

        {screen === 'Approvazione Accessi' && (
          <CampaignProvider value={campaignContextValue}>
            <ApprovalPage />
          </CampaignProvider>
        )}

        {screen === 'Missioni' && (
          <MissionProvider value={missionContextValue}>
            <MissionsPage />
          </MissionProvider>
        )}

        {screen === 'Stanze' && (
          <CampaignProvider value={campaignContextValue}>
            <RoomsPage />
          </CampaignProvider>
        )}

        {screen === 'Log' && (
          <UiProvider value={uiContextValue}>
            <LogPage />
          </UiProvider>
        )}

        {screen === 'Profilo' && (
          <UiProvider value={uiContextValue}>
            <ProfileProvider value={profileContextValue}>
              <ProfilePage />
            </ProfileProvider>
          </UiProvider>
        )}

        {screen === 'Modifica Profilo' && (
          <ProfileProvider value={profileContextValue}>
            <EditProfilePage key={profile.id} />
          </ProfileProvider>
        )}

        {screen === 'Gestione Personaggi' && (
          <CharacterProvider value={characterContextValue}>
            <CharacterListPage />
          </CharacterProvider>
        )}

        {screen === 'Scheda PG' && (
          <CharacterProvider value={characterContextValue}>
            <CharacterDetailPage key={`${selectedCharacterId || 'no-character'}-${characterSheetDetail?.updatedAt || characterSheetDetail?.schemaVersion || 'no-sheet'}`} />
          </CharacterProvider>
        )}

        {screen === 'Gestione Campagna' && (
          <CampaignProvider value={campaignContextValue}>
            <CampaignManagementPage key={campaign?.id || 'empty-campaign-management'} />
          </CampaignProvider>
        )}

        {screen === 'Profilo Membro Campagna' && selectedCampaignMember && selectedCampaignMemberProfile && (
          <CampaignProvider value={campaignContextValue}>
            <CampaignMemberProfilePage key={selectedCampaignMember.userId} />
          </CampaignProvider>
        )}

        {screen === 'Seleziona PG' && (
          <CharacterProvider value={characterContextValue}>
            <SelectCharacterPage key={`${activeCampaignCharacterId || 'no-preferred'}-${characters.map((character) => character.id).join('|')}`} />
          </CharacterProvider>
        )}

        {screen === 'Crea Personaggio' && (
          <CharacterProvider value={characterContextValue}>
            <CreateCharacterPage key={`${canCreatePlayerCharacter}-${canCreateNpc}`} />
          </CharacterProvider>
        )}
        {isLeaveCampaignOpen && (
          <LeaveCampaignModal
            context={{
              campaignName: activeCampaignLabel,
              characterWillBeRetired: activeCampaignMembership?.characterStatus === 'ACTIVE',
            }}
            busy={busy}
            onClose={closeLeaveCampaignModal}
            onConfirm={() => void leaveActiveCampaign()}
          />
        )}
      </main>
    </div>
  )
}

export default App
