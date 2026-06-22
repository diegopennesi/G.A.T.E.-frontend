import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import './App.css'
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
  approveApplication,
  changePassword,
  checkPermission,
  banCampaignMember,
  createCampaign,
  createCharacter,
  discoverCampaigns,
  createMission,
  closeMission,
  cancelMission,
  createRoom,
  getCampaign,
  getCampaignMember,
  getCampaignMembers,
  listCampaignGameSystems,
  listCampaignModules,
  listCampaignMembersForManagement,
  getCharacter,
  getCharacterSheet,
  getMe,
  getPublicProfile,
  joinMission,
  leaveCampaign,
  leaveMission,
  listCharacters,
  listMyCampaignMemberships,
  listPendingApplications,
  listMissions,
  listRooms,
  login,
  logout,
  register,
  rejectApplication,
  reopenMission,
  requestPasswordReset,
  confirmPasswordReset,
  updateAdminCampaign,
  updateAdminGameSystem,
  updateAdminSheetType,
  updateAdminUser,
  updateMission,
  updateMissionParticipationType,
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
} from './types/domain'

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

type ProfileDraft = {
  profileName: string
  bio: string
  whatsapp: string
  instagram: string
  otherSocial: string
}

const CAMPAIGN_ID_KEY = 'gate_campaign_id'
const KNOWN_CAMPAIGNS_KEY = 'gate_known_campaign_ids'
const KNOWN_CAMPAIGN_META_KEY = 'gate_known_campaign_meta'
const THEME_KEY = 'gate_theme'
const PENDING_APPLICATIONS_CACHE_KEY = 'gate_pending_applications_cache'
const LEGACY_CAMPAIGN_ID_KEY = CAMPAIGN_ID_KEY
const LEGACY_KNOWN_CAMPAIGNS_KEY = KNOWN_CAMPAIGNS_KEY
const LEGACY_KNOWN_CAMPAIGN_META_KEY = KNOWN_CAMPAIGN_META_KEY

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

type CampaignAccessBadgeKind = 'edit' | 'player' | 'outside' | 'pending' | 'blocked' | 'banned'
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
      'Seleziona PG',
      'Crea Personaggio',
      'Profilo Membro Campagna',
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
  Missioni: 'MISSIONI',
  Stanze: 'STANZE',
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`${name} ${className}`.trim()} />
}

function FieldLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="field-label-with-icon">
      <Icon name={icon} className="field-label-icon" />
      <span>{label}</span>
    </span>
  )
}

function CampaignAccessIcon({ kind }: { kind: CampaignAccessBadgeKind }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (kind) {
    case 'edit':
      return (
        <svg {...commonProps}>
          <path d="M12 3.5 19 6v5c0 4.5-2.6 7.9-7 10-4.4-2.1-7-5.5-7-10V6l7-2.5Z" />
          <path d="m14.5 9.5 1 1" />
          <path d="m10 15 4.2-4.2a1.2 1.2 0 0 1 1.7 0l1.3 1.3a1.2 1.2 0 0 1 0 1.7L13 18H10v-3Z" />
        </svg>
      )
    case 'player':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19c1.1-3.1 3.5-4.7 6.5-4.7s5.4 1.6 6.5 4.7" />
        </svg>
      )
    case 'pending':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.8V12l2.7 1.8" />
        </svg>
      )
    case 'blocked':
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="9" rx="2" />
          <path d="M8.5 10V8.2a3.5 3.5 0 0 1 7 0V10" />
        </svg>
      )
    case 'banned':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )
    case 'outside':
    default:
      return (
        <svg {...commonProps}>
          <path d="M6 5h8v14H6z" />
          <path d="M14 6.5 18.5 8.8v6.4L14 17.5" />
          <path d="M10.5 12h4.5" />
        </svg>
      )
  }
}

function CampaignAccessBadge({ item }: { item: CampaignDiscoverResponse }) {
  const badge = (() => {
    if (item.membershipStatus === 'APPROVED') {
      if (item.membershipRole === 'MASTER') {
        return { kind: 'edit' as const, label: 'MASTER', title: 'Ruolo campagna: MASTER' }
      }
      if (item.membershipRole === 'SUPER_MASTER') {
        return { kind: 'edit' as const, label: 'SUPER MASTER', title: 'Ruolo campagna: SUPER MASTER' }
      }
      if (item.membershipRole === 'CO_MASTER') {
        return { kind: 'edit' as const, label: 'CO-MASTER', title: 'Ruolo campagna: CO-MASTER' }
      }
      return { kind: 'player' as const, label: 'GIOCATORE', title: 'Ruolo campagna: GIOCATORE' }
    }
    if (item.membershipStatus === 'PENDING') {
      return { kind: 'pending' as const, label: 'IN ATTESA', title: 'Richiesta di accesso in attesa' }
    }
    if (item.membershipStatus === 'BLOCKED') {
      return { kind: 'blocked' as const, label: 'BLOCCATO', title: 'Membership sospesa' }
    }
    if (item.membershipStatus === 'BANNED') {
      return { kind: 'banned' as const, label: 'BANNATO', title: 'Membership bannata' }
    }
    return { kind: 'outside' as const, label: 'FUORI', title: 'Non fai parte della campagna' }
  })()

  return (
    <span className="campaign-access-badge" title={badge.title} aria-label={badge.title}>
      <span className={`campaign-access-icon is-${badge.kind}`} aria-hidden="true">
        <CampaignAccessIcon kind={badge.kind} />
      </span>
      <span className="campaign-access-label">{badge.label}</span>
    </span>
  )
}

function CampaignStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`campaign-status-badge ${isActive ? 'is-active' : 'is-disabled'}`}>
      {isActive ? 'Attiva' : 'Disattivata'}
    </span>
  )
}

function MissionTinyIcon({ kind }: { kind: 'clock' | 'calendar' | 'group' | 'target' | 'repeat' | 'edit' | 'person' }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (kind) {
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="4.5" y="6" width="15" height="13" rx="2" />
          <path d="M8 3.5v4" />
          <path d="M16 3.5v4" />
          <path d="M4.5 9h15" />
        </svg>
      )
    case 'group':
      return (
        <svg {...props}>
          <circle cx="8" cy="9" r="2.2" />
          <circle cx="16" cy="9" r="2.2" />
          <path d="M4.8 18c.8-2.7 2.9-4.1 5.2-4.1" />
          <path d="M19.2 18c-.8-2.7-2.9-4.1-5.2-4.1" />
        </svg>
      )
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'repeat':
      return (
        <svg {...props}>
          <path d="M6.5 8.5A7 7 0 0 1 19 11" />
          <path d="M18 6v5h-5" />
          <path d="M17.5 15.5A7 7 0 0 1 5 13" />
          <path d="M6 19v-5h5" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...props}>
          <path d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10z" />
          <path d="M13.5 7.5l3 3" />
        </svg>
      )
    case 'person':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19c1.2-3.1 3.4-4.7 6.5-4.7s5.3 1.6 6.5 4.7" />
        </svg>
      )
    case 'clock':
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      )
  }
}

function MissionStatusIcon({ status }: { status: MissionStatus }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (status) {
    case 'OPEN':
      return (
        <svg {...commonProps}>
          <path d="M7 12h10" />
          <path d="M12 7l5 5-5 5" />
          <path d="M5.5 19h13" />
        </svg>
      )
    case 'REOPENED':
      return (
        <svg {...commonProps}>
          <path d="M6.5 8.5A8 8 0 1 1 6 15" />
          <path d="M6 4.5v4h4" />
        </svg>
      )
    case 'CONFIRMED':
      return (
        <svg {...commonProps}>
          <path d="M5.5 12.5 10 17l8.5-10" />
          <path d="M4.5 6h15" />
        </svg>
      )
    case 'CANCELLED':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )
    case 'CLOSED':
    default:
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="9" rx="2" />
          <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
        </svg>
      )
  }
}

function MissionStatusBadge({ status, sessionAt }: { status: MissionStatus; sessionAt?: string | null }) {
  const label = (() => {
    switch (status) {
      case 'OPEN':
        return 'ATTIVA'
      case 'REOPENED':
        return 'ATTIVA'
      case 'CONFIRMED':
        return sessionAt && new Date(sessionAt).getTime() <= Date.now() ? 'COMPLETATA' : 'CONFERMATA'
      case 'CLOSED':
        return 'CHIUSA'
      case 'CANCELLED':
        return 'ANNULLATA'
      default:
        return status
    }
  })()

  return (
    <span className={`mission-status mission-status-${status.toLowerCase()}`}>
      <span className="mission-status-icon" aria-hidden="true">
        <MissionStatusIcon status={status} />
      </span>
      <span>{label}</span>
    </span>
  )
}

function MissionParticipationBadge({ participationType }: { participationType: MissionParticipationType }) {
  const isTitolare = participationType === 'TITOLARE'
  return (
    <span className={`mission-participation ${isTitolare ? 'is-titolare' : 'is-backup'}`}>
      <span className="mission-status-icon" aria-hidden="true">
        {isTitolare ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19c1.1-3.1 3.5-4.7 6.5-4.7s5.4 1.6 6.5 4.7" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7.5h8" />
            <path d="M8 12h8" />
            <path d="M8 16.5h8" />
            <rect x="5" y="5" width="14" height="14" rx="3" />
          </svg>
        )}
      </span>
      <span>{isTitolare ? 'TITOLARE' : 'PANCHINA'}</span>
    </span>
  )
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

  const [missions, setMissions] = useState<MissionResponse[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [lastMissionAction, setLastMissionAction] = useState<MissionParticipantResponse | null>(null)
  const [missionCharacters, setMissionCharacters] = useState<Character[]>([])

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

  const selectedMission = useMemo(
    () => missions.find((mission) => mission.id === selectedMissionId) || null,
    [missions, selectedMissionId],
  )
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
  const canCreateMissions = activeCampaignRole === 'CO_MASTER' || activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER'
  const canAccessCampaignManagement =
    activeCampaignRole === 'CO_MASTER' || activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER'
  const missionWindowSince = () => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const campaignsForList = useMemo(() => {
    const byId = new Map<string, CampaignDiscoverResponse>()
    for (const item of discoverableCampaigns) {
      byId.set(item.id, item)
    }

    for (const membership of myCampaigns) {
      const existing = byId.get(membership.campaignId)
      if (existing) {
        byId.set(membership.campaignId, {
          ...existing,
          membershipStatus: membership.memberStatus,
          membershipRole: membership.role,
          moderationReason: membership.moderationReason,
          name: existing.name || membership.campaignName,
        })
      } else {
        byId.set(membership.campaignId, {
          id: membership.campaignId,
          name: membership.campaignName,
          description: null,
          summary: null,
          coverImageUrl: null,
          founderId: '',
          isOpen: true,
          isActive: true,
          isSearchable: false,
          createdAt: '',
          membershipStatus: membership.memberStatus,
          membershipRole: membership.role,
          moderationReason: membership.moderationReason,
        })
      }
    }

    return Array.from(byId.values())
  }, [discoverableCampaigns, myCampaigns])
  const campaignIsActiveForCurrentUser = (campaignToCheck: string) => {
    if (isSystemRole) return true
    const visibleCampaign = campaignsForList.find((item) => item.id === campaignToCheck)
    return visibleCampaign?.isActive === true
  }
  const canShowCampaignInNavbar = (role: CampaignRole | null | undefined) => {
    if (isSystemRole) return true
    return role === 'CO_MASTER' || role === 'MASTER' || role === 'SUPER_MASTER'
  }
  const selectableCampaigns = useMemo<CampaignPickerCampaign[]>(() => {
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
  }, [campaignIsActiveForCurrentUser, campaignsForList, myCampaigns, canShowCampaignInNavbar, isSystemRole, campaignId])
  const isCampaignScope = (value: Screen) =>
    value === 'Lista Campagne' ||
    value === 'Crea Campagna' ||
    value === 'Scheda Campagna' ||
    value === 'Approvazione Accessi' ||
    value === 'Gestione Personaggi' ||
    value === 'Scheda PG' ||
    value === 'Profilo Membro Campagna' ||
    value === 'Crea Personaggio'
  const isCharacterScope = (value: Screen) =>
    value === 'Gestione Personaggi' || value === 'Scheda PG' || value === 'Crea Personaggio'

  const addEvent = (text: string, level: UiEvent['level']) => {
    setEvents((prev) => [{ id: `${Date.now()}`, ts: new Date().toISOString(), text, level }, ...prev].slice(0, 50))
  }

  const requiresCampaignSelection = (value: Screen) => CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(value)

  const rememberCampaignId = (id: string) => {
    const trimmed = id.trim()
    setCampaignId(trimmed)
    const storageKey = scopedStorageKey(CAMPAIGN_ID_KEY, activeUserId)
    if (trimmed) {
      localStorage.setItem(storageKey, trimmed)
      setKnownCampaignIds((prev) => {
        const next = Array.from(new Set([trimmed, ...prev]))
        localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGNS_KEY, activeUserId), JSON.stringify(next))
        return next
      })
    } else {
      localStorage.removeItem(storageKey)
    }
  }

  const rememberCampaignMeta = (id: string, name: string) => {
    setKnownCampaignMeta((prev) => {
      const next = [{ id, name }, ...prev.filter((item) => item.id !== id)]
      localStorage.setItem(scopedStorageKey(KNOWN_CAMPAIGN_META_KEY, activeUserId), JSON.stringify(next))
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
        rememberCampaignId('')
        setCampaign(null)
        setMembers([])
        setCampaignMembersForManagement([])
        setCanManageCampaignMembers(false)
        setPendingApplications([])
        setSelectedCampaignMember(null)
        setSelectedCampaignMemberProfile(null)
        setCharacters([])
        setMissions([])
        setRooms([])
      } else if (campaignId && !mine.some((item) => item.campaignId === campaignId && item.memberStatus === 'APPROVED')) {
        rememberCampaignId('')
        setCampaign(null)
        setMembers([])
        setCampaignMembersForManagement([])
        setCanManageCampaignMembers(false)
        setPendingApplications([])
        setSelectedCampaignMember(null)
        setSelectedCampaignMemberProfile(null)
        setCharacters([])
        setMissions([])
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
    rememberCampaignMeta(campaignValue.id, campaignValue.name)
    setMembers(memberValue)
    setCampaignMembersForManagement(memberManagementValue)
    setCanManageCampaignMembers(canManageMembersPermission)
    setPendingApplications(pendingValue)
    writePendingApplicationsForCampaign(activeUserId, targetCampaignId, pendingValue)
    setCharacters(characterValue)
    setMissions(missionValue)
    setRooms(roomValue)
    setSelectedCharacterId((prev) => prev || characterValue[0]?.id || '')
    setSelectedMissionId((prev) => prev || missionValue[0]?.id || '')
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
    setSelectedMissionId('')
    setLastMissionAction(null)
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
      setLastMissionAction(null)
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

  const refreshMissions = async () => {
    const approvedCampaignIds = approvedCampaignMemberships.map((membership) => membership.campaignId)
    if (approvedCampaignIds.length === 0) {
      setMissions([])
      setSelectedMissionId('')
      return
    }

    const settled = await Promise.allSettled(
      approvedCampaignIds.map(async (targetCampaignId) => {
        const list = await listMissions(targetCampaignId, missionWindowSince())
        return list.map((mission) => ({ ...mission, campaignId: targetCampaignId }))
      }),
    )

    const combined = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
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
        case 'CANCELLED':
        default:
          return 4
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
    setSelectedMissionId((prev) => (nextMissions.some((item) => item.id === prev) ? prev : nextMissions[0]?.id || ''))
  }

  const refreshMissionCharacters = async () => {
    const approvedCampaignIds = approvedCampaignMemberships.map((membership) => membership.campaignId)
    if (approvedCampaignIds.length === 0) {
      setMissionCharacters([])
      return
    }

    const settled = await Promise.allSettled(approvedCampaignIds.map((targetCampaignId) => listCharacters(targetCampaignId)))
    const combined = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    const nextCharacters = combined.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    setMissionCharacters(nextCharacters)
  }

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Missioni') return

    let cancelled = false
    void (async () => {
      try {
        await refreshMissions()
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

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Missioni') return

    let cancelled = false
    void (async () => {
      try {
        await refreshMissionCharacters()
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Personaggi missioni caricati: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, approvedCampaignMemberships, campaignId])

  const loadCharactersForManagement = async () => {
    const activeCampaignId = campaignId.trim()
    const canManageActiveCampaign = approvedCampaignMemberships.some((item) => item.campaignId === activeCampaignId)
    if (!activeCampaignId || !canManageActiveCampaign) {
      setCharacters([])
      setSelectedCharacterId('')
      setCharacterDetail(null)
      setCharacterSheetDetail(null)
      return
    }
    const nextCharacters = await listCharacters(activeCampaignId)
    nextCharacters.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    setCharacters(nextCharacters)
    setSelectedCharacterId((prev) => (nextCharacters.some((item) => item.id === prev) ? prev : nextCharacters[0]?.id || ''))
  }

  const loadPendingForActiveCampaign = async () => {
    if (!campaignId.trim()) return
    const list = await listPendingApplications(campaignId)
    setPendingApplications(list)
    writePendingApplicationsForCampaign(activeUserId, campaignId, list)
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

    rememberCampaignId('')
    clearCampaignWorkspace()
    if (screen !== 'Lista Campagne') {
      setScreen('Lista Campagne')
    }
  }, [activeCampaignIsEnabled, activeCampaignListEntry?.isActive, campaign?.isActive, campaignId, isSystemRole, screen])
  useEffect(() => {
    if (hasActiveCampaign) return
    if (screen !== 'Scheda Campagna' && screen !== 'Gestione Campagna' && screen !== 'Stanze') return
    if (isCampaignPickerOpen && campaignPickerTarget === screen) return
    openCampaignPicker(screen)
  }, [screen, hasActiveCampaign, isCampaignPickerOpen, campaignPickerTarget])

  useEffect(() => {
    if (screen !== 'Approvazione Accessi') return
    if (canAccessCampaignManagement) return
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
    if (screen !== 'Crea Campagna' && screen !== 'Gestione Campagna') return
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

  const handleLogout = () => {
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
    setMissionCharacters([])
    setRooms([])
    setPermissions([])
    setCharacterDetail(null)
    setCharacterSheetDetail(null)
    setLastMissionAction(null)
    setSelectedCharacterId('')
    setSelectedMissionId('')
    setError('')
    setSystemAdminView('users')
    addEvent('Logout eseguito', 'info')
  }

  const activeUserId = profile?.id ?? null

  useEffect(() => {
    if (!isSystemSession) {
      setAdminUsersPage(null)
      setAdminUsersPageIndex(0)
      setAdminUsersDrafts({})
      setAdminCampaignsPage(null)
      setAdminCampaignsPageIndex(0)
      setAdminCampaignsDrafts({})
      setAdminGameSystems([])
      setAdminSheetTypes([])
      setAdminSheetCatalogsLoaded(false)
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
    const legacyCampaignId = localStorage.getItem(LEGACY_CAMPAIGN_ID_KEY) || ''
    const nextCampaignId = scopedCampaignId || legacyCampaignId

    const scopedKnownCampaignIds = readStoredJson<string[]>(localStorage, scopedKnownCampaignIdsKey, [])
    const legacyKnownCampaignIds = readStoredJson<string[]>(localStorage, LEGACY_KNOWN_CAMPAIGNS_KEY, [])
    const nextKnownCampaignIds = scopedKnownCampaignIds.length > 0 ? scopedKnownCampaignIds : legacyKnownCampaignIds

    const scopedKnownCampaignMeta = readStoredJson<KnownCampaignMeta[]>(localStorage, scopedKnownCampaignMetaKey, [])
    const legacyKnownCampaignMeta = readStoredJson<KnownCampaignMeta[]>(localStorage, LEGACY_KNOWN_CAMPAIGN_META_KEY, [])
    const nextKnownCampaignMeta = scopedKnownCampaignMeta.length > 0 ? scopedKnownCampaignMeta : legacyKnownCampaignMeta

    const scopedPendingApplications = readPendingApplicationsCache(activeUserId)
    const legacyPendingApplications = readPendingApplicationsCache(null)
    const nextPendingApplications = nextCampaignId ? scopedPendingApplications[nextCampaignId] || legacyPendingApplications[nextCampaignId] || [] : []

    if (!scopedCampaignId && legacyCampaignId) {
      localStorage.setItem(scopedCampaignKey, legacyCampaignId)
    }
    if (scopedKnownCampaignIds.length === 0 && legacyKnownCampaignIds.length > 0) {
      localStorage.setItem(scopedKnownCampaignIdsKey, JSON.stringify(legacyKnownCampaignIds))
    }
    if (scopedKnownCampaignMeta.length === 0 && legacyKnownCampaignMeta.length > 0) {
      localStorage.setItem(scopedKnownCampaignMetaKey, JSON.stringify(legacyKnownCampaignMeta))
    }
    if (nextCampaignId && !scopedPendingApplications[nextCampaignId] && legacyPendingApplications[nextCampaignId]) {
      writePendingApplicationsForCampaign(activeUserId, nextCampaignId, legacyPendingApplications[nextCampaignId])
    }

    setCampaignId(nextCampaignId)
    setKnownCampaignIds(nextKnownCampaignIds)
    setKnownCampaignMeta(nextKnownCampaignMeta)
    setPendingApplications(nextPendingApplications)
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
  const campaignArea = isCampaignScope(screen)
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
  const activeCampaignName = campaign?.name || activeCampaignMembership?.campaignName || 'non impostata'
  const activeCampaignIsClickable = isSystemRole || campaignId.trim().length === 0 || activeCampaignIsEnabled
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
  const campaignNameForCharacter = (character: Character) => {
    if (!character.campaignId) return 'Campagna non assegnata'
    return campaignNameById[character.campaignId] || character.campaignId
  }
  const canOpenCharacterSheet = (character: Character) => {
    if (character.userId === profile.id) return true
    const role = character.campaignId ? approvedRoleByCampaignId[character.campaignId] : undefined
    if (character.isNpc) {
      return role === 'CO_MASTER' || role === 'MASTER' || role === 'SUPER_MASTER'
    }
    return role === 'MASTER' || role === 'SUPER_MASTER'
  }
  const canMarkCharacterDead = (character: Character | null) => {
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
                                  <label className="system-status-option" aria-label={`${item.name} aperta`}>
                                    <span className="system-status-label">
                                      <strong>Aperta</strong>
                                      <small>Può ricevere applicazioni e accessi.</small>
                                    </span>
                                    <span className="switch system-user-switch">
                                      <input
                                        type="checkbox"
                                        checked={draft.isOpen}
                                        onChange={(event) =>
                                          setAdminCampaignsDrafts((prev) => ({
                                            ...prev,
                                            [item.id]: {
                                              ...draft,
                                              isOpen: event.target.checked,
                                            },
                                          }))
                                        }
                                      />
                                      <span className="switch-track" aria-hidden="true">
                                        <span className="switch-thumb" />
                                      </span>
                                    </span>
                                  </label>
                                  <label className="system-status-option" aria-label={`${item.name} attiva`}>
                                    <span className="system-status-label">
                                      <strong>Attiva</strong>
                                      <small>Campagna abilitata nel sistema.</small>
                                    </span>
                                    <span className="switch system-user-switch">
                                      <input
                                        type="checkbox"
                                        checked={draft.isActive}
                                        onChange={(event) =>
                                          setAdminCampaignsDrafts((prev) => ({
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
                                    </span>
                                  </label>
                                  <label className="system-status-option" aria-label={`${item.name} cercabile`}>
                                    <span className="system-status-label">
                                      <strong>Cercabile</strong>
                                      <small>Compare nei cataloghi e nelle ricerche.</small>
                                    </span>
                                    <span className="switch system-user-switch">
                                      <input
                                        type="checkbox"
                                        checked={draft.isSearchable}
                                        onChange={(event) =>
                                          setAdminCampaignsDrafts((prev) => ({
                                            ...prev,
                                            [item.id]: {
                                              ...draft,
                                              isSearchable: event.target.checked,
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
              <p className="brand-subtitle">Interfaccia operativa</p>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="sidebar-context">
          <p className="sidebar-user-kicker">Campagna attiva</p>
          <p className="sidebar-context-title">{hasActiveCampaign ? activeCampaignLabel : 'Nessuna campagna attiva'}</p>
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
                      if (requiresCampaignSelection(item) && !hasActiveCampaign) {
                        openCampaignPicker(item)
                        return
                      }
                      goToScreen(item)
                    }}
                      disabled={isDisabled}
                    title={
                      itemState.title
                    }
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
          <div className="inline-actions topbar-actions">
            <button
              type="button"
              className={`campaign-context-pill ${!activeCampaignIsClickable ? 'is-disabled' : ''}`}
              onClick={() =>
                activeCampaignIsClickable &&
                openCampaignPicker(campaignArea ? screen : screen === 'Gestione Campagna' ? 'Gestione Campagna' : 'Scheda Campagna')
              }
              disabled={!activeCampaignIsClickable}
              aria-disabled={!activeCampaignIsClickable}
              title={!activeCampaignIsClickable ? 'Campagna disattivata: non selezionabile' : undefined}
            >
              <span className="campaign-context-label">Campagna attiva</span>
              <span className="campaign-context-name">
                {activeCampaignName}
                {!activeCampaignIsClickable && <span className="campaign-context-badge">Disattivata</span>}
              </span>
            </button>
            {pageContext.backTarget && (
              <button type="button" className="refresh-btn" onClick={() => goToScreen(pageContext.backTarget as Screen)}>
                <Icon name="fa-solid fa-arrow-left" />
                <span>Indietro</span>
              </button>
            )}
            <button type="button" className="refresh-btn" disabled={busy} onClick={() => void refreshProfile()}>
              <Icon name="fa-solid fa-rotate-right" />
              <span>Refresh profilo</span>
            </button>
            {campaignArea && (
              <button type="button" className="refresh-btn" disabled={busy} onClick={() => void refreshCampaignBlock()}>
                <Icon name="fa-solid fa-arrows-rotate" />
                <span>Refresh campagna</span>
              </button>
            )}
          </div>
        </header>

        {error && <section className="panel error">{error}</section>}

        {screen === 'Lista Campagne' && (
          <CampaignListPage
            campaigns={campaignsForList}
            founderNames={campaignFounderNames}
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
            currentUserId={profile.id}
            members={campaignMembersForManagement.length > 0 ? campaignMembersForManagement : members}
            memberNames={memberNames}
            availableModules={campaignModules}
            availableGameSystems={campaignGameSystems}
            onReload={() => void refreshCampaignBlock()}
            onOpenMember={(userId) =>
              run('Profilo membro caricato', async () => {
                if (!campaignId.trim()) return
                const [membership, profileValue] = await Promise.all([
                  getCampaignMember(campaignId, userId),
                  getPublicProfile(userId),
                ])
                setSelectedCampaignMember(membership)
                setSelectedCampaignMemberProfile(profileValue)
                setScreen('Profilo Membro Campagna')
              })
            }
            onOpenManagement={() =>
              campaign?.id && void activateCampaignAndNavigate(campaign.id, 'Gestione Campagna')
            }
            onOpenSelectPg={() =>
              campaign?.id && void activateCampaignAndNavigate(campaign.id, 'Seleziona PG')
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
            missionCharacters={missionCharacters}
            selectedMission={selectedMission}
            lastMissionAction={lastMissionAction}
            canCreateMissions={canCreateMissions}
            currentUserId={profile?.id || ''}
            activeCampaignId={campaignId.trim()}
            activeCampaignRole={activeCampaignRole}
            campaignNameById={campaignNameById}
            onCreate={(payload) =>
              run('Missione creata', async () => {
                const created = await createMission(campaignId, payload)
                setSelectedMissionId(created.id)
                await refreshMissions()
              })
            }
            onSelectMission={setSelectedMissionId}
            onReopen={(mission) =>
              run('Missione riaperta', async () => {
                await reopenMission(mission.campaignId, mission.id)
                await refreshMissions()
              })
            }
            onClose={(mission) =>
              run('Missione chiusa', async () => {
                await closeMission(mission.campaignId, mission.id)
                await refreshMissions()
              })
            }
            onUpdate={(mission, payload) =>
              run('Missione aggiornata', async () => {
                await updateMission(mission.campaignId, mission.id, payload)
                await refreshMissions()
              })
            }
            onCancel={(mission) =>
              run('Missione cancellata', async () => {
                await cancelMission(mission.campaignId, mission.id)
                await refreshMissions()
              })
            }
            onJoin={(mission, characterId, participationType) =>
              run('Join missione completato', async () => {
                const result = await joinMission(mission.campaignId, mission.id, { characterId, participationType })
                setLastMissionAction(result)
                await refreshMissions()
              })
            }
            onLeave={(mission) =>
              run('Leave missione completato', async () => {
                const result = await leaveMission(mission.campaignId, mission.id)
                setLastMissionAction(result)
                await refreshMissions()
              })
            }
            onUpdateParticipationType={(mission, participationType) =>
              run('Ruolo missione aggiornato', async () => {
                const result = await updateMissionParticipationType(mission.campaignId, mission.id, { participationType })
                setLastMissionAction(result)
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
            canMarkCharacterDead={canMarkCharacterDead}
            onUpdateStatus={(status) =>
              run('Stato personaggio aggiornato', async () => {
                if (!selectedCharacter) return
                const targetCampaignId = selectedCharacter.campaignId || campaignId
                if (!targetCampaignId) return
                const updated = await updateCharacterStatus(targetCampaignId, selectedCharacter.id, status)
                setCharacters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                setCharacterDetail(updated)
              })
            }
          />
        )}

        {screen === 'Gestione Campagna' && (
          <CampaignManagementPage
            campaign={campaign}
            availableModules={campaignModules}
            availableGameSystems={campaignGameSystems}
            permissions={permissions}
            onSave={(payload) =>
              campaign?.id &&
              run('Campagna aggiornata', async () => {
                const updated = await updateCampaign(campaign.id, payload)
                setCampaign(updated)
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
              })
            }
            currentUserId={profile.id}
            onLeave={openLeaveCampaignModal}
          />
        )}

        {screen === 'Profilo Membro Campagna' && selectedCampaignMember && selectedCampaignMemberProfile && (
          <CampaignMemberProfilePage
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
            characters={characters}
            onApply={(characterId) =>
              run('Apply con personaggio inviato', async () => {
                await applyToCampaign(campaignId, characterId)
              })
            }
          />
        )}

        {screen === 'Crea Personaggio' && (
          <CreateCharacterPage
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

function AuthScreen({ onAuth }: { onAuth: (session: AuthSession) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileName, setProfileName] = useState('')
  const [bio, setBio] = useState('')
  const [resetSeed, setResetSeed] = useState('')
  const [resetExpiresAt, setResetExpiresAt] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const resetRecoveryState = () => {
    setResetSeed('')
    setResetExpiresAt('')
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryStep('request')
    setInfo('')
  }

  const switchMode = (nextMode: typeof mode) => {
    setMode(nextMode)
    setError('')
    if (nextMode !== 'recover') {
      resetRecoveryState()
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await onAuth(await login(username, password))
        return
      }

      if (mode === 'register') {
        await onAuth(await register({ username, password, profileName, bio }))
        return
      }

      if (recoveryStep === 'request') {
        const response = await requestPasswordReset(username)
        setResetSeed(response.resetSeed)
        setResetExpiresAt(response.expiresAt)
        setRecoveryStep('confirm')
        setInfo('Seed di reset generato. Usa il seed ricevuto per confermare il reset.')
        return
      }

      if (newPassword !== confirmPassword) {
        throw new Error('La nuova password e la conferma non coincidono')
      }

      await onAuth(
        await confirmPasswordReset({
          resetSeed,
          newPassword,
        }),
      )
    } catch (err) {
      setError(toMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-side">
        <h1>Taverna del Codice</h1>
        <p>Frontend reale su API backend. Scope: tutte le pagine tranne chat.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-mode-picker" role="tablist" aria-label="Accesso e password">
            {[
              {
                key: 'login' as const,
                label: 'Login',
                hint: 'Entra con username e password.',
              },
              {
                key: 'register' as const,
                label: 'Registrazione',
                hint: 'Crea un nuovo account con profilo base.',
              },
              {
                key: 'recover' as const,
                label: 'Recupero password',
                hint: 'Richiedi un seed e conferma il reset in due passi.',
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`auth-mode-pill ${mode === item.key ? 'is-active' : ''}`}
                onClick={() => switchMode(item.key)}
                title={item.hint}
                aria-label={`${item.label}. ${item.hint}`}
              >
                <span>{item.label}</span>
                <span className="auth-mode-hint" aria-hidden="true">
                  {item.hint}
                </span>
              </button>
            ))}
          </div>
          <h2>{mode === 'login' ? 'Login' : mode === 'register' ? 'Registrazione' : 'Recupero password'}</h2>
          {mode === 'recover' && (
            <p className="auth-note">
              Il reset è pubblico e avviene in due passaggi. Prima richiedi un seed, poi confermi il reset con il seed e la nuova password.
            </p>
          )}
          {mode !== 'recover' && (
            <label>
              Username
              <input required value={username} placeholder="Il tuo username" onChange={(event) => setUsername(event.target.value)} />
            </label>
          )}
          {mode === 'login' && (
            <label>
              Password
              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          {mode === 'register' && (
            <>
              <label>
                Password
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label>
                Profile Name
                <input value={profileName} placeholder="Nome profilo" onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <label>
                Bio
                <textarea rows={3} placeholder="Breve presentazione del tuo profilo" value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>
            </>
          )}
          {mode === 'recover' && (
            <>
              {recoveryStep === 'request' ? (
                <label>
                  Username
                  <input
                    required
                    value={username}
                    placeholder="Username dell'account"
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <div className="auth-result-box">
                    <p className="auth-result-label">Seed di reset</p>
                    <p className="auth-result-value">{resetSeed}</p>
                    <p className="auth-result-meta">Scadenza: {resetExpiresAt || 'n/d'}</p>
                  </div>
                  <label>
                    Reset seed
                    <input required value={resetSeed} placeholder="Seed ricevuto dal request" onChange={(event) => setResetSeed(event.target.value)} />
                  </label>
                  <label>
                    Nuova password
                    <input
                      required
                      type="password"
                      placeholder="Nuova password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <label>
                    Conferma nuova password
                    <input
                      required
                      type="password"
                      placeholder="Ripeti la nuova password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          {info && <p className="auth-note">{info}</p>}
          {mode === 'recover' ? (
            <button className="primary-btn" disabled={busy} type="submit">
              {busy ? 'Attendere...' : recoveryStep === 'request' ? 'Richiedi seed' : 'Conferma reset'}
            </button>
          ) : (
            <button className="primary-btn" disabled={busy} type="submit">
              {busy ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          )}
        </form>
      </section>
    </div>
  )
}

function CampaignListPage({
  campaigns,
  founderNames,
  onDiscover,
  onOpenCampaign,
  onApplyCampaign,
  onCreateCampaign,
  activeCampaignName,
}: {
  campaigns: CampaignDiscoverResponse[]
  founderNames: Record<string, string>
  onDiscover: () => void
  onOpenCampaign: (campaignId: string) => void
  onApplyCampaign: (campaignId: string) => void
  onCreateCampaign: () => void
  activeCampaignName: string
}) {
  return (
    <section className="panel">
      <div className="row-between">
        <h2>Lista Campagne</h2>
        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onDiscover}>
            Cerca campagne
          </button>
          <button type="button" className="primary-btn" onClick={onCreateCampaign}>
            Crea campagna
          </button>
        </div>
      </div>
      {activeCampaignName && <p className="muted">Campagna attiva: <strong>{activeCampaignName}</strong></p>}
      {campaigns.length === 0 && <p className="muted">Nessuna campagna visibile. Premi "Cerca campagne".</p>}
      {campaigns.length > 0 && (
        <ul className="list-reset">
          {campaigns.map((item) => {
            const moderationTooltip =
              (item.membershipStatus === 'BLOCKED' || item.membershipStatus === 'BANNED') && item.moderationReason
                ? item.moderationReason
                : null
            const isDisabled = !item.isActive
            return (
              <li key={item.id} className={`line-item campaign-item ${isDisabled ? 'is-disabled' : ''}`}>
                <div className="campaign-item-main">
                  <div className="campaign-item-header">
                    <div className="campaign-title-wrap">
                      <p className="character-name">{item.name}</p>
                      {isDisabled && <span className="campaign-state-badge">Disattivata</span>}
                    </div>
                    <CampaignAccessBadge item={item} />
                  </div>
                  <p className="campaign-status-line">
                    Stato campagna: <CampaignStatusBadge isActive={item.isActive} />
                  </p>
                  <p className="muted">{item.summary || item.description || 'Nessuna descrizione'}</p>
                  {item.founderId && (
                    <p className="campaign-creator">
                      Creatore: {founderNames[item.founderId] || item.founderId}
                    </p>
                  )}
                </div>
                <div className="inline-actions campaign-item-actions">
                  {item.membershipStatus === 'APPROVED' && !isDisabled && (
                    <button type="button" className="secondary-btn" onClick={() => onOpenCampaign(item.id)}>
                      Apri e attiva
                    </button>
                  )}
                  {item.membershipStatus === 'APPROVED' && isDisabled && (
                    <button type="button" className="secondary-btn" disabled title="Campagna disattivata">
                      Disattivata
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
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function CreateCampaignPage({
  availableModules,
  availableGameSystems,
  onCreate,
}: {
  availableModules: CampaignCatalogEntry[]
  availableGameSystems: CampaignCatalogEntry[]
  onCreate: (payload: {
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
    gameSystem: string
    allowedModules: string[]
  }) => void
}) {
  const [name, setName] = useState('Nuova Campagna')
  const [description, setDescription] = useState('')
  const [summary, setSummary] = useState('')
  const [setting, setSetting] = useState('')
  const [tone, setTone] = useState('')
  const [rules, setRules] = useState('')
  const [requirements, setRequirements] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [isSearchable, setIsSearchable] = useState(true)
  const [selectedGameSystem, setSelectedGameSystem] = useState('DND5E')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false)

  useEffect(() => {
    if (availableModules.length === 0) return
    setSelectedModules((prev) => {
      if (prev.length === 0) return availableModules.map((module) => module.code)
      const allowed = new Set(availableModules.map((module) => module.code))
      return prev.filter((moduleCode) => allowed.has(moduleCode))
    })
  }, [availableModules])

  useEffect(() => {
    if (availableGameSystems.length === 0) {
      setSelectedGameSystem('DND5E')
      return
    }
    setSelectedGameSystem((prev) => {
      const allowed = new Set(availableGameSystems.map((item) => item.code))
      return allowed.has(prev) ? prev : availableGameSystems[0]?.code || 'DND5E'
    })
  }, [availableGameSystems])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode) ? prev.filter((item) => item !== moduleCode) : [...prev, moduleCode]
    )
  }
  const selectedVisibilityLabel = [isOpen ? 'Aperta' : null, isSearchable ? 'Ricercabile' : null]
    .filter(Boolean)
    .join(', ') || 'Nessuna opzione selezionata'

  return (
    <section className="panel">
      <h2>Crea Campagna</h2>
      <label>
        <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
        <select
          required
          value={selectedGameSystem}
          onChange={(event) => setSelectedGameSystem(event.target.value)}
        >
          {availableGameSystems.length > 0 ? (
            availableGameSystems.map((gameSystem) => (
              <option key={gameSystem.code} value={gameSystem.code}>
                {gameSystem.label || gameSystem.code}
              </option>
            ))
          ) : (
            <option value="DND5E">D&D 5E</option>
          )}
        </select>
        <p className="muted">{catalogEntryDescription(availableGameSystems, selectedGameSystem)}</p>
        <p className="muted">Obbligatorio. Definisce il template della scheda e la logica base della campagna.</p>
      </label>
        <label>
          <FieldLabel icon="fa-solid fa-signature" label="Nome" />
          <input value={name} placeholder="Nome della campagna" onChange={(event) => setName(event.target.value)} />
        </label>
      <label>
        <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
        <textarea rows={3} placeholder="Descrizione estesa della campagna" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        <FieldLabel icon="fa-solid fa-quote-right" label="Riassunto breve" />
        <textarea rows={2} placeholder="Riassunto breve visibile in elenco" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
      </label>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-map-location-dot" label="Ambientazione" />
          <textarea rows={3} placeholder="Ambientazione, mondo o contesto di gioco" value={setting} onChange={(event) => setSetting(event.target.value)} />
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
      <div className="multicheck-field">
        <p className="muted">Visibilità e accesso</p>
        <button
          type="button"
          className="secondary-btn multicheck-trigger"
          onClick={() => setVisibilityMenuOpen((prev) => !prev)}
        >
          <span className="multicheck-value">{selectedVisibilityLabel}</span>
          <span aria-hidden="true">{visibilityMenuOpen ? '▴' : '▾'}</span>
        </button>
        {visibilityMenuOpen && (
          <div className="multicheck-menu">
            <label className="checkbox-row">
              <input checked={isOpen} onChange={(event) => setIsOpen(event.target.checked)} type="checkbox" />
              Campagna aperta
            </label>
            <label className="checkbox-row">
              <input
                checked={isSearchable}
                onChange={(event) => setIsSearchable(event.target.checked)}
                type="checkbox"
              />
              Ricercabile
            </label>
          </div>
        )}
      </div>
      <CampaignAddonToggleList
        title="Addon campagna"
        description="I moduli sono sempre visibili e puoi attivarli o disattivarli senza passaggi aggiuntivi."
        availableModules={availableModules}
        selectedModules={selectedModules}
        onToggle={toggleModule}
      />
      <button
        type="button"
        className="primary-btn"
        onClick={() =>
          onCreate({
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
            gameSystem: selectedGameSystem,
            allowedModules: selectedModules,
          })
        }
      >
        <Icon name="fa-solid fa-plus" />
        Crea
      </button>
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

function CampaignAddonToggleList({
  title,
  description,
  availableModules,
  selectedModules,
  onToggle,
}: {
  title: string
  description: string
  availableModules: CampaignCatalogEntry[]
  selectedModules: string[]
  onToggle: (moduleCode: string) => void
}) {
  return (
    <section className="addon-panel">
      <div className="row-between">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="readonly-chip">{selectedModules.length} attivi</span>
      </div>
      {availableModules.length > 0 ? (
        <div className="addon-list">
          {availableModules.map((module) => {
            const enabled = selectedModules.includes(module.code)
            return (
              <div key={module.code} className="addon-row">
                <div className="addon-copy">
                  <p className="addon-title">{module.label || module.code}</p>
                  <p className="addon-description">{module.description || 'Addon disponibile per la campagna.'}</p>
                </div>
                <label className="switch" aria-label={`${module.label || module.code} ${enabled ? 'attivo' : 'disattivo'}`}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => onToggle(module.code)}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </label>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="muted">Lista addon non ancora disponibile.</p>
      )}
    </section>
  )
}

function CampaignDetailPage({
  campaign,
  currentUserId,
  members,
  memberNames,
  availableModules,
  availableGameSystems,
  onReload,
  onOpenMember,
  onOpenManagement,
  onOpenSelectPg,
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
  members: CampaignMembershipResponse[]
  memberNames: Record<string, string>
  availableModules: CampaignCatalogEntry[]
  availableGameSystems: CampaignCatalogEntry[]
  onReload: () => void
  onOpenMember: (userId: string) => void
  onOpenManagement: () => void
  onOpenSelectPg: () => void
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
    if (member.memberStatus === 'BLOCKED') return { label: 'BLOCKED', className: 'status-danger' }
    if (member.memberStatus === 'BANNED') return { label: 'BANNED', className: 'status-danger' }
    if (member.memberStatus === 'PENDING') return { label: 'PENDING', className: 'status-warning' }
    if (member.memberStatus !== 'APPROVED') return { label: member.memberStatus, className: 'status-neutral' }
    if (member.characterStatus === 'DEAD' || member.characterStatus === 'RETIRED') {
      return { label: 'INACTIVE', className: 'status-neutral' }
    }
    return { label: 'ACTIVE', className: 'status-success' }
  }

  const toggleStatusFilter = (status: CampaignMemberStatus) => {
    setStatusFilters((prev) => (prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]))
  }

  const toggleRoleFilter = (role: CampaignRole) => {
    setRoleFilters((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]))
  }

  const statusFilterLabel = statusFilters.length > 0 ? statusFilters.join(', ') : 'Nessuno stato selezionato'
  const roleFilterLabel = roleFilters.length > 0 ? roleFilters.join(', ') : 'Nessun grado selezionato'

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
          <p>
            <strong>{campaign.name}</strong>
          </p>
          <p className="campaign-status-line">
            Stato campagna: <CampaignStatusBadge isActive={campaign.isActive} />
          </p>
          {campaign.summary && <p className="campaign-summary">{campaign.summary}</p>}
          <p className="muted">{campaign.description || 'Nessuna descrizione'}</p>
          <div className="campaign-profile-grid">
            <InfoBlock title="Ambientazione" value={campaign.setting} />
            <InfoBlock title="Tono" value={campaignToneLabel(campaign.tone)} />
            <InfoBlock title="Sistema di gioco" value={catalogEntryLabel(availableGameSystems, campaign.gameSystem)} />
            <InfoBlock
              title="Descrizione sistema"
              value={catalogEntryDescription(availableGameSystems, campaign.gameSystem)}
            />
            <InfoBlock title="Regole" value={campaign.rules} />
            <InfoBlock title="Requisiti d'ingresso" value={campaign.requirements} />
          </div>
          <p className="muted">
            open: {String(campaign.isOpen)} | searchable: {String(campaign.isSearchable)}
          </p>
          <div className="campaign-addon-section">
            <div className="row-between">
              <h3 className="section-title">Addon attivi</h3>
              <span className="readonly-chip">{campaign.allowedModules.length} attivi</span>
            </div>
            {campaign.allowedModules.length > 0 ? (
              <div className="campaign-addon-grid">
                {campaign.allowedModules.map((moduleCode) => (
                  <article key={moduleCode} className="campaign-addon-card">
                    <p className="field-label">{catalogEntryLabel(availableModules, moduleCode)}</p>
                    <p className="muted">{catalogEntryDescription(availableModules, moduleCode)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Nessun addon attivo per questa campagna.</p>
            )}
          </div>
          <div className="inline-actions">
            {membershipStatus === 'APPROVED' && (
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
              <button type="button" className="secondary-btn" onClick={onOpenManagement}>
                Gestione Campagna
              </button>
            )}
            {membershipStatus === 'APPROVED' && (
              <button type="button" className="secondary-btn" onClick={onOpenSelectPg}>
                Seleziona PG
              </button>
            )}
            {membershipStatus === 'APPROVED' && (
              <button type="button" className="secondary-btn" onClick={onOpenCharacters}>
                Gestione Personaggi
              </button>
            )}
            {membershipStatus === 'APPROVED' && campaign?.founderId !== currentUserId && (
              <button type="button" className="danger-btn" onClick={onLeaveCampaign}>
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
                          className={`filter-chip ${statusFilters.includes(status) ? 'is-active' : ''}`}
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
                          className={`filter-chip ${roleFilters.includes(role) ? 'is-active' : ''}`}
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
              <ul className="list-reset">
                {filteredMembers.map((member) => {
                  const activity = memberActivityBadge(member)
                  return (
                    <li key={`${member.userId}-${member.role}-${member.memberStatus}`} className="line-item line-item-clickable">
                      <button type="button" className="member-card-btn" onClick={() => onOpenMember(member.userId)}>
                        <div>
                          <p className="character-name">{memberNames[member.userId] || member.userId}</p>
                        </div>
                        <div className="inline-actions">
                          <span className="status status-info">{member.role}</span>
                          <span className={`status ${activity.className}`}>{activity.label}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
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

function ApprovalPage({
  pendingApplications,
  onLoadPending,
  onApprove,
  onReject,
}: {
  pendingApplications: CampaignApplicationResponse[]
  onLoadPending: () => void
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
}) {
  return (
    <section className="panel">
      <h2>Approvazione Accessi</h2>
      <div className="row-between">
        <p className="muted">Le richieste si caricano automaticamente quando entri in questa pagina.</p>
        <button type="button" className="secondary-btn" onClick={onLoadPending}>
          Aggiorna elenco
        </button>
      </div>
      {pendingApplications.length === 0 && <p className="muted">Nessuna richiesta pending.</p>}
      {pendingApplications.length > 0 && (
        <ul className="list-reset">
          {pendingApplications.map((item) => (
            <li key={item.userId} className="line-item">
              <div>
                <p className="character-name">{item.profileName}</p>
                <p className="muted">@{item.username}</p>
              </div>
              <div className="inline-actions">
                <button type="button" className="primary-btn" onClick={() => onApprove(item.userId)}>
                  Approva
                </button>
                <button type="button" className="secondary-btn" onClick={() => onReject(item.userId)}>
                  Rifiuta
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MissionsPage({
  missions,
  missionCharacters,
  selectedMission,
  lastMissionAction,
  canCreateMissions,
  currentUserId,
  activeCampaignId,
  activeCampaignRole,
  campaignNameById,
  onCreate,
  onSelectMission,
  onReopen,
  onClose,
  onUpdate,
  onCancel,
  onJoin,
  onLeave,
  onUpdateParticipationType,
}: {
  missions: MissionResponse[]
  missionCharacters: Character[]
  selectedMission: MissionResponse | null
  lastMissionAction: MissionParticipantResponse | null
  canCreateMissions: boolean
  currentUserId: string
  activeCampaignId: string
  activeCampaignRole: CampaignRole | null
  campaignNameById: Record<string, string>
  onCreate: (payload: {
    title: string
    description: string
    isMultiSession: boolean
    sessionAt: string
    closesAt: string
    quorum: number | null
    maxParticipants: number | null
    autoReopenOnDrop: boolean
  }) => void
  onSelectMission: (id: string) => void
  onReopen: (mission: MissionResponse) => void
  onClose: (mission: MissionResponse) => void
  onUpdate: (
    mission: MissionResponse,
    payload: {
      title: string
      description: string
      isMultiSession: boolean
      sessionAt: string
      closesAt: string
      quorum: number | null
      maxParticipants: number | null
      autoReopenOnDrop: boolean
    },
  ) => void
  onCancel: (mission: MissionResponse) => void
  onJoin: (mission: MissionResponse, characterId: string, participationType: 'TITOLARE' | 'NON_TITOLARE') => void
  onLeave: (mission: MissionResponse) => void
  onUpdateParticipationType: (mission: MissionResponse, participationType: 'TITOLARE' | 'NON_TITOLARE') => void
}) {
  type MissionDraft = {
    title: string
    description: string
    isMultiSession: boolean
    sessionAt: string
    closesAt: string
    quorum: string
    maxParticipants: string
    autoReopenOnDrop: boolean
  }

  const defaultDraft = (): MissionDraft => ({
    title: 'Nuova sessione',
    description: '',
    isMultiSession: false,
    sessionAt: '',
    closesAt: '',
    quorum: '3',
    maxParticipants: '5',
    autoReopenOnDrop: true,
  })

  const draftFromMission = (mission: MissionResponse): MissionDraft => ({
    title: mission.title,
    description: mission.description || '',
    isMultiSession: mission.isMultiSession,
    sessionAt: mission.sessionAt ? mission.sessionAt.slice(0, 16) : '',
    closesAt: mission.closesAt ? mission.closesAt.slice(0, 16) : '',
    quorum: mission.quorum?.toString() || '',
    maxParticipants: mission.maxParticipants?.toString() || '',
    autoReopenOnDrop: mission.autoReopenOnDrop,
  })

  const [mode, setMode] = useState<'browse' | 'create' | 'edit'>('browse')
  const [now, setNow] = useState(() => Date.now())
  const [createDraft, setCreateDraft] = useState<MissionDraft>(defaultDraft)
  const [createError, setCreateError] = useState('')
  const [editDraft, setEditDraft] = useState<MissionDraft>(defaultDraft)
  const [editError, setEditError] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [participationType, setParticipationType] = useState<'TITOLARE' | 'NON_TITOLARE'>('TITOLARE')
  const [searchText, setSearchText] = useState('')
  const [campaignFilter, setCampaignFilter] = useState<'all' | string>('all')
  const [statusView, setStatusView] = useState<'joinable' | 'all'>('joinable')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (mode === 'edit' && selectedMission) {
      setEditDraft(draftFromMission(selectedMission))
      setEditError('')
    }
    if (mode === 'create') {
      setCreateDraft(defaultDraft())
      setCreateError('')
    }
  }, [mode, selectedMission])

  useEffect(() => {
    if (!selectedMission) return
    if (mode !== 'browse' && selectedMission.status === 'CANCELLED') {
      setMode('browse')
    }
  }, [mode, selectedMission])

  useEffect(() => {
    if (mode !== 'create') return
    if (canCreateMissions && activeCampaignId) return
    setMode('browse')
  }, [mode, canCreateMissions, activeCampaignId])

  const parseOptionalInt = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const toIsoTimestamp = (value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  }

  const formatMissionDay = (value: string | null | undefined): string => {
    if (!value) return 'Non impostato'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date)
  }

  const formatMissionTime = (value: string | null | undefined): string => {
    if (!value) return 'Ora non impostata'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  const formatCountdown = (value: string | null | undefined): string => {
    if (!value) return 'Chiusura manuale'
    const target = new Date(value).getTime()
    if (Number.isNaN(target)) return value
    const diff = target - now
    if (diff <= 0) return 'Tempo scaduto'
    const totalMinutes = Math.floor(diff / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    const parts = [
      days > 0 ? `${days}g` : null,
      hours > 0 || days > 0 ? `${hours}h` : null,
      `${minutes}m`,
    ].filter(Boolean)
    return parts.join(' ')
  }

  const selectedMissionIsJoinable = selectedMission?.status === 'OPEN' || selectedMission?.status === 'REOPENED'
  const selectedMissionCanBeClosed =
    selectedMission && selectedMission.campaignId === activeCampaignId
      ? selectedMission.status !== 'CLOSED' && selectedMission.status !== 'CANCELLED'
      : false
  const selectedMissionCanBeReopened = selectedMission
    ? selectedMission.campaignId === activeCampaignId && (selectedMission.status === 'CLOSED' || selectedMission.status === 'CONFIRMED')
    : false
  const selectedMissionCanBeEdited =
    !!selectedMission &&
    selectedMission.campaignId === activeCampaignId &&
    selectedMission.status !== 'CANCELLED' &&
    !!currentUserId &&
    (selectedMission.createdBy === currentUserId
      ? activeCampaignRole === 'CO_MASTER' || activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER'
      : activeCampaignRole === 'SUPER_MASTER')
  const selectedMissionCanBeCancelled =
    !!selectedMission && selectedMission.campaignId === activeCampaignId && activeCampaignRole === 'SUPER_MASTER' && selectedMission.status !== 'CANCELLED'

  const activeCharacters = useMemo(
    () =>
      missionCharacters.filter(
        (character) => !character.isNpc && character.characterStatus === 'ACTIVE' && character.campaignId === selectedMission?.campaignId,
      ),
    [missionCharacters, selectedMission?.campaignId],
  )
  const campaignOptions = useMemo(
    () =>
      Array.from(
        new Map(
          missions
            .filter((mission) => mission.campaignId)
            .map((mission) => [mission.campaignId as string, campaignNameById[mission.campaignId] || mission.campaignId]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [missions, campaignNameById],
  )
  const normalizedSearchText = searchText.trim().toLowerCase()
  const filteredMissions = missions.filter((mission) => {
    if (campaignFilter !== 'all' && mission.campaignId !== campaignFilter) return false
    if (statusView === 'joinable' && mission.status !== 'OPEN' && mission.status !== 'REOPENED') return false
    if (!normalizedSearchText) return true
    const missionCampaignName = campaignNameById[mission.campaignId] || mission.campaignId
    return (
      mission.title.toLowerCase().includes(normalizedSearchText) ||
      (mission.description || '').toLowerCase().includes(normalizedSearchText) ||
      missionCampaignName.toLowerCase().includes(normalizedSearchText)
    )
  })

  useEffect(() => {
    if (activeCharacters.length === 0) {
      if (characterId) setCharacterId('')
      return
    }
    if (!activeCharacters.some((character) => character.id === characterId)) {
      setCharacterId(activeCharacters[0]?.id || '')
    }
  }, [activeCharacters, characterId])

  const submitCreate = () => {
    const sessionIso = toIsoTimestamp(createDraft.sessionAt)
    const closesIso = toIsoTimestamp(createDraft.closesAt)
    if (sessionIso && closesIso && new Date(closesIso).getTime() >= new Date(sessionIso).getTime()) {
      setCreateError('La chiusura iscrizioni deve precedere la data della sessione.')
      return
    }

    setCreateError('')
    onCreate({
      title: createDraft.title,
      description: createDraft.description,
      isMultiSession: createDraft.isMultiSession,
      sessionAt: sessionIso || '',
      closesAt: closesIso || '',
      quorum: parseOptionalInt(createDraft.quorum),
      maxParticipants: parseOptionalInt(createDraft.maxParticipants),
      autoReopenOnDrop: createDraft.autoReopenOnDrop,
    })
    setMode('browse')
  }

  const submitEdit = () => {
    if (!selectedMission) return
    const sessionIso = toIsoTimestamp(editDraft.sessionAt)
    const closesIso = toIsoTimestamp(editDraft.closesAt)
    if (sessionIso && closesIso && new Date(closesIso).getTime() >= new Date(sessionIso).getTime()) {
      setEditError('La chiusura iscrizioni deve precedere la data della sessione.')
      return
    }

    setEditError('')
    onUpdate(selectedMission, {
      title: editDraft.title,
      description: editDraft.description,
      isMultiSession: editDraft.isMultiSession,
      sessionAt: sessionIso || '',
      closesAt: closesIso || '',
      quorum: parseOptionalInt(editDraft.quorum),
      maxParticipants: parseOptionalInt(editDraft.maxParticipants),
      autoReopenOnDrop: editDraft.autoReopenOnDrop,
    })
    setMode('browse')
  }

  const renderMissionForm = (
    draft: MissionDraft,
    setDraft: Dispatch<SetStateAction<MissionDraft>>,
    error: string,
    setError: (value: string) => void,
    submitLabel: string,
    onSubmit: () => void,
  ) => (
    <div className="mission-form-card">
      <div className="card-section-header">
        <div>
          <h3 className="section-title">{submitLabel}</h3>
          <p className="muted">Compila i parametri della sessione e conferma solo dopo aver controllato date e cap.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-pen-to-square" label="Titolo sessione" />
          <input
            value={draft.title}
            placeholder="Titolo breve della sessione"
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-calendar-day" label="Giorno della sessione" />
          <input
            type="datetime-local"
            step={900}
            value={draft.sessionAt}
            onChange={(event) => setDraft((prev) => ({ ...prev, sessionAt: event.target.value }))}
          />
        </label>
      </div>
      <label>
        <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
        <textarea
          rows={3}
          placeholder="Obiettivo, contesto e dettagli utili della sessione"
          value={draft.description}
          onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
        />
      </label>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-hourglass-end" label="Tempo prima della chiusura" />
          <input
            type="datetime-local"
            step={900}
            value={draft.closesAt}
            onChange={(event) => setDraft((prev) => ({ ...prev, closesAt: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-users" label="Quorum titolari" />
          <input
            value={draft.quorum}
            inputMode="numeric"
            placeholder="3"
            onChange={(event) => setDraft((prev) => ({ ...prev, quorum: event.target.value }))}
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-users-between-lines" label="Max partecipanti" />
          <input
            value={draft.maxParticipants}
            inputMode="numeric"
            placeholder="5"
            onChange={(event) => setDraft((prev) => ({ ...prev, maxParticipants: event.target.value }))}
          />
        </label>
        <label className="checkbox-row mission-checkbox">
          <input
            checked={draft.isMultiSession}
            type="checkbox"
            onChange={(event) => setDraft((prev) => ({ ...prev, isMultiSession: event.target.checked }))}
          />
          Sessione multipla
        </label>
      </div>
      <label className="checkbox-row mission-checkbox">
        <input
          checked={draft.autoReopenOnDrop}
          type="checkbox"
          onChange={(event) => setDraft((prev) => ({ ...prev, autoReopenOnDrop: event.target.checked }))}
        />
        Riapri automaticamente se si scende sotto quorum
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="inline-actions mission-actions">
        <button type="button" className="primary-btn" onClick={onSubmit}>
          <Icon name="fa-solid fa-floppy-disk" />
          {submitLabel}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setError('')
            setMode('browse')
          }}
        >
          <Icon name="fa-solid fa-xmark" />
          Annulla
        </button>
      </div>
    </div>
  )

  return (
    <section className="panel mission-shell">
      <div className="panel-header mission-page-header">
        <div>
          <h2>Missioni</h2>
          <p className="muted">Cerca, filtra e joina le missioni aperte delle campagne a cui sei approvato.</p>
        </div>
        <div className="inline-actions">
          {canCreateMissions && activeCampaignId && mode !== 'create' && (
            <button type="button" className="secondary-btn" onClick={() => setMode('create')}>
              <Icon name="fa-solid fa-plus" />
              Crea missione
            </button>
          )}
        </div>
      </div>

      {canCreateMissions && activeCampaignId && mode === 'create' && (
        <div className="subpanel mission-form-panel">{renderMissionForm(createDraft, setCreateDraft, createError, setCreateError, 'Crea missione', submitCreate)}</div>
      )}

      <div className="mission-toolbar">
        <label className="mission-search">
          <FieldLabel icon="fa-solid fa-magnifying-glass" label="Cerca" />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Titolo, descrizione o campagna" />
        </label>
        <label className="mission-campaign-filter">
          <FieldLabel icon="fa-solid fa-folder-open" label="Campagna" />
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
            <option value="all">Tutte</option>
            {campaignOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented-btn-group mission-status-toggle">
          <button type="button" className={`segmented-btn ${statusView === 'joinable' ? 'is-active' : ''}`} onClick={() => setStatusView('joinable')}>
            Aperte
          </button>
          <button type="button" className={`segmented-btn ${statusView === 'all' ? 'is-active' : ''}`} onClick={() => setStatusView('all')}>
            Tutte
          </button>
        </div>
      </div>

      <div className="mission-grid">
        <div className="subpanel mission-block mission-list-block">
          <div className="row-between">
            <div>
              <h3 className="section-title">Risultati</h3>
              <p className="muted">Le missioni sono aggregate per tutte le campagne approvate.</p>
            </div>
            <span className="mission-count">{filteredMissions.length}</span>
          </div>
          <ul className="list-reset mission-list">
            {filteredMissions.length === 0 && <li className="muted">Nessuna missione corrisponde ai filtri.</li>}
            {filteredMissions.map((mission) => (
              <li key={`${mission.campaignId}-${mission.id}`}>
                <button
                  type="button"
                  className={`character-item mission-item ${selectedMission?.id === mission.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelectMission(mission.id)
                    setMode('browse')
                  }}
                >
                  <div className="mission-item-main">
                    <div className="mission-item-title-row">
                      <div>
                        <p className="character-name">{mission.title}</p>
                        <p className="muted">{mission.description || 'Nessuna descrizione'}</p>
                      </div>
                      <MissionStatusBadge status={mission.status} sessionAt={mission.sessionAt} />
                    </div>

                    <div className="mission-pill-row">
                      <span className="mission-meta-pill">
                        <span className="mission-mini-icon" aria-hidden="true">
                          <Icon name="fa-solid fa-folder-open" />
                        </span>
                        <span>
                          <strong>Campagna</strong>
                          <span>{campaignNameById[mission.campaignId] || mission.campaignId}</span>
                        </span>
                      </span>
                      <span className="mission-meta-pill">
                        <span className="mission-mini-icon" aria-hidden="true">
                          <MissionTinyIcon kind="clock" />
                        </span>
                        <span>
                          <strong>Chiusura</strong>
                          <span>{formatCountdown(mission.closesAt)}</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="subpanel mission-block mission-detail-block">
          {selectedMission ? (
            mode === 'edit' && selectedMissionCanBeEdited ? (
              renderMissionForm(editDraft, setEditDraft, editError, setEditError, 'Modifica missione', submitEdit)
            ) : (
              <>
                <div className="row-between mission-detail-head">
                  <div>
                    <h3 className="section-title">{selectedMission.title}</h3>
                    <p className="muted">{selectedMission.description || 'Nessuna descrizione'}</p>
                    <p className="muted">Campagna: {campaignNameById[selectedMission.campaignId] || selectedMission.campaignId}</p>
                  </div>
                  <MissionStatusBadge status={selectedMission.status} sessionAt={selectedMission.sessionAt} />
                </div>

                <div className="mission-summary-grid">
                  <div className="info-block">
                    <p className="field-label">Stato sessione</p>
                    <p>{selectedMission.status === 'CONFIRMED' && selectedMission.sessionAt && new Date(selectedMission.sessionAt).getTime() <= now ? 'COMPLETATA' : selectedMission.status === 'CLOSED' ? 'CHIUSA' : selectedMission.status === 'CANCELLED' ? 'ANNULLATA' : 'ATTIVA'}</p>
                  </div>
                  <div className="info-block">
                    <p className="field-label">Campagna</p>
                    <p>{campaignNameById[selectedMission.campaignId] || selectedMission.campaignId}</p>
                  </div>
                  <div className="info-block">
                    <p className="field-label">Tempo prima della chiusura</p>
                    <p>{formatCountdown(selectedMission.closesAt)}</p>
                  </div>
                  <div className="info-block">
                    <p className="field-label">Giorno della sessione</p>
                    <p>{formatMissionDay(selectedMission.sessionAt)}</p>
                    <p className="muted">{formatMissionTime(selectedMission.sessionAt)}</p>
                  </div>
                  <div className="info-block">
                    <p className="field-label">Parametri</p>
                    <p>
                      Quorum {selectedMission.quorum ?? 'manuale'} · Cap {selectedMission.maxParticipants ?? '∞'} ·{' '}
                      {selectedMission.autoReopenOnDrop ? 'Riapertura automatica' : 'Riapertura bloccata'}
                    </p>
                  </div>
                </div>

                <div className="card-section-header">
                  <div>
                    <h4 className="section-title">Azioni sessione</h4>
                    <p className="muted">Le azioni di gestione restano vincolate alla campagna attiva della sessione selezionata.</p>
                  </div>
                </div>

                <div className="inline-actions mission-actions">
                  {selectedMissionCanBeEdited && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setEditDraft(draftFromMission(selectedMission))
                        setMode('edit')
                      }}
                    >
                      Modifica missione
                    </button>
                  )}
                  {selectedMissionCanBeClosed && (
                    <button type="button" className="secondary-btn" onClick={() => onClose(selectedMission)}>
                      Chiudi missione
                    </button>
                  )}
                  {selectedMissionCanBeReopened && (
                    <button type="button" className="secondary-btn" onClick={() => onReopen(selectedMission)}>
                      Riapri missione
                    </button>
                  )}
                  {selectedMissionCanBeCancelled && (
                    <button type="button" className="danger-btn" onClick={() => onCancel(selectedMission)}>
                      Cancella missione
                    </button>
                  )}
                  <button type="button" className="secondary-btn" onClick={() => onLeave(selectedMission)}>
                    Esci dalla missione
                  </button>
                </div>

                <div className="card-section-header">
                  <div>
                    <h4 className="section-title">Iscrizione PG</h4>
                    <p className="muted">Scegli un personaggio attivo della campagna della missione e poi conferma il ruolo.</p>
                  </div>
                </div>

                <div className="form-grid mission-join-grid">
                  <label>
                    <FieldLabel icon="fa-solid fa-user" label="Personaggio attivo" />
                    <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                      <option value="">seleziona</option>
                      {activeCharacters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldLabel icon="fa-solid fa-tag" label="Ruolo" />
                    <select
                      value={participationType}
                      onChange={(event) => setParticipationType(event.target.value as 'TITOLARE' | 'NON_TITOLARE')}
                    >
                      <option value="TITOLARE">TITOLARE</option>
                      <option value="NON_TITOLARE">PANCHINA</option>
                    </select>
                  </label>
                </div>

                {!selectedMissionIsJoinable && <p className="muted mission-last-action">La missione non è al momento aperta al join.</p>}
                {selectedMissionIsJoinable && activeCharacters.length === 0 && (
                  <p className="muted mission-last-action">Nessun personaggio attivo disponibile nella campagna di questa missione.</p>
                )}

                <div className="inline-actions mission-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={!characterId || !selectedMissionIsJoinable}
                    onClick={() => characterId && onJoin(selectedMission, characterId, 'TITOLARE')}
                  >
                    Segnati titolare
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={!characterId || !selectedMissionIsJoinable}
                    onClick={() => characterId && onJoin(selectedMission, characterId, 'NON_TITOLARE')}
                  >
                    Segnati panchina
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onUpdateParticipationType(selectedMission, participationType)}
                  >
                    Aggiorna solo ruolo
                  </button>
                </div>

                {lastMissionAction && (
                  <p className="muted mission-last-action">
                    Ultima azione: {lastMissionAction.characterId} ·{' '}
                    <MissionParticipationBadge participationType={lastMissionAction.participationType} /> · score{' '}
                    {lastMissionAction.priorityScore}
                  </p>
                )}
              </>
            )
          ) : (
            <>
              <h3 className="section-title">Dettaglio missione</h3>
              <p className="muted">Seleziona una missione dalla lista per vedere i dettagli, il countdown e le azioni disponibili.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function RoomsPage({
  rooms,
  canCreateRoom,
  onCreate,
}: {
  rooms: RoomResponse[]
  canCreateRoom: boolean
  onCreate: (payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number }) => void
}) {
  const [name, setName] = useState('Piazza Centrale')
  const [type, setType] = useState<'ROLEPLAY' | 'SPAM'>('ROLEPLAY')
  const [ttlHours, setTtlHours] = useState(72)
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0)

  return (
    <section className="panel">
      <h2>Stanze</h2>
      {canCreateRoom ? (
        <>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Nome" />
              <input value={name} placeholder="Nome della stanza" onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-layer-group" label="Tipo" />
              <select value={type} onChange={(event) => setType(event.target.value as 'ROLEPLAY' | 'SPAM')}>
                <option value="ROLEPLAY">ROLEPLAY</option>
                <option value="SPAM">SPAM</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-hourglass-half" label="TTL hours" />
              <input
                type="number"
                min={1}
                max={72}
                placeholder="72"
                value={ttlHours}
                onChange={(event) => setTtlHours(Number(event.target.value))}
              />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-stopwatch" label="Slowmode seconds" />
              <input
                type="number"
                min={0}
                max={600}
                placeholder="0"
                value={slowmodeSeconds}
                onChange={(event) => setSlowmodeSeconds(Number(event.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onCreate({ name, type, ttlHours, slowmodeSeconds })}
          >
            <Icon name="fa-solid fa-circle-plus" />
            Crea Stanza
          </button>
        </>
      ) : (
        <div className="info-box">
          <p className="section-title">Creazione non disponibile</p>
          <p className="muted">
            Solo i ruoli <strong>MASTER</strong> e <strong>SUPER_MASTER</strong> possono creare stanze.
          </p>
        </div>
      )}

      <div className="divider" />
      <h3 className="section-title">Elenco Stanze</h3>
      <ul className="list-reset">
        {rooms.map((room) => (
          <li key={room.id} className="line-item">
            <span>
              {room.name} ({room.type})
            </span>
            <span className="muted">
              ttl {room.ttlHours}h / slow {room.slowmodeSeconds}s
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function NotificationsPage({ events }: { events: UiEvent[] }) {
  return (
    <section className="panel">
      <h2>Notifiche</h2>
      <p className="muted">Feed locale basato su azioni API client.</p>
      <ul className="list-reset">
        {events.map((event) => (
          <li key={event.id} className="line-item">
            <span>{event.text}</span>
            <span className={`status ${event.level === 'error' ? 'status-danger' : event.level === 'ok' ? 'status-success' : 'status-neutral'}`}>
              {new Date(event.ts).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
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

function ProfilePage({
  profile,
  onGoEdit,
}: {
  profile: UserProfile
  onGoEdit: () => void
}) {
  const displayValue = (value: string | null | undefined) => (value && value.trim() ? value : 'Non impostato')
  const avatarLabel = profile.profileName?.trim() || profile.username?.trim() || 'U'
  return (
    <section className="panel profile-shell">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {avatarLabel.slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-header-copy">
          <p className="profile-kicker">Profilo utente</p>
          <h2>{displayValue(profile.profileName)}</h2>
          <p className="muted">{displayValue(profile.username ? `@${profile.username}` : null)}</p>
        </div>
        <div className="profile-header-actions">
          <button type="button" className="primary-btn" onClick={onGoEdit}>
            <Icon name="fa-solid fa-pen-to-square" />
            <span>Modifica profilo</span>
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-user" className="profile-card-icon" />
            <p className="profile-card-label">Nome profilo</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.profileName)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-at" className="profile-card-icon" />
            <p className="profile-card-label">Username</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.username ? `@${profile.username}` : null)}</p>
        </article>

        <article className="profile-card profile-card-wide">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-quote-left" className="profile-card-icon" />
            <p className="profile-card-label">Bio</p>
          </div>
          <p className="profile-card-value profile-card-body">{displayValue(profile.bio)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-phone" className="profile-card-icon" />
            <p className="profile-card-label">WhatsApp</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.whatsapp)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-brands fa-instagram" className="profile-card-icon" />
            <p className="profile-card-label">Instagram</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.socialLinks.instagram)}</p>
        </article>

        <article className="profile-card profile-card-wide">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-link" className="profile-card-icon" />
            <p className="profile-card-label">Altro social</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.socialLinks.other)}</p>
        </article>
      </div>

      <p className="profile-footnote muted">I campi vuoti vengono mostrati esplicitamente per evitare ambiguità nel profilo.</p>
    </section>
  )
}

function EditProfilePage({
  profile,
  onSave,
  onChangePassword,
}: {
  profile: UserProfile
  onSave: (draft: ProfileDraft) => void
  onChangePassword: (params: { currentPassword: string; newPassword: string }) => Promise<void>
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileToDraft(profile))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordInfo, setPasswordInfo] = useState('')

  useEffect(() => {
    setDraft(profileToDraft(profile))
  }, [profile.id, profile.profileName, profile.bio, profile.whatsapp, profile.socialLinks])

  const submitPasswordChange = async () => {
    setPasswordError('')
    setPasswordInfo('')
    if (newPassword !== confirmPassword) {
      setPasswordError('La nuova password e la conferma non coincidono.')
      return
    }

    setPasswordBusy(true)
    try {
      await onChangePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordInfo('Password aggiornata con successo.')
    } catch (err) {
      setPasswordError(toMessage(err))
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Modifica Profilo</h2>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-user" label="Profile Name" />
          <input
            placeholder="Nome profilo"
            value={draft.profileName}
            onChange={(event) => setDraft((prev) => ({ ...prev, profileName: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-brands fa-whatsapp" label="WhatsApp" />
          <input
            placeholder="Numero o contatto WhatsApp"
            value={draft.whatsapp}
            onChange={(event) => setDraft((prev) => ({ ...prev, whatsapp: event.target.value }))}
          />
        </label>
      </div>
      <label>
        <FieldLabel icon="fa-solid fa-quote-left" label="Bio" />
        <textarea
          rows={4}
          placeholder="Breve presentazione del tuo profilo"
          value={draft.bio}
          onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
        />
      </label>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-brands fa-instagram" label="Instagram" />
          <input
            placeholder="@account instagram"
            value={draft.instagram}
            onChange={(event) => setDraft((prev) => ({ ...prev, instagram: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-link" label="Altro social" />
          <input
            placeholder="Link o nickname"
            value={draft.otherSocial}
            onChange={(event) => setDraft((prev) => ({ ...prev, otherSocial: event.target.value }))}
          />
        </label>
      </div>
      <button type="button" className="primary-btn" onClick={() => onSave(draft)}>
        <Icon name="fa-solid fa-floppy-disk" />
        Salva
      </button>
      <div className="divider" />
      <div className="profile-password-block">
        <div className="row-between">
          <h3 className="section-title">Cambio password</h3>
          <span className="status status-info">Protetto</span>
        </div>
        <p className="muted">Usa la password attuale per aggiornare le credenziali e invalidare le sessioni precedenti.</p>
        <label>
          <FieldLabel icon="fa-solid fa-key" label="Password corrente" />
          <input
            type="password"
            placeholder="Password corrente"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            <FieldLabel icon="fa-solid fa-lock" label="Nuova password" />
            <input
              type="password"
              placeholder="Nuova password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-lock" label="Conferma nuova password" />
            <input
              type="password"
              placeholder="Ripeti la nuova password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        </div>
        {passwordError && <p className="form-error">{passwordError}</p>}
        {passwordInfo && <p className="auth-note">{passwordInfo}</p>}
        <button type="button" className="secondary-btn" disabled={passwordBusy} onClick={() => void submitPasswordChange()}>
          <Icon name="fa-solid fa-unlock-keyhole" />
          {passwordBusy ? 'Attendere...' : 'Aggiorna password'}
        </button>
      </div>
    </section>
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
  const [campaignFilters, setCampaignFilters] = useState<string[]>([])
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false)

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
  const campaignOptions = useMemo(
    () =>
      Array.from(
        new Map(
          characters
            .filter((character) => !!character.campaignId)
            .map((character) => [character.campaignId as string, campaignNameForCharacter(character)]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [characters, campaignNameForCharacter],
  )

  useEffect(() => {
    setCampaignFilters((prev) => {
      const next = prev.filter((campaignValue) => campaignOptions.some((option) => option.id === campaignValue))
      if (next.length === prev.length && next.every((value, index) => value === prev[index])) {
        return prev
      }
      return next
    })
  }, [campaignOptions])

  const toggleCampaignFilter = (campaignValue: string) => {
    setCampaignFilters((prev) =>
      prev.includes(campaignValue) ? prev.filter((item) => item !== campaignValue) : [...prev, campaignValue],
    )
  }

  const selectedCampaignLabel =
    campaignFilters.length > 0
      ? campaignFilters
          .map((campaignValue) => campaignOptions.find((option) => option.id === campaignValue)?.name || campaignValue)
          .join(', ')
      : 'Tutte le campagne'
  const filteredCharacters = characters.filter((character) => {
    if (!character.characterStatus || !statusFilters.includes(character.characterStatus)) return false
    const type = character.isNpc ? 'NPC' : 'PG'
    if (!typeFilters.includes(type)) return false
    if (campaignFilters.length > 0 && (!character.campaignId || !campaignFilters.includes(character.campaignId))) return false
    if (!normalizedSearchText) return true
    const owner = ownerProfileLabel(character.userId, character.ownerProfileName).toLowerCase()
    const name = character.name.toLowerCase()
    const campaignName = campaignNameForCharacter(character).toLowerCase()
    return owner.includes(normalizedSearchText) || name.includes(normalizedSearchText) || campaignName.includes(normalizedSearchText)
  })

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
      <div className="chips">
        {(['PG', 'NPC'] as Array<'PG' | 'NPC'>).map((type) => (
          <button
            key={type}
            type="button"
            className={`chip ${typeFilters.includes(type) ? 'is-active' : ''}`}
            onClick={() => toggleTypeFilter(type)}
          >
            {type === 'PG' ? 'Personaggio' : 'NPC'}
          </button>
        ))}
      </div>
      <div className="chips">
        {(['ACTIVE', 'RETIRED', 'DEAD'] as CharacterStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className={`chip ${statusFilters.includes(status) ? 'is-active' : ''}`}
            onClick={() => toggleStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>
      <label>
        Ricerca (nome PG o campagna)
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="es. diego"
        />
      </label>
      <p className="muted">La ricerca confronta nome personaggio, campagna e profilo di appartenenza.</p>
      <div className="multicheck-field">
        <p className="muted">Filtro campagna</p>
        <button
          type="button"
          className="secondary-btn multicheck-trigger"
          onClick={() => setCampaignMenuOpen((prev) => !prev)}
          disabled={campaignOptions.length === 0}
        >
          <span className="multicheck-value">{selectedCampaignLabel}</span>
          <span aria-hidden="true">{campaignMenuOpen ? '▴' : '▾'}</span>
        </button>
        {campaignMenuOpen && campaignOptions.length > 0 && (
          <div className="multicheck-menu">
            {campaignOptions.map((option) => (
              <label key={option.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={campaignFilters.includes(option.id)}
                  onChange={() => toggleCampaignFilter(option.id)}
                />
                {option.name}
              </label>
            ))}
          </div>
        )}
      </div>
      {filteredCharacters.length === 0 && <p className="muted">Nessun personaggio per i filtri selezionati.</p>}
      <ul className="list-reset">
        {filteredCharacters.map((character) => (
          <li key={character.id}>
            {(() => {
              const canOpen = canOpenCharacterSheet(character)
              return (
            <button
              type="button"
              className={`character-item ${selectedCharacterId === character.id ? 'is-selected' : ''}`}
              onClick={() => onSelectCharacter(character)}
              disabled={!canOpen}
            >
              <div>
                <p className="character-name">
                  <span className="char-kind-icon" aria-hidden="true">
                    <Icon name={character.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
                  </span>{' '}
                  {character.name}
                </p>
                <p className="muted">
                  {character.nickname || 'no nickname'} · {ownerProfileLabel(character.userId, character.ownerProfileName)}
                </p>
                <p className="muted">Campagna: {campaignNameForCharacter(character)}</p>
              </div>
              <span
                className={`editability-icon ${canOpen ? 'is-editable' : 'is-readonly'}`}
                aria-label={canOpen ? 'Modificabile' : 'Non modificabile'}
                title={canOpen ? 'Modificabile' : 'Non modificabile'}
              >
                <Icon name={canOpen ? 'fa-solid fa-pen' : 'fa-solid fa-lock'} />
              </span>
              <span className={`status status-${statusTone(character.characterStatus)}`}>
                {character.characterStatus || 'N/A'}
              </span>
            </button>
              )
            })()}
          </li>
        ))}
      </ul>
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
  canMarkCharacterDead,
  onRefresh,
  onUpdateStatus,
  onSaveSheet,
}: {
  character: Character | null
  externalDetail: Character | null
  sheet: CharacterSheetResponse | null
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  canMarkCharacterDead: (character: Character | null) => boolean
  onRefresh: () => void
  onUpdateStatus: (status: CharacterStatus) => void
  onSaveSheet: (dataJson: Record<string, unknown>) => Promise<void>
}) {
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>('ACTIVE')
  const [sheetDraft, setSheetDraft] = useState<Record<string, unknown>>({})
  const [sheetDirty, setSheetDirty] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const sheetBlocks = useMemo(() => getSheetBlocks(sheet?.schemaJson || {}), [sheet?.schemaJson])

  useEffect(() => {
    if (value?.characterStatus) setStatus(value.characterStatus)
  }, [value?.id, value?.characterStatus])

  useEffect(() => {
    setSheetDraft(sheet?.dataJson || {})
    setSheetDirty(false)
    setSheetSaving(false)
  }, [sheet?.characterId, sheet?.schemaVersion, sheet?.updatedAt, sheet?.sheetTypeCode])

  const deadAllowed = canMarkCharacterDead(value)

  useEffect(() => {
    if (status === 'DEAD' && !deadAllowed) {
      setStatus('RETIRED')
    }
  }, [status, deadAllowed])

  const updateSheetField = (fieldPath: string, nextValue: unknown) => {
    setSheetDraft((prev) => ({ ...prev, [fieldPath]: nextValue }))
    setSheetDirty(true)
  }

  const saveSheet = async () => {
    if (!sheet?.editable || !sheetDirty || sheetSaving) return
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
    const disabled = !sheet?.editable

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
          </p>
          <p className="muted">tipo: {value.isNpc ? 'NPC' : 'Personaggio'}</p>
          <p className="muted">profilo: {ownerProfileLabel(value.userId, value.ownerProfileName)}</p>
          <p className="muted">status: {value.characterStatus || 'N/A'}</p>
          {sheet && (
            <div className="sheet-header">
              <span className="status status-info">{sheet.gameSystemCode || 'Sistema non disponibile'}</span>
              <span className="status status-neutral">{sheet.sheetTypeCode || 'Scheda non assegnata'}</span>
              <span className={`status ${sheet.hasTemplate ? 'status-success' : 'status-warning'}`}>
                {sheet.hasTemplate ? `v${sheet.schemaVersion}` : 'Template mancante'}
              </span>
              <span className={`status ${sheet.editable ? 'status-success' : 'status-neutral'}`}>
                {sheet.editable ? 'Modificabile' : 'Sola lettura'}
              </span>
            </div>
          )}
          <label>
            Nuovo status
            <select value={status} onChange={(event) => setStatus(event.target.value as CharacterStatus)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RETIRED">RETIRED</option>
              {deadAllowed && <option value="DEAD">DEAD</option>}
            </select>
          </label>
          {!deadAllowed && <p className="muted">Non hai permessi per impostare lo stato DEAD.</p>}
          <button type="button" className="primary-btn" onClick={() => onUpdateStatus(status)}>
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
                  disabled={!sheet.editable || !sheetDirty || sheetSaving}
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

  useEffect(() => {
    setRole(membership.role)
  }, [membership.role])

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
  currentUserId: string
  onLeave: () => void
}) {
  const [newOwnerUserId, setNewOwnerUserId] = useState('')
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

  useEffect(() => {
    if (!campaign) return
    setName(campaign.name)
    setDescription(campaign.description || '')
    setSummary(campaign.summary || '')
    setSetting(campaign.setting || '')
    setTone(campaign.tone || '')
    setRules(campaign.rules || '')
    setRequirements(campaign.requirements || '')
    setCoverImageUrl(campaign.coverImageUrl || '')
    setIsOpen(campaign.isOpen)
    setIsSearchable(campaign.isSearchable)
    setSelectedModules(campaign.allowedModules)
  }, [campaign])

  useEffect(() => {
    if (!campaign) return
    onRefreshPermissions()
  }, [campaign?.id])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode) ? prev.filter((item) => item !== moduleCode) : [...prev, moduleCode],
    )
  }

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
          <div className="inline-actions">
            <label className="checkbox-row">
              <input checked={isOpen} onChange={(event) => setIsOpen(event.target.checked)} type="checkbox" />
              Aperta
            </label>
            <label className="checkbox-row">
              <input checked={isSearchable} onChange={(event) => setIsSearchable(event.target.checked)} type="checkbox" />
              Ricercabile
            </label>
          </div>
          <CampaignAddonToggleList
            title="Addon campagna"
            description="I moduli sono sempre disponibili e puoi accenderli o spegnerli senza ricaricare la lista."
            availableModules={availableModules}
            selectedModules={selectedModules}
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
                allowedModules: selectedModules,
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

function SelectCharacterPage({
  characters,
  onApply,
}: {
  characters: Character[]
  onApply: (characterId: string) => void
}) {
  const [characterId, setCharacterId] = useState('')
  return (
    <section className="panel">
      <h2>Seleziona PG</h2>
      <label>
        <FieldLabel icon="fa-solid fa-user" label="Personaggio" />
        <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
          <option value="">scegli</option>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name} ({character.characterStatus || 'N/A'})
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="primary-btn" onClick={() => characterId && onApply(characterId)}>
        <Icon name="fa-solid fa-arrow-right" />
        Apply alla campagna con PG
      </button>
    </section>
  )
}

function CreateCharacterPage({
  hasActiveCampaign,
  canCreatePlayerCharacter,
  canCreateNpc,
  onCreate,
}: {
  hasActiveCampaign: boolean
  canCreatePlayerCharacter: boolean
  canCreateNpc: boolean
  onCreate: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) => void
}) {
  const [name, setName] = useState('Nuovo PG')
  const [nickname, setNickname] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [isNpc, setIsNpc] = useState(false)
  const canCreateSelectedType = isNpc ? canCreateNpc : canCreatePlayerCharacter
  const saveDisabled =
    !hasActiveCampaign ||
    (!canCreatePlayerCharacter && !canCreateNpc) ||
    !canCreateSelectedType ||
    name.trim().length === 0

  useEffect(() => {
    if (isNpc && !canCreateNpc && canCreatePlayerCharacter) {
      setIsNpc(false)
    }
    if (!isNpc && !canCreatePlayerCharacter && canCreateNpc) {
      setIsNpc(true)
    }
  }, [isNpc, canCreateNpc, canCreatePlayerCharacter])

  return (
    <section className="panel">
      <h2>Crea Personaggio</h2>
      {!hasActiveCampaign && <p className="muted">Per creare un personaggio devi prima attivare una campagna.</p>}
      {hasActiveCampaign && !canCreatePlayerCharacter && (
        <div className="character-create-warning" role="alert" aria-live="polite">
          <Icon name="fa-solid fa-triangle-exclamation" className="character-create-warning-icon" />
          <div>
            <p className="character-create-warning-title">Limite raggiunto</p>
            <p className="character-create-warning-text">
              Hai già un PG attivo in questa campagna: non puoi crearne un altro.
              {canCreateNpc
                ? ' Se ti serve un personaggio aggiuntivo, puoi creare solo un NPC.'
                : ' I PG morti o ritirati non bloccano la creazione di un nuovo PG.'}
            </p>
          </div>
        </div>
      )}
      {hasActiveCampaign && !canCreateNpc && (
        <p className="muted">Con ruolo GIOCATORE non puoi creare NPC.</p>
      )}
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-signature" label="Nome" />
          <input value={name} placeholder="Nome del personaggio" onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-quote-right" label="Nickname" />
          <input value={nickname} placeholder="Soprannome o alias" onChange={(event) => setNickname(event.target.value)} />
        </label>
      </div>
      <label>
        <FieldLabel icon="fa-solid fa-image" label="Portrait URL" />
        <input value={portraitUrl} placeholder="https://..." onChange={(event) => setPortraitUrl(event.target.value)} />
      </label>
      <div>
        <div className="field-label">Tipo</div>
        <div className="segmented">
          <button
            type="button"
          className={`segmented-btn ${!isNpc ? 'is-active' : ''}`}
          disabled={!canCreatePlayerCharacter}
          onClick={() => setIsNpc(false)}
        >
            <span className="char-kind-icon" aria-hidden="true">
              <Icon name="fa-solid fa-user" />
            </span>
            Personaggio
          </button>
          <button
            type="button"
          className={`segmented-btn ${isNpc ? 'is-active' : ''}`}
          disabled={!canCreateNpc}
          onClick={() => setIsNpc(true)}
        >
            <span className="char-kind-icon" aria-hidden="true">
              <Icon name="fa-solid fa-mask" />
            </span>
            NPC
          </button>
        </div>
      </div>
      <button
        type="button"
        className="primary-btn"
        disabled={saveDisabled}
        onClick={() => onCreate({ name, nickname, portraitUrl, isNpc })}
      >
        <Icon name="fa-solid fa-plus" />
        Crea
      </button>
    </section>
  )
}

function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    profileName: profile.profileName || '',
    bio: profile.bio || '',
    whatsapp: profile.whatsapp || '',
    instagram: profile.socialLinks.instagram || '',
    otherSocial: profile.socialLinks.other || '',
  }
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
