import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { ApiError, getAccessToken, getApiBaseUrl } from './services/apiClient'
import {
  applyToCampaign,
  approveApplication,
  checkPermission,
  createCampaign,
  createCharacter,
  discoverCampaigns,
  createMission,
  createRoom,
  getCampaign,
  getCampaignMembers,
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
  transferOwnership,
  updateCharacterStatus,
  updateMe,
} from './services/gateApi'
import type {
  AuthSession,
  CampaignApplicationResponse,
  CampaignDiscoverResponse,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
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
  'Scheda Campagna',
  'Approvazione Accessi',
  'Gestione Personaggi',
  'Scheda PG',
  'Crea Personaggio',
]

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
  const [permissions, setPermissions] = useState<CampaignPermissionResponse[]>([])

  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [characterDetail, setCharacterDetail] = useState<Character | null>(null)

  const [missions, setMissions] = useState<MissionResponse[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [lastMissionAction, setLastMissionAction] = useState<MissionParticipantResponse | null>(null)

  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [expandedSidebarGroup, setExpandedSidebarGroup] = useState<SidebarGroup | null>('Profilo')

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || null,
    [characters, selectedCharacterId],
  )

  const selectedMission = useMemo(
    () => missions.find((mission) => mission.id === selectedMissionId) || null,
    [missions, selectedMissionId],
  )
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
          membershipStatus: 'APPROVED',
          membershipRole: membership.role,
          name: existing.name || membership.campaignName,
        })
      } else {
        byId.set(membership.campaignId, {
          id: membership.campaignId,
          name: membership.campaignName,
          description: null,
          founderId: '',
          isOpen: true,
          isSearchable: true,
          createdAt: '',
          membershipStatus: 'APPROVED',
          membershipRole: membership.role,
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
        setCharacters([])
        setMissions([])
        setRooms([])
      } else if (campaignId && !mine.some((item) => item.campaignId === campaignId)) {
        rememberCampaignId('')
        setCampaign(null)
        setMembers([])
        setCharacters([])
        setMissions([])
        setRooms([])
      }
    })
  }

  const loadCampaignBlockFor = async (targetCampaignId: string) => {
    const [campaignValue, memberValue, characterValue, missionValue, roomValue] = await Promise.all([
      getCampaign(targetCampaignId),
      getCampaignMembers(targetCampaignId),
      listCharacters(targetCampaignId),
      listMissions(targetCampaignId),
      listRooms(targetCampaignId),
    ])
    setCampaign(campaignValue)
    rememberCampaignMeta(campaignValue.id, campaignValue.name)
    setMembers(memberValue)
    setCharacters(characterValue)
    setMissions(missionValue)
    setRooms(roomValue)
    setSelectedCharacterId((prev) => prev || characterValue[0]?.id || '')
    setSelectedMissionId((prev) => prev || missionValue[0]?.id || '')
  }

  const loadCampaignSummaryFor = async (targetCampaignId: string) => {
    const [campaignValue, memberValue] = await Promise.all([
      getCampaign(targetCampaignId),
      getCampaignMembers(targetCampaignId),
    ])
    setCampaign(campaignValue)
    rememberCampaignMeta(campaignValue.id, campaignValue.name)
    setMembers(memberValue)
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
    await run('Campagna attivata', async () => {
      await loadCampaignBlockFor(item.campaignId)
    })
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
    const missingUserIds = members
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
  }, [members, memberNames])

  const hasActiveCampaign = myCampaigns.some((item) => item.campaignId === campaignId)
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
        const list = await discoverCampaigns(true)
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
    if (!hasActiveCampaign || !campaignId.trim()) return

    let cancelled = false
    void (async () => {
      try {
        const list = await listCharacters(campaignId)
        if (!cancelled) setCharacters(list)
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
  }, [screen, hasActiveCampaign, campaignId])

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
    'Crea Campagna',
    'Approvazione Accessi',
    'Gestione Personaggi',
    'Crea Personaggio',
  ]
  const menuGroups: { key: SidebarGroup; screens: Screen[] }[] = [
    { key: 'Profilo', screens: profileScreens },
    { key: 'Campagna', screens: campaignScreens },
  ]
  const enabledSet = new Set<Screen>([...profileScreens, ...campaignScreens])
  const isMenuScreenEnabled = (value: Screen) => {
    if (!enabledSet.has(value)) return false
    if (CAMPAIGN_ACTIVE_REQUIRED_SCREENS.includes(value) && !hasActiveCampaign) return false
    return true
  }
  const campaignArea = isCampaignScope(screen)
  const characterArea = isCharacterScope(screen)
  const activeCampaignMembership = myCampaigns.find((item) => item.campaignId === campaignId)
  const activeCampaignName = campaign?.name || activeCampaignMembership?.campaignName || 'non impostata'
  const canOpenCharacterSheet = (character: Character) => {
    if (character.userId === profile.id) return true
    const role = activeCampaignMembership?.role
    if (character.isNpc) {
      return role === 'CO_MASTER' || role === 'MASTER' || role === 'SUPER_MASTER'
    }
    return role === 'MASTER' || role === 'SUPER_MASTER'
  }
  const ownerProfileLabel = (userId: string | null, ownerProfileName?: string | null) => {
    if (ownerProfileName && ownerProfileName.trim()) return ownerProfileName.trim()
    if (!userId) return 'NPC di campagna'
    if (userId === profile.id) return profile.profileName
    return memberNames[userId] || 'Profilo non disponibile'
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <p className="brand-title">Taverna del Codice</p>
            <p className="brand-subtitle">MVP no-chat</p>
          </div>
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
                        onClick={() => isMenuScreenEnabled(item) && setScreen(item)}
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
          <div>
            <h1>{screen}</h1>
            {!campaignArea && <p>Utente: {profile.username || profile.profileName}</p>}
            {campaignArea && (
              <p>
                Utente: {profile.username || profile.profileName} | Campagna attiva: {activeCampaignName}
              </p>
            )}
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
            onDiscover={() =>
              run('Campagne disponibili caricate', async () => {
                const list = await discoverCampaigns(true)
                setDiscoverableCampaigns(list)
              })
            }
            onActivate={(targetCampaignId) =>
              run('Campagna attivata', async () => {
                rememberCampaignId(targetCampaignId)
                await loadCampaignSummaryFor(targetCampaignId)
                setScreen('Scheda Campagna')
              })
            }
            onApplyToCampaign={(targetCampaignId) => {
              void run('Apply campagna inviato', async () => {
                await applyToCampaign(targetCampaignId)
                const [discover, mine] = await Promise.all([discoverCampaigns(true), listMyCampaignMemberships()])
                setDiscoverableCampaigns(discover)
                setMyCampaigns(mine)
              })
            }}
            activeCampaignName={campaign?.name || activeCampaignMembership?.campaignName || campaignId || ''}
          />
        )}

        {screen === 'Crea Campagna' && (
          <CreateCampaignPage
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
                    isFounder: true,
                  },
                  ...prev.filter((item) => item.campaignId !== created.id),
                ])
                setCampaign(created)
                setScreen('Scheda Campagna')
              })
            }
          />
        )}

        {screen === 'Scheda Campagna' && (
          <CampaignDetailPage
            campaign={campaign}
            members={members}
            memberNames={memberNames}
            onReload={() => void refreshCampaignBlock()}
            onOpenManagement={() => setScreen('Gestione Campagna')}
            onOpenSelectPg={() => setScreen('Seleziona PG')}
          />
        )}

        {screen === 'Approvazione Accessi' && (
          <ApprovalPage
            pendingApplications={pendingApplications}
            onLoadPending={() =>
              run('Richieste pending caricate', async () => {
                if (!campaignId.trim()) return
                const list = await listPendingApplications(campaignId)
                setPendingApplications(list)
              })
            }
            onApprove={(userId) =>
              run('Approvazione utente completata', async () => {
                await approveApplication(campaignId, userId)
                const list = await listPendingApplications(campaignId)
                setPendingApplications(list)
              })
            }
            onReject={(userId) =>
              run('Rifiuto utente completato', async () => {
                await rejectApplication(campaignId, userId)
                const list = await listPendingApplications(campaignId)
                setPendingApplications(list)
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
            onSelectCharacter={(character) => {
              if (!canOpenCharacterSheet(character)) {
                setError('Permesso negato: puoi aprire solo PG/NPC tuoi o con ruolo adeguato.')
                addEvent('Accesso Scheda PG negato per permessi', 'error')
                return
              }
              setSelectedCharacterId(character.id)
              setScreen('Scheda PG')
            }}
            onCreateScreen={() => setScreen('Crea Personaggio')}
            onReload={() =>
              run('Lista personaggi caricata', async () => {
                const list = await listCharacters(campaignId)
                setCharacters(list)
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
                const detail = await getCharacter(campaignId, selectedCharacterId)
                setCharacterDetail(detail)
              })
            }
            externalDetail={characterDetail}
            ownerProfileLabel={ownerProfileLabel}
            onUpdateStatus={(status) =>
              run('Stato personaggio aggiornato', async () => {
                if (!selectedCharacter) return
                const updated = await updateCharacterStatus(campaignId, selectedCharacter.id, status)
                setCharacters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                setCharacterDetail(updated)
              })
            }
          />
        )}

        {screen === 'Gestione Campagna' && (
          <CampaignManagementPage
            permissions={permissions}
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
  onDiscover,
  onActivate,
  onApplyToCampaign,
  activeCampaignName,
}: {
  campaigns: CampaignDiscoverResponse[]
  onDiscover: () => void
  onActivate: (campaignId: string) => void
  onApplyToCampaign: (campaignId: string) => void
  activeCampaignName: string
}) {
  return (
    <section className="panel">
      <div className="row-between">
        <h2>Lista Campagne</h2>
        <button type="button" className="secondary-btn" onClick={onDiscover}>
          Cerca campagne
        </button>
      </div>
      {activeCampaignName && <p className="muted">Campagna attiva: <strong>{activeCampaignName}</strong></p>}
      {campaigns.length === 0 && <p className="muted">Nessuna campagna visibile. Premi "Cerca campagne".</p>}
      {campaigns.length > 0 && (
        <ul className="list-reset">
          {campaigns.map((item) => (
            <li key={item.id} className="line-item">
              <div>
                <p className="character-name">{item.name}</p>
                <p className="muted">{item.description || 'Nessuna descrizione'}</p>
              </div>
              <div className="inline-actions">
                <span className={`status ${item.membershipStatus === 'APPROVED' ? 'status-success' : 'status-neutral'}`}>
                  {item.membershipStatus || 'NO_MEMBERSHIP'}
                </span>
                {item.membershipStatus === 'APPROVED' && (
                  <button type="button" className="secondary-btn" onClick={() => onActivate(item.id)}>
                    Entra
                  </button>
                )}
                {(item.membershipStatus === null || item.membershipStatus === 'REJECTED') && (
                  <button type="button" className="primary-btn" onClick={() => onApplyToCampaign(item.id)}>
                    Richiedi accesso
                  </button>
                )}
                {item.membershipStatus === 'PENDING' && (
                  <button type="button" className="secondary-btn" disabled>
                    Richiesta inviata
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CreateCampaignPage({
  onCreate,
}: {
  onCreate: (payload: {
    name: string
    description: string
    isOpen: boolean
    isSearchable: boolean
    allowedModules: string[]
  }) => void
}) {
  const [name, setName] = useState('Nuova Campagna')
  const [description, setDescription] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [isSearchable, setIsSearchable] = useState(true)
  const [modulesRaw, setModulesRaw] = useState('MISSIONI,STANZE')

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
      <label>
        Moduli (CSV)
        <input value={modulesRaw} onChange={(event) => setModulesRaw(event.target.value)} />
      </label>
      <button
        type="button"
        className="primary-btn"
        onClick={() =>
          onCreate({
            name,
            description,
            isOpen,
            isSearchable,
            allowedModules: modulesRaw
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          })
        }
      >
        Crea
      </button>
    </section>
  )
}

function CampaignDetailPage({
  campaign,
  members,
  memberNames,
  onReload,
  onOpenManagement,
  onOpenSelectPg,
}: {
  campaign: CampaignResponse | null
  members: CampaignMembershipResponse[]
  memberNames: Record<string, string>
  onReload: () => void
  onOpenManagement: () => void
  onOpenSelectPg: () => void
}) {
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
          <p>
            <strong>{campaign.name}</strong>
          </p>
          <p className="muted">{campaign.description || 'Nessuna descrizione'}</p>
          <p className="muted">
            open: {String(campaign.isOpen)} | searchable: {String(campaign.isSearchable)}
          </p>
          <div className="inline-actions">
            <button type="button" className="secondary-btn" onClick={onOpenManagement}>
              Gestione Campagna
            </button>
            <button type="button" className="secondary-btn" onClick={onOpenSelectPg}>
              Seleziona PG
            </button>
          </div>
          <div className="divider" />
          <h3 className="section-title">Members APPROVED</h3>
          {members.length === 0 && <p className="muted">Nessun membro</p>}
          <ul className="list-reset">
            {members.map((member) => (
              <li key={`${member.userId}-${member.role}`} className="line-item">
                <span>{memberNames[member.userId] || 'Profilo non disponibile'}</span>
                <span className="status status-neutral">
                  {member.role} / {member.memberStatus}
                </span>
              </li>
            ))}
          </ul>
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
  onCreateScreen,
  onReload,
}: {
  characters: Character[]
  selectedCharacterId: string
  onSelectCharacter: (character: Character) => void
  canOpenCharacterSheet: (character: Character) => boolean
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  onCreateScreen: () => void
  onReload: () => void
}) {
  const [typeFilters, setTypeFilters] = useState<Array<'NPC' | 'PG'>>(['NPC', 'PG'])
  const [statusFilters, setStatusFilters] = useState<CharacterStatus[]>(['ACTIVE', 'RETIRED', 'DEAD'])
  const [searchText, setSearchText] = useState('')

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
  const filteredCharacters = characters.filter((character) => {
    if (!character.characterStatus || !statusFilters.includes(character.characterStatus)) return false
    const type = character.isNpc ? 'NPC' : 'PG'
    if (!typeFilters.includes(type)) return false
    if (!normalizedSearchText) return true
    const owner = ownerProfileLabel(character.userId, character.ownerProfileName).toLowerCase()
    const name = character.name.toLowerCase()
    return owner.includes(normalizedSearchText) || name.includes(normalizedSearchText)
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
        Ricerca (nome o profilo)
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="es. diego"
        />
      </label>
      <p className="muted">La ricerca confronta sia il nome del personaggio che il profilo di appartenenza.</p>
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
  onRefresh,
  onUpdateStatus,
}: {
  character: Character | null
  externalDetail: Character | null
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  onRefresh: () => void
  onUpdateStatus: (status: CharacterStatus) => void
}) {
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>('ACTIVE')
  useEffect(() => {
    if (value?.characterStatus) setStatus(value.characterStatus)
  }, [value?.id, value?.characterStatus])

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
              <option value="DEAD">DEAD</option>
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={() => onUpdateStatus(status)}>
            Aggiorna Status
          </button>
        </>
      )}
    </section>
  )
}

function CampaignManagementPage({
  permissions,
  onCheckPermission,
  onTransfer,
  onLeave,
}: {
  permissions: CampaignPermissionResponse[]
  onCheckPermission: (action: string) => void
  onTransfer: (newOwnerUserId: string) => void
  onLeave: () => void
}) {
  const [action, setAction] = useState('CREATE_ROOM')
  const [newOwnerUserId, setNewOwnerUserId] = useState('')

  return (
    <section className="panel">
      <h2>Gestione Campagna</h2>
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
  onCreate,
}: {
  onCreate: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) => void
}) {
  const [name, setName] = useState('Nuovo PG')
  const [nickname, setNickname] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [isNpc, setIsNpc] = useState(false)

  return (
    <section className="panel">
      <h2>Crea Personaggio</h2>
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
            onClick={() => setIsNpc(true)}
          >
            <span className="char-kind-icon" aria-hidden="true">
              🎭
            </span>
            NPC
          </button>
        </div>
      </div>
      <button type="button" className="primary-btn" onClick={() => onCreate({ name, nickname, portraitUrl, isNpc })}>
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
