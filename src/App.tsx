import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { ApiError, getAccessToken, getApiBaseUrl } from './services/apiClient'
import {
  approveCampaignMember,
  applyToCampaign,
  approveApplication,
  checkPermission,
  banCampaignMember,
  createCampaign,
  createCharacter,
  discoverCampaigns,
  createMission,
  createRoom,
  getCampaign,
  getCampaignMember,
  getCampaignMembers,
  listCampaignModules,
  listCampaignMembersForManagement,
  getCharacter,
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
  suspendCampaignMember,
  transferOwnership,
  unbanCampaignMember,
  unsuspendCampaignMember,
  updateCampaign,
  updateCampaignMemberRole,
  updateCharacterStatus,
  updateMe,
} from './services/gateApi'
import type {
  AuthSession,
  CampaignApplicationResponse,
  CampaignDiscoverResponse,
  CampaignMemberStatus,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
  CampaignRole,
  CampaignResponse,
  Character,
  CharacterStatus,
  MyCampaignMembershipResponse,
  MissionParticipantResponse,
  MissionResponse,
  RoomResponse,
  UserProfile,
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
const DEV_REMOVE_TAG = '@REMOVE_BEFORE_PROD:GATE_DEV_ONLY'
type KnownCampaignMeta = { id: string; name: string }
type SidebarGroup = 'Profilo' | 'Campagna'
const CAMPAIGN_ACTIVE_REQUIRED_SCREENS: Screen[] = [
  'Approvazione Accessi',
  'Gestione Personaggi',
  'Scheda PG',
  'Gestione Campagna',
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

type CampaignAccessBadgeKind = 'edit' | 'player' | 'outside' | 'pending' | 'blocked' | 'banned'

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

function App() {
  const [screen, setScreen] = useState<Screen>('Profilo')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<UiEvent[]>([])

  const [campaignId, setCampaignId] = useState(localStorage.getItem(CAMPAIGN_ID_KEY) || '')
  const [knownCampaignIds, setKnownCampaignIds] = useState<string[]>(() => {
    const raw = localStorage.getItem(KNOWN_CAMPAIGNS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  })
  const [knownCampaignMeta, setKnownCampaignMeta] = useState<KnownCampaignMeta[]>(() => {
    const raw = localStorage.getItem(KNOWN_CAMPAIGN_META_KEY)
    return raw ? (JSON.parse(raw) as KnownCampaignMeta[]) : []
  })
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
  const [campaignModules, setCampaignModules] = useState<string[]>([])

  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [characterDetail, setCharacterDetail] = useState<Character | null>(null)

  const [missions, setMissions] = useState<MissionResponse[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [lastMissionAction, setLastMissionAction] = useState<MissionParticipantResponse | null>(null)

  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [selectedCampaignMember, setSelectedCampaignMember] = useState<CampaignMembershipResponse | null>(null)
  const [selectedCampaignMemberProfile, setSelectedCampaignMemberProfile] = useState<UserProfile | null>(null)
  const [expandedSidebarGroup, setExpandedSidebarGroup] = useState<SidebarGroup | null>('Profilo')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

  const rememberCampaignId = (id: string) => {
    const trimmed = id.trim()
    setCampaignId(trimmed)
    if (trimmed) {
      localStorage.setItem(CAMPAIGN_ID_KEY, trimmed)
      setKnownCampaignIds((prev) => {
        const next = Array.from(new Set([trimmed, ...prev]))
        localStorage.setItem(KNOWN_CAMPAIGNS_KEY, JSON.stringify(next))
        return next
      })
    } else {
      localStorage.removeItem(CAMPAIGN_ID_KEY)
    }
  }

  const rememberCampaignMeta = (id: string, name: string) => {
    setKnownCampaignMeta((prev) => {
      const next = [{ id, name }, ...prev.filter((item) => item.id !== id)]
      localStorage.setItem(KNOWN_CAMPAIGN_META_KEY, JSON.stringify(next))
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
        setSelectedCampaignMember(null)
        setSelectedCampaignMemberProfile(null)
        setCharacters([])
        setMissions([])
        setRooms([])
      }
    })
  }

  const loadCampaignBlockFor = async (targetCampaignId: string) => {
    const [campaignValue, memberValue, characterValue, missionValue, roomValue, canManageMembersPermission] = await Promise.all([
      getCampaign(targetCampaignId),
      getCampaignMembers(targetCampaignId),
      listCharacters(targetCampaignId),
      listMissions(targetCampaignId),
      listRooms(targetCampaignId),
      checkPermission(targetCampaignId, 'PROMOTE_CO_MASTER_OR_MASTER')
        .then((permission) => permission.allowed)
        .catch(() => false),
    ])
    const memberManagementValue = canManageMembersPermission
      ? await listCampaignMembersForManagement(targetCampaignId).catch(() => [])
      : []
    setCampaign(campaignValue)
    rememberCampaignMeta(campaignValue.id, campaignValue.name)
    setMembers(memberValue)
    setCampaignMembersForManagement(memberManagementValue)
    setCanManageCampaignMembers(canManageMembersPermission)
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

  const activateCampaign = async (item: MyCampaignMembershipResponse) => {
    rememberCampaignId(item.campaignId)
    rememberCampaignMeta(item.campaignId, item.campaignName)
    setSelectedCampaignMember(null)
    setSelectedCampaignMemberProfile(null)
    await run('Campagna attivata', async () => {
      await loadCampaignBlockFor(item.campaignId)
    })
  }

  const loadPendingForActiveCampaign = async () => {
    if (!campaignId.trim()) return
    const list = await listPendingApplications(campaignId)
    setPendingApplications(list)
  }

  const loadCharactersForManagement = async () => {
    const activeCampaignId = campaignId.trim()
    const canManageActiveCampaign = approvedCampaignMemberships.some((item) => item.campaignId === activeCampaignId)
    if (!activeCampaignId || !canManageActiveCampaign) {
      setCharacters([])
      setSelectedCharacterId('')
      setCharacterDetail(null)
      return
    }
    const nextCharacters = await listCharacters(activeCampaignId)
    nextCharacters.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    setCharacters(nextCharacters)
    setSelectedCharacterId((prev) => (nextCharacters.some((item) => item.id === prev) ? prev : nextCharacters[0]?.id || ''))
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
          localStorage.setItem(KNOWN_CAMPAIGN_META_KEY, JSON.stringify(merged))
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

  const hasActiveCampaign =
    myCampaigns.some((item) => item.campaignId === campaignId && item.memberStatus === 'APPROVED') ||
    campaignsForList.some((item) => item.id === campaignId && item.membershipStatus === 'APPROVED')
  useEffect(() => {
    if (!CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(screen)) return
    if (!hasActiveCampaign) setScreen('Lista Campagne')
  }, [screen, hasActiveCampaign])

  useEffect(() => {
    if (screen !== 'Scheda PG') return
    if (!selectedCharacterId) setScreen('Gestione Personaggi')
  }, [screen, selectedCharacterId])

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
    if (screen !== 'Scheda Campagna') return
    if (!campaignId.trim()) return

    let cancelled = false
    void (async () => {
      try {
        const list = await listPendingApplications(campaignId)
        if (!cancelled) setPendingApplications(list)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setPendingApplications([])
          return
        }
        const message = toMessage(err)
        setError(message)
        addEvent(`Richieste pending: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen, campaignId])

  useEffect(() => {
    if (!getAccessToken()) return
    if (screen !== 'Crea Campagna') return

    let cancelled = false
    void (async () => {
      try {
        const modules = await listCampaignModules()
        if (!cancelled) setCampaignModules(modules)
      } catch (err) {
        if (cancelled) return
        const message = toMessage(err)
        setError(message)
        addEvent(`Caricamento moduli campagna: ${message}`, 'error')
        if (isUnauthorized(err)) handleLogout()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [screen])

  const handleAuth = async (session: AuthSession) => {
    setProfile(session.user)
    setError('')
    addEvent('Autenticazione completata', 'ok')
    await refreshProfile()
  }

  const handleLogout = () => {
    logout()
    setProfile(null)
    setCampaign(null)
    setMembers([])
    setCampaignMembersForManagement([])
    setSelectedCampaignMember(null)
    setSelectedCampaignMemberProfile(null)
    setCharacters([])
    setMissions([])
    setRooms([])
    setPermissions([])
    setCharacterDetail(null)
    setLastMissionAction(null)
    setSelectedCharacterId('')
    setSelectedMissionId('')
    setError('')
    addEvent('Logout eseguito', 'info')
  }

  if (!profile) {
    return <AuthScreen onAuth={handleAuth} />
  }

  const profileScreens: Screen[] = ['Profilo', 'Modifica Profilo']
  const campaignScreens: Screen[] = [
    'Lista Campagne',
    'Profilo Membro Campagna',
  ]
  const menuGroups: { key: SidebarGroup; screens: Screen[] }[] = [
    { key: 'Profilo', screens: profileScreens },
    { key: 'Campagna', screens: campaignScreens },
  ]
  const enabledSet = new Set<Screen>([...profileScreens, ...campaignScreens])
  const isMenuScreenEnabled = (value: Screen) => {
    if (!enabledSet.has(value)) return false
    if (CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(value) && !hasActiveCampaign) return false
    if (value === 'Profilo Membro Campagna' && !selectedCampaignMember) return false
    return true
  }
  const campaignArea = isCampaignScope(screen)
  const characterArea = isCharacterScope(screen)
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
  const hasPlayerCharacterInActiveCampaign = characters.some(
    (character) => !character.isNpc && character.userId === profile.id && character.campaignId === campaignId,
  )
  const canCreatePlayerCharacter = hasActiveCampaign && !hasPlayerCharacterInActiveCampaign
  const canCreateNpc =
    hasActiveCampaign &&
    (activeCampaignMembership?.role === 'CO_MASTER' ||
      activeCampaignMembership?.role === 'MASTER' ||
      activeCampaignMembership?.role === 'SUPER_MASTER')
  const goToScreen = (value: Screen) => {
    setScreen(value)
    setIsSidebarOpen(false)
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

      <aside className={`sidebar-drawer ${isSidebarOpen ? 'is-open' : ''}`} aria-hidden={!isSidebarOpen}>
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <p className="brand-title">Taverna del Codice</p>
            <p className="brand-subtitle">MVP no-chat</p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={() => setIsSidebarOpen(false)}>
            Chiudi
          </button>
        </div>

        <div className="api-box">
          <p className="muted">API</p>
          <p className="api-url">{getApiBaseUrl()}</p>
        </div>

        <nav className="menu compact-menu">
          {menuGroups.map((group) => {
            const isExpanded = expandedSidebarGroup === group.key
            return (
              <div key={group.key} className="menu-group">
                <button
                  type="button"
                  className={`menu-group-toggle ${isExpanded ? 'is-expanded' : ''}`}
                  onClick={() => setExpandedSidebarGroup((prev) => (prev === group.key ? null : group.key))}
                >
                  <span>{group.key}</span>
                  <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                </button>
                <div className={`menu-group-items-wrap ${isExpanded ? 'is-expanded' : ''}`}>
                  <div className="menu-group-items">
                    {group.screens.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`menu-item ${screen === item ? 'is-active' : ''} ${isMenuScreenEnabled(item) ? '' : 'is-disabled'}`}
                        onClick={() => isMenuScreenEnabled(item) && goToScreen(item)}
                        disabled={!isMenuScreenEnabled(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <p className="sidebar-user-name">{profile.profileName}</p>
          <p className="sidebar-user-handle">@{profile.username || 'utente'}</p>
        </div>

        <button type="button" className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title-row">
            <button type="button" className="menu-trigger" aria-label="Apri menu" onClick={() => setIsSidebarOpen(true)}>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <div>
              <h1>{screen}</h1>
              {!campaignArea && <p>Utente: {profile.username || profile.profileName}</p>}
              {campaignArea && (
                <p>
                  Utente: {profile.username || profile.profileName} | Campagna attiva: {activeCampaignName}
                </p>
              )}
            </div>
          </div>
          <div className="inline-actions">
            <button type="button" className="refresh-btn" disabled={busy} onClick={() => void refreshProfile()}>
              Refresh Profilo
            </button>
            {campaignArea && (
              <button type="button" className="refresh-btn" disabled={busy} onClick={() => void refreshCampaignBlock()}>
                Refresh Campagna
              </button>
            )}
          </div>
        </header>

        {error && <section className="panel error">{error}</section>}

        {characterArea && hasActiveCampaign && (
          <section className="panel">
            <label>
              Campaign ID attivo (richiesto dalle API per PG/NPC)
              <input
                value={campaignId}
                onChange={(event) => rememberCampaignId(event.target.value)}
                placeholder="id campagna"
              />
            </label>
            {myCampaigns.length > 0 && (
              <div className="chips">
                {myCampaigns.map((item) => (
                  <button
                    key={item.campaignId}
                    type="button"
                    className={`chip ${campaignId === item.campaignId ? 'is-active' : ''}`}
                    onClick={() => void activateCampaign(item)}
                  >
                    {item.campaignName} · {item.role}
                    {campaignId === item.campaignId ? ' · Attiva' : ''}
                  </button>
                ))}
              </div>
            )}
            {myCampaigns.length === 0 && <p className="muted">Nessuna campagna attiva per questo profilo.</p>}
          </section>
        )}

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
              run('Scheda campagna caricata', async () => {
                const [campaignValue, memberValue, memberManagementValue] = await Promise.all([
                  getCampaign(targetCampaignId),
                  getCampaignMembers(targetCampaignId).catch(() => []),
                  listCampaignMembersForManagement(targetCampaignId).catch(() => []),
                ])
                setCampaign(campaignValue)
                rememberCampaignMeta(campaignValue.id, campaignValue.name)
                setMembers(memberValue)
                setCampaignMembersForManagement(memberManagementValue)
                setScreen('Scheda Campagna')
              })
            }
            onCreateCampaign={() => setScreen('Crea Campagna')}
            activeCampaignName={campaign?.name || activeCampaignMembership?.campaignName || campaignId || ''}
          />
        )}

        {screen === 'Crea Campagna' && (
          <CreateCampaignPage
            availableModules={campaignModules}
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
            members={campaignMembersForManagement.length > 0 ? campaignMembersForManagement : members}
            memberNames={memberNames}
            onReload={() => void refreshCampaignBlock()}
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
              run('Campagna attivata', async () => {
                if (!campaign?.id) return
                rememberCampaignId(campaign.id)
                await loadCampaignBlockFor(campaign.id)
                setScreen('Gestione Campagna')
              })
            }
            onOpenSelectPg={() =>
              run('Campagna attivata', async () => {
                if (!campaign?.id) return
                rememberCampaignId(campaign.id)
                await loadCampaignBlockFor(campaign.id)
                setScreen('Seleziona PG')
              })
            }
            onOpenCharacters={() =>
              run('Campagna attivata', async () => {
                if (!campaign?.id) return
                rememberCampaignId(campaign.id)
                await loadCampaignBlockFor(campaign.id)
                setScreen('Gestione Personaggi')
              })
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
              campaign?.id &&
              run('Campagna attivata', async () => {
                rememberCampaignId(campaign.id)
                const [mine] = await Promise.all([listMyCampaignMemberships(), loadCampaignBlockFor(campaign.id)])
                setMyCampaigns(mine)
              })
            }
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
            characters={characters}
            lastMissionAction={lastMissionAction}
            onCreate={(payload) =>
              run('Missione creata', async () => {
                const created = await createMission(campaignId, payload)
                setMissions((prev) => [created, ...prev])
                setSelectedMissionId(created.id)
              })
            }
            onSelectMission={setSelectedMissionId}
            onReopen={(missionId) =>
              run('Missione riaperta', async () => {
                const updated = await reopenMission(campaignId, missionId)
                setMissions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
              })
            }
            onJoin={(missionId, characterId, participationType) =>
              run('Join missione completato', async () => {
                const result = await joinMission(campaignId, missionId, { characterId, participationType })
                setLastMissionAction(result)
              })
            }
            onLeave={(missionId) =>
              run('Leave missione completato', async () => {
                const result = await leaveMission(campaignId, missionId)
                setLastMissionAction(result)
              })
            }
          />
        )}

        {screen === 'Stanze' && (
          <RoomsPage
            rooms={rooms}
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
            onPublicLookup={(id) =>
              run('Profilo pubblico caricato', async () => {
                const publicProfile = await getPublicProfile(id)
                addEvent(`Public profile ${publicProfile.id} caricato`, 'info')
              })
            }
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
            onRefresh={() =>
              run('Scheda personaggio caricata', async () => {
                if (!selectedCharacterId) return
                const detailCampaignId = selectedCharacter?.campaignId || campaignId
                if (!detailCampaignId) return
                const detail = await getCharacter(detailCampaignId, selectedCharacterId)
                setCharacterDetail(detail)
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
            permissions={permissions}
            onLoadModules={() =>
              run('Moduli campagna caricati', async () => {
                const modules = await listCampaignModules()
                setCampaignModules(modules)
              })
            }
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
            onCheckPermission={(action) =>
              run(`Permission check ${action}`, async () => {
                const checked = await checkPermission(campaignId, action)
                setPermissions((prev) => [
                  checked,
                  ...prev.filter((item) => item.action !== action),
                ])
              })
            }
            onTransfer={(newOwnerId) =>
              run('Ownership trasferita', async () => {
                const updated = await transferOwnership(campaignId, newOwnerId)
                setCampaign(updated)
              })
            }
            onLeave={() =>
              run('Leave campaign completato', async () => {
                await leaveCampaign(campaignId)
              })
            }
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
      </main>
    </div>
  )
}

function AuthScreen({ onAuth }: { onAuth: (session: AuthSession) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileName, setProfileName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const session =
        mode === 'login'
          ? await login(username, password)
          : await register({ username, password, profileName, bio })
      await onAuth(session)
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
          <div className="row-between">
            <h2>{mode === 'login' ? 'Login' : 'Registrazione'}</h2>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setMode((value) => (value === 'login' ? 'register' : 'login'))}
            >
              {mode === 'login' ? 'Vai a registrazione' : 'Vai a login'}
            </button>
          </div>
          <label>
            Username
            <input required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === 'register' && (
            <>
              <label>
                Profile Name
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <label>
                Bio
                <textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </button>
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
  onCreateCampaign,
  activeCampaignName,
}: {
  campaigns: CampaignDiscoverResponse[]
  founderNames: Record<string, string>
  onDiscover: () => void
  onOpenCampaign: (campaignId: string) => void
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
            return (
              <li key={item.id} className="line-item campaign-item">
                <div className="campaign-item-main">
                  <div className="campaign-item-header">
                    <p className="character-name">{item.name}</p>
                    <CampaignAccessBadge item={item} />
                  </div>
                  <p className="muted">{item.summary || item.description || 'Nessuna descrizione'}</p>
                  {item.founderId && (
                    <p className="campaign-creator">
                      Creatore: {founderNames[item.founderId] || item.founderId}
                    </p>
                  )}
                </div>
                <div className="inline-actions campaign-item-actions">
                  <button type="button" className="secondary-btn" onClick={() => onOpenCampaign(item.id)}>
                    Apri scheda
                  </button>
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
  onCreate,
}: {
  availableModules: string[]
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
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false)
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false)

  useEffect(() => {
    if (availableModules.length === 0) return
    setSelectedModules((prev) => {
      if (prev.length === 0) return [...availableModules]
      return prev.filter((moduleCode) => availableModules.includes(moduleCode))
    })
  }, [availableModules])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode) ? prev.filter((item) => item !== moduleCode) : [...prev, moduleCode]
    )
  }
  const selectedModulesLabel = selectedModules.length > 0 ? selectedModules.join(', ') : 'Nessun modulo selezionato'
  const selectedVisibilityLabel = [isOpen ? 'Aperta' : null, isSearchable ? 'Ricercabile' : null]
    .filter(Boolean)
    .join(', ') || 'Nessuna opzione selezionata'

  return (
    <section className="panel">
      <h2>Crea Campagna</h2>
      <label>
        Nome
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Descrizione
        <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Riassunto breve
        <textarea rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
      </label>
      <div className="form-grid">
        <label>
          Ambientazione
          <textarea rows={3} value={setting} onChange={(event) => setSetting(event.target.value)} />
        </label>
        <label>
          Tono
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
        Regole
        <textarea rows={3} value={rules} onChange={(event) => setRules(event.target.value)} />
      </label>
      <label>
        Requisiti d'ingresso
        <textarea rows={3} value={requirements} onChange={(event) => setRequirements(event.target.value)} />
      </label>
      <label>
        URL immagine copertina
        <input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} />
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
      <div className="multicheck-field">
        <p className="muted">Moduli</p>
        <button
          type="button"
          className="secondary-btn multicheck-trigger"
          onClick={() => setModuleMenuOpen((prev) => !prev)}
          disabled={availableModules.length === 0}
        >
          <span className="multicheck-value">{selectedModulesLabel}</span>
          <span aria-hidden="true">{moduleMenuOpen ? '▴' : '▾'}</span>
        </button>
        {moduleMenuOpen && availableModules.length > 0 && (
          <div className="multicheck-menu">
            {availableModules.map((moduleCode) => (
              <label key={moduleCode} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selectedModules.includes(moduleCode)}
                  onChange={() => toggleModule(moduleCode)}
                />
                {moduleCode}
              </label>
            ))}
          </div>
        )}
        {availableModules.length === 0 && <p className="muted">Nessun modulo disponibile.</p>}
      </div>
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
            allowedModules: selectedModules,
          })
        }
      >
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

function CampaignDetailPage({
  campaign,
  members,
  memberNames,
  pendingApplications,
  onReload,
  onLoadPending,
  onApprove,
  onReject,
  onOpenMember,
  onOpenManagement,
  onOpenSelectPg,
  onOpenCharacters,
  canManageMembers,
  onApply,
  onActivate,
  membershipStatus,
  membershipRole,
}: {
  campaign: CampaignResponse | null
  members: CampaignMembershipResponse[]
  memberNames: Record<string, string>
  pendingApplications: CampaignApplicationResponse[]
  onReload: () => void
  onLoadPending: () => void
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
  onOpenMember: (userId: string) => void
  onOpenManagement: () => void
  onOpenSelectPg: () => void
  onOpenCharacters: () => void
  canManageMembers: boolean
  onApply: () => void
  onActivate: () => void
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
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

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
          {campaign.summary && <p className="campaign-summary">{campaign.summary}</p>}
          <p className="muted">{campaign.description || 'Nessuna descrizione'}</p>
          <div className="campaign-profile-grid">
            <InfoBlock title="Ambientazione" value={campaign.setting} />
            <InfoBlock title="Tono" value={campaignToneLabel(campaign.tone)} />
            <InfoBlock title="Regole" value={campaign.rules} />
            <InfoBlock title="Requisiti d'ingresso" value={campaign.requirements} />
          </div>
          <p className="muted">
            open: {String(campaign.isOpen)} | searchable: {String(campaign.isSearchable)}
          </p>
          {campaign.allowedModules.length > 0 && (
            <div className="chips">
              {campaign.allowedModules.map((moduleCode) => (
                <span key={moduleCode} className="chip readonly-chip">
                  {moduleCode}
                </span>
              ))}
            </div>
          )}
          <div className="inline-actions">
            {membershipStatus === 'APPROVED' && (
              <button type="button" className="primary-btn" onClick={onActivate}>
                Entra
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
          </div>
          {canManageMembers && (
            <>
              <div className="divider" />
              <h3 className="section-title">Membri Campagna</h3>
              <label>
                Cerca membro per nome
                <input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="es. Sandro"
                />
              </label>
              <div className="multicheck-field">
                <p className="muted">Filtro stato membro</p>
                <button
                  type="button"
                  className="secondary-btn multicheck-trigger"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                >
                  <span className="multicheck-value">{statusFilterLabel}</span>
                  <span aria-hidden="true">{statusMenuOpen ? '▴' : '▾'}</span>
                </button>
                {statusMenuOpen && (
                  <div className="multicheck-menu">
                    {(['APPROVED', 'PENDING', 'BLOCKED', 'BANNED', 'REJECTED'] as CampaignMemberStatus[]).map((status) => (
                      <label key={status} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={statusFilters.includes(status)}
                          onChange={() => toggleStatusFilter(status)}
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="multicheck-field">
                <p className="muted">Filtro grado</p>
                <button
                  type="button"
                  className="secondary-btn multicheck-trigger"
                  onClick={() => setRoleMenuOpen((prev) => !prev)}
                >
                  <span className="multicheck-value">{roleFilterLabel}</span>
                  <span aria-hidden="true">{roleMenuOpen ? '▴' : '▾'}</span>
                </button>
                {roleMenuOpen && (
                  <div className="multicheck-menu">
                    {(['GIOCATORE', 'CO_MASTER', 'MASTER', 'SUPER_MASTER'] as CampaignRole[]).map((role) => (
                      <label key={role} className="checkbox-row">
                        <input type="checkbox" checked={roleFilters.includes(role)} onChange={() => toggleRoleFilter(role)} />
                        {role}
                      </label>
                    ))}
                  </div>
                )}
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
              <div className="divider" />
              <div className="row-between">
                <h3 className="section-title">Richieste Pending</h3>
                <button type="button" className="secondary-btn" onClick={onLoadPending}>
                  Carica richieste pending
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
            </>
          )}
        </>
      )}
    </section>
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
        <p className="muted">Solo profili con permesso adeguato (MASTER/SUPER_MASTER o ADMIN).</p>
        <button type="button" className="secondary-btn" onClick={onLoadPending}>
          Carica richieste pending
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
  selectedMission,
  characters,
  lastMissionAction,
  onCreate,
  onSelectMission,
  onReopen,
  onJoin,
  onLeave,
}: {
  missions: MissionResponse[]
  selectedMission: MissionResponse | null
  characters: Character[]
  lastMissionAction: MissionParticipantResponse | null
  onCreate: (payload: {
    title: string
    description: string
    isMultiSession: boolean
    sessionAt: string
    closesAt: string
  }) => void
  onSelectMission: (id: string) => void
  onReopen: (missionId: string) => void
  onJoin: (missionId: string, characterId: string, participationType: 'TITOLARE' | 'NON_TITOLARE') => void
  onLeave: (missionId: string) => void
}) {
  const [title, setTitle] = useState('Nuova Missione')
  const [description, setDescription] = useState('')
  const [multi, setMulti] = useState(false)
  const [sessionAt, setSessionAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [participationType, setParticipationType] = useState<'TITOLARE' | 'NON_TITOLARE'>('TITOLARE')

  return (
    <section className="panel">
      <h2>Missioni</h2>
      <div className="form-grid">
        <label>
          Titolo
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Session At (ISO)
          <input value={sessionAt} onChange={(event) => setSessionAt(event.target.value)} />
        </label>
      </div>
      <label>
        Descrizione
        <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Closes At (ISO)
        <input value={closesAt} onChange={(event) => setClosesAt(event.target.value)} />
      </label>
      <label className="checkbox-row">
        <input checked={multi} type="checkbox" onChange={(event) => setMulti(event.target.checked)} />
        Multi session
      </label>
      <button
        type="button"
        className="primary-btn"
        onClick={() =>
          onCreate({
            title,
            description,
            isMultiSession: multi,
            sessionAt,
            closesAt,
          })
        }
      >
        Crea Missione
      </button>

      <div className="divider" />
      <h3 className="section-title">Elenco Missioni</h3>
      <ul className="list-reset">
        {missions.map((mission) => (
          <li key={mission.id}>
            <button
              type="button"
              className={`character-item ${selectedMission?.id === mission.id ? 'is-selected' : ''}`}
              onClick={() => onSelectMission(mission.id)}
            >
              <div>
                <p className="character-name">{mission.title}</p>
                <p className="muted">{mission.status}</p>
              </div>
              <span className={`status ${mission.status === 'OPEN' ? 'status-success' : 'status-warning'}`}>
                {mission.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selectedMission && (
        <div className="subpanel">
          <p>
            <strong>{selectedMission.title}</strong>
          </p>
          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={() => onReopen(selectedMission.id)}>
              Reopen
            </button>
            <button type="button" className="secondary-btn" onClick={() => onLeave(selectedMission.id)}>
              Leave mission
            </button>
          </div>
          <div className="form-grid">
            <label>
              Character
              <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                <option value="">seleziona</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name} ({character.characterStatus || 'N/A'})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Participation
              <select
                value={participationType}
                onChange={(event) => setParticipationType(event.target.value as 'TITOLARE' | 'NON_TITOLARE')}
              >
                <option value="TITOLARE">TITOLARE</option>
                <option value="NON_TITOLARE">NON_TITOLARE</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => characterId && onJoin(selectedMission.id, characterId, participationType)}
          >
            Join mission
          </button>
          {lastMissionAction && (
            <p className="muted">
              Ultima azione: {lastMissionAction.userId} {'->'} {lastMissionAction.participationType}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function RoomsPage({
  rooms,
  onCreate,
}: {
  rooms: RoomResponse[]
  onCreate: (payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number }) => void
}) {
  const [name, setName] = useState('Piazza Centrale')
  const [type, setType] = useState<'ROLEPLAY' | 'SPAM'>('ROLEPLAY')
  const [ttlHours, setTtlHours] = useState(72)
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0)

  return (
    <section className="panel">
      <h2>Stanze</h2>
      <div className="form-grid">
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Tipo
          <select value={type} onChange={(event) => setType(event.target.value as 'ROLEPLAY' | 'SPAM')}>
            <option value="ROLEPLAY">ROLEPLAY</option>
            <option value="SPAM">SPAM</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          TTL hours
          <input
            type="number"
            min={1}
            max={72}
            value={ttlHours}
            onChange={(event) => setTtlHours(Number(event.target.value))}
          />
        </label>
        <label>
          Slowmode seconds
          <input
            type="number"
            min={0}
            max={600}
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
        Crea Stanza
      </button>

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
      <p className="muted">
        Feed locale basato su azioni API client. <strong>{DEV_REMOVE_TAG}</strong>
      </p>
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

function ProfilePage({
  profile,
  onPublicLookup,
  onGoEdit,
}: {
  profile: UserProfile
  onPublicLookup: (userId: string) => void
  onGoEdit: () => void
}) {
  const [userId, setUserId] = useState('')
  return (
    <section className="panel">
      <h2>Profilo</h2>
      <p>
        <strong>{profile.username || profile.profileName}</strong>
      </p>
      <p className="muted">{profile.bio || 'Nessuna bio'}</p>
      <p className="muted">Whatsapp: {profile.whatsapp || '-'}</p>
      <div className="inline-actions">
        <button type="button" className="primary-btn" onClick={onGoEdit}>
          Modifica Profilo
        </button>
      </div>
      <div className="divider" />
      <label>
        Lookup profilo pubblico per userId
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>
      <button type="button" className="secondary-btn" onClick={() => onPublicLookup(userId)}>
        Carica pubblico
      </button>
    </section>
  )
}

function EditProfilePage({
  profile,
  onSave,
}: {
  profile: UserProfile
  onSave: (draft: ProfileDraft) => void
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileToDraft(profile))

  useEffect(() => {
    setDraft(profileToDraft(profile))
  }, [profile.id, profile.profileName, profile.bio, profile.whatsapp, profile.socialLinks])

  return (
    <section className="panel">
      <h2>Modifica Profilo</h2>
      <div className="form-grid">
        <label>
          Profile Name
          <input
            value={draft.profileName}
            onChange={(event) => setDraft((prev) => ({ ...prev, profileName: event.target.value }))}
          />
        </label>
        <label>
          WhatsApp
          <input
            value={draft.whatsapp}
            onChange={(event) => setDraft((prev) => ({ ...prev, whatsapp: event.target.value }))}
          />
        </label>
      </div>
      <label>
        Bio
        <textarea
          rows={4}
          value={draft.bio}
          onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
        />
      </label>
      <div className="form-grid">
        <label>
          Instagram
          <input
            value={draft.instagram}
            onChange={(event) => setDraft((prev) => ({ ...prev, instagram: event.target.value }))}
          />
        </label>
        <label>
          Altro social
          <input
            value={draft.otherSocial}
            onChange={(event) => setDraft((prev) => ({ ...prev, otherSocial: event.target.value }))}
          />
        </label>
      </div>
      <button type="button" className="primary-btn" onClick={() => onSave(draft)}>
        Salva
      </button>
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
                    {character.isNpc ? '🎭' : '🧙'}
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
                {canOpen ? '✎' : '🔒'}
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

function CharacterDetailPage({
  character,
  externalDetail,
  ownerProfileLabel,
  canMarkCharacterDead,
  onRefresh,
  onUpdateStatus,
}: {
  character: Character | null
  externalDetail: Character | null
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  canMarkCharacterDead: (character: Character | null) => boolean
  onRefresh: () => void
  onUpdateStatus: (status: CharacterStatus) => void
}) {
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>('ACTIVE')
  useEffect(() => {
    if (value?.characterStatus) setStatus(value.characterStatus)
  }, [value?.id, value?.characterStatus])
  const deadAllowed = canMarkCharacterDead(value)

  useEffect(() => {
    if (status === 'DEAD' && !deadAllowed) {
      setStatus('RETIRED')
    }
  }, [status, deadAllowed])

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
                {value.isNpc ? '🎭' : '🧙'}
              </span>{' '}
              {value.name}
            </strong>
          </p>
          <p className="muted">tipo: {value.isNpc ? 'NPC' : 'Personaggio'}</p>
          <p className="muted">profilo: {ownerProfileLabel(value.userId, value.ownerProfileName)}</p>
          <p className="muted">status: {value.characterStatus || 'N/A'}</p>
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
          Ruolo campagna
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
            Aggiorna ruolo
          </button>
        </div>
      </div>

      <div className="inline-actions">
        {(membership.memberStatus === 'PENDING' || membership.memberStatus === 'REJECTED') && (
          <button type="button" className="primary-btn" onClick={onApprove}>
            Accetta utente
          </button>
        )}
        {membership.memberStatus === 'APPROVED' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('suspend')}>
            Sospendi utente
          </button>
        )}
        {membership.memberStatus === 'BLOCKED' && (
          <button type="button" className="secondary-btn" onClick={onUnsuspend}>
            Sblocca sospensione
          </button>
        )}
        {membership.memberStatus !== 'BANNED' && membership.memberStatus !== 'PENDING' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('ban')}>
            Blocca utente
          </button>
        )}
        {membership.memberStatus === 'BANNED' && (
          <button type="button" className="secondary-btn" onClick={onUnban}>
            Sblocca utente
          </button>
        )}
      </div>

      {moderationMode && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3>{moderationMode === 'ban' ? 'Motivo ban' : 'Motivo sospensione'}</h3>
            <label>
              Motivo (max 200)
              <textarea
                rows={4}
                maxLength={200}
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
  permissions,
  onLoadModules,
  onSave,
  onCheckPermission,
  onTransfer,
  onLeave,
}: {
  campaign: CampaignResponse | null
  availableModules: string[]
  permissions: CampaignPermissionResponse[]
  onLoadModules: () => void
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
  onCheckPermission: (action: string) => void
  onTransfer: (newOwnerUserId: string) => void
  onLeave: () => void
}) {
  const [action, setAction] = useState('CREATE_ROOM')
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
              Nome
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Tono
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
            Descrizione
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Riassunto breve
            <textarea rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
          </label>
          <label>
            Ambientazione
            <textarea rows={3} value={setting} onChange={(event) => setSetting(event.target.value)} />
          </label>
          <label>
            Regole
            <textarea rows={3} value={rules} onChange={(event) => setRules(event.target.value)} />
          </label>
          <label>
            Requisiti d'ingresso
            <textarea rows={3} value={requirements} onChange={(event) => setRequirements(event.target.value)} />
          </label>
          <label>
            URL immagine copertina
            <input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} />
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
          <div className="multicheck-field">
            <div className="row-between">
              <p className="muted">Moduli</p>
              <button type="button" className="secondary-btn" onClick={onLoadModules}>
                Carica moduli
              </button>
            </div>
            <div className="chips">
              {availableModules.map((moduleCode) => (
                <button
                  key={moduleCode}
                  type="button"
                  className={`chip ${selectedModules.includes(moduleCode) ? 'is-active' : ''}`}
                  onClick={() => toggleModule(moduleCode)}
                >
                  {moduleCode}
                </button>
              ))}
              {availableModules.length === 0 && <p className="muted">Premi "Carica moduli" per modificare i moduli.</p>}
            </div>
          </div>
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
            Salva anagrafica
          </button>
          <div className="divider" />
        </>
      )}
      <div className="form-grid">
        <label>
          Permission action
          <select value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="CREATE_ROOM">CREATE_ROOM</option>
            <option value="APPROVE_OR_REJECT_APPLICATIONS">APPROVE_OR_REJECT_APPLICATIONS</option>
            <option value="TRANSFER_OWNERSHIP">TRANSFER_OWNERSHIP</option>
            <option value="MANAGE_CAMPAIGN_SETTINGS">MANAGE_CAMPAIGN_SETTINGS</option>
          </select>
        </label>
        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={() => onCheckPermission(action)}>
            Check permission
          </button>
        </div>
      </div>
      <ul className="list-reset">
        {permissions.map((permission) => (
          <li key={permission.action} className="line-item">
            <span>{permission.action}</span>
            <span className={`status ${permission.allowed ? 'status-success' : 'status-danger'}`}>
              {String(permission.allowed)}
            </span>
          </li>
        ))}
      </ul>

      <div className="divider" />
      <label>
        New owner userId
        <input value={newOwnerUserId} onChange={(event) => setNewOwnerUserId(event.target.value)} />
      </label>
      <button type="button" className="secondary-btn" onClick={() => onTransfer(newOwnerUserId)}>
        Transfer ownership
      </button>

      <div className="divider" />
      <button type="button" className="secondary-btn" onClick={onLeave}>
        Leave campaign
      </button>
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
        Personaggio
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
        <p className="muted">Hai già un PG in questa campagna: non puoi crearne un altro.</p>
      )}
      {hasActiveCampaign && !canCreateNpc && (
        <p className="muted">Con ruolo GIOCATORE non puoi creare NPC.</p>
      )}
      <div className="form-grid">
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Nickname
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
        </label>
      </div>
      <label>
        Portrait URL
        <input value={portraitUrl} onChange={(event) => setPortraitUrl(event.target.value)} />
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
              🧙
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
              🎭
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
