import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AuthScreen } from './features/auth'
import { ApprovalPage, CampaignAccessBadge, CampaignOpenBadge, CampaignStatusBadge, CreateCampaignPage } from './features/campaigns'
import { CreateCharacterPage, SelectCharacterPage } from './features/characters'
import { MissionsPage } from './features/missions'
import { NotificationsPage } from './features/notifications'
import { EditProfilePage, ProfilePage } from './features/profile'
import { RoomsPage } from './features/rooms'
import { DataTable, FieldLabel, Icon } from './shared/components'
import { ApiError, getAccessToken } from './services/apiClient'
import {
  createAdminGameSystem,
  createAdminSheetType,
  listAdminCampaigns,
  listAdminGameSystems,
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
  reopenMission,
  updateMission,
  updateMissionParticipationType,
  updateAdminCampaign,
  updateAdminGameSystem,
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
  AdminCampaignUpdateRequest,
  AdminUserPage,
  AdminUserUpdateRequest,
  AuthSession,
  CampaignApplicationResponse,
  CampaignCatalogEntry,
  CampaignDiscoverResponse,
  CampaignMemberStatus,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
  CampaignRole,
  CampaignResponse,
  Character,
  CharacterSheetResponse,
  CharacterStatus,
  MyCampaignMembershipResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
  MissionStatus,
  RoomResponse,
  PlatformRole,
  SheetEntityType,
  SheetSchemaBlock,
  SheetSchemaField,
  SheetTypeCatalogEntry,
  UserProfile,
  AdminGameSystemUpsertRequest,
  AdminSheetTypeUpsertRequest,
  CampaignInvitePreviewResponse,
  CreateInviteTokenRequest,
  InviteCapability,
  InviteTokenPreviewResponse,
  InviteTokenResponse,
} from './types/domain'
import type { ResourceInvalidationPayload } from './types/realtime'

type Screen =
  | 'Lista Campagne'
  | 'Crea Campagna'
  | 'Scheda Campagna'
  | 'Approvazione Accessi'
  | 'Missioni'
  | 'Stanze'
  | 'Notifiche'
  | 'Profilo'
  | 'Modifica Profilo'
  | 'Gestione Personaggi'
  | 'Scheda PG'
  | 'Gestione Campagna'
  | 'Profilo Membro Campagna'
  | 'Seleziona PG'
  | 'Crea Personaggio'

type UiEvent = {
  id: string
  ts: string
  text: string
  level: 'info' | 'ok' | 'error'
}

const CAMPAIGN_ID_KEY = 'gate_campaign_id'
const KNOWN_CAMPAIGNS_KEY = 'gate_known_campaign_ids'
const KNOWN_CAMPAIGN_META_KEY = 'gate_known_campaign_meta'
const THEME_KEY = 'gate_theme'
const PENDING_APPLICATIONS_CACHE_KEY = 'gate_pending_applications_cache'

function scopedStorageKey(baseKey: string, userId?: string | null) {
  return userId ? `${baseKey}:${userId}` : baseKey
}

function readStoredJson<T>(storage: Storage, key: string, fallback: T): T {
  const raw = storage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

type KnownCampaignMeta = { id: string; name: string }
type CampaignPickerCampaign = {
  campaignId: string
  campaignName: string
  role: CampaignRole
  isActive: boolean
  disabled: boolean
}
type LeaveCampaignContext = {
  campaignName: string
  characterWillBeRetired: boolean
}

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
const CAMPAIGN_TONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EPIC_FANTASY', label: 'Fantasy Epico' },
  { value: 'HEROIC', label: 'Eroico' },
  { value: 'DARK', label: 'Dark' },
  { value: 'MYSTERY', label: 'Mistero' },
  { value: 'HORROR', label: 'Horror' },
  { value: 'POLITICAL_INTRIGUE', label: 'Intrigo Politico' },
  { value: 'ADVENTURE', label: 'Avventura' },
  { value: 'LIGHTHEARTED', label: 'Leggero' },
]

const campaignToneLabel = (value: string | null | undefined): string | null => {
  if (!value) return null
  const match = CAMPAIGN_TONE_OPTIONS.find((toneOption) => toneOption.value === value)
  return match?.label || value
}

const catalogEntryByCode = (entries: CampaignCatalogEntry[], code: string | null | undefined): CampaignCatalogEntry | null => {
  if (!code) return null
  return entries.find((entry) => entry.code === code) || null
}

const catalogEntryLabel = (entries: CampaignCatalogEntry[], code: string | null | undefined): string | null => {
  return catalogEntryByCode(entries, code)?.label || code || null
}

const catalogEntryDescription = (entries: CampaignCatalogEntry[], code: string | null | undefined): string | null => {
  if (!code) return null
  return catalogEntryByCode(entries, code)?.description || null
}

const LEGACY_INVITE_CODE_REGEX = /^[0-9a-fA-F-]{36}$/

function isLegacyInviteCode(value: string) {
  return LEGACY_INVITE_CODE_REGEX.test(value.trim())
}

const platformRoleLabel = (role: PlatformRole) => {
  switch (role) {
    case 'ADMIN':
      return 'ADMIN'
    case 'SYSTEM':
      return 'SYSTEM'
    default:
      return 'USER'
  }
}

const ADMIN_PLATFORM_ROLES: PlatformRole[] = ['USER', 'ADMIN', 'SYSTEM']
type SystemAdminView = 'users' | 'campaigns' | 'sheets'

type InviteAccessPreview = {
  campaignId: string
  campaignName: string
  campaignSummary: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  gameSystem: string | null
  capabilities: InviteCapability[]
  modeLabel: string
  modeTone: 'success' | 'warning'
}
type BreadcrumbItem = {
  label: string
  target?: Screen
}

type ThemeMode = 'light' | 'dark'
type EffectiveThemeMode = ThemeMode | 'sysadmin'

type NavigationSection = {
  label: string
  description: string
  items: Screen[]
}

type RealtimeActionMap = {
  refreshProfile: () => Promise<void>
  refreshCampaignBlock: () => Promise<void>
  refreshCharacterBlock: () => Promise<void>
  refreshMissions: (options?: { clearSelection?: boolean }) => Promise<void>
  loadDiscoverableCampaigns: () => Promise<void>
  loadCharactersForManagement: () => Promise<void>
  loadPendingForActiveCampaign: () => Promise<void>
  refreshPendingApplicationsForCampaign: (campaignId: string) => Promise<void>
  loadAdminUsers: (page: number) => Promise<void>
  loadAdminCampaigns: (page: number) => Promise<void>
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
}

const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    label: 'Essenziali',
    description: 'Le viste che userai più spesso.',
    items: ['Profilo', 'Lista Campagne', 'Missioni', 'Gestione Personaggi', 'Notifiche'],
  },
  {
    label: 'Strumenti',
    description: 'Operazioni di supporto e dettagli.',
    items: [
      'Crea Campagna',
      'Scheda Campagna',
      'Approvazione Accessi',
      'Gestione Campagna',
      'Stanze',
      'Modifica Profilo',
      'Scheda PG',
      'Crea Personaggio',
    ],
  },
]

const SCREEN_LABELS: Record<Screen, string> = {
  'Lista Campagne': 'Campagne',
  'Crea Campagna': 'Crea campagna',
  'Scheda Campagna': 'Scheda campagna',
  'Approvazione Accessi': 'Accessi',
  Missioni: 'Missioni',
  Stanze: 'Stanze',
  Notifiche: 'Notifiche',
  Profilo: 'Profilo',
  'Modifica Profilo': 'Modifica profilo',
  'Gestione Personaggi': 'Personaggi',
  'Scheda PG': 'Scheda PG',
  'Gestione Campagna': 'Gestione campagna',
  'Profilo Membro Campagna': 'Profilo membro',
  'Seleziona PG': 'Seleziona PG',
  'Crea Personaggio': 'Crea personaggio',
}

const SCREEN_ICONS: Record<Screen, string> = {
  'Lista Campagne': 'fa-solid fa-layer-group',
  'Crea Campagna': 'fa-solid fa-circle-plus',
  'Scheda Campagna': 'fa-solid fa-book-open',
  'Approvazione Accessi': 'fa-solid fa-shield-halved',
  Missioni: 'fa-solid fa-flag-checkered',
  Stanze: 'fa-solid fa-door-open',
  Notifiche: 'fa-solid fa-bell',
  Profilo: 'fa-solid fa-user',
  'Modifica Profilo': 'fa-solid fa-user-gear',
  'Gestione Personaggi': 'fa-solid fa-users',
  'Scheda PG': 'fa-solid fa-id-card',
  'Gestione Campagna': 'fa-solid fa-sliders',
  'Profilo Membro Campagna': 'fa-solid fa-address-card',
  'Seleziona PG': 'fa-solid fa-address-book',
  'Crea Personaggio': 'fa-solid fa-wand-magic-sparkles',
}

const CAMPAIGN_REQUIRED_TOOLTIP = 'Caricare prima la campagna'
const MODULE_REQUIRED_BY_SCREEN: Partial<Record<Screen, string>> = {
  Stanze: 'STANZE',
}

function App() {
  const [screen, setScreen] = useState<Screen>('Profilo')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<UiEvent[]>([])

  const [campaignId, setCampaignId] = useState('')
  const [knownCampaignIds, setKnownCampaignIds] = useState<string[]>([])
  const [knownCampaignMeta, setKnownCampaignMeta] = useState<KnownCampaignMeta[]>([])
  const [myCampaigns, setMyCampaigns] = useState<MyCampaignMembershipResponse[]>([])
  const [discoverableCampaigns, setDiscoverableCampaigns] = useState<CampaignDiscoverResponse[]>([])
  const [campaignDetailsById, setCampaignDetailsById] = useState<Record<string, CampaignResponse>>({})
  const [pendingApplications, setPendingApplications] = useState<CampaignApplicationResponse[]>([])
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null)
  const [members, setMembers] = useState<CampaignMembershipResponse[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [campaignMembersForManagement, setCampaignMembersForManagement] = useState<CampaignMembershipResponse[]>([])
  const [canManageCampaignMembers, setCanManageCampaignMembers] = useState(false)
  const [campaignFounderNames, setCampaignFounderNames] = useState<Record<string, string>>({})
  const [permissions, setPermissions] = useState<CampaignPermissionResponse[]>([])
  const [campaignModules, setCampaignModules] = useState<CampaignCatalogEntry[]>([])
  const [campaignGameSystems, setCampaignGameSystems] = useState<CampaignCatalogEntry[]>([])
  const [adminUsersPage, setAdminUsersPage] = useState<AdminUserPage | null>(null)
  const [adminUsersPageIndex, setAdminUsersPageIndex] = useState(0)
  const [adminUsersDrafts, setAdminUsersDrafts] = useState<Record<string, AdminUserUpdateRequest>>({})
  const [adminCampaignsPage, setAdminCampaignsPage] = useState<AdminCampaignPage | null>(null)
  const [adminCampaignsPageIndex, setAdminCampaignsPageIndex] = useState(0)
  const [adminCampaignsDrafts, setAdminCampaignsDrafts] = useState<Record<string, AdminCampaignUpdateRequest>>({})
  const [adminGameSystems, setAdminGameSystems] = useState<CampaignCatalogEntry[]>([])
  const [adminSheetTypes, setAdminSheetTypes] = useState<SheetTypeCatalogEntry[]>([])
  const [adminSheetCatalogsLoaded, setAdminSheetCatalogsLoaded] = useState(false)
  const [systemAdminView, setSystemAdminView] = useState<SystemAdminView>('users')

  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [characterDetail, setCharacterDetail] = useState<Character | null>(null)
  const [characterSheetDetail, setCharacterSheetDetail] = useState<CharacterSheetResponse | null>(null)
  const [pendingApplicationsByCampaignId, setPendingApplicationsByCampaignId] = useState<
    Record<string, CampaignApplicationResponse[]>
  >({})

  const [missions, setMissions] = useState<MissionResponse[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [missionParticipantsById, setMissionParticipantsById] = useState<Record<string, MissionParticipantResponse[]>>({})
  const [myMissionParticipationById, setMyMissionParticipationById] = useState<Record<string, MissionParticipationType>>({})
  const [missionParticipantCharacterLabelById, setMissionParticipantCharacterLabelById] = useState<Record<string, string>>({})

  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [selectedCampaignMember, setSelectedCampaignMember] = useState<CampaignMembershipResponse | null>(null)
  const [selectedCampaignMemberProfile, setSelectedCampaignMemberProfile] = useState<UserProfile | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCampaignPickerOpen, setIsCampaignPickerOpen] = useState(false)
  const [campaignPickerTarget, setCampaignPickerTarget] = useState<Screen | null>(null)
  const [isLeaveCampaignOpen, setIsLeaveCampaignOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'dark' || saved === 'light' ? (saved as ThemeMode) : 'light'
  })
  const isSystemRole = profile?.platformRole === 'SYSTEM'
  const isSystemSession = isSystemRole
  const effectiveTheme: EffectiveThemeMode = isSystemRole ? 'sysadmin' : theme
  const welcomeProfileName = profile?.profileName?.trim() || profile?.username?.trim() || 'profilo'
  const activeUserId = profile?.id ?? null

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
  const selectableCampaigns = useMemo<CampaignPickerCampaign[]>(() => {
    const campaignIsActiveForCurrentUser = (campaignToCheck: string) => {
      if (isSystemRole) return true
      const visibleCampaign = campaignsForList.find((item) => item.id === campaignToCheck)
      return visibleCampaign?.isActive === true
    }
    const canShowCampaignInNavbar = (role: CampaignRole | null | undefined) => {
      if (isSystemRole) return true
      return role === 'CO_MASTER' || role === 'MASTER' || role === 'SUPER_MASTER'
    }
    const byId = new Map<string, CampaignPickerCampaign>()
    for (const item of myCampaigns) {
      if (item.memberStatus === 'APPROVED' && canShowCampaignInNavbar(item.role)) {
        byId.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignName: item.campaignName,
          role: item.role,
          isActive: campaignIsActiveForCurrentUser(item.campaignId),
          disabled: !isSystemRole && !campaignIsActiveForCurrentUser(item.campaignId),
        })
      }
    }
    for (const item of campaignsForList) {
      if (item.membershipStatus === 'APPROVED' && item.membershipRole && canShowCampaignInNavbar(item.membershipRole) && !byId.has(item.id)) {
        byId.set(item.id, {
          campaignId: item.id,
          campaignName: item.name,
          role: item.membershipRole,
          isActive: item.isActive,
          disabled: !isSystemRole && !item.isActive,
        })
      }
    }
    return Array.from(byId.values()).sort((left, right) => {
      if (left.campaignId === campaignId) return -1
      if (right.campaignId === campaignId) return 1
      return left.campaignName.localeCompare(right.campaignName, 'it')
    })
  }, [campaignsForList, myCampaigns, isSystemRole, campaignId])
  const isCharacterScope = (value: Screen) =>
    value === 'Gestione Personaggi' || value === 'Scheda PG' || value === 'Crea Personaggio'

  const addEvent = (text: string, level: UiEvent['level']) => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    setEvents((prev) => [{ id, ts: new Date().toISOString(), text, level }, ...prev].slice(0, 50))
  }

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

  const loadAdminUsers = async (page: number) => {
    setBusy(true)
    setError('')
    try {
      const response = await listAdminUsers(page)
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

  const saveAdminUser = async (userId: string) => {
    const draft = adminUsersDrafts[userId]
    if (!draft) return

    setBusy(true)
    setError('')
    try {
      await updateAdminUser(userId, draft)
      await loadAdminUsers(adminUsersPageIndex)
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

  const openCampaignPicker = (target: Screen | null) => {
    setCampaignPickerTarget(target)
    setIsCampaignPickerOpen(true)
    setIsSidebarOpen(false)
  }

  const closeCampaignPicker = () => {
    setIsCampaignPickerOpen(false)
    setCampaignPickerTarget(null)
  }

  const closeCampaignPickerAndGoHome = () => {
    closeCampaignPicker()
    setScreen('Lista Campagne')
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

  const activateCampaignFromPicker = async (item: CampaignPickerCampaign) => {
    await run('Campagna attivata', async () => {
      const targetScreen = campaignPickerTarget || 'Scheda Campagna'
      await activateCampaignAndNavigate(item.campaignId, targetScreen)
      closeCampaignPicker()
    })
  }

  const activateCampaignAndNavigate = async (targetCampaignId: string, targetScreen: Screen) => {
    const latestCampaign = await getCampaign(targetCampaignId)
    if (!isSystemRole && !latestCampaign.isActive) {
      throw new Error('Campagna disattivata: non selezionabile come attiva')
    }
    await run('Campagna attivata', async () => {
      rememberCampaignId(targetCampaignId)
      setSelectedCampaignMember(null)
      setSelectedCampaignMemberProfile(null)
      setCharacterDetail(null)
      setCharacterSheetDetail(null)
      setSelectedCharacterId('')
      setSelectedMissionId('')
      await loadCampaignBlockFor(targetCampaignId)
      setScreen(targetScreen)
    })
  }

  const leaveActiveCampaign = async () => {
    if (!campaignId.trim()) return
    await run('Uscita dalla campagna completata', async () => {
      await leaveCampaign(campaignId)
      rememberCampaignId('')
      clearCampaignWorkspace()
      setScreen('Lista Campagne')
      closeLeaveCampaignModal()
      await refreshProfile()
    })
  }

  const detachActiveCampaign = () => {
    if (!campaignId.trim()) return
    rememberCampaignId('')
    clearCampaignWorkspace()
    setScreen('Lista Campagne')
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

    const missingUserIds = Array.from(participantUserIds).filter((userId) => userId !== profile?.id && !memberNames[userId])
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

  const loadDiscoverableCampaigns = async () => {
    const list = await discoverCampaigns(false)
    setDiscoverableCampaigns(list)
  }

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
    if (screen !== 'Scheda Campagna' && screen !== 'Gestione Campagna' && screen !== 'Stanze') return
    if (isCampaignPickerOpen && campaignPickerTarget === screen) return
    // Navigation guard: prompt for an active campaign before entering campaign-scoped screens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openCampaignPicker(screen)
  }, [screen, hasActiveCampaign, isCampaignPickerOpen, campaignPickerTarget])

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
    if (screen !== 'Crea Campagna') return
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
    addEvent('Autenticazione completata', 'ok')
    await refreshProfile()
  }

  function handleLogout() {
    logout()
    setProfile(null)
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
    addEvent('Logout eseguito', 'info')
  }

  const realtimeActionsRef = useRef<RealtimeActionMap>({
    refreshProfile: async () => {},
    refreshCampaignBlock: async () => {},
    refreshCharacterBlock: async () => {},
    refreshMissions: async () => {},
    loadDiscoverableCampaigns: async () => {},
    loadCharactersForManagement: async () => {},
    loadPendingForActiveCampaign: async () => {},
    refreshPendingApplicationsForCampaign: async () => {},
    loadAdminUsers: async () => {},
    loadAdminCampaigns: async () => {},
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
  })

  useEffect(() => {
    realtimeActionsRef.current = {
      refreshProfile,
      refreshCampaignBlock,
      refreshCharacterBlock,
      refreshMissions,
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
    }
  }, [
    activeUserId,
    adminCampaignsPageIndex,
    adminUsersPageIndex,
    campaignId,
    isSystemSession,
    loadAdminCampaigns,
    loadAdminSheetCatalogs,
    loadAdminUsers,
    loadCharactersForManagement,
    loadDiscoverableCampaigns,
    loadPendingForActiveCampaign,
    loadPendingForCampaign,
    refreshCampaignBlock,
    refreshCharacterBlock,
    refreshMissions,
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
    const characterKeyMatch = payload.keys.some((key) => key.startsWith('campaigns:') && key.endsWith(':characters'))
    const pendingApplicationsCampaignIds = payload.keys
      .filter((key) => key.startsWith('campaigns:') && key.endsWith(':pending-applications'))
      .map((key) => key.split(':')[1])
    const userProfileKey = snapshot.activeUserId ? `users:${snapshot.activeUserId}:profile` : ''

    if (keys.has('campaigns:discover') && snapshot.screen === 'Lista Campagne') {
      void realtimeActionsRef.current.loadDiscoverableCampaigns()
    }

    if (userProfileKey && keys.has(userProfileKey)) {
      void realtimeActionsRef.current.refreshProfile()
    }

    if (snapshot.isSystemSession) {
      if (snapshot.systemAdminView === 'users' && keys.has('admin:users')) {
        void realtimeActionsRef.current.loadAdminUsers(snapshot.adminUsersPageIndex)
      }
      if (snapshot.systemAdminView === 'campaigns' && keys.has('admin:campaigns')) {
        void realtimeActionsRef.current.loadAdminCampaigns(snapshot.adminCampaignsPageIndex)
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
    if (!isSystemSession) {
      // Session boundary cleanup: leaving SYSTEM mode clears admin-only state.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAdminUsersPage(null)
      setAdminUsersPageIndex(0)
      setAdminUsersDrafts({})
      setAdminCampaignsPage(null)
      setAdminCampaignsPageIndex(0)
      setAdminCampaignsDrafts({})
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
    if (systemAdminView === 'sheets' && !adminSheetCatalogsLoaded) {
      void loadAdminSheetCatalogs()
    }
  }, [isSystemSession, profile?.id, systemAdminView, adminSheetCatalogsLoaded])

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

  if (!profile) {
    return <AuthScreen onAuth={handleAuth} />
  }

  const getMenuScreenState = (value: Screen) => {
    const moduleCode = MODULE_REQUIRED_BY_SCREEN[value]
    const hasRequiredModule = !moduleCode || (campaign?.allowedModules || []).includes(moduleCode)

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
      case 'Notifiche':
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
                <Icon name="fa-solid fa-shield-halved" />
              </div>
              <div>
                <p className="brand-title">Taverna del Codice</p>
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
            <p className="muted">Da qui gestirai utenti, campagne, sistemi di gioco e cataloghi moduli.</p>
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
                <div className="system-table-wrap">
                  <table className="system-users-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Profilo</th>
                        <th>Ruolo</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busy && systemUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Caricamento utenti...</td>
                        </tr>
                      ) : systemUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty-cell">Nessun utente trovato.</td>
                        </tr>
                      ) : (
                        systemUsers.map((item) => {
                          const draft = adminUsersDrafts[item.id] || {
                            platformRole: item.platformRole,
                            isActive: item.isActive,
                          }
                          const isDirty =
                            draft.platformRole !== item.platformRole || draft.isActive !== item.isActive

                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="system-user-primary">
                                  <span className="system-user-username">@{item.username}</span>
                                  <span className="system-user-id">{item.id}</span>
                                </div>
                              </td>
                              <td>
                                <div className="system-user-secondary">
                                  <span>{item.profileName}</span>
                                  <span className="system-user-id">
                                    Creato {new Date(item.createdAt).toLocaleDateString('it-IT')}
                                  </span>
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
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="system-pagination">
                  <p className="muted">
                    Mostrati {systemUsers.length} utenti su {systemUsersTotal}
                  </p>
                  <div className="system-pagination-controls">
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminUsersPage || adminUsersPage.first}
                      onClick={() => void loadAdminUsers(Math.max(adminUsersPageIndex - 1, 0))}
                    >
                      <Icon name="fa-solid fa-chevron-left" />
                      <span>Precedente</span>
                    </button>
                    <button
                      type="button"
                      className="refresh-btn"
                      disabled={busy || !adminUsersPage || adminUsersPage.last}
                      onClick={() => void loadAdminUsers(adminUsersPageIndex + 1)}
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
                        <th>Campagna</th>
                        <th>Sistema</th>
                        <th>Stato</th>
                        <th>Moduli</th>
                        <th>Azioni</th>
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
                        systemCampaigns.map((item) => {
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

                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="system-user-primary">
                                  <span className="system-user-username">{item.name}</span>
                                  <span className="system-user-id">{item.id}</span>
                                  <span className="system-user-id">Founder {item.founderProfileName}</span>
                                </div>
                              </td>
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
                              <td>
                                <div className="system-campaign-statuses">
                                  <div className="system-status-option">
                                    <span className="system-status-copy">
                                      <strong>Aperta</strong>
                                      <small>Può ricevere applicazioni e accessi.</small>
                                    </span>
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
                                  </div>
                                  <div className="system-status-option">
                                    <span className="system-status-copy">
                                      <strong>Attiva</strong>
                                      <small>Campagna abilitata nel sistema.</small>
                                    </span>
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
                                  </div>
                                  <div className="system-status-option">
                                    <span className="system-status-copy">
                                      <strong>Cercabile</strong>
                                      <small>Compare nei cataloghi e nelle ricerche.</small>
                                    </span>
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
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="system-campaign-addon-list">
                                  {(campaignModules.length > 0 ? campaignModules : item.allowedModules.map((code) => ({ code, label: code, description: null, active: true, sortOrder: 0 }))).map((module) => {
                                    const enabled = draft.allowedModules.includes(module.code)
                                    return (
                                      <div key={module.code} className="system-campaign-addon-row" aria-label={`${module.code} ${enabled ? 'attivo' : 'disattivo'}`}>
                                        <span className="system-campaign-addon-text">
                                          <span>{catalogEntryLabel(campaignModules, module.code) || module.label || module.code}</span>
                                          <small>{catalogEntryDescription(campaignModules, module.code) || module.description || 'Addon campagna'}</small>
                                        </span>
                                        <label className="switch system-user-switch">
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
                                      </div>
                                    )
                                  })}
                                </div>
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
                                    onClick={() => void saveAdminCampaign(item.id)}
                                  >
                                    <Icon name="fa-solid fa-floppy-disk" />
                                    <span>Salva</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
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
            ) : (
              <SystemCatalogsPage
                busy={busy}
                gameSystems={adminGameSystems}
                sheetTypes={adminSheetTypes}
                onRefresh={() => void loadAdminSheetCatalogs()}
                onCreateGameSystem={createAdminGameSystemEntry}
                onSaveGameSystem={saveAdminGameSystem}
                onCreateSheetType={createAdminSheetTypeEntry}
                onSaveSheetType={saveAdminSheetType}
              />
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
          <div className="brand">
            <div className="brand-mark">
              <Icon name="fa-solid fa-dungeon" />
            </div>
            <div>
              <p className="brand-title">Taverna del Codice</p>
              <p className="brand-subtitle">Benvenuto {welcomeProfileName}</p>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="sidebar-context">
          <p className="sidebar-user-kicker">Campagna attiva</p>
          <p className="sidebar-context-title">{hasActiveCampaign ? activeCampaignLabel : 'Nessuna campagna attiva'}</p>
          {hasActiveCampaign && (
            <button type="button" className="danger-btn sidebar-context-action" onClick={detachActiveCampaign}>
              <Icon name="fa-solid fa-right-from-bracket" />
              <span>Exit</span>
            </button>
          )}
        </div>

        <nav className="menu" aria-label="Navigazione principale">
          {NAVIGATION_SECTIONS.map((section) => (
            <section key={section.label} className="menu-section">
              <div className="menu-section-head">
                <div>
                  <p className="menu-group-label">{section.label}</p>
                  <p className="menu-section-description">{section.description}</p>
                </div>
              </div>
              <div className={`menu-section-grid ${section.label === 'Strumenti' ? 'is-compact' : ''}`}>
                {section.items.map((item) => (
                  (() => {
                    const itemState = getMenuScreenState(item)
                    const isDisabled = !itemState.enabled
                    return (
                      <button
                        key={item}
                        type="button"
                        className={`menu-item ${screen === item ? 'is-active' : ''} ${requiresCampaignSelection(item) && !hasActiveCampaign ? 'is-gated' : ''} ${isDisabled ? 'is-disabled' : ''} ${MODULE_REQUIRED_BY_SCREEN[item] && hasActiveCampaign && !(campaign?.allowedModules || []).includes(MODULE_REQUIRED_BY_SCREEN[item]!) ? 'is-module-disabled' : ''}`}
                        onClick={() => {
                          if (!itemState.enabled) return
                          if (item === 'Lista Campagne' && hasActiveCampaign) {
                            goToScreen('Scheda Campagna')
                            return
                          }
                          if (requiresCampaignSelection(item) && !hasActiveCampaign) {
                            openCampaignPicker(item)
                            return
                          }
                          goToScreen(item)
                        }}
                        disabled={isDisabled}
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
                      {item === 'Approvazione Accessi' && itemState.enabled && pendingApplications.length > 0 && (
                        <span className="menu-item-badge" aria-hidden="true">
                          {pendingApplications.length}
                        </span>
                      )}
                    </span>
                    <span className="menu-item-text">{SCREEN_LABELS[item]}</span>
                      </button>
                    )
                  })()
                ))}
              </div>
            </section>
          ))}
        </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="refresh-btn theme-toggle-btn sidebar-theme-toggle"
              disabled={isSystemRole}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Icon name={isSystemRole ? 'fa-solid fa-shield-halved' : theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
              <span>{isSystemRole ? 'Tema Sistema' : theme === 'light' ? 'Tema scuro' : 'Tema chiaro'}</span>
            </button>
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
          <CampaignListPage
            campaigns={campaignsForList}
            founderNames={campaignFounderNames}
            missionAlertsByCampaign={missionAlertsByCampaign}
            pendingApplicationsByCampaignId={pendingApplicationsByCampaignId}
            onDiscover={() =>
              run('Campagne disponibili caricate', async () => {
                const list = await discoverCampaigns(false)
                setDiscoverableCampaigns(list)
              })
            }
            onOpenCampaign={(targetCampaignId) =>
              void activateCampaignAndNavigate(targetCampaignId, 'Scheda Campagna')
            }
            onApplyCampaign={(targetCampaignId) =>
              run('Richiesta accesso inviata', async () => {
                await applyToCampaign(targetCampaignId)
                const [discover, mine] = await Promise.all([discoverCampaigns(false), listMyCampaignMemberships()])
                setDiscoverableCampaigns(discover)
                setMyCampaigns(mine)
              })
            }
            onPreviewInviteAccess={(inviteValue) => previewInviteAccess(inviteValue)}
            onApplyInviteAccess={(inviteValue) => run('Richiesta accesso invito inviata', async () => {
              await applyInviteAccess(inviteValue)
            })}
            onCreateCampaign={() => setScreen('Crea Campagna')}
            activeCampaignName={campaign?.name || activeCampaignMembership?.campaignName || campaignId || ''}
          />
        )}

        {screen === 'Crea Campagna' && (
          <CreateCampaignPage
            availableModules={campaignModules}
            availableGameSystems={campaignGameSystems}
            onCreate={(payload) =>
              run('Campagna creata', async () => {
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
              })
            }
          />
        )}

        {screen === 'Scheda Campagna' && (
          <CampaignDetailPage
            campaign={campaign}
            isActiveCampaign={campaign?.id === campaignId}
            currentUserId={profile.id}
            members={campaignMembersForManagement.length > 0 ? campaignMembersForManagement : members}
            memberNames={memberNames}
            availableModules={campaignModules}
            availableGameSystems={campaignGameSystems}
            onReload={() => void refreshCampaignBlock()}
            onOpenMember={(member) =>
              run('Profilo membro caricato', async () => {
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
              })
            }
            onOpenManagement={() =>
              campaign?.id && void activateCampaignAndNavigate(campaign.id, 'Gestione Campagna')
            }
            onOpenCharacters={() =>
              campaign?.id && void activateCampaignAndNavigate(campaign.id, 'Gestione Personaggi')
            }
            canManageMembers={canManageCampaignMembers}
            onApply={() =>
              campaign?.id &&
              run('Apply campagna inviato', async () => {
                await applyToCampaign(campaign.id)
                const [discover, mine] = await Promise.all([discoverCampaigns(false), listMyCampaignMemberships()])
                setDiscoverableCampaigns(discover)
                setMyCampaigns(mine)
              })
            }
            onActivate={() =>
              campaign?.id && void activateCampaignAndNavigate(campaign.id, 'Scheda Campagna')
            }
            onLeaveCampaign={openLeaveCampaignModal}
            membershipStatus={campaign?.id ? campaignsForList.find((item) => item.id === campaign.id)?.membershipStatus || null : null}
            membershipRole={campaign?.id ? campaignsForList.find((item) => item.id === campaign.id)?.membershipRole || null : null}
          />
        )}

        {screen === 'Approvazione Accessi' && (
          <ApprovalPage
            pendingApplications={pendingApplications}
            onLoadPending={() =>
              run('Richieste pending caricate', async () => {
                await loadPendingForActiveCampaign()
              })
            }
            onApprove={(userId) =>
              run('Approvazione utente completata', async () => {
                await approvePendingForActiveCampaign(userId)
              })
            }
            onReject={(userId) =>
              run('Rifiuto utente completato', async () => {
                await rejectPendingForActiveCampaign(userId)
              })
            }
          />
        )}

        {screen === 'Missioni' && (
          <MissionsPage
            missions={missions}
            selectedMission={selectedMission}
            canCreateMissions={canCreateMissions}
            activeCampaignId={campaignId.trim()}
            activeCampaignRole={activeCampaignRole}
            activeCampaignCharacterId={selectedMissionCharacterId}
            campaignNameById={campaignNameById}
            campaignGameSystemById={campaignGameSystemById}
            campaignCanBeOpenedById={campaignCanBeOpenedById}
            missionParticipantsById={missionParticipantsById}
            missionParticipantLabelByUserId={{
              ...memberNames,
              ...(profile?.id ? { [profile.id]: profile.profileName || profile.username || profile.id } : {}),
            }}
            missionParticipantCharacterLabelById={missionParticipantCharacterLabelById}
            myMissionParticipationById={myMissionParticipationById}
            onCreate={(payload) =>
              run('Missione creata', async () => {
                const created = await createMission(campaignId, payload)
                setSelectedMissionId(created.id)
                await refreshMissions()
              })
            }
            onSelectMission={setSelectedMissionId}
            onJoinMission={(missionId, participationType) =>
              run('Partecipazione missione aggiornata', async () => {
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
                await refreshMissions()
              })
            }
            onLeaveMission={(missionId) =>
              run('Uscita missione completata', async () => {
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
              })
            }
            onOpenCampaign={(targetCampaignId) => void activateCampaignAndNavigate(targetCampaignId, 'Missioni')}
            onBrowseCampaigns={() => setScreen('Lista Campagne')}
            onCreateCharacter={() => setScreen('Crea Personaggio')}
            onUpdateMission={(missionId, payload) =>
              run('Missione aggiornata', async () => {
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
              })
            }
            onCompleteMission={(missionId) =>
              run('Missione completata', async () => {
                if (!campaignId.trim()) {
                  throw new Error('Campagna non attiva.')
                }
                await completeMission(campaignId, missionId)
                await refreshMissions()
              })
            }
            onCancelMission={(missionId) =>
              run('Missione cancellata', async () => {
                if (!campaignId.trim()) {
                  throw new Error('Campagna non attiva.')
                }
                await cancelMission(campaignId, missionId)
                await refreshMissions()
              })
            }
          />
        )}

        {screen === 'Stanze' && (
          <RoomsPage
            rooms={rooms}
            canCreateRoom={canCreateRoom}
            onCreate={(payload) =>
              run('Stanza creata', async () => {
                const created = await createRoom(campaignId, payload)
                setRooms((prev) => [created, ...prev])
              })
            }
          />
        )}

        {screen === 'Notifiche' && <NotificationsPage events={events} />}

        {screen === 'Profilo' && (
          <ProfilePage
            profile={profile}
            onGoEdit={() => setScreen('Modifica Profilo')}
          />
        )}

        {screen === 'Modifica Profilo' && (
          <EditProfilePage
            key={profile.id}
            profile={profile}
            onSave={(draft) =>
              run('Profilo aggiornato', async () => {
                const updated = await updateMe(draft)
                setProfile(updated)
                setScreen('Profilo')
              })
            }
            onChangePassword={(payload) =>
              run('Password aggiornata', async () => {
                const session = await changePassword(payload)
                setProfile(session.user)
              })
            }
          />
        )}

        {screen === 'Gestione Personaggi' && (
          <CharacterListPage
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            canOpenCharacterSheet={canOpenCharacterSheet}
            ownerProfileLabel={ownerProfileLabel}
            campaignNameForCharacter={campaignNameForCharacter}
            onSelectCharacter={(character) => {
              if (!canOpenCharacterSheet(character)) {
                setError('Permesso negato: puoi aprire solo PG/NPC tuoi o con ruolo adeguato.')
                addEvent('Accesso Scheda PG negato per permessi', 'error')
                return
              }
              setSelectedCharacterId(character.id)
              setCharacterDetail(null)
              setCharacterSheetDetail(null)
              setScreen('Scheda PG')
            }}
            onCreateScreen={() => setScreen('Crea Personaggio')}
            onReload={() =>
              run('Lista personaggi caricata', async () => {
                await loadCharactersForManagement()
              })
            }
          />
        )}

        {screen === 'Scheda PG' && (
          <CharacterDetailPage
            key={`${selectedCharacterId || 'no-character'}-${characterSheetDetail?.updatedAt || characterSheetDetail?.schemaVersion || 'no-sheet'}`}
            character={selectedCharacter}
            sheet={characterSheetDetail}
            onRefresh={() => void refreshCharacterBlock()}
            onSaveSheet={(dataJson) =>
              run('Scheda personaggio salvata', async () => {
                if (!selectedCharacterId) return
                const detailCampaignId = selectedCharacter?.campaignId || campaignId
                if (!detailCampaignId) return
                const updated = await updateCharacterSheet(detailCampaignId, selectedCharacterId, { dataJson })
                setCharacterSheetDetail(updated)
              })
            }
            externalDetail={characterDetail}
            ownerProfileLabel={ownerProfileLabel}
            campaignNameForCharacter={campaignNameForCharacter}
            canMarkCharacterDead={canMarkCharacterDead}
            canReactivateCharacter={canReactivateCharacter}
            onUpdateStatus={(status) =>
              run('Stato personaggio aggiornato', async () => {
                if (!selectedCharacter) return
                const targetCampaignId = selectedCharacter.campaignId || campaignId
                if (!targetCampaignId) return
                const updated = await updateCharacterStatus(targetCampaignId, selectedCharacter.id, status)
                setCharacters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                setCharacterDetail(updated)
                await refreshMissions()
              })
            }
          />
        )}

        {screen === 'Gestione Campagna' && (
          <CampaignManagementPage
            key={campaign?.id || 'empty-campaign-management'}
            campaign={campaign}
            availableModules={campaignModules}
            availableGameSystems={campaignGameSystems}
            permissions={permissions}
            onSave={(payload) =>
              campaign?.id &&
              run('Campagna aggiornata', async () => {
                const updated = await updateCampaign(campaign.id, payload)
                setCampaign(updated)
                setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
                rememberCampaignMeta(updated.id, updated.name)
                setMyCampaigns((prev) =>
                  prev.map((item) =>
                    item.campaignId === updated.id
                      ? { ...item, campaignName: updated.name }
                      : item,
                  ),
                )
                setDiscoverableCampaigns((prev) =>
                  prev.map((item) =>
                    item.id === updated.id
                      ? { ...item, name: updated.name, summary: updated.summary, description: updated.description }
                      : item,
                  ),
                )
                setScreen('Lista Campagne')
              })
            }
            onRefreshPermissions={() =>
              run('Checklist permessi aggiornata', async () => {
                const actions = ['CREATE_ROOM', 'APPROVE_OR_REJECT_APPLICATIONS', 'TRANSFER_OWNERSHIP', 'MANAGE_CAMPAIGN_SETTINGS']
                const settled = await Promise.all(actions.map(async (actionValue) => checkPermission(campaignId, actionValue)))
                setPermissions(settled)
              })
            }
            onTransfer={(newOwnerId) =>
              run('Ownership trasferita', async () => {
                const updated = await transferOwnership(campaignId, newOwnerId)
                setCampaign(updated)
                setCampaignDetailsById((prev) => ({ ...prev, [updated.id]: updated }))
              })
            }
            onCreateInviteToken={(payload) =>
              runResult('Token invito creato', async () => {
                if (!campaignId.trim()) {
                  throw new Error('Campagna non attiva.')
                }
                return createInviteToken(campaignId, payload)
              })
            }
            currentUserId={profile.id}
            onLeave={openLeaveCampaignModal}
          />
        )}

        {screen === 'Profilo Membro Campagna' && selectedCampaignMember && selectedCampaignMemberProfile && (
          <CampaignMemberProfilePage
            key={selectedCampaignMember.userId}
            membership={selectedCampaignMember}
            profile={selectedCampaignMemberProfile}
            onRefresh={() =>
              run('Profilo membro aggiornato', async () => {
                if (!campaignId.trim()) return
                const [membership, allMembers] = await Promise.all([
                  getCampaignMember(campaignId, selectedCampaignMember.userId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(membership)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onUpdateRole={(role) =>
              run('Ruolo membro aggiornato', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  updateCampaignMemberRole(campaignId, selectedCampaignMember.userId, role),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onBan={(reason) =>
              run('Membro bannato', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  banCampaignMember(campaignId, selectedCampaignMember.userId, reason),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onUnban={() =>
              run('Membro sbloccato', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  unbanCampaignMember(campaignId, selectedCampaignMember.userId),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onSuspend={(reason) =>
              run('Membro sospeso', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  suspendCampaignMember(campaignId, selectedCampaignMember.userId, reason),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onUnsuspend={() =>
              run('Membro riattivato', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  unsuspendCampaignMember(campaignId, selectedCampaignMember.userId),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
            onApprove={() =>
              run('Membro approvato', async () => {
                if (!campaignId.trim()) return
                const [updated, approvedMembers, allMembers] = await Promise.all([
                  approveCampaignMember(campaignId, selectedCampaignMember.userId),
                  getCampaignMembers(campaignId),
                  listCampaignMembersForManagement(campaignId).catch(() => campaignMembersForManagement),
                ])
                setSelectedCampaignMember(updated)
                setMembers(approvedMembers)
                setCampaignMembersForManagement(allMembers)
              })
            }
          />
        )}

        {screen === 'Seleziona PG' && (
          <SelectCharacterPage
            key={`${activeCampaignCharacterId || 'no-preferred'}-${characters.map((character) => character.id).join('|')}`}
            characters={characters}
            preferredCharacterId={activeCampaignCharacterId}
            onApply={(characterId) =>
              run('Apply con personaggio inviato', async () => {
                await applyToCampaign(campaignId, characterId)
              })
            }
          />
        )}

        {screen === 'Crea Personaggio' && (
          <CreateCharacterPage
            key={`${canCreatePlayerCharacter}-${canCreateNpc}`}
            hasActiveCampaign={hasActiveCampaign}
            canCreatePlayerCharacter={canCreatePlayerCharacter}
            canCreateNpc={canCreateNpc}
            onCreate={(payload) =>
              run('Personaggio creato', async () => {
                const created = await createCharacter(campaignId, payload)
                setCharacters((prev) => [created, ...prev])
                setSelectedCharacterId(created.id)
                setScreen('Gestione Personaggi')
              })
            }
          />
        )}
        {isCampaignPickerOpen && (
          <CampaignPickerModal
            campaigns={selectableCampaigns}
            targetScreen={campaignPickerTarget}
            busy={busy}
            onClose={
              !hasActiveCampaign && (campaignPickerTarget === 'Scheda Campagna' || campaignPickerTarget === 'Gestione Campagna')
                ? closeCampaignPickerAndGoHome
                : closeCampaignPicker
            }
            onSelect={(campaignItem) => void activateCampaignFromPicker(campaignItem)}
          />
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

function CampaignListPage({
  campaigns,
  founderNames,
  missionAlertsByCampaign,
  pendingApplicationsByCampaignId,
  onDiscover,
  onOpenCampaign,
  onApplyCampaign,
  onApplyInviteAccess,
  onPreviewInviteAccess,
  onCreateCampaign,
  activeCampaignName,
}: {
  campaigns: CampaignDiscoverResponse[]
  founderNames: Record<string, string>
  missionAlertsByCampaign: Record<string, number>
  pendingApplicationsByCampaignId: Record<string, CampaignApplicationResponse[]>
  onDiscover: () => void
  onOpenCampaign: (campaignId: string) => void
  onApplyCampaign: (campaignId: string) => void
  onApplyInviteAccess: (inviteValue: string) => Promise<void>
  onPreviewInviteAccess: (inviteValue: string) => Promise<InviteAccessPreview>
  onCreateCampaign: () => void
  activeCampaignName: string
}) {
  const [membershipFilter, setMembershipFilter] = useState<'all' | 'inside' | 'outside' | 'pending' | 'blocked'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | CampaignRole>('all')
  const [inviteValue, setInviteValue] = useState('')
  const [invitePreview, setInvitePreview] = useState<InviteAccessPreview | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((item) => {
      const isInside = item.membershipStatus === 'APPROVED'
      const isPending = item.membershipStatus === 'PENDING'
      const isBlocked = item.membershipStatus === 'BLOCKED' || item.membershipStatus === 'BANNED'
      const isOutside = item.membershipStatus === null || item.membershipStatus === 'REJECTED'

      if (membershipFilter === 'inside' && !isInside) return false
      if (membershipFilter === 'outside' && !isOutside) return false
      if (membershipFilter === 'pending' && !isPending) return false
      if (membershipFilter === 'blocked' && !isBlocked) return false

      if (roleFilter !== 'all' && item.membershipRole !== roleFilter) return false
      return true
    })
  }, [campaigns, membershipFilter, roleFilter])

  const previewCampaignByCode = async () => {
    const trimmed = inviteValue.trim()
    if (!trimmed) {
      setInvitePreview(null)
      setInviteFeedback('Inserisci un codice o token invito.')
      return
    }

    setInviteBusy(true)
    setInviteFeedback('')
    try {
      const preview = await onPreviewInviteAccess(trimmed)
      setInvitePreview(preview)
      setInviteFeedback(preview.modeLabel)
    } catch (err) {
      setInvitePreview(null)
      setInviteFeedback(toMessage(err))
    } finally {
      setInviteBusy(false)
    }
  }

  const applyCampaignByCode = async () => {
    const trimmed = inviteValue.trim()
    if (!trimmed) {
      setInviteFeedback('Inserisci un codice o token invito.')
      return
    }

    setInviteBusy(true)
    setInviteFeedback('')
    try {
      await onApplyInviteAccess(trimmed)
      setInviteFeedback('Richiesta inviata.')
    } catch (err) {
      setInviteFeedback(toMessage(err))
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Lista Campagne</h2>
        <div className="inline-actions campaign-list-actions">
          <button type="button" className="secondary-btn" onClick={onDiscover}>
            Cerca campagne
          </button>
          <button type="button" className="primary-btn" onClick={onCreateCampaign}>
            Crea campagna
          </button>
        </div>
      </div>
      <div className="campaign-invite-panel">
        <div className="campaign-invite-panel-head">
          <div>
            <p className="section-title">Accedi con invito</p>
            <p className="muted">
              Usa un codice legacy o un token opaco. Il backend decide se l'accesso è manuale o automatico.
            </p>
          </div>
          <span className="readonly-chip">Accesso diretto</span>
        </div>
        <div className="campaign-invite-form">
          <label className="campaign-invite-input">
            <FieldLabel icon="fa-solid fa-key" label="Codice o token" />
            <input
              className="invite-code-input"
              value={inviteValue}
              placeholder="Incolla un UUID o un token invito"
              onChange={(event) => {
                setInviteValue(event.target.value)
                if (inviteFeedback) setInviteFeedback('')
                if (invitePreview) setInvitePreview(null)
              }}
            />
          </label>
          <div className="campaign-invite-actions">
            <button type="button" className="secondary-btn" onClick={previewCampaignByCode} disabled={inviteBusy}>
              <Icon name="fa-solid fa-magnifying-glass" />
              Verifica
            </button>
            <button type="button" className="primary-btn" onClick={applyCampaignByCode} disabled={inviteBusy}>
              <Icon name="fa-solid fa-paper-plane" />
              Richiedi accesso
            </button>
          </div>
        </div>
        {inviteFeedback && <p className="muted campaign-invite-feedback">{inviteFeedback}</p>}
        {invitePreview && (
          <div className="campaign-invite-preview">
            <div className="row-between campaign-invite-preview-head">
              <div className="data-table-primary">
                <p className="data-table-title">{invitePreview.campaignName}</p>
                <p className="data-table-secondary">{invitePreview.campaignSummary || 'Nessuna descrizione'}</p>
              </div>
              <div className="campaign-invite-preview-badges">
                <span className={`status ${invitePreview.modeTone === 'success' ? 'status-success' : 'status-warning'}`}>
                  {invitePreview.modeLabel}
                </span>
                <span className={`status ${invitePreview.isOpen ? 'status-success' : 'status-neutral'}`}>
                  {invitePreview.isOpen ? 'Aperta' : 'Chiusa'}
                </span>
              </div>
            </div>
            <p className="data-table-meta">
              {invitePreview.gameSystem}
              {invitePreview.capabilities.length > 0 ? ` • ${invitePreview.capabilities.join(', ')}` : ' • Richiesta manuale'}
            </p>
          </div>
        )}
      </div>
      <div className="campaign-list-filters">
        <label className="campaign-list-filter">
          <FieldLabel icon="fa-solid fa-filter" label="Stato membership" />
          <select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value as typeof membershipFilter)}>
            <option value="all">Tutte</option>
            <option value="inside">Dentro</option>
            <option value="outside">Fuori</option>
            <option value="pending">In attesa</option>
            <option value="blocked">Bloccate</option>
          </select>
        </label>
        <label className="campaign-list-filter">
          <FieldLabel icon="fa-solid fa-user-shield" label="Ruolo" />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
            <option value="all">Tutti i ruoli</option>
            <option value="GIOCATORE">Giocatore</option>
            <option value="CO_MASTER">Co-master</option>
            <option value="MASTER">Master</option>
            <option value="SUPER_MASTER">Super master</option>
          </select>
        </label>
      </div>
      {activeCampaignName && <p className="muted">Campagna attiva: <strong>{activeCampaignName}</strong></p>}
      {campaigns.length === 0 && <p className="muted">Nessuna campagna visibile. Premi "Cerca campagne".</p>}
      {campaigns.length > 0 && (
        <DataTable
          columns={[
            { key: 'campaign', label: 'Campagna' },
            { key: 'state', label: 'Stato' },
            { key: 'access', label: 'Accesso' },
            { key: 'alerts', label: 'Avvisi' },
            { key: 'actions', label: 'Azioni' },
          ]}
          rows={filteredCampaigns}
          getRowKey={(item) => item.id}
          emptyMessage="Nessuna campagna corrisponde ai filtri selezionati."
          renderRow={(item) => {
            const moderationTooltip =
              (item.membershipStatus === 'BLOCKED' || item.membershipStatus === 'BANNED') && item.moderationReason
                ? item.moderationReason
                : null
            const isDisabled = !item.isActive
            const pendingCount = pendingApplicationsByCampaignId[item.id]?.length || 0
            return (
              <tr className={isDisabled ? 'is-disabled' : ''}>
                <td>
                  <div className="data-table-primary">
                    <p className="data-table-title">{item.name}</p>
                    <div className="campaign-title-badges">
                      <CampaignOpenBadge isOpen={item.isOpen} />
                    </div>
                    <p className="data-table-secondary">{item.summary || item.description || 'Nessuna descrizione'}</p>
                    {item.founderId && (
                      <p className="data-table-meta">Creatore: {founderNames[item.founderId] || item.founderId}</p>
                    )}
                  </div>
                </td>
                <td>
                  <CampaignStatusBadge isActive={item.isActive} />
                </td>
                <td>
                  <CampaignAccessBadge item={item} />
                </td>
                <td>
                  <div className="campaign-alerts-cell">
                    {missionAlertsByCampaign[item.id] > 0 && (
                      <span className="campaign-mission-alert" title={`${missionAlertsByCampaign[item.id]} missioni aperte o riaperte`}>
                        <Icon name="fa-solid fa-triangle-exclamation" />
                        <span>{missionAlertsByCampaign[item.id]}</span>
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span
                        className="campaign-access-alert"
                        title={`${pendingCount} richieste di accesso in attesa`}
                      >
                        <Icon name="fa-solid fa-triangle-exclamation" />
                        <span>{pendingCount}</span>
                      </span>
                    )}
                    {missionAlertsByCampaign[item.id] === 0 &&
                      pendingCount === 0 && (
                        <span className="data-table-muted">-</span>
                      )}
                  </div>
                </td>
                <td>
                  <div className="data-table-actions">
                    {item.membershipStatus === 'APPROVED' && (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => onOpenCampaign(item.id)}
                        disabled={isDisabled}
                        title={isDisabled ? 'Campagna disattivata: apri e attiva non disponibile' : undefined}
                      >
                        Apri e attiva
                      </button>
                    )}
                    {(item.membershipStatus === null || item.membershipStatus === 'REJECTED') && item.isOpen && !isDisabled && (
                      <button type="button" className="primary-btn" onClick={() => onApplyCampaign(item.id)}>
                        Richiedi accesso
                      </button>
                    )}
                    {(item.membershipStatus === null || item.membershipStatus === 'REJECTED') && (!item.isOpen || isDisabled) && (
                      <button type="button" className="secondary-btn" disabled>
                        {isDisabled ? 'Disattivata' : 'Campagna chiusa'}
                      </button>
                    )}
                    {item.membershipStatus === 'PENDING' && (
                      <button type="button" className="secondary-btn" disabled>
                        Richiesta inviata
                      </button>
                    )}
                  </div>
                  {moderationTooltip && <div className="campaign-item-tooltip">{moderationTooltip}</div>}
                </td>
              </tr>
            )
          }}
        />
      )}
    </section>
  )
}

function InfoBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="info-block">
      <p className="field-label">{title}</p>
      <p>{value}</p>
    </div>
  )
}

type FilterChipOption<T extends string> = {
  value: T
  label: string
  title?: string
  className?: string
}

function FilterChipGroup<T extends string>({
  label,
  options,
  selectedValues,
  onToggle,
}: {
  label: string
  options: Array<FilterChipOption<T>>
  selectedValues: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="filter-chip-group">
      <p className="muted">{label}</p>
      <div className="filter-chip-row">
        {options.map((option) => {
          const active = selectedValues.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className={`filter-chip ${option.className || ''} ${active ? 'is-active' : ''}`.trim()}
              onClick={() => onToggle(option.value)}
              title={option.title || option.label}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function campaignModuleIconName(module: CampaignCatalogEntry): string {
  const token = `${module.code} ${module.label}`.toLowerCase()
  if (token.includes('notif')) return 'fa-solid fa-bell'
  if (token.includes('chat') || token.includes('messag') || token.includes('comment')) return 'fa-solid fa-comment-dots'
  if (token.includes('stanza') || token.includes('room') || token.includes('door')) return 'fa-solid fa-door-open'
  if (token.includes('mission') || token.includes('quest') || token.includes('board') || token.includes('bacheca'))
    return 'fa-solid fa-clipboard-list'
  return 'fa-solid fa-circle-info'
}

function campaignModuleTitle(module: CampaignCatalogEntry): string {
  return module.label || module.code
}

type CampaignToggleRow = {
  key: string
  title: string
  description: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
}

function CampaignToggleSettingsTable({
  title,
  description,
  rows,
  availableModules,
  selectedModules,
  onToggle,
}: {
  title: string
  description: string
  rows?: CampaignToggleRow[]
  availableModules?: CampaignCatalogEntry[]
  selectedModules?: string[]
  onToggle?: (moduleCode: string) => void
}) {
  const renderRowForSetting = (setting: CampaignToggleRow) => (
    <tr key={setting.key}>
      <td>
        <div className="data-table-primary">
          <p className="data-table-title">{setting.title}</p>
        </div>
      </td>
      <td className="data-table-secondary">{setting.description}</td>
      <td>
        <span className={`status ${setting.active ? 'status-success' : 'status-neutral'}`}>
          {setting.active ? setting.activeLabel : setting.inactiveLabel}
        </span>
      </td>
      <td>
        <label className="switch" aria-label={`${setting.title} ${setting.active ? 'attivo' : 'disattivo'}`}>
          <input type="checkbox" checked={setting.active} onChange={setting.onToggle} />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
        </label>
      </td>
    </tr>
  )

  const renderRowForModule = (module: CampaignCatalogEntry) => {
    const enabled = selectedModules?.includes(module.code) || false
    return (
      <tr key={module.code}>
        <td>
          <div className="data-table-primary">
            <p className="data-table-title">{module.label || module.code}</p>
            <p className="data-table-meta">{module.code}</p>
          </div>
        </td>
        <td className="data-table-secondary">{module.description || 'Addon disponibile per la campagna.'}</td>
        <td>
          <span className={`status ${enabled ? 'status-success' : 'status-neutral'}`}>
            {enabled ? 'Attivo' : 'Disattivo'}
          </span>
        </td>
        <td>
          <label className="switch" aria-label={`${module.label || module.code} ${enabled ? 'attivo' : 'disattivo'}`}>
            <input type="checkbox" checked={enabled} onChange={() => onToggle?.(module.code)} />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </label>
        </td>
      </tr>
    )
  }

  return (
    <div className="campaign-toggle-table-block">
      <div className="row-between">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="muted">{description}</p>
        </div>
        {availableModules && availableModules.length > 0 ? (
          <span className="readonly-chip">{selectedModules?.length || 0}/{availableModules.length} attivi</span>
        ) : (
          <span className="readonly-chip">{rows?.filter((row) => row.active).length || 0}/{rows?.length || 0} attivi</span>
        )}
      </div>
      {rows && rows.length > 0 ? (
        <DataTable
          columns={[
            { key: 'setting', label: 'Impostazione' },
            { key: 'description', label: 'Descrizione' },
            { key: 'state', label: 'Stato' },
            { key: 'toggle', label: 'Attivo' },
          ]}
          rows={rows}
          getRowKey={(row) => row.key}
          emptyMessage="Nessuna impostazione disponibile."
          renderRow={renderRowForSetting}
        />
      ) : availableModules && availableModules.length > 0 ? (
        <DataTable
          columns={[
            { key: 'module', label: 'Modulo' },
            { key: 'description', label: 'Descrizione' },
            { key: 'state', label: 'Stato' },
            { key: 'toggle', label: 'Attivo' },
          ]}
          rows={availableModules}
          getRowKey={(module) => module.code}
          emptyMessage="Lista addon non ancora disponibile."
          renderRow={renderRowForModule}
        />
      ) : (
        <p className="muted">Lista addon non ancora disponibile.</p>
      )}
    </div>
  )
}

function CampaignDetailPage({
  campaign,
  currentUserId,
  isActiveCampaign,
  members,
  memberNames,
  availableModules,
  availableGameSystems,
  onReload,
  onOpenMember,
  onOpenManagement,
  onOpenCharacters,
  canManageMembers,
  onApply,
  onActivate,
  onLeaveCampaign,
  membershipStatus,
  membershipRole,
}: {
  campaign: CampaignResponse | null
  currentUserId: string
  isActiveCampaign: boolean
  members: CampaignMembershipResponse[]
  memberNames: Record<string, string>
  availableModules: CampaignCatalogEntry[]
  availableGameSystems: CampaignCatalogEntry[]
  onReload: () => void
  onOpenMember: (member: CampaignMembershipResponse) => void
  onOpenManagement: () => void
  onOpenCharacters: () => void
  canManageMembers: boolean
  onApply: () => void
  onActivate: () => void
  onLeaveCampaign: () => void
  membershipStatus: CampaignMemberStatus | null
  membershipRole: CampaignRole | null
}) {
  const [memberQuery, setMemberQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState<CampaignMemberStatus[]>([
    'APPROVED',
    'PENDING',
    'BLOCKED',
    'BANNED',
    'REJECTED',
  ])
  const [roleFilters, setRoleFilters] = useState<CampaignRole[]>([
    'GIOCATORE',
    'CO_MASTER',
    'MASTER',
    'SUPER_MASTER',
  ])

  const normalizedQuery = memberQuery.trim().toLowerCase()
  const filteredMembers = members.filter((member) => {
    const displayName = memberNames[member.userId] || member.userId
    return (
      (normalizedQuery.length === 0 || displayName.toLowerCase().includes(normalizedQuery)) &&
      statusFilters.includes(member.memberStatus) &&
      roleFilters.includes(member.role)
    )
  })

  const memberActivityBadge = (member: CampaignMembershipResponse) => {
    if (member.memberStatus === 'BLOCKED') return { label: 'BLOCKED', className: 'is-blocked' }
    if (member.memberStatus === 'BANNED') return { label: 'BANNED', className: 'is-banned' }
    if (member.memberStatus === 'PENDING') return { label: 'PENDING', className: 'is-pending' }
    if (member.memberStatus !== 'APPROVED') return { label: member.memberStatus, className: 'is-neutral' }
    if (member.characterStatus === 'DEAD' || member.characterStatus === 'RETIRED') {
      return { label: 'INACTIVE', className: 'is-neutral' }
    }
    return { label: 'ACTIVE', className: 'is-active' }
  }

  const toggleStatusFilter = (status: CampaignMemberStatus) => {
    setStatusFilters((prev) => (prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]))
  }

  const toggleRoleFilter = (role: CampaignRole) => {
    setRoleFilters((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]))
  }

  const statusFilterLabel = statusFilters.length > 0 ? statusFilters.join(', ') : 'Nessuno stato selezionato'
  const roleFilterLabel = roleFilters.length > 0 ? roleFilters.join(', ') : 'Nessun grado selezionato'
  const campaignVisibilityMeta = [
    {
      key: 'open',
      active: campaign?.isOpen ?? false,
      label: campaign?.isOpen ? 'Campagna aperta' : 'Campagna privata',
      icon: campaign?.isOpen ? 'fa-solid fa-door-open' : 'fa-solid fa-lock',
    },
    {
      key: 'searchable',
      active: campaign?.isSearchable ?? false,
      label: campaign?.isSearchable ? 'Visibile nella ricerca' : 'Nascosta nella ricerca',
      icon: campaign?.isSearchable ? 'fa-solid fa-magnifying-glass' : 'fa-solid fa-eye-slash',
    },
  ]
  const campaignDetailButtonClass =
    membershipStatus === 'APPROVED' && (membershipRole === 'MASTER' || membershipRole === 'SUPER_MASTER')
      ? 'primary-btn'
      : 'secondary-btn'

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Scheda Campagna</h2>
        <button type="button" className="secondary-btn" onClick={onReload}>
          Reload
        </button>
      </div>
      {!campaign && <p className="muted">Carica prima una campagna.</p>}
      {campaign && (
        <>
          {campaign.coverImageUrl && (
            <img className="campaign-cover" src={campaign.coverImageUrl} alt="" />
          )}
          <div className="campaign-hero-head">
            <div className="campaign-hero-title-block">
              <p className="campaign-hero-kicker">Scheda Campagna</p>
              <div className="campaign-hero-title-row">
                <h2 className="campaign-hero-title">{campaign.name}</h2>
                <span className="campaign-system-inline" title={catalogEntryDescription(availableGameSystems, campaign.gameSystem) || undefined}>
                  <Icon name="fa-solid fa-gamepad" />
                  <span>{catalogEntryLabel(availableGameSystems, campaign.gameSystem) || 'Sistema non disponibile'}</span>
                </span>
              </div>
            </div>
            <div className="campaign-hero-status">
              <p className="campaign-status-line">
                Stato campagna: <CampaignStatusBadge isActive={campaign.isActive} />
              </p>
            </div>
          </div>
          <div className="campaign-visibility-meta" aria-label="Stato visibilità campagna">
            {campaignVisibilityMeta.map((item) => (
              <span
                key={item.key}
                className={`campaign-meta-pill ${item.active ? 'is-active' : 'is-inactive'}`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
          {campaign.summary && <p className="campaign-summary">{campaign.summary}</p>}
          <p className="campaign-description-muted">{campaign.description || 'Nessuna descrizione'}</p>
          <div className="campaign-profile-grid">
            <InfoBlock title="Ambientazione" value={campaign.setting} />
            <InfoBlock title="Tono" value={campaignToneLabel(campaign.tone)} />
            <InfoBlock title="Regole" value={campaign.rules} />
            <InfoBlock title="Requisiti d'ingresso" value={campaign.requirements} />
          </div>
          <div className="campaign-addon-section">
            <div className="row-between">
              <h3 className="section-title">Addon campagna</h3>
              <span className="readonly-chip">{campaign.allowedModules.length} attivi</span>
            </div>
            {availableModules.length > 0 ? (
              <div className="campaign-addon-icons" role="list" aria-label="Addon campagna">
                {availableModules.map((module) => {
                  const active = campaign.allowedModules.includes(module.code)
                  const label = campaignModuleTitle(module)
                  const description = module.description || 'Addon campagna'
                  return (
                    <span
                      key={module.code}
                      role="listitem"
                      className={`campaign-addon-icon ${active ? '' : 'is-inactive'}`}
                      title={`${label} - ${description}`}
                      aria-label={`${label} ${active ? 'attivo' : 'inattivo'}: ${description}`}
                    >
                      <Icon name={campaignModuleIconName(module)} />
                      <span className="campaign-addon-icon-label">{label}</span>
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="muted">Lista addon non ancora disponibile.</p>
            )}
          </div>
          <div className="inline-actions campaign-detail-actions">
            {!isActiveCampaign && membershipStatus === 'APPROVED' && (
              <button type="button" className="primary-btn" onClick={onActivate}>
                Attiva campagna
              </button>
            )}
            {(membershipStatus === null || membershipStatus === 'REJECTED') && campaign.isOpen && (
              <button type="button" className="primary-btn" onClick={onApply}>
                Richiedi accesso
              </button>
            )}
            {membershipStatus === 'PENDING' && (
              <button type="button" className="secondary-btn" disabled>
                Richiesta inviata
              </button>
            )}
            {(membershipRole === 'MASTER' || membershipRole === 'SUPER_MASTER') && (
              <button type="button" className={campaignDetailButtonClass} onClick={onOpenManagement}>
                Gestione Campagna
              </button>
            )}
            {membershipStatus === 'APPROVED' && (
              <button type="button" className="secondary-btn" onClick={onOpenCharacters}>
                Gestione Personaggi
              </button>
            )}
            {membershipStatus === 'APPROVED' && campaign?.founderId !== currentUserId && (
              <button type="button" className="danger-btn campaign-leave-btn" onClick={onLeaveCampaign}>
                Esci dalla campagna
              </button>
            )}
          </div>
          {canManageMembers && (
            <>
              <div className="divider" />
              <h3 className="section-title">Membri Campagna</h3>
              <div className="member-filters-panel">
                <div className="member-filters-head">
                  <div>
                    <p className="section-title">Filtro membri</p>
                    <p className="muted">Un solo pannello per ricerca, stato e grado. Passa sopra le opzioni per i suggerimenti.</p>
                  </div>
                  <div className="member-filters-summary">
                    <span className="status status-info" title={statusFilterLabel}>
                      Stato: {statusFilters.length}
                    </span>
                    <span className="status status-info" title={roleFilterLabel}>
                      Gradi: {roleFilters.length}
                    </span>
                  </div>
                </div>
                <label>
                  Cerca membro per nome
                  <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="es. Sandro" />
                </label>
                <div className="member-filter-row">
                  <div className="member-filter-group">
                    <p className="muted">Stato membro</p>
                    <div className="member-filter-chips">
                      {(['APPROVED', 'PENDING', 'BLOCKED', 'BANNED', 'REJECTED'] as CampaignMemberStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`filter-chip filter-chip--status-${status.toLowerCase()} ${
                            statusFilters.includes(status) ? 'is-active' : ''
                          }`}
                          onClick={() => toggleStatusFilter(status)}
                          title={`Mostra i membri con stato ${status}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="member-filter-group">
                    <p className="muted">Grado</p>
                    <div className="member-filter-chips">
                      {(['GIOCATORE', 'CO_MASTER', 'MASTER', 'SUPER_MASTER'] as CampaignRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          className={`filter-chip filter-chip--role-${role.toLowerCase()} ${roleFilters.includes(role) ? 'is-active' : ''}`}
                          onClick={() => toggleRoleFilter(role)}
                          title={`Mostra i membri con grado ${role}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {members.length === 0 && <p className="muted">Nessun membro</p>}
              {members.length > 0 && filteredMembers.length > 0 && (
                <div className="member-table-shell">
                  <div className="member-table-wrap">
                    <table className="member-table">
                      <thead>
                        <tr>
                          <th scope="col">Membro</th>
                          <th scope="col">Ruolo</th>
                          <th scope="col">Stato</th>
                          <th scope="col">PG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => {
                          const activity = memberActivityBadge(member)
                          return (
                            <tr key={`${member.userId}-${member.role}-${member.memberStatus}`}>
                              <td>
                                <button type="button" className="member-table-link" onClick={() => onOpenMember(member)}>
                                  {memberNames[member.userId] || member.userId}
                                </button>
                              </td>
                              <td>{member.role}</td>
                              <td>
                                <span className={`member-state-badge ${activity.className}`}>{activity.label}</span>
                              </td>
                              <td className="member-table-muted">{member.characterStatus || 'N/A'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {members.length > 0 && filteredMembers.length === 0 && (
                <p className="muted">Nessun membro trovato con questo filtro.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

function SystemCatalogsPage({
  busy,
  gameSystems,
  sheetTypes,
  onRefresh,
  onCreateGameSystem,
  onSaveGameSystem,
  onCreateSheetType,
  onSaveSheetType,
}: {
  busy: boolean
  gameSystems: CampaignCatalogEntry[]
  sheetTypes: SheetTypeCatalogEntry[]
  onRefresh: () => void
  onCreateGameSystem: (payload: AdminGameSystemUpsertRequest) => Promise<void>
  onSaveGameSystem: (code: string, payload: AdminGameSystemUpsertRequest) => Promise<void>
  onCreateSheetType: (payload: AdminSheetTypeUpsertRequest) => Promise<void>
  onSaveSheetType: (code: string, payload: AdminSheetTypeUpsertRequest) => Promise<void>
}) {
  type GameSystemDraft = {
    code: string
    label: string
    description: string
    active: boolean
    sortOrder: number
  }
  type SheetTypeDraft = {
    code: string
    label: string
    description: string
    gameSystemCode: string
    entityType: SheetEntityType
    schemaVersion: string
    sortOrder: string
    active: boolean
    isDefault: boolean
    schemaJsonText: string
  }

  const entityTypeOptions: Array<{ value: SheetEntityType; label: string }> = [
    { value: 'CHARACTER', label: 'Character' },
    { value: 'ARMY', label: 'Army' },
    { value: 'DECK', label: 'Deck' },
  ]

  const createDefaultGameSystemDraft = (): GameSystemDraft => ({
    code: '',
    label: '',
    description: '',
    active: true,
    sortOrder: 0,
  })

  const createDefaultSheetTypeDraft = (defaultGameSystemCode: string): SheetTypeDraft => ({
    code: '',
    label: '',
    description: '',
    gameSystemCode: defaultGameSystemCode,
    entityType: 'CHARACTER',
    schemaVersion: '1',
    sortOrder: '0',
    active: true,
    isDefault: false,
    schemaJsonText: JSON.stringify(
      {
        version: 1,
        blocks: [
          { code: 'identity', label: 'Identita', order: 1 },
          { code: 'core', label: 'Core', order: 2 },
          { code: 'notes', label: 'Notes', order: 3 },
        ],
      },
      null,
      2,
    ),
  })

  const parseSchemaJson = (text: string): Record<string, unknown> => {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('schemaJson deve essere un oggetto JSON')
    }
    return parsed as Record<string, unknown>
  }

  const toNumberOrThrow = (value: string, fieldLabel: string) => {
    const parsed = Number.parseInt(value.trim(), 10)
    if (!Number.isFinite(parsed)) {
      throw new Error(`${fieldLabel} non valido`)
    }
    return parsed
  }

  const [newGameSystem, setNewGameSystem] = useState<GameSystemDraft>(createDefaultGameSystemDraft)
  const [newGameSystemError, setNewGameSystemError] = useState('')
  const [gameSystemDrafts, setGameSystemDrafts] = useState<Record<string, GameSystemDraft>>({})
  const [gameSystemErrors, setGameSystemErrors] = useState<Record<string, string>>({})
  const [newSheetType, setNewSheetType] = useState<SheetTypeDraft>(createDefaultSheetTypeDraft(gameSystems[0]?.code || ''))
  const [newSheetTypeError, setNewSheetTypeError] = useState('')
  const [sheetTypeDrafts, setSheetTypeDrafts] = useState<Record<string, SheetTypeDraft>>({})
  const [sheetTypeErrors, setSheetTypeErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setGameSystemDrafts(
      Object.fromEntries(
        gameSystems.map((item) => [
          item.code,
          {
            code: item.code,
            label: item.label,
            description: item.description || '',
            active: item.active,
            sortOrder: item.sortOrder,
          },
        ]),
      ),
    )
    setGameSystemErrors({})
  }, [gameSystems])

  useEffect(() => {
    const defaultGameSystemCode = gameSystems[0]?.code || ''
    setNewSheetType((prev) =>
      prev.gameSystemCode && gameSystems.some((item) => item.code === prev.gameSystemCode)
        ? prev
        : createDefaultSheetTypeDraft(defaultGameSystemCode),
    )
  }, [gameSystems])

  useEffect(() => {
    setSheetTypeDrafts(
      Object.fromEntries(
        sheetTypes.map((item) => [
          item.code,
          {
            code: item.code,
            label: item.label,
            description: item.description || '',
            gameSystemCode: item.gameSystemCode,
            entityType: item.entityType,
            schemaVersion: String(item.schemaVersion),
            sortOrder: String(item.sortOrder),
            active: item.active,
            isDefault: item.isDefault,
            schemaJsonText: JSON.stringify(item.schemaJson || {}, null, 2),
          },
        ]),
      ),
    )
    setSheetTypeErrors({})
  }, [sheetTypes])

  const sortedGameSystems = [...gameSystems].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const sortedSheetTypes = [...sheetTypes].sort((left, right) => {
    if (left.gameSystemCode !== right.gameSystemCode) return left.gameSystemCode.localeCompare(right.gameSystemCode, 'it')
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const submitNewGameSystem = async () => {
    const code = newGameSystem.code.trim()
    const label = newGameSystem.label.trim()
    if (!code || !label) {
      setNewGameSystemError('Codice e label sono obbligatori')
      return
    }

    setNewGameSystemError('')
    await onCreateGameSystem({
      code,
      label,
      description: newGameSystem.description.trim(),
      active: newGameSystem.active,
      sortOrder: Number.isFinite(newGameSystem.sortOrder) ? newGameSystem.sortOrder : 0,
    })
    setNewGameSystem(createDefaultGameSystemDraft())
  }

  const saveGameSystem = async (code: string) => {
    const draft = gameSystemDrafts[code]
    if (!draft) return
    const normalizedCode = code.trim()
    const label = draft.label.trim()
    if (!normalizedCode || !label) {
      setGameSystemErrors((prev) => ({
        ...prev,
        [code]: 'Codice e label sono obbligatori',
      }))
      return
    }

    await onSaveGameSystem(code, {
      code: normalizedCode,
      label,
      description: draft.description.trim(),
      active: draft.active,
      sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    })
  }

  const submitNewSheetType = async () => {
    const code = newSheetType.code.trim()
    const label = newSheetType.label.trim()
    const gameSystemCode = newSheetType.gameSystemCode.trim()
    if (!code || !label || !gameSystemCode) {
      setNewSheetTypeError('Codice, label e sistema di gioco sono obbligatori')
      return
    }

    let schemaJson: Record<string, unknown>
    try {
      schemaJson = parseSchemaJson(newSheetType.schemaJsonText)
    } catch (err) {
      setNewSheetTypeError(err instanceof Error ? err.message : 'schemaJson non valido')
      return
    }

    setNewSheetTypeError('')
    await onCreateSheetType({
      code,
      label,
      description: newSheetType.description.trim(),
      gameSystemCode,
      entityType: newSheetType.entityType,
      schemaVersion: toNumberOrThrow(newSheetType.schemaVersion, 'Schema version'),
      sortOrder: toNumberOrThrow(newSheetType.sortOrder, 'Sort order'),
      active: newSheetType.active,
      isDefault: newSheetType.isDefault,
      schemaJson,
    })
    setNewSheetType(createDefaultSheetTypeDraft(gameSystems[0]?.code || ''))
  }

  const saveSheetType = async (code: string) => {
    const draft = sheetTypeDrafts[code]
    if (!draft) return
    const normalizedCode = code.trim()
    const label = draft.label.trim()
    const gameSystemCode = draft.gameSystemCode.trim()
    if (!normalizedCode || !label || !gameSystemCode) {
      setSheetTypeErrors((prev) => ({ ...prev, [code]: 'Codice, label e sistema di gioco sono obbligatori' }))
      return
    }

    let schemaJson: Record<string, unknown>
    try {
      schemaJson = parseSchemaJson(draft.schemaJsonText)
    } catch (err) {
      setSheetTypeErrors((prev) => ({ ...prev, [code]: err instanceof Error ? err.message : 'schemaJson non valido' }))
      return
    }

    setSheetTypeErrors((prev) => ({ ...prev, [code]: '' }))
    await onSaveSheetType(code, {
      code: normalizedCode,
      label,
      description: draft.description.trim(),
      gameSystemCode,
      entityType: draft.entityType,
      schemaVersion: toNumberOrThrow(draft.schemaVersion, 'Schema version'),
      sortOrder: toNumberOrThrow(draft.sortOrder, 'Sort order'),
      active: draft.active,
      isDefault: draft.isDefault,
      schemaJson,
    })
  }

  return (
    <div className="system-catalogs-layout">
      <section className="system-catalog-hero">
        <div className="system-catalog-hero-copy">
          <p className="menu-group-label">SYSTEM / SCHEDE</p>
          <h3>Cataloghi configurabili, riusabili e versionati</h3>
          <p className="muted">
            Qui definisci i sistemi di gioco censiti a database e la struttura scheda che poi il frontend usera'
            per comporre i moduli runtime.
          </p>
        </div>
        <div className="system-catalog-hero-meta">
          <span className="status status-neutral">Sistemi {gameSystems.length}</span>
          <span className="status status-info">Schede {sheetTypes.length}</span>
          <button type="button" className="refresh-btn" disabled={busy} onClick={onRefresh}>
            <Icon name="fa-solid fa-rotate-right" />
            <span>Ricarica</span>
          </button>
        </div>
      </section>

      <div className="system-catalogs-grid">
        <section className="system-catalog-panel">
          <div className="system-catalog-panel-head">
            <div>
              <h3 className="section-title">Sistemi di gioco</h3>
              <p className="muted">Catalogo amministrativo dei mondi di gioco disponibili.</p>
            </div>
            <span className="readonly-chip">{gameSystems.length} record</span>
          </div>

          <div className="system-catalog-form">
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-key" label="Codice nuovo sistema" />
                <input
                  value={newGameSystem.code}
                  onChange={(event) => setNewGameSystem((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="DND5E"
                />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-signature" label="Label" />
                <input
                  value={newGameSystem.label}
                  onChange={(event) => setNewGameSystem((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="D&D 5E"
                />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
              <textarea
                rows={3}
                value={newGameSystem.description}
                onChange={(event) => setNewGameSystem((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrizione amministrativa del sistema"
              />
            </label>
            <div className="system-toggle-row">
              <label className="system-status-option">
                <span className="system-status-label">
                  <strong>Attivo</strong>
                  <small>Visibile nelle campagne e nei template.</small>
                </span>
                <span className="switch system-user-switch">
                  <input
                    type="checkbox"
                    checked={newGameSystem.active}
                    onChange={(event) => setNewGameSystem((prev) => ({ ...prev, active: event.target.checked }))}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </span>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                <input
                  type="number"
                  value={String(newGameSystem.sortOrder)}
                  onChange={(event) =>
                    setNewGameSystem((prev) => ({
                      ...prev,
                      sortOrder: Number.parseInt(event.target.value || '0', 10),
                    }))
                  }
                />
              </label>
            </div>
            {newGameSystemError && <p className="system-inline-error">{newGameSystemError}</p>}
            <button type="button" className="primary-btn" disabled={busy} onClick={() => void submitNewGameSystem()}>
              <Icon name="fa-solid fa-plus" />
              <span>Crea sistema</span>
            </button>
          </div>

          <div className="system-catalog-table-wrap">
            <table className="system-catalog-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Label</th>
                  <th>Descrizione</th>
                  <th>Stato</th>
                  <th>Ordine</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedGameSystems.length === 0 ? (
                  <tr>
                    <td className="system-empty-cell" colSpan={6}>
                      Nessun sistema di gioco censito.
                    </td>
                  </tr>
                ) : (
                  sortedGameSystems.map((item) => {
                    const draft = gameSystemDrafts[item.code] || {
                      code: item.code,
                      label: item.label,
                      description: item.description || '',
                      active: item.active,
                      sortOrder: item.sortOrder,
                    }
                    const isDirty =
                      draft.label !== item.label ||
                      (draft.description || '') !== (item.description || '') ||
                      draft.active !== item.active ||
                      draft.sortOrder !== item.sortOrder

                    return (
                      <Fragment key={item.code}>
                        <tr key={item.code}>
                          <td>
                            <div className="system-catalog-code-block">
                              <span className="system-user-username">{item.code}</span>
                              <span className="system-user-id">Readonly code</span>
                            </div>
                          </td>
                          <td>
                            <input
                              className="system-inline-input"
                              value={draft.label}
                              onChange={(event) =>
                                setGameSystemDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    ...draft,
                                    label: event.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <textarea
                              className="system-inline-textarea"
                              rows={3}
                              value={draft.description}
                              onChange={(event) =>
                                setGameSystemDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    ...draft,
                                    description: event.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <label className="switch system-user-switch" aria-label={`${item.code} ${draft.active ? 'attivo' : 'disattivo'}`}>
                              <input
                                type="checkbox"
                                checked={draft.active}
                                onChange={(event) =>
                                  setGameSystemDrafts((prev) => ({
                                    ...prev,
                                    [item.code]: {
                                      ...draft,
                                      active: event.target.checked,
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
                            <input
                              className="system-inline-input system-inline-input-narrow"
                              type="number"
                              value={String(draft.sortOrder)}
                              onChange={(event) =>
                                setGameSystemDrafts((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    ...draft,
                                    sortOrder: Number.parseInt(event.target.value || '0', 10),
                                  },
                                }))
                              }
                            />
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
                                onClick={() => void saveGameSystem(item.code)}
                              >
                                <Icon name="fa-solid fa-floppy-disk" />
                                <span>Salva</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {gameSystemErrors[item.code] && (
                          <tr>
                            <td colSpan={6} className="system-inline-error-row">
                              {gameSystemErrors[item.code]}
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
        </section>

        <section className="system-catalog-panel system-catalog-panel-wide">
          <div className="system-catalog-panel-head">
            <div>
              <h3 className="section-title">Sheet type</h3>
              <p className="muted">Definisci i template scheda per character, army o deck.</p>
            </div>
            <span className="readonly-chip">{sheetTypes.length} record</span>
          </div>

          <div className="system-catalog-form system-catalog-form-compact">
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-key" label="Codice nuovo sheet type" />
                <input
                  value={newSheetType.code}
                  onChange={(event) => setNewSheetType((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="DND5E_CHARACTER"
                />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-signature" label="Label" />
                <input
                  value={newSheetType.label}
                  onChange={(event) => setNewSheetType((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="D&D Character Sheet"
                />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
              <textarea
                rows={3}
                value={newSheetType.description}
                onChange={(event) => setNewSheetType((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrizione del template scheda"
              />
            </label>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
                <select
                  value={newSheetType.gameSystemCode}
                  onChange={(event) => setNewSheetType((prev) => ({ ...prev, gameSystemCode: event.target.value }))}
                >
                  {gameSystems.length > 0 ? (
                    gameSystems.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label || item.code}
                      </option>
                    ))
                  ) : (
                    <option value="">Nessun sistema disponibile</option>
                  )}
                </select>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-layer-group" label="Entity type" />
                <select
                  value={newSheetType.entityType}
                  onChange={(event) =>
                    setNewSheetType((prev) => ({
                      ...prev,
                      entityType: event.target.value as SheetEntityType,
                    }))
                  }
                >
                  {entityTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-code-branch" label="Schema version" />
                <input
                  type="number"
                  value={newSheetType.schemaVersion}
                  onChange={(event) => setNewSheetType((prev) => ({ ...prev, schemaVersion: event.target.value }))}
                />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                <input
                  type="number"
                  value={newSheetType.sortOrder}
                  onChange={(event) => setNewSheetType((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>
            </div>
            <div className="system-toggle-row">
              <label className="system-status-option">
                <span className="system-status-label">
                  <strong>Attivo</strong>
                  <small>Utilizzabile dalle campagne.</small>
                </span>
                <span className="switch system-user-switch">
                  <input
                    type="checkbox"
                    checked={newSheetType.active}
                    onChange={(event) => setNewSheetType((prev) => ({ ...prev, active: event.target.checked }))}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </span>
              </label>
              <label className="system-status-option">
                <span className="system-status-label">
                  <strong>Default</strong>
                  <small>Template base per il sistema e la entity.</small>
                </span>
                <span className="switch system-user-switch">
                  <input
                    type="checkbox"
                    checked={newSheetType.isDefault}
                    onChange={(event) => setNewSheetType((prev) => ({ ...prev, isDefault: event.target.checked }))}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </span>
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-diagram-project" label="Schema JSON" />
              <textarea
                className="system-json-editor"
                rows={10}
                value={newSheetType.schemaJsonText}
                onChange={(event) => setNewSheetType((prev) => ({ ...prev, schemaJsonText: event.target.value }))}
              />
            </label>
            <p className="muted">Il JSON deve essere un oggetto valido. Serve al FE per comporre i blocchi in modo configurabile.</p>
            {newSheetTypeError && <p className="system-inline-error">{newSheetTypeError}</p>}
            <button type="button" className="primary-btn" disabled={busy || gameSystems.length === 0} onClick={() => void submitNewSheetType()}>
              <Icon name="fa-solid fa-plus" />
              <span>Crea sheet type</span>
            </button>
          </div>

          <div className="system-sheet-list">
            {sortedSheetTypes.length === 0 ? (
              <div className="system-empty-cell system-sheet-empty">Nessuno sheet type configurato.</div>
            ) : (
              sortedSheetTypes.map((item) => {
                const draft = sheetTypeDrafts[item.code] || {
                  code: item.code,
                  label: item.label,
                  description: item.description || '',
                  gameSystemCode: item.gameSystemCode,
                  entityType: item.entityType,
                  schemaVersion: String(item.schemaVersion),
                  sortOrder: String(item.sortOrder),
                  active: item.active,
                  isDefault: item.isDefault,
                  schemaJsonText: JSON.stringify(item.schemaJson || {}, null, 2),
                }
                const isDirty =
                  draft.label !== item.label ||
                  (draft.description || '') !== (item.description || '') ||
                  draft.gameSystemCode !== item.gameSystemCode ||
                  draft.entityType !== item.entityType ||
                  draft.schemaVersion !== String(item.schemaVersion) ||
                  draft.sortOrder !== String(item.sortOrder) ||
                  draft.active !== item.active ||
                  draft.isDefault !== item.isDefault ||
                  draft.schemaJsonText !== JSON.stringify(item.schemaJson || {}, null, 2)

                return (
                  <article key={item.code} className="system-sheet-card">
                    <div className="system-sheet-card-head">
                      <div>
                        <div className="system-sheet-title-row">
                          <h4>{item.label}</h4>
                          <span className="readonly-chip">{item.code}</span>
                          {item.isDefault && <span className="status status-info">Default</span>}
                          {!item.active && <span className="status status-neutral">Disattivo</span>}
                        </div>
                        <p className="muted">
                          {gameSystems.find((system) => system.code === item.gameSystemCode)?.label || item.gameSystemCode} · {item.entityType} · v{item.schemaVersion}
                        </p>
                      </div>
                      <div className="system-row-actions">
                        <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>
                          {isDirty ? 'Da salvare' : 'Salvato'}
                        </span>
                        <button
                          type="button"
                          className="refresh-btn"
                          disabled={busy || !isDirty}
                          onClick={() => void saveSheetType(item.code)}
                        >
                          <Icon name="fa-solid fa-floppy-disk" />
                          <span>Salva</span>
                        </button>
                      </div>
                    </div>

                    <div className="system-catalog-form-grid">
                      <label>
                        <FieldLabel icon="fa-solid fa-signature" label="Label" />
                        <input
                          value={draft.label}
                          onChange={(event) =>
                            setSheetTypeDrafts((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...draft,
                                label: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
                        <select
                          value={draft.gameSystemCode}
                          onChange={(event) =>
                            setSheetTypeDrafts((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...draft,
                                gameSystemCode: event.target.value,
                              },
                            }))
                          }
                        >
                          {gameSystems.map((system) => (
                            <option key={system.code} value={system.code}>
                              {system.label || system.code}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="system-catalog-form-grid">
                      <label>
                        <FieldLabel icon="fa-solid fa-layer-group" label="Entity type" />
                        <select
                          value={draft.entityType}
                          onChange={(event) =>
                            setSheetTypeDrafts((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...draft,
                                entityType: event.target.value as SheetEntityType,
                              },
                            }))
                          }
                        >
                          {entityTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-code-branch" label="Schema version" />
                        <input
                          type="number"
                          value={draft.schemaVersion}
                          onChange={(event) =>
                            setSheetTypeDrafts((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...draft,
                                schemaVersion: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setSheetTypeDrafts((prev) => ({
                              ...prev,
                              [item.code]: {
                                ...draft,
                                sortOrder: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <label>
                      <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
                      <textarea
                        rows={3}
                        value={draft.description}
                        onChange={(event) =>
                          setSheetTypeDrafts((prev) => ({
                            ...prev,
                            [item.code]: {
                              ...draft,
                              description: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <div className="system-toggle-row">
                      <label className="system-status-option">
                        <span className="system-status-label">
                          <strong>Attivo</strong>
                          <small>Disponibile per la selezione runtime.</small>
                        </span>
                        <span className="switch system-user-switch">
                          <input
                            type="checkbox"
                            checked={draft.active}
                            onChange={(event) =>
                              setSheetTypeDrafts((prev) => ({
                                ...prev,
                                [item.code]: {
                                  ...draft,
                                  active: event.target.checked,
                                },
                              }))
                            }
                          />
                          <span className="switch-track" aria-hidden="true">
                            <span className="switch-thumb" />
                          </span>
                        </span>
                      </label>
                      <label className="system-status-option">
                        <span className="system-status-label">
                          <strong>Default</strong>
                          <small>Template base per questo sistema/entity.</small>
                        </span>
                        <span className="switch system-user-switch">
                          <input
                            type="checkbox"
                            checked={draft.isDefault}
                            onChange={(event) =>
                              setSheetTypeDrafts((prev) => ({
                                ...prev,
                                [item.code]: {
                                  ...draft,
                                  isDefault: event.target.checked,
                                },
                              }))
                            }
                          />
                          <span className="switch-track" aria-hidden="true">
                            <span className="switch-thumb" />
                          </span>
                        </span>
                      </label>
                    </div>

                    <label>
                      <FieldLabel icon="fa-solid fa-diagram-project" label="Schema JSON" />
                      <textarea
                        className="system-json-editor"
                        rows={10}
                        value={draft.schemaJsonText}
                        onChange={(event) =>
                          setSheetTypeDrafts((prev) => ({
                            ...prev,
                            [item.code]: {
                              ...draft,
                              schemaJsonText: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <p className="muted">Edita il JSON senza reflection. Il backend lo salva versionato e il FE lo interpreta per blocchi.</p>
                    {sheetTypeErrors[item.code] && <p className="system-inline-error">{sheetTypeErrors[item.code]}</p>}
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function CampaignPickerModal({
  campaigns,
  targetScreen,
  busy,
  onClose,
  onSelect,
}: {
  campaigns: CampaignPickerCampaign[]
  targetScreen: Screen | null
  busy: boolean
  onClose: () => void
  onSelect: (campaign: CampaignPickerCampaign) => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel campaign-picker-panel">
        <div className="modal-panel-head">
          <div>
            <h3>Seleziona campagna</h3>
            <p className="muted">
              {targetScreen
                ? `Carica prima una campagna per aprire ${SCREEN_LABELS[targetScreen].toLowerCase()}.`
                : 'Le campagne disattivate restano visibili ma non sono selezionabili.'}
            </p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        {campaigns.length > 0 ? (
          <div className="campaign-picker-list">
            {campaigns.map((campaign) => (
              <button
                key={campaign.campaignId}
                type="button"
                className={`campaign-picker-item ${campaign.disabled ? 'is-disabled' : ''}`}
                onClick={() => onSelect(campaign)}
                disabled={busy || campaign.disabled}
                aria-disabled={busy || campaign.disabled}
                title={campaign.disabled ? 'Campagna disattivata: non selezionabile' : undefined}
              >
                <div className="campaign-picker-main">
                  <p className="campaign-picker-name">
                    {campaign.campaignName}
                    {!campaign.isActive && <span className="campaign-picker-badge">Disattivata</span>}
                  </p>
                  <p className="campaign-picker-meta">{campaign.role.replaceAll('_', ' ')}</p>
                </div>
                <Icon name="fa-solid fa-chevron-right" className="campaign-picker-icon" />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Nessuna campagna disponibile per il tuo ruolo.</p>
        )}

        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

function LeaveCampaignModal({
  context,
  busy,
  onClose,
  onConfirm,
}: {
  context: LeaveCampaignContext
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel campaign-leave-panel">
        <div className="modal-panel-head">
          <div>
            <h3>Esci dalla campagna</h3>
            <p className="muted">
              Stai per lasciare <strong>{context.campaignName}</strong>.
            </p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} disabled={busy}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="leave-warning-box">
          <p className="leave-warning-title">Operazione irreversibile nel contesto attivo</p>
          <p className="muted">
            La tua membership verrà disattivata.
            {context.characterWillBeRetired
              ? ' Il tuo personaggio attivo in questa campagna verrà ritirato.'
              : ' Non hai un personaggio attivo in questa campagna, quindi verrà solo rimosso il contesto.'}
            Dopo l’uscita non potrai più usare questa campagna come contesto attivo finché non avrai una nuova membership approvata.
          </p>
        </div>

        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>
            Annulla
          </button>
          <button type="button" className="danger-btn" onClick={onConfirm} disabled={busy}>
            Esci dalla campagna
          </button>
        </div>
      </div>
    </div>
  )
}

function CharacterListPage({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  canOpenCharacterSheet,
  ownerProfileLabel,
  campaignNameForCharacter,
  onCreateScreen,
  onReload,
}: {
  characters: Character[]
  selectedCharacterId: string
  onSelectCharacter: (character: Character) => void
  canOpenCharacterSheet: (character: Character) => boolean
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  campaignNameForCharacter: (character: Character) => string
  onCreateScreen: () => void
  onReload: () => void
}) {
  const [typeFilters, setTypeFilters] = useState<Array<'NPC' | 'PG'>>(['NPC', 'PG'])
  const [statusFilters, setStatusFilters] = useState<CharacterStatus[]>(['ACTIVE', 'RETIRED', 'DEAD'])
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'character' | 'profile' | 'campaign' | 'type' | 'status' | 'access'>('character')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const toggleTypeFilter = (type: 'NPC' | 'PG') => {
    setTypeFilters((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== type)
      }
      return [...prev, type]
    })
  }

  const toggleStatusFilter = (status: CharacterStatus) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== status)
      }
      return [...prev, status]
    })
  }
  const normalizedSearchText = searchText.trim().toLowerCase()
  const filteredCharacters = useMemo(() => {
    const list = characters.filter((character) => {
      if (!character.characterStatus || !statusFilters.includes(character.characterStatus)) return false
      const type = character.isNpc ? 'NPC' : 'PG'
      if (!typeFilters.includes(type)) return false
      if (!normalizedSearchText) return true
      const owner = ownerProfileLabel(character.userId, character.ownerProfileName).toLowerCase()
      const name = character.name.toLowerCase()
      const campaignName = campaignNameForCharacter(character).toLowerCase()
      return owner.includes(normalizedSearchText) || name.includes(normalizedSearchText) || campaignName.includes(normalizedSearchText)
    })

    const directionMultiplier = sortDirection === 'asc' ? 1 : -1
    const sortString = (left: string, right: string) => left.localeCompare(right, 'it', { sensitivity: 'base' }) * directionMultiplier
    const sortBoolean = (left: boolean, right: boolean) => (Number(left) - Number(right)) * directionMultiplier

    return [...list].sort((left, right) => {
      switch (sortBy) {
        case 'profile':
          return sortString(ownerProfileLabel(left.userId, left.ownerProfileName), ownerProfileLabel(right.userId, right.ownerProfileName))
        case 'campaign':
          return sortString(campaignNameForCharacter(left), campaignNameForCharacter(right))
        case 'type':
          return sortString(left.isNpc ? 'NPC' : 'PG', right.isNpc ? 'NPC' : 'PG')
        case 'status':
          return sortString(left.characterStatus || '', right.characterStatus || '')
        case 'access':
          return sortBoolean(canOpenCharacterSheet(left), canOpenCharacterSheet(right))
        case 'character':
        default:
          return sortString(left.name, right.name)
      }
    })
  }, [
    characters,
    statusFilters,
    typeFilters,
    normalizedSearchText,
    sortBy,
    sortDirection,
    ownerProfileLabel,
    campaignNameForCharacter,
    canOpenCharacterSheet,
  ])

  const handleSortChange = (nextSortBy: string) => {
    setSortBy((prev) => {
      const nextKey = nextSortBy as typeof sortBy
      if (prev === nextKey) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return nextKey
    })
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Gestione Personaggi</h2>
        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onReload}>
            Reload
          </button>
          <button type="button" className="primary-btn" onClick={onCreateScreen}>
            Crea Personaggio
          </button>
        </div>
      </div>
      <div className="character-filter-toolbar">
        <FilterChipGroup
          label="Tipo"
          options={[
            { value: 'PG', label: 'Personaggio', title: 'Mostra i personaggi giocanti' },
            { value: 'NPC', label: 'NPC', title: 'Mostra i personaggi non giocanti' },
          ]}
          selectedValues={typeFilters}
          onToggle={toggleTypeFilter}
        />
        <FilterChipGroup
          label="Stato"
          options={[
            { value: 'ACTIVE', label: 'ACTIVE', className: 'filter-chip--status-approved', title: 'Stato attivo' },
            { value: 'RETIRED', label: 'RETIRED', className: 'filter-chip--status-rejected', title: 'Stato ritirato' },
            { value: 'DEAD', label: 'DEAD', className: 'filter-chip--status-blocked', title: 'Stato morto' },
          ]}
          selectedValues={statusFilters}
          onToggle={toggleStatusFilter}
        />
        <label className="character-filter-field">
          <span className="muted">Ricerca</span>
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Nome, profilo o campagna" />
        </label>
      </div>
      <DataTable
        columns={[
          { key: 'character', label: 'Personaggio', sortKey: 'character' },
          { key: 'profile', label: 'Profilo', sortKey: 'profile' },
          { key: 'campaign', label: 'Campagna', sortKey: 'campaign' },
          { key: 'type', label: 'Tipo', sortKey: 'type' },
          { key: 'status', label: 'Stato', sortKey: 'status' },
          { key: 'access', label: 'Accesso', sortKey: 'access' },
        ]}
        rows={filteredCharacters}
        getRowKey={(character) => character.id}
        emptyMessage="Nessun personaggio per i filtri selezionati."
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        renderRow={(character) => {
          const canOpen = canOpenCharacterSheet(character)
          return (
            <tr className={selectedCharacterId === character.id ? 'is-selected' : ''}>
              <td>
                <button
                  type="button"
                  className="data-table-link"
                  onClick={() => onSelectCharacter(character)}
                  disabled={!canOpen}
                >
                  <span className="char-kind-icon" aria-hidden="true">
                    <Icon name={character.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
                  </span>{' '}
                  {character.name}
                </button>
                <p className="data-table-secondary">{character.nickname || 'no nickname'}</p>
              </td>
              <td className="data-table-secondary">{ownerProfileLabel(character.userId, character.ownerProfileName)}</td>
              <td className="data-table-secondary">{campaignNameForCharacter(character)}</td>
              <td>{character.isNpc ? 'NPC' : 'PG'}</td>
              <td>
                <span className={`status status-${statusTone(character.characterStatus)}`}>{character.characterStatus || 'N/A'}</span>
              </td>
              <td>
                <span
                  className={`editability-icon ${canOpen ? 'is-editable' : 'is-readonly'}`}
                  aria-label={canOpen ? 'Modificabile' : 'Non modificabile'}
                  title={canOpen ? 'Modificabile' : 'Non modificabile'}
                >
                  <Icon name={canOpen ? 'fa-solid fa-pen' : 'fa-solid fa-lock'} />
                </span>
              </td>
            </tr>
          )
        }}
      />
    </section>
  )
}

function getSheetBlocks(schemaJson: Record<string, unknown>): SheetSchemaBlock[] {
  const schemaRecord = schemaJson as Record<string, unknown>
  const rawBlocks = Array.isArray(schemaRecord.blocks) ? schemaRecord.blocks : []
  const blocks: SheetSchemaBlock[] = []

  for (const block of rawBlocks) {
    if (!block || typeof block !== 'object') continue
    const item = block as Record<string, unknown>
    const rawFields = Array.isArray(item.fields) ? item.fields : []
    const fields: SheetSchemaField[] = []

    for (const field of rawFields) {
      if (!field || typeof field !== 'object') continue
      fields.push(field as SheetSchemaField)
    }

    blocks.push({
      key: typeof item.key === 'string' ? item.key : undefined,
      label: typeof item.label === 'string' ? item.label : undefined,
      description: typeof item.description === 'string' ? item.description : null,
      fields,
    })
  }

  return blocks
}

function sheetFieldPath(blockKey: string, fieldKey: string) {
  return `${blockKey}.${fieldKey}`
}

function getSheetOptionValue(option: unknown): string {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return String(option)
  }
  if (!option || typeof option !== 'object') return ''
  const record = option as Record<string, unknown>
  return String(record.value ?? record.code ?? record.key ?? record.label ?? '')
}

function getSheetOptionLabel(option: unknown): string {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return String(option)
  }
  if (!option || typeof option !== 'object') return ''
  const record = option as Record<string, unknown>
  return String(record.label ?? record.name ?? record.title ?? record.value ?? record.code ?? record.key ?? '')
}

function sheetValueAsText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ')
  }
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseSheetValue(type: string | undefined, rawValue: string, checked?: boolean): unknown {
  switch ((type || 'text').toLowerCase()) {
    case 'number':
      return rawValue.trim() === '' ? null : Number.parseInt(rawValue, 10)
    case 'boolean':
      return Boolean(checked)
    case 'tags':
      return rawValue
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    default:
      return rawValue
  }
}

function CharacterDetailPage({
  character,
  externalDetail,
  sheet,
  ownerProfileLabel,
  campaignNameForCharacter,
  canMarkCharacterDead,
  canReactivateCharacter,
  onRefresh,
  onUpdateStatus,
  onSaveSheet,
}: {
  character: Character | null
  externalDetail: Character | null
  sheet: CharacterSheetResponse | null
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  campaignNameForCharacter: (character: Character) => string
  canMarkCharacterDead: (character: Character | null) => boolean
  canReactivateCharacter: (character: Character | null) => boolean
  onRefresh: () => void
  onUpdateStatus: (status: CharacterStatus) => void
  onSaveSheet: (dataJson: Record<string, unknown>) => Promise<void>
}) {
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>(value?.characterStatus || 'ACTIVE')
  const [sheetDraft, setSheetDraft] = useState<Record<string, unknown>>(() => sheet?.dataJson || {})
  const [sheetDirty, setSheetDirty] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const sheetBlocks = useMemo(() => getSheetBlocks(sheet?.schemaJson || {}), [sheet?.schemaJson])

  const deadAllowed = canMarkCharacterDead(value)
  const effectiveStatus = status === 'DEAD' && !deadAllowed ? 'RETIRED' : status
  const canReactivate = canReactivateCharacter(value)
  const sheetLockedBecauseInactive = value?.characterStatus !== 'ACTIVE'
  const canEditSheet = Boolean(sheet?.editable && !sheetLockedBecauseInactive)

  const updateSheetField = (fieldPath: string, nextValue: unknown) => {
    setSheetDraft((prev) => ({ ...prev, [fieldPath]: nextValue }))
    setSheetDirty(true)
  }

  const saveSheet = async () => {
    if (!canEditSheet || !sheetDirty || sheetSaving) return
    setSheetSaving(true)
    try {
      await onSaveSheet(sheetDraft)
      setSheetDirty(false)
    } finally {
      setSheetSaving(false)
    }
  }

  const renderSheetField = (blockKey: string, field: SheetSchemaField) => {
    const fieldKey = field.key?.trim()
    if (!fieldKey) return null
    const path = sheetFieldPath(blockKey, fieldKey)
    const type = (field.type || 'text').toLowerCase()
    const currentValue =
      sheetDraft[path] !== undefined
        ? sheetDraft[path]
        : field.defaultValue !== undefined
          ? field.defaultValue
          : type === 'number'
            ? 0
            : type === 'boolean'
              ? false
              : type === 'tags'
                ? []
                : ''
    const disabled = !canEditSheet

    return (
      <div key={path} className="sheet-field">
        <span className="sheet-field-label">
          {field.label || fieldKey}
          {field.required && <span className="sheet-field-required">*</span>}
        </span>
        {type === 'textarea' ? (
          <textarea
            rows={4}
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, event.target.value)}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        ) : type === 'boolean' ? (
          <label className="sheet-checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              disabled={disabled}
              onChange={(event) => updateSheetField(path, parseSheetValue(type, '', event.target.checked))}
            />
            <span>{field.placeholder || 'Valore booleano'}</span>
          </label>
        ) : type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
          <select
            value={sheetValueAsText(currentValue)}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, event.target.value)}
          >
            <option value="">Seleziona</option>
            {field.options.map((option: unknown) => {
              const optionValue = getSheetOptionValue(option)
              const optionLabel = getSheetOptionLabel(option)
              return (
                <option key={optionValue || optionLabel} value={optionValue}>
                  {optionLabel || optionValue}
                </option>
              )
            })}
          </select>
        ) : type === 'tags' ? (
          <input
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || 'tag1, tag2'}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        ) : (
          <input
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        )}
        {field.helpText && <span className="sheet-field-help">{field.helpText}</span>}
      </div>
    )
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Scheda PG</h2>
        <button type="button" className="secondary-btn" onClick={onRefresh}>
          Reload dettaglio
        </button>
      </div>
      {!value && <p className="muted">Seleziona un personaggio.</p>}
      {value && (
        <>
          <p>
            <strong>
              <span className="char-kind-icon" aria-hidden="true">
                <Icon name={value.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
              </span>{' '}
              {value.name}
            </strong>
            {value.nickname && <em className="character-alias">({value.nickname})</em>}
          </p>
          <div className="sheet-meta-row">
            <span className="status status-info">{value.isNpc ? 'NPC' : 'Personaggio'}</span>
            <span className={`status ${statusTone(value.characterStatus)}`}>{value.characterStatus || 'N/A'}</span>
            <span className="status status-neutral">{campaignNameForCharacter(value)}</span>
          </div>
          <p className="muted">profilo: {ownerProfileLabel(value.userId, value.ownerProfileName)}</p>
          {value.characterStatus !== 'ACTIVE' && (
            <p className="form-error">Scheda bloccata: il personaggio non e' attivo.</p>
          )}
          {sheet && (
            <div className="sheet-header">
              <span className="status status-neutral">{sheet.sheetTypeCode || 'Scheda non assegnata'}</span>
              <span className={`status ${sheet.hasTemplate ? 'status-success' : 'status-warning'}`}>
                {sheet.hasTemplate ? 'Template configurato' : 'Template mancante'}
              </span>
              <span className="status status-info">Version {sheet.schemaVersion}</span>
              <span className={`status ${canEditSheet ? 'status-success' : 'status-neutral'}`}>
                {canEditSheet ? 'Modificabile' : 'Sola lettura'}
              </span>
            </div>
          )}
          <label>
            Nuovo status
            <select value={effectiveStatus} onChange={(event) => setStatus(event.target.value as CharacterStatus)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RETIRED">RETIRED</option>
              {deadAllowed && <option value="DEAD">DEAD</option>}
            </select>
          </label>
          {!deadAllowed && <p className="muted">Non hai permessi per impostare lo stato DEAD.</p>}
          {effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate && (
            <p className="muted">Non hai permessi per riportare il personaggio ad ACTIVE.</p>
          )}
          <button
            type="button"
            className="primary-btn"
            disabled={(effectiveStatus === 'DEAD' && !deadAllowed) || (effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate)}
            title={
              effectiveStatus === 'DEAD' && !deadAllowed
                ? 'Non hai permessi per impostare DEAD.'
                : effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate
                  ? 'Non hai permessi per riportare il personaggio ad ACTIVE.'
                  : undefined
            }
            onClick={() => onUpdateStatus(effectiveStatus)}
          >
            Aggiorna Status
          </button>
          <div className="divider" />
          <div className="row-between">
            <h3 className="section-title">Scheda sistema</h3>
            <button type="button" className="secondary-btn" onClick={onRefresh}>
              Reload dettaglio
            </button>
          </div>
          {!sheet && <p className="muted">Caricamento scheda sistema...</p>}
          {sheet && !sheet.hasTemplate && (
            <p className="muted">Nessun template configurato per il sistema di gioco di questa campagna.</p>
          )}
          {sheet && sheet.hasTemplate && (
            <>
              {sheetBlocks.length === 0 ? (
                <p className="muted">La scheda non espone blocchi configurati.</p>
              ) : (
                <div className="sheet-grid">
                  {sheetBlocks.map((block: SheetSchemaBlock) => {
                    const blockKey = block.key?.trim()
                    if (!blockKey) return null
                    return (
                      <section key={blockKey} className="sheet-block">
                        <div className="sheet-block-head">
                          <div>
                            <h4>{block.label || blockKey}</h4>
                            {block.description && <p className="muted">{block.description}</p>}
                          </div>
                        </div>
                        <div className="sheet-fields-grid">
                          {(block.fields || []).map((field: SheetSchemaField) => renderSheetField(blockKey, field))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
              <div className="sheet-actions">
                {sheet.updatedAt && <p className="muted">Ultimo salvataggio: {new Date(sheet.updatedAt).toLocaleString('it-IT')}</p>}
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!canEditSheet || !sheetDirty || sheetSaving}
                  title={!canEditSheet ? 'La scheda non e modificabile quando il personaggio non e attivo.' : undefined}
                  onClick={() => void saveSheet()}
                >
                  <Icon name="fa-solid fa-floppy-disk" />
                  <span>{sheetSaving ? 'Salvataggio...' : 'Salva scheda'}</span>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

function CampaignMemberProfilePage({
  membership,
  profile,
  onRefresh,
  onUpdateRole,
  onBan,
  onSuspend,
  onUnsuspend,
  onUnban,
  onApprove,
}: {
  membership: CampaignMembershipResponse
  profile: UserProfile
  onRefresh: () => void
  onUpdateRole: (role: CampaignRole) => void
  onBan: (reason: string) => void
  onSuspend: (reason: string) => void
  onUnsuspend: () => void
  onUnban: () => void
  onApprove: () => void
}) {
  const [role, setRole] = useState<CampaignRole>(membership.role)
  const [moderationMode, setModerationMode] = useState<'suspend' | 'ban' | null>(null)
  const [moderationReason, setModerationReason] = useState('')

  const roleOptions: CampaignRole[] = ['GIOCATORE', 'CO_MASTER', 'MASTER']
  const activityLabel =
    membership.memberStatus === 'APPROVED'
      ? 'ATTIVO'
      : membership.memberStatus === 'BLOCKED'
        ? 'BLOCCATO'
        : membership.memberStatus === 'BANNED'
          ? 'BANNATO'
          : 'DISABILITATO'
  const activityClass = membership.memberStatus === 'APPROVED' ? 'status-success' : 'status-danger'

  const openModerationModal = (mode: 'suspend' | 'ban') => {
    setModerationMode(mode)
    setModerationReason('')
  }

  const closeModerationModal = () => {
    setModerationMode(null)
    setModerationReason('')
  }

  const confirmModeration = () => {
    const reason = moderationReason.trim()
    if (!reason || reason.length > 200) return
    if (moderationMode === 'suspend') onSuspend(reason)
    if (moderationMode === 'ban') onBan(reason)
    closeModerationModal()
  }

  return (
      <section className="panel">
      <div className="row-between">
        <h2>Profilo Membro Campagna</h2>
        <button type="button" className="secondary-btn" onClick={onRefresh}>
          <Icon name="fa-solid fa-rotate-right" />
          Reload
        </button>
      </div>
      <p className="character-name">{profile.profileName}</p>
      {profile.username && <p className="muted">@{profile.username}</p>}
      <div className="inline-actions">
        <span className="status status-info">{membership.role}</span>
        <span className={`status ${activityClass}`}>{activityLabel}</span>
        <span className="status status-neutral">{membership.memberStatus}</span>
      </div>
      <p className="muted">Stato PG in campagna: {membership.characterStatus || 'N/A'}</p>

      <div className="divider" />
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-shield-halved" label="Ruolo campagna" />
          <select value={role} onChange={(event) => setRole(event.target.value as CampaignRole)}>
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-actions">
          <button type="button" className="primary-btn" onClick={() => onUpdateRole(role)}>
            <Icon name="fa-solid fa-user-gear" />
            Aggiorna ruolo
          </button>
        </div>
      </div>

      <div className="inline-actions">
        {(membership.memberStatus === 'PENDING' || membership.memberStatus === 'REJECTED') && (
          <button type="button" className="primary-btn" onClick={onApprove}>
            <Icon name="fa-solid fa-user-check" />
            Accetta utente
          </button>
        )}
        {membership.memberStatus === 'APPROVED' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('suspend')}>
            <Icon name="fa-solid fa-user-slash" />
            Sospendi utente
          </button>
        )}
        {membership.memberStatus === 'BLOCKED' && (
          <button type="button" className="secondary-btn" onClick={onUnsuspend}>
            <Icon name="fa-solid fa-unlock" />
            Sblocca sospensione
          </button>
        )}
        {membership.memberStatus !== 'BANNED' && membership.memberStatus !== 'PENDING' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('ban')}>
            <Icon name="fa-solid fa-ban" />
            Blocca utente
          </button>
        )}
        {membership.memberStatus === 'BANNED' && (
          <button type="button" className="secondary-btn" onClick={onUnban}>
            <Icon name="fa-solid fa-unlock-keyhole" />
            Sblocca utente
          </button>
        )}
      </div>

      {moderationMode && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3>{moderationMode === 'ban' ? 'Motivo ban' : 'Motivo sospensione'}</h3>
            <label>
              <FieldLabel icon="fa-solid fa-comment-dots" label="Motivo (max 200)" />
              <textarea
                rows={4}
                maxLength={200}
                placeholder="Spiega il motivo della moderazione"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
              />
            </label>
            <p className="muted">{moderationReason.length}/200</p>
            <div className="inline-actions">
              <button type="button" className="secondary-btn" onClick={closeModerationModal}>
                Annulla
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={confirmModeration}
                disabled={moderationReason.trim().length === 0 || moderationReason.trim().length > 200}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

function CampaignManagementPage({
  campaign,
  availableModules,
  availableGameSystems,
  permissions,
  onSave,
  onRefreshPermissions,
  onTransfer,
  onCreateInviteToken,
  currentUserId,
  onLeave,
}: {
  campaign: CampaignResponse | null
  availableModules: CampaignCatalogEntry[]
  availableGameSystems: CampaignCatalogEntry[]
  permissions: CampaignPermissionResponse[]
  onSave: (payload: {
    name: string
    description: string
    summary: string
    setting: string
    tone: string
    rules: string
    requirements: string
    coverImageUrl: string
    isOpen: boolean
    isSearchable: boolean
    allowedModules: string[]
  }) => void
  onRefreshPermissions: () => void
  onTransfer: (newOwnerUserId: string) => void
  onCreateInviteToken: (payload: CreateInviteTokenRequest) => Promise<InviteTokenResponse>
  currentUserId: string
  onLeave: () => void
}) {
  const [newOwnerUserId, setNewOwnerUserId] = useState('')
  const [inviteCopyFeedback, setInviteCopyFeedback] = useState('')
  const [inviteTokenAutoJoin, setInviteTokenAutoJoin] = useState(false)
  const [inviteTokenExpiresAt, setInviteTokenExpiresAt] = useState('')
  const [inviteTokenMaxUses, setInviteTokenMaxUses] = useState('')
  const [inviteTokenResult, setInviteTokenResult] = useState<InviteTokenResponse | null>(null)
  const [inviteTokenFeedback, setInviteTokenFeedback] = useState('')
  const [name, setName] = useState(campaign?.name || '')
  const [description, setDescription] = useState(campaign?.description || '')
  const [summary, setSummary] = useState(campaign?.summary || '')
  const [setting, setSetting] = useState(campaign?.setting || '')
  const [tone, setTone] = useState(campaign?.tone || '')
  const [rules, setRules] = useState(campaign?.rules || '')
  const [requirements, setRequirements] = useState(campaign?.requirements || '')
  const [coverImageUrl, setCoverImageUrl] = useState(campaign?.coverImageUrl || '')
  const [isOpen, setIsOpen] = useState(campaign?.isOpen ?? true)
  const [isSearchable, setIsSearchable] = useState(campaign?.isSearchable ?? true)
  const [selectedModules, setSelectedModules] = useState<string[]>(campaign?.allowedModules || [])
  const availableModuleCodes = useMemo(() => availableModules.map((module) => module.code), [availableModules])
  const selectedAvailableModules =
    availableModuleCodes.length === 0
      ? []
      : selectedModules.filter((moduleCode) => availableModuleCodes.includes(moduleCode))
  const permissionChecklist: Array<{
    action: string
    label: string
    description: string
  }> = [
    {
      action: 'CREATE_ROOM',
      label: 'Creare stanze',
      description: 'Nuove stanze della campagna.',
    },
    {
      action: 'APPROVE_OR_REJECT_APPLICATIONS',
      label: 'Gestire accessi',
      description: 'Approva o rifiuta le richieste pending.',
    },
    {
      action: 'TRANSFER_OWNERSHIP',
      label: 'Trasferire proprietà',
      description: 'Cedere la leadership della campagna.',
    },
    {
      action: 'MANAGE_CAMPAIGN_SETTINGS',
      label: 'Modificare impostazioni',
      description: 'Aggiornare regole, requisiti e visibilità.',
    },
  ]
  const permissionReminders: Array<{ role: string; items: string[] }> = [
    {
      role: 'GIOCATORE',
      items: ['Giocare il tuo personaggio', 'Ritirare il tuo personaggio'],
    },
    {
      role: 'CO_MASTER',
      items: ['Creare NPC', 'Gestire i tuoi NPC', 'Aprire o riaprire missioni'],
    },
    {
      role: 'MASTER',
      items: ['Gestire qualsiasi NPC', 'Approvarе o rifiutare accessi', 'Creare stanze', 'Gestire le impostazioni campagna'],
    },
    {
      role: 'SUPER_MASTER',
      items: ['Tutto quanto sopra', 'Eliminare stanze', 'Gestire moduli', 'Trasferire ownership', 'Chiudere o cancellare la campagna'],
    },
  ]
  const campaignVisibilityRows = [
    {
      key: 'open',
      title: 'Campagna aperta',
      description: 'Permette richiesta di accesso dall’elenco campagne.',
      active: isOpen,
      activeLabel: 'Aperta',
      inactiveLabel: 'Privata',
      onToggle: () => setIsOpen((prev) => !prev),
    },
    {
      key: 'searchable',
      title: 'Visibile nella ricerca',
      description: 'La campagna può essere trovata nella ricerca pubblica.',
      active: isSearchable,
      activeLabel: 'Ricercabile',
      inactiveLabel: 'Nascosta',
      onToggle: () => setIsSearchable((prev) => !prev),
    },
  ]

  useEffect(() => {
    if (!campaign) return
    onRefreshPermissions()
  }, [campaign?.id])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode)
        ? prev.filter((item) => item !== moduleCode)
        : [...prev.filter((item) => availableModuleCodes.includes(item)), moduleCode],
    )
  }

  const copyInviteCode = async () => {
    const value = campaign?.inviteCode?.trim()
    if (!value) {
      setInviteCopyFeedback('Codice non disponibile.')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setInviteCopyFeedback('Codice copiato.')
    } catch {
      setInviteCopyFeedback('Copia non disponibile.')
    }
  }

  const createInviteToken = async () => {
    const expiresAt = inviteTokenExpiresAt.trim()
    const maxUsesValue = inviteTokenMaxUses.trim()
    const maxUses =
      maxUsesValue.length === 0 ? null : Number.isFinite(Number(maxUsesValue)) && Number(maxUsesValue) > 0 ? Number(maxUsesValue) : NaN
    if (Number.isNaN(maxUses)) {
      setInviteTokenFeedback('Max utilizzi non valido.')
      return
    }

    setInviteTokenFeedback('')
    const payload: CreateInviteTokenRequest = {
      capabilities: inviteTokenAutoJoin ? ['AUTOJOIN'] : [],
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      maxUses: maxUses === null ? null : maxUses,
    }
    const created = await onCreateInviteToken(payload)
    setInviteTokenResult(created)
    setInviteTokenFeedback('Token creato.')
  }

  const inviteTokenModeLabel = inviteTokenAutoJoin ? 'AUTOJOIN attivo' : 'Richiesta manuale'

  return (
    <section className="panel">
      <h2>Gestione Campagna</h2>
      {!campaign && <p className="muted">Apri prima una scheda campagna.</p>}
      {campaign && (
        <>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Nome" />
              <input value={name} placeholder="Nome della campagna" onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-wand-magic-sparkles" label="Tono" />
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="">Seleziona tono</option>
                {CAMPAIGN_TONE_OPTIONS.map((toneOption) => (
                  <option key={toneOption.value} value={toneOption.value}>
                    {toneOption.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
            <textarea rows={3} placeholder="Descrizione estesa della campagna" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-quote-right" label="Riassunto breve" />
            <textarea rows={2} placeholder="Riassunto breve visibile in elenco" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-map-location-dot" label="Ambientazione" />
            <textarea rows={3} placeholder="Ambientazione, mondo o contesto di gioco" value={setting} onChange={(event) => setSetting(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-gavel" label="Regole" />
            <textarea rows={3} placeholder="Regole principali della campagna" value={rules} onChange={(event) => setRules(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-door-open" label="Requisiti d'ingresso" />
            <textarea rows={3} placeholder="Requisiti richiesti per entrare" value={requirements} onChange={(event) => setRequirements(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-image" label="URL immagine copertina" />
            <input value={coverImageUrl} placeholder="https://..." onChange={(event) => setCoverImageUrl(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
            <input value={catalogEntryLabel(availableGameSystems, campaign.gameSystem) || campaign.gameSystem || ''} disabled />
            <p className="muted">{catalogEntryDescription(availableGameSystems, campaign.gameSystem)}</p>
            <p className="muted">Definito in creazione. Per cambiare sistema va creata una nuova campagna.</p>
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-key" label="Codice invito" />
            <div className="invite-code-row">
              <input className="invite-code-input" value={campaign.inviteCode} readOnly />
              <button type="button" className="secondary-btn" onClick={copyInviteCode}>
                <Icon name="fa-solid fa-copy" />
                Copia
              </button>
            </div>
            <p className="muted">
              Condividilo per accedere anche quando la campagna non è ricercabile. La chiusura della campagna resta attiva.
            </p>
            {inviteCopyFeedback && <p className="muted invite-copy-feedback">{inviteCopyFeedback}</p>}
          </label>
          <div className="campaign-token-panel">
            <div className="campaign-token-panel-head">
              <div>
                <p className="section-title">Token invito</p>
                <p className="muted">Crea un link opaco con approvazione automatica o manuale.</p>
              </div>
              <span className="readonly-chip">{inviteTokenModeLabel}</span>
            </div>
            <div className="campaign-token-form">
              <label className="campaign-token-switch">
                <FieldLabel icon="fa-solid fa-wand-magic-sparkles" label="Auto join" />
                <label className="switch" aria-label="Auto join token">
                  <input
                    type="checkbox"
                    checked={inviteTokenAutoJoin}
                    onChange={(event) => setInviteTokenAutoJoin(event.target.checked)}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </label>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-calendar-day" label="Scadenza" />
                <input
                  type="datetime-local"
                  value={inviteTokenExpiresAt}
                  onChange={(event) => setInviteTokenExpiresAt(event.target.value)}
                />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-hashtag" label="Max utilizzi" />
                <input
                  type="number"
                  min={1}
                  placeholder="Illimitato"
                  value={inviteTokenMaxUses}
                  onChange={(event) => setInviteTokenMaxUses(event.target.value)}
                />
              </label>
            </div>
            <div className="campaign-token-actions">
              <button type="button" className="primary-btn" onClick={createInviteToken}>
                <Icon name="fa-solid fa-circle-plus" />
                Crea token
              </button>
            </div>
            {inviteTokenFeedback && <p className="muted invite-copy-feedback">{inviteTokenFeedback}</p>}
            {inviteTokenResult && (
              <div className="campaign-token-result">
                <div className="row-between campaign-invite-preview-head">
                  <div className="data-table-primary">
                    <p className="data-table-title">{inviteTokenResult.token}</p>
                    <p className="data-table-secondary">
                      {inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'Approvazione automatica' : 'Richiesta manuale'}
                    </p>
                  </div>
                  <div className="campaign-invite-preview-badges">
                    <span className={`status ${inviteTokenResult.isActive ? 'status-success' : 'status-neutral'}`}>
                      {inviteTokenResult.isActive ? 'Attivo' : 'Disattivo'}
                    </span>
                    <span className={`status ${inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'status-success' : 'status-warning'}`}>
                      {inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'AUTOJOIN' : 'MANUALE'}
                    </span>
                  </div>
                </div>
                <div className="invite-token-copy-row">
                  <input className="invite-code-input" value={inviteTokenResult.token} readOnly />
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteTokenResult.token)
                        setInviteTokenFeedback('Token copiato.')
                      } catch {
                        setInviteTokenFeedback('Copia non disponibile.')
                      }
                    }}
                  >
                    <Icon name="fa-solid fa-copy" />
                    Copia
                  </button>
                </div>
                <p className="data-table-meta">
                  {inviteTokenResult.expiresAt ? `Scade il ${inviteTokenResult.expiresAt}` : 'Nessuna scadenza'}
                  {inviteTokenResult.maxUses ? ` • max ${inviteTokenResult.maxUses} utilizzi` : ' • utilizzi illimitati'}
                </p>
              </div>
            )}
          </div>
          <CampaignToggleSettingsTable
            title="Visibilità e accesso"
            description="Impostazioni di pubblicazione della campagna, con la stessa logica usata in creazione."
            rows={campaignVisibilityRows}
          />
          <CampaignToggleSettingsTable
            title="Addon campagna"
            description="I moduli sono sempre disponibili e puoi accenderli o spegnerli senza ricaricare la lista."
            availableModules={availableModules}
            selectedModules={selectedAvailableModules}
            onToggle={toggleModule}
          />
          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              onSave({
                name,
                description,
                summary,
                setting,
                tone,
                rules,
                requirements,
                coverImageUrl,
                isOpen,
                isSearchable,
                allowedModules: selectedAvailableModules,
              })
            }
          >
            <Icon name="fa-solid fa-floppy-disk" />
            Salva anagrafica
          </button>
          <div className="divider" />
        </>
      )}
      <details className="utility-box">
        <summary className="utility-box-summary">
          <div>
            <p className="section-title">Tabella permessi</p>
            <p className="muted">Apri solo se ti serve vedere i dettagli delle azioni consentite.</p>
          </div>
          <span className="readonly-chip">{permissions.length || permissionChecklist.length} voci</span>
        </summary>
        <div className="utility-box-body">
          <div className="row-between utility-box-actions">
            <p className="muted">Checklist delle azioni realmente disponibili per il tuo ruolo nella campagna attiva.</p>
            <button type="button" className="secondary-btn" onClick={onRefreshPermissions}>
              <Icon name="fa-solid fa-rotate-right" />
              Aggiorna
            </button>
          </div>
          <div className="permission-table">
            {permissionChecklist.map((item) => {
              const permission = permissions.find((entry) => entry.action === item.action)
              const allowed = permission?.allowed ?? false
              return (
                <div key={item.action} className="permission-table-row">
                  <div className="permission-check-main">
                    <span className={`permission-check-icon ${allowed ? 'is-allowed' : 'is-denied'}`}>
                      <Icon name={allowed ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                    </span>
                    <div>
                      <p className="permission-action-name">{item.label}</p>
                      <p className="muted">{item.description}</p>
                    </div>
                  </div>
                  <span className={`status ${allowed ? 'status-success' : 'status-danger'}`}>{allowed ? 'OK' : 'KO'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </details>

      <details className="utility-box">
        <summary className="utility-box-summary">
          <div>
            <p className="section-title">Accessi e opzioni per ruolo</p>
            <p className="muted">Reminder rapido delle azioni disponibili per fascia di ruolo.</p>
          </div>
          <span className="readonly-chip">{permissionReminders.length} fasce</span>
        </summary>
        <div className="utility-box-body">
          <div className="permission-reminders">
            {permissionReminders.map((reminder) => (
              <article key={reminder.role} className="permission-reminder-card">
                <div className="row-between">
                  <p className="permission-role-title">{reminder.role}</p>
                  <span className="status status-info">Remind</span>
                </div>
                <ul className="permission-reminder-list">
                  {reminder.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </details>

      <div className="divider" />
      <label>
        <FieldLabel icon="fa-solid fa-user-pen" label="New owner userId" />
        <input value={newOwnerUserId} placeholder="ID utente del nuovo proprietario" onChange={(event) => setNewOwnerUserId(event.target.value)} />
      </label>
      <button type="button" className="secondary-btn" onClick={() => onTransfer(newOwnerUserId)}>
        <Icon name="fa-solid fa-right-left" />
        Transfer ownership
      </button>

      <div className="divider" />
      {campaign && campaign.founderId !== currentUserId && (
        <div className="leave-campaign-block">
          <p className="muted">Uscendo dalla campagna il tuo personaggio attivo verrà ritirato.</p>
          <button type="button" className="danger-btn" onClick={onLeave}>
            <Icon name="fa-solid fa-right-from-bracket" />
            Esci dalla campagna
          </button>
        </div>
      )}
    </section>
  )
}

function statusTone(status: Character['characterStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'RETIRED') return 'warning'
  if (status === 'DEAD') return 'danger'
  return 'neutral'
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.payload?.fields
      ? ` (${Object.entries(error.payload.fields)
          .map(([key, value]) => `${key}:${value}`)
          .join(', ')})`
      : ''
    return `${error.message}${fields}`
  }
  if (error instanceof Error) return error.message
  return 'Errore non gestito'
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export default App
