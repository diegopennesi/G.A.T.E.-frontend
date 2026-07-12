import { useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { Skeleton } from 'primereact/skeleton'
import { useMissionContext } from '../../../context'
import { MissionChatPanel } from '../../chat'
import { ConfirmActionDialog, DataTable, FieldLabel, Icon } from '../../../shared/components'
import { gameSystemIconName } from '../../../shared/utils'
import { shareMissionOnWhatsApp } from '../utils/whatsappShare'
import type {
  MissionParticipationType,
  MissionResponse,
  MissionStatusReason,
} from '../../../types/domain'
import { useLoadingOverlayState } from '../../../services/loadingOverlay'

type MissionPayload = {
  title: string
  description?: string
  isMultiSession?: boolean
  sessionAt?: string
  closesAt?: string
  quorum?: number | null
  maxParticipants?: number | null
  autoReopenOnDrop?: boolean
}

type MissionViewFilter = 'active' | 'expired' | 'completed'

type MissionFilterOption = {
  value: MissionViewFilter
  label: string
  icon: string
}

const MISSION_VIEW_FILTER_OPTIONS: MissionFilterOption[] = [
  { value: 'active', label: 'Attive', icon: 'fa-solid fa-unlock' },
  { value: 'expired', label: 'Scadute', icon: 'fa-solid fa-hourglass-half' },
  { value: 'completed', label: 'Completate', icon: 'fa-solid fa-circle-check' },
]

type MissionDraft = {
  title: string
  description: string
  isMultiSession: boolean
  sessionDate: string
  sessionTime: string
  closesDate: string
  closesTime: string
  quorum: string
  maxParticipants: string
  autoReopenOnDrop: boolean
}

type MissionDetailRow = {
  key: string
  label: string
  value: ReactNode
}

type MissionSortKey = 'title' | 'status' | 'participants' | 'session' | 'role' | 'campaign' | 'module'
type MissionParticipantSortKey = 'user' | 'type' | 'joinedAt'

const missionTimeConfig = {
  hourMin: 0,
  hourMax: 23,
  minuteStep: 15,
  defaultTime: '15:30',
} as const

const pad2 = (value: number) => value.toString().padStart(2, '0')

function formatDateInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatTimeInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function addDaysToDate(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function combineDateAndTime(dateValue: string, timeValue: string): string | null {
  const trimmedDate = dateValue.trim()
  const trimmedTime = timeValue.trim()
  if (!trimmedDate || !trimmedTime) return null
  const date = new Date(`${trimmedDate}T${trimmedTime}:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function shiftCount(value: string, direction: 1 | -1, minValue = 1, maxValue = 999) {
  const parsed = Number.parseInt(value, 10)
  const current = Number.isFinite(parsed) ? parsed : minValue
  return String(Math.min(Math.max(current + direction, minValue), maxValue))
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toIsoTimestamp(dateValue: string, timeValue: string): string | null {
  const combined = combineDateAndTime(dateValue, timeValue)
  if (!combined) return null
  const date = new Date(combined)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function formatMissionDay(value: string | null | undefined): string {
  if (!value) return 'Non impostato'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function formatMissionShortDay(value: string | null | undefined): string {
  if (!value) return 'N/D'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const weekday = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date).replace('.', '').toUpperCase()
  const day = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' }).format(date)
  return `${weekday} ${day}`
}

function formatMissionTime(value: string | null | undefined): string {
  if (!value) return 'Ora non impostata'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatMissionJoinedAt(value: string | null | undefined): string {
  if (!value) return 'N/D'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const dayMonth = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long' }).format(date)
  const time = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
  const centiseconds = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0')
  return `${dayMonth} ${time}:${centiseconds}`
}

function formatMissionDateTime(value: string | null | undefined): string {
  if (!value) return 'Non impostata'
  return `${formatMissionDay(value)} ${formatMissionTime(value)}`
}

function formatMissionParticipants(mission: MissionResponse) {
  const current = Number.isFinite(mission.participantCount) ? mission.participantCount : 0
  const total = mission.maxParticipants ?? 'illimitato'
  return `${current}/${total}`
}

function missionReachedMaxParticipants(mission: MissionResponse) {
  return typeof mission.maxParticipants === 'number' && mission.participantCount >= mission.maxParticipants
}

function participationLabel(value: MissionParticipationType) {
  return value === 'TITOLARE' ? 'Titolare' : 'Panchina'
}

function missionStatusLabel(status: MissionResponse['status']) {
  switch (status) {
    case 'OPEN':
      return 'Aperta'
    case 'REOPENED':
      return 'Riaperta'
    case 'CONFIRMED':
      return 'Confermata'
    case 'CLOSED':
      return 'Chiusa'
    case 'CANCELLED':
      return 'Annullata'
    case 'COMPLETED':
      return 'Completata'
    default:
      return status
  }
}

function missionStatusReasonLabel(reason: MissionStatusReason | null | undefined) {
  switch (reason) {
    case 'CONFIRMED_BY_QUORUM':
      return 'Quorum raggiunto'
    case 'CONFIRMED_BY_MAX_PARTICIPANTS':
      return 'Capienza raggiunta'
    case 'CONFIRMED_BY_DEADLINE':
      return 'Confermata alla scadenza'
    case 'CONFIRMED_BY_BENCH':
      return 'Confermata da panchina'
    case 'CLOSED_MANUALLY':
      return 'Chiusura manuale'
    case 'CLOSED_BY_DEADLINE':
      return 'Chiusura alla scadenza'
    case 'REOPENED_MANUALLY':
      return 'Riaperta manualmente'
    case 'REOPENED_BY_ROSTER_DROP':
      return 'Riaperta per calo roster'
    case 'CANCELLED_MANUALLY':
      return 'Annullata manualmente'
    case 'CANCELLED_NO_BENCH':
      return 'Annullata senza panchina'
    case 'COMPLETED_MANUALLY':
      return 'Completata manualmente'
    default:
      return ''
  }
}

function missionStatusClassName(status: MissionResponse['status']) {
  return `mission-status mission-status-${status.toLowerCase()}`
}

function missionStatusIcon(status: MissionResponse['status']) {
  switch (status) {
    case 'OPEN':
      return 'pi pi-lock-open'
    case 'REOPENED':
      return 'pi pi-refresh'
    case 'CONFIRMED':
      return 'pi pi-check-circle'
    case 'CLOSED':
      return 'pi pi-lock'
    case 'CANCELLED':
      return 'pi pi-ban'
    case 'COMPLETED':
      return 'pi pi-verified'
    default:
      return 'pi pi-info-circle'
  }
}

function missionGameSystemLabel(value: string | null | undefined) {
  if (!value) return 'N/D'
  if (value === 'DND5E') return 'D&D'
  return value
}

function missionGameSystemIcon(value: string | null | undefined) {
  return gameSystemIconName(value)
}

function renderMissionText(value: string | null | undefined) {
  const text = value?.trim() || 'Nessun dettaglio missione inserito.'
  const lines = text.split(/\r?\n/)

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={`line-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`${lineIndex}-${partIndex}`}>{part.slice(2, -2)}</strong>
          }
          return <span key={`${lineIndex}-${partIndex}`}>{part}</span>
        })}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    )
  })
}

function defaultDraft(): MissionDraft {
  const sessionDate = addDaysToDate(new Date(), 3)
  const sessionTime = missionTimeConfig.defaultTime
  const closeDate = addDaysToDate(sessionDate, -2)
  return {
    title: '',
    description: '',
    isMultiSession: false,
    sessionDate: formatDateInputValue(sessionDate),
    sessionTime,
    closesDate: formatDateInputValue(closeDate),
    closesTime: sessionTime,
    quorum: '3',
    maxParticipants: '5',
    autoReopenOnDrop: true,
  }
}

function draftFromMission(mission: MissionResponse): MissionDraft {
  return {
    title: mission.title,
    description: mission.description || '',
    isMultiSession: mission.isMultiSession,
    sessionDate: formatDateInputValue(mission.sessionAt || ''),
    sessionTime: formatTimeInputValue(mission.sessionAt || ''),
    closesDate: formatDateInputValue(mission.closesAt || ''),
    closesTime: formatTimeInputValue(mission.closesAt || ''),
    quorum: mission.quorum ? String(mission.quorum) : '',
    maxParticipants: mission.maxParticipants ? String(mission.maxParticipants) : '',
    autoReopenOnDrop: mission.autoReopenOnDrop,
  }
}

export function MissionsPage() {
  const {
    missions,
    selectedMission,
    canCreateMissions,
    activeCampaignId,
    activeCampaignRole,
    activeCampaignCharacterId,
    campaignNameById,
    campaignGameSystemById,
    campaignCanBeOpenedById,
    missionParticipantsById,
    missionParticipantLabelByUserId,
    missionParticipantCharacterLabelById,
    myMissionParticipationById,
    currentUserId,
    selectedMissionChatId,
    missionChat,
    missionChatBusy,
    missionChatError,
    createMission: onCreate,
    selectMission: onSelectMission,
    openMissionChat: onOpenMissionChat,
    closeMissionChat: onCloseMissionChat,
    sendMissionChatMessage: onSendMissionChatMessage,
    joinMission: onJoinMission,
    leaveMission: onLeaveMission,
    openMissionCampaign: onOpenCampaign,
    browseCampaigns: onBrowseCampaigns,
    openCreateCharacter: onCreateCharacter,
    updateMission: onUpdateMission,
    completeMission: onCompleteMission,
    cancelMission: onCancelMission,
  } = useMissionContext()
  const [mode, setMode] = useState<'browse' | 'create'>('browse')
  const [createDraft, setCreateDraft] = useState<MissionDraft>(defaultDraft)
  const [createError, setCreateError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [campaignFilters, setCampaignFilters] = useState<Record<string, string>>({})
  const [missionViewFilters, setMissionViewFilters] = useState<MissionViewFilter[]>(['active'])
  const [sortBy, setSortBy] = useState<MissionSortKey>('session')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [participantSortBy, setParticipantSortBy] = useState<MissionParticipantSortKey>('user')
  const [participantSortDirection, setParticipantSortDirection] = useState<'asc' | 'desc'>('asc')
  const [now, setNow] = useState(Date.now)
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [detailPane, setDetailPane] = useState<'summary' | 'chat'>('summary')
  const [chatReturnTarget, setChatReturnTarget] = useState<'list' | 'summary'>('summary')
  const [confirmAction, setConfirmAction] = useState<null | 'leave' | 'complete' | 'cancel'>(null)
  const [isDetailMetaCollapsed, setIsDetailMetaCollapsed] = useState(false)
  const { pendingCount } = useLoadingOverlayState()

  const hasActiveCampaign = Boolean(activeCampaignId)
  const canUseCreateMode = canCreateMissions && hasActiveCampaign
  const visibleMode = mode === 'create' && canUseCreateMode ? 'create' : 'browse'
  const selectedMissionInActiveCampaign = Boolean(selectedMission && selectedMission.campaignId === activeCampaignId)
  const canShareSelectedMission = Boolean(selectedMission) && selectedMissionInActiveCampaign
  const campaignFilter = activeCampaignId ? campaignFilters[activeCampaignId] || 'all' : 'all'
  const activeMissionView = missionViewFilters[0] || 'active'
  const showExpired = activeMissionView === 'expired'
  const showCompleted = activeMissionView === 'completed'
  const selectedMissionStarted = Boolean(
    selectedMission?.sessionAt && new Date(selectedMission.sessionAt).getTime() <= now,
  )
  const canChangeSelectedMissionParticipation =
    Boolean(selectedMission) &&
    selectedMissionInActiveCampaign &&
    Boolean(activeCampaignRole) &&
    Boolean(activeCampaignCharacterId) &&
    !selectedMissionStarted
  const canJoinSelectedMission =
    Boolean(selectedMission) &&
    canChangeSelectedMissionParticipation &&
    (selectedMission?.status === 'OPEN' || selectedMission?.status === 'REOPENED') &&
    !missionReachedMaxParticipants(selectedMission)
  const canEditSelectedMission =
    Boolean(selectedMission) &&
    selectedMissionInActiveCampaign &&
    selectedMission?.status !== 'COMPLETED' &&
    (activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER')
  const canResolveSelectedMission =
    Boolean(selectedMission) &&
    selectedMissionInActiveCampaign &&
    selectedMission?.status !== 'COMPLETED' &&
    selectedMission?.status !== 'CANCELLED' &&
    (activeCampaignRole === 'MASTER' || activeCampaignRole === 'SUPER_MASTER')
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
  const isExpiredMission = (mission: MissionResponse) => {
    if (!mission.sessionAt) return false
    const sessionTime = new Date(mission.sessionAt).getTime()
    return Number.isFinite(sessionTime) && sessionTime < now
  }
  const defaultVisibleStatuses: MissionResponse['status'][] = ['OPEN', 'REOPENED', 'CONFIRMED']
  const filteredMissions = missions.filter((mission) => {
    if (campaignFilter !== 'all' && mission.campaignId !== campaignFilter) return false
    const isExpired = isExpiredMission(mission)
    if (showCompleted) {
      if (mission.status !== 'COMPLETED') return false
    } else if (showExpired) {
      if (!isExpired) return false
      if (mission.status === 'COMPLETED') return false
    } else {
      if (isExpired) return false
      if (!defaultVisibleStatuses.includes(mission.status)) return false
    }
    if (!normalizedSearchText) return true
    const missionCampaignName = campaignNameById[mission.campaignId] || mission.campaignId
    return (
      mission.title.toLowerCase().includes(normalizedSearchText) ||
      (mission.description || '').toLowerCase().includes(normalizedSearchText) ||
      missionCampaignName.toLowerCase().includes(normalizedSearchText)
    )
  })
  const sortedMissions = [...filteredMissions].sort((left, right) => {
    const compareText = (leftValue: string | null | undefined, rightValue: string | null | undefined) =>
      (leftValue || '').localeCompare(rightValue || '', 'it-IT', { sensitivity: 'base', numeric: true })
    const compareNumber = (leftValue: number, rightValue: number) => leftValue - rightValue
    const compareDate = (leftValue: string | null | undefined, rightValue: string | null | undefined) => {
      const leftTime = leftValue ? new Date(leftValue).getTime() : Number.POSITIVE_INFINITY
      const rightTime = rightValue ? new Date(rightValue).getTime() : Number.POSITIVE_INFINITY
      return compareNumber(
        Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY,
        Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY,
      )
    }
    const statusRank: Record<MissionResponse['status'], number> = {
      OPEN: 0,
      REOPENED: 1,
      CONFIRMED: 2,
      CLOSED: 3,
      COMPLETED: 4,
      CANCELLED: 5,
    }
    const roleRank = (mission: MissionResponse) => {
      const participation = myMissionParticipationById[mission.id] || null
      if (participation === 'TITOLARE') return 0
      if (participation === 'NON_TITOLARE') return 1
      return 2
    }

    const result = (() => {
      switch (sortBy) {
        case 'title':
          return compareText(left.title, right.title)
        case 'status':
          return compareNumber(statusRank[left.status], statusRank[right.status])
        case 'participants':
          return compareNumber(left.participantCount, right.participantCount)
        case 'role':
          return compareNumber(roleRank(left), roleRank(right))
        case 'campaign':
          return compareText(campaignNameById[left.campaignId] || left.campaignId, campaignNameById[right.campaignId] || right.campaignId)
        case 'module':
          return compareText(campaignGameSystemById[left.campaignId] || 'N/D', campaignGameSystemById[right.campaignId] || 'N/D')
        case 'session':
        default:
          return compareDate(left.sessionAt, right.sessionAt)
      }
    })()
    const fallbackResult = result === 0 ? compareText(left.title, right.title) : result
    return sortDirection === 'asc' ? fallbackResult : -fallbackResult
  })
  const handleSortChange = (nextSortBy: string) => {
    const typedSortBy = nextSortBy as MissionSortKey
    setSortBy((prev) => {
      if (prev === typedSortBy) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return typedSortBy
    })
  }

  const handleParticipantSortChange = (nextSortBy: string) => {
    const typedSortBy = nextSortBy as MissionParticipantSortKey
    setParticipantSortBy((prev) => {
      if (prev === typedSortBy) {
        setParticipantSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setParticipantSortDirection('asc')
      return typedSortBy
    })
  }

  const canOpenMissionChat = (mission: MissionResponse) =>
    mission.status !== 'COMPLETED' &&
    mission.status !== 'CANCELLED' &&
    (mission.createdBy === currentUserId || Boolean(myMissionParticipationById[mission.id]))
  const showMissionSkeleton = pendingCount > 0 && missions.length === 0

  const submitCreate = () => {
    const payload = missionDraftToPayload(createDraft, setCreateError)
    if (!payload) return
    onCreate(payload)
    setMode('browse')
  }

  const renderMissionForm = (
    draft: MissionDraft,
    setDraft: Dispatch<SetStateAction<MissionDraft>>,
    error: string,
    setError: (value: string) => void,
    submitLabel: string,
    onSubmit: () => void,
    onCancel: () => void,
  ) => (
    <div className="mission-form-card mission-form-card--compact">
      <div className="mission-form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-pen-to-square" label="Titolo" />
          <input
            value={draft.title}
            placeholder="Titolo missione"
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-align-left" label="Missione" />
          <textarea
            rows={4}
            placeholder="Obiettivo, contesto e dettagli utili. Usa **testo** per il grassetto."
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>
      </div>

      <div className="mission-inline-table">
        <div className="mission-inline-table-row">
          <span className="mission-inline-table-label">Sessione</span>
          <input
            type="datetime-local"
            step={900}
            value={`${draft.sessionDate}T${draft.sessionTime}`}
            onChange={(event) => {
              const [sessionDate, sessionTime = missionTimeConfig.defaultTime] = event.target.value.split('T')
              setDraft((prev) => ({ ...prev, sessionDate, sessionTime }))
            }}
          />
        </div>
        <div className="mission-inline-table-row">
          <span className="mission-inline-table-label">Chiusura</span>
          <input
            type="datetime-local"
            step={900}
            value={`${draft.closesDate}T${draft.closesTime}`}
            onChange={(event) => {
              const [closesDate, closesTime = missionTimeConfig.defaultTime] = event.target.value.split('T')
              setDraft((prev) => ({ ...prev, closesDate, closesTime }))
            }}
          />
        </div>
        <div className="mission-inline-table-row">
          <span className="mission-inline-table-label">Capienza</span>
          <MissionCountStepper label="Max" value={draft.maxParticipants} minValue={1} maxValue={999} onChange={(value) => setDraft((prev) => ({ ...prev, maxParticipants: value }))} />
        </div>
      </div>

      <div className="mission-toggle-row">
        <label className="mission-checkbox">
          <input
            type="checkbox"
            checked={draft.isMultiSession}
            onChange={(event) => setDraft((prev) => ({ ...prev, isMultiSession: event.target.checked }))}
          />
          <span>Sessione multipla</span>
        </label>
        <label className="mission-checkbox">
          <input
            type="checkbox"
            checked={draft.autoReopenOnDrop}
            onChange={(event) => setDraft((prev) => ({ ...prev, autoReopenOnDrop: event.target.checked }))}
          />
          <span>Riapri automaticamente</span>
        </label>
      </div>

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
            onCancel()
          }}
        >
          <Icon name="fa-solid fa-xmark" />
          Annulla
        </button>
      </div>
    </div>
  )

  const renderMissionDetail = () => {
    if (!selectedMission) {
      return (
        <div className="subpanel mission-block mission-detail-block">
          <div className="row-between">
            <div>
              <h3 className="section-title">Missione</h3>
              <p className="muted">Seleziona una missione dalla tabella.</p>
            </div>
          </div>
          <div className="mission-detail-empty">
            <p className="muted">Nessuna missione selezionata.</p>
          </div>
        </div>
      )
    }

    const missionCampaignName = campaignNameById[selectedMission.campaignId] || selectedMission.campaignId
    const selectedMissionStatusReason = missionStatusReasonLabel(selectedMission.statusReason)
    const selectedMissionReachedMax = missionReachedMaxParticipants(selectedMission)
    const selectedMissionBelowQuorum =
      selectedMission.status === 'CONFIRMED' &&
      typeof selectedMission.quorum === 'number' &&
      selectedMission.participantCount < selectedMission.quorum
    const selectedMissionParticipants = missionParticipantsById[selectedMission.id] || []
    const selectedMissionCreatorLabel =
      missionParticipantLabelByUserId[selectedMission.createdBy] ||
      (selectedMission.createdBy === currentUserId ? 'Tu' : selectedMission.createdBy)
    const sortedSelectedMissionParticipants = [...selectedMissionParticipants].sort((left, right) => {
      const compareText = (leftValue: string | null | undefined, rightValue: string | null | undefined) =>
        (leftValue || '').localeCompare(rightValue || '', 'it-IT', { sensitivity: 'base', numeric: true })
      const compareDate = (leftValue: string | null | undefined, rightValue: string | null | undefined) => {
        const leftTime = leftValue ? new Date(leftValue).getTime() : Number.POSITIVE_INFINITY
        const rightTime = rightValue ? new Date(rightValue).getTime() : Number.POSITIVE_INFINITY
        return (
          (Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY) -
          (Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY)
        )
      }
      const participationRank = (value: MissionParticipationType) => (value === 'TITOLARE' ? 0 : 1)
      const result = (() => {
        switch (participantSortBy) {
          case 'type':
            return participationRank(left.participationType) - participationRank(right.participationType)
          case 'joinedAt':
            return compareDate(left.joinedAt, right.joinedAt)
          case 'user':
          default:
            return compareText(
              missionParticipantLabelByUserId[left.userId] || left.userId,
              missionParticipantLabelByUserId[right.userId] || right.userId,
            )
        }
      })()
      const fallbackResult =
        result === 0
          ? compareText(
              missionParticipantLabelByUserId[left.userId] || left.userId,
              missionParticipantLabelByUserId[right.userId] || right.userId,
            )
          : result
      return participantSortDirection === 'asc' ? fallbackResult : -fallbackResult
    })
    const myMissionParticipation = myMissionParticipationById[selectedMission.id] || null
    const selectedMissionIsJoinableStatus = selectedMission.status === 'OPEN' || selectedMission.status === 'REOPENED'
    const selectedMissionReachedMaxForNewJoin = selectedMissionReachedMax && selectedMissionIsJoinableStatus && !myMissionParticipation
    const participationUnavailableReason = (() => {
      if (!selectedMissionInActiveCampaign) return 'Per entrare devi prima attivare questa campagna.'
      if (!activeCampaignRole) return 'Non hai accesso approvato a questa campagna.'
      if (!activeCampaignCharacterId) return 'Non hai un PG attivo in questa campagna. Crea o seleziona un personaggio prima di entrare in missione.'
      if (selectedMissionStarted) return 'La sessione e gia iniziata.'
      if (!selectedMissionIsJoinableStatus && !myMissionParticipation) return 'Questa missione non accetta nuove iscrizioni.'
      if (selectedMissionReachedMaxForNewJoin) return 'Missione raggiunto numero di giocatori massimo.'
      return ''
    })()
    const canSubmitParticipation =
      canJoinSelectedMission ||
      Boolean(myMissionParticipation && canChangeSelectedMissionParticipation) ||
      (canChangeSelectedMissionParticipation && !selectedMissionIsJoinableStatus)
    const canChooseParticipation = canSubmitParticipation && !selectedMissionReachedMaxForNewJoin
    const missingActiveCharacterInCampaign = selectedMissionInActiveCampaign && Boolean(activeCampaignRole) && !activeCampaignCharacterId
    const selectedMissionCanOpenChat = canOpenMissionChat(selectedMission)
    const detailRows: MissionDetailRow[] = [
      { key: 'title', label: 'Titolo', value: selectedMission.title },
      { key: 'creator', label: 'Creatore', value: selectedMissionCreatorLabel },
      { key: 'session', label: 'Sessione', value: formatMissionDateTime(selectedMission.sessionAt) },
      { key: 'closing', label: 'Chiusura', value: formatMissionDateTime(selectedMission.closesAt) },
      { key: 'capacity', label: 'Partecipanti', value: formatMissionParticipants(selectedMission) },
      {
        key: 'flags',
        label: 'Opzioni',
        value: [selectedMission.isMultiSession ? 'Multi sessione' : null, selectedMission.autoReopenOnDrop ? 'Auto riapertura' : null]
          .filter(Boolean)
          .join(' / ') || '-',
      },
    ]

    return (
      <div className="subpanel mission-block mission-detail-block">
        <div className="row-between mission-detail-head">
          <div>
            <button
              type="button"
              className="secondary-btn mission-back-btn"
              onClick={() => {
                if (detailPane === 'chat') {
                  onCloseMissionChat()
                  if (chatReturnTarget === 'list') {
                    setIsDetailVisible(false)
                    setDetailPane('summary')
                    return
                  }
                  setDetailPane('summary')
                  return
                }
                setIsDetailVisible(false)
                onCloseMissionChat()
              }}
            >
              <Icon name="fa-solid fa-chevron-left" />
              {detailPane === 'chat' ? (chatReturnTarget === 'list' ? 'Torna alle missioni' : 'Torna al riepilogo') : 'Torna indietro'}
            </button>
            <h3 className="section-title">Missione</h3>
            <p className="muted">Campagna: <strong>{missionCampaignName}</strong></p>
            {detailPane === 'summary' && (
              <div className="mission-title-inline-badges">
                <div className="mission-title-status-group">
                  <span className={missionStatusClassName(selectedMission.status)}>
                    {missionStatusLabel(selectedMission.status)}
                  </span>
                  <span className="mission-count">{formatMissionParticipants(selectedMission)}</span>
                </div>
                {selectedMissionCanOpenChat && (
                  <button
                    type="button"
                    className={`mission-chat-inline-badge ${selectedMissionChatId === selectedMission.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setDetailPane('chat')
                      setChatReturnTarget('summary')
                      onOpenMissionChat(selectedMission.campaignId, selectedMission.id)
                    }}
                  >
                    <Icon name="fa-solid fa-comments" />
                    <span>Chat</span>
                  </button>
                )}
                {canShareSelectedMission && (
                  <button
                    type="button"
                    className="mission-chat-inline-badge mission-share-inline-badge"
                    onClick={() => shareMissionOnWhatsApp(selectedMission!)}
                  >
                    <Icon name="fa-whatsapp" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="mission-title-badges" title={selectedMissionBelowQuorum ? 'Stato incoerente: Confermata sotto quorum.' : selectedMissionStatusReason || undefined} />
        </div>

        {detailPane === 'summary' ? (
        <>
        <div className="mission-description-block">
          <p className="mission-card-label">Missione</p>
          <p className="mission-description-text">{renderMissionText(selectedMission.description)}</p>
        </div>

        <section className="mission-meta-card">
          <button
            type="button"
            className="mission-meta-toggle"
            onClick={() => setIsDetailMetaCollapsed((value) => !value)}
            aria-expanded={!isDetailMetaCollapsed}
          >
            <span>Dettagli missione</span>
            <Icon name={isDetailMetaCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-up'} />
          </button>
          {!isDetailMetaCollapsed && (
            <table className="mission-meta-table">
              <tbody>
                {detailRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="mission-join-table">
          <div>
            <FieldLabel icon="fa-solid fa-people-group" label="Come entrare" />
            {canChooseParticipation ? (
              <div className="segmented-btn-group mission-participation-control">
                <button
                  type="button"
                  className={`segmented-btn ${myMissionParticipation === 'TITOLARE' ? 'is-active' : ''}`}
                  onClick={() => {
                    onJoinMission(selectedMission.id, 'TITOLARE')
                  }}
                >
                  Titolare
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${myMissionParticipation === 'NON_TITOLARE' ? 'is-active' : ''}`}
                  onClick={() => {
                    onJoinMission(selectedMission.id, 'NON_TITOLARE')
                  }}
                >
                  Panchina
                </button>
              </div>
            ) : (
              <div className="mission-flow-helper">
                <p className="muted">{participationUnavailableReason || 'Nessuna azione disponibile al momento.'}</p>
                {missingActiveCharacterInCampaign && (
                  <div className="inline-actions">
                    <button type="button" className="secondary-btn" onClick={onCreateCharacter}>
                      <Icon name="fa-solid fa-wand-magic-sparkles" />
                      Crea personaggio
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!selectedMissionInActiveCampaign && (
          <div className="mission-campaign-entry">
            <p className="muted">Per entrare in missione devi entrare nella campagna.</p>
            <div className="inline-actions">
              {campaignCanBeOpenedById[selectedMission.campaignId] ? (
                <button type="button" className="secondary-btn" onClick={() => onOpenCampaign(selectedMission.campaignId)}>
                  <Icon name="fa-solid fa-arrow-right-to-bracket" />
                  Entra nella campagna
                </button>
              ) : (
                <button type="button" className="secondary-btn" onClick={onBrowseCampaigns}>
                  <Icon name="fa-solid fa-list" />
                  Vai alle campagne
                </button>
              )}
            </div>
          </div>
        )}

        <DataTable
          className="mission-participants-table"
          columns={[
            { key: 'user', label: 'Giocatore', sortKey: 'user' },
            { key: 'character', label: 'Personaggio' },
            { key: 'type', label: 'Ingresso', sortKey: 'type' },
            { key: 'joinedAt', label: 'Iscrizione', sortKey: 'joinedAt' },
          ]}
          rows={sortedSelectedMissionParticipants}
          sortBy={participantSortBy}
          sortDirection={participantSortDirection}
          onSortChange={handleParticipantSortChange}
          getRowKey={(participant) => `${participant.missionId}-${participant.userId}-${participant.characterId}`}
          emptyMessage="Nessun giocatore in missione."
          renderRow={(participant) => (
            <tr>
              <td>
                <div className="data-table-primary">
                  <p className="data-table-title">{missionParticipantLabelByUserId[participant.userId] || participant.userId}</p>
                </div>
              </td>
              <td className="data-table-muted">{missionParticipantCharacterLabelById[participant.characterId] || participant.characterId}</td>
              <td>
                <span className={`status ${participant.participationType === 'TITOLARE' ? 'status-success' : 'status-warning'}`}>
                  {participationLabel(participant.participationType)}
                </span>
              </td>
              <td className="data-table-muted">{formatMissionJoinedAt(participant.joinedAt)}</td>
            </tr>
          )}
        />

        {(canEditSelectedMission || canResolveSelectedMission || canChangeSelectedMissionParticipation) && editingMissionId !== selectedMission.id && (
          <div className="mission-actions-stack">
            <div className="inline-actions mission-actions mission-actions-bottom">
              {canEditSelectedMission && (
                <button type="button" className="secondary-btn" onClick={() => setEditingMissionId(selectedMission.id)}>
                  <Icon name="fa-solid fa-pen-to-square" />
                  Modifica missione
                </button>
              )}
              {canResolveSelectedMission && (
                <button type="button" className="secondary-btn" onClick={() => setConfirmAction('complete')}>
                  <Icon name="fa-solid fa-circle-check" />
                  Segna completata
                </button>
              )}
              {canChangeSelectedMissionParticipation && myMissionParticipation && (
                <button type="button" className="danger-btn" onClick={() => setConfirmAction('leave')}>
                  <Icon name="fa-solid fa-right-from-bracket" />
                  Esci dalla missione
                </button>
              )}
            </div>
            {canResolveSelectedMission && (
              <div className="mission-danger-row">
                <button type="button" className="danger-btn mission-danger-wide-btn" onClick={() => setConfirmAction('cancel')}>
                  <Icon name="fa-solid fa-ban" />
                  Cancella sessione
                </button>
              </div>
            )}
          </div>
        )}

        {canEditSelectedMission && editingMissionId === selectedMission.id && (
          <MissionEditForm
            key={selectedMission.id}
            mission={selectedMission}
            onCancel={() => setEditingMissionId(null)}
            onSave={(payload) => {
              onUpdateMission(selectedMission.id, payload)
              setEditingMissionId(null)
            }}
            renderForm={renderMissionForm}
          />
        )}
        </>
        ) : (
          <MissionChatPanel
            chat={missionChat}
            busy={missionChatBusy}
            error={missionChatError}
            currentUserId={currentUserId}
            onClose={() => {
              onCloseMissionChat()
              if (chatReturnTarget === 'list') {
                setIsDetailVisible(false)
                setDetailPane('summary')
                return
              }
              setDetailPane('summary')
            }}
            onSend={onSendMissionChatMessage}
            showCloseAction={false}
          />
        )}
      </div>
    )
  }

  return (
    <section className="panel mission-shell">
      <div className="panel-header mission-page-header">
        <div>
          <h2>Missioni</h2>
          <p className="muted">Cerca, filtra e joina le missioni aperte delle campagne a cui sei approvato.</p>
        </div>
        <div className="inline-actions">
          {hasActiveCampaign && visibleMode !== 'create' && canCreateMissions && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setCreateDraft(defaultDraft())
                setCreateError('')
                setMode('create')
              }}
            >
              <Icon name="fa-solid fa-plus" />
              Crea missione
            </button>
          )}
        </div>
      </div>

      {canUseCreateMode && visibleMode === 'create' && (
        <div className="subpanel mission-form-panel">
          {renderMissionForm(createDraft, setCreateDraft, createError, setCreateError, 'Crea missione', submitCreate, () => setMode('browse'))}
        </div>
      )}

      <div className="mission-toolbar">
        <label className="mission-search">
          <FieldLabel icon="fa-solid fa-magnifying-glass" label="Cerca" />
          {showMissionSkeleton ? (
            <Skeleton height="2.75rem" borderRadius="8px" />
          ) : (
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Titolo, descrizione o campagna" />
          )}
        </label>
        {campaignOptions.length > 1 && (
          <label className="mission-campaign-filter">
            <FieldLabel icon="fa-solid fa-folder-open" label="Campagna" />
            {showMissionSkeleton ? (
              <Skeleton height="2.75rem" borderRadius="8px" />
            ) : (
              <select
                value={campaignFilter}
                onChange={(event) => {
                  if (!activeCampaignId) return
                  const nextValue = event.target.value
                  setCampaignFilters((prev) => ({ ...prev, [activeCampaignId]: nextValue }))
                }}
              >
                <option value="all">Tutte</option>
                {campaignOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        <label className="member-filter-field mission-view-filter">
          <span className="muted">Vista</span>
          <MultiSelect
            className="member-filter-select"
            panelClassName="member-filter-select-panel"
            value={missionViewFilters}
            options={MISSION_VIEW_FILTER_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => {
              setNow(Date.now())
              const nextValues = (event.value as MissionViewFilter[]).slice(-1)
              setMissionViewFilters(nextValues)
            }}
            placeholder="Vista"
            maxSelectedLabels={1}
            selectedItemsLabel="{0} selezionata"
            itemTemplate={(option: MissionFilterOption) => (
              <span className="member-filter-option-copy">
                <Icon name={option.icon} />
                <span>{option.label}</span>
              </span>
            )}
          />
        </label>
      </div>

      <div className="mission-grid mission-grid-single">
        {!isDetailVisible && (
        <div className="subpanel mission-block mission-list-block">
          <div className="row-between">
            <div>
              <h3 className="section-title">Risultati</h3>
              <p className="muted">
                {showExpired
                  ? 'Missioni con data sessione gia passata.'
                  : showCompleted
                    ? 'Missioni completate.'
                  : 'Missioni aperte, riaperte o confermate non ancora scadute.'}
              </p>
            </div>
            <span className="mission-count">{sortedMissions.length}</span>
          </div>
          {showMissionSkeleton ? (
            <div className="mission-table-skeleton" aria-hidden="true">
              <Skeleton height="3rem" borderRadius="8px" />
              <Skeleton height="5rem" borderRadius="8px" />
              <Skeleton height="5rem" borderRadius="8px" />
              <Skeleton height="5rem" borderRadius="8px" />
            </div>
          ) : (
          <DataTable
            className="mission-data-table"
            columns={[
              { key: 'title', label: 'Missione', sortKey: 'title', className: 'mission-title-col' },
              { key: 'session', label: 'Sessione', sortKey: 'session', className: 'mission-center-col' },
              { key: 'campaign', label: 'Campagna', className: 'mission-center-col' },
              { key: 'module', label: 'Modulo di gioco', className: 'mission-center-col' },
              { key: 'status', label: 'Stato', className: 'mission-center-col' },
              { key: 'role', label: 'Ruolo', className: 'mission-center-col' },
              { key: 'chat', label: '', className: 'mission-action-col' },
              { key: 'summary', label: '', className: 'mission-action-col' },
            ]}
            rows={sortedMissions}
            getRowKey={(mission) => `${mission.campaignId}-${mission.id}`}
            emptyMessage="Nessuna missione corrisponde ai filtri."
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            selectedRowKey={selectedMission ? `${selectedMission.campaignId}-${selectedMission.id}` : null}
            renderRow={(mission) => (
              <tr>
                <td className="mission-title-cell">
                  <div className="data-table-primary">
                    <p className="data-table-title mission-title-with-badges">
                      <span className="mission-participants-pill">
                        <Icon name="fa-solid fa-people-group" />
                        <span>{formatMissionParticipants(mission)}</span>
                      </span>
                      <span>{mission.title}</span>
                    </p>
                  </div>
                </td>
                <td className="mission-center-cell">
                  <div className="data-table-primary">
                    <p className="data-table-meta mission-session-text">{`${formatMissionShortDay(mission.sessionAt)} H ${formatMissionTime(mission.sessionAt)}`}</p>
                  </div>
                </td>
                <td className="mission-center-cell">
                  <div className="data-table-primary">
                    <p className="data-table-title">{campaignNameById[mission.campaignId] || mission.campaignId}</p>
                  </div>
                </td>
                <td className="mission-center-cell">
                  <span className="campaign-system-inline mission-module-chip">
                    <Icon name={missionGameSystemIcon(campaignGameSystemById[mission.campaignId])} />
                    <span>{missionGameSystemLabel(campaignGameSystemById[mission.campaignId])}</span>
                  </span>
                </td>
                <td className="mission-center-cell">
                  <span
                    className={missionStatusClassName(mission.status)}
                    title={missionStatusReasonLabel(mission.statusReason) || undefined}
                  >
                    <Icon name={missionStatusIcon(mission.status)} />
                    {missionStatusLabel(mission.status)}
                  </span>
                </td>
                <td className="mission-center-cell">
                  {myMissionParticipationById[mission.id] ? (
                    <span className={`status ${myMissionParticipationById[mission.id] === 'TITOLARE' ? 'status-success' : 'status-warning'}`}>
                      {participationLabel(myMissionParticipationById[mission.id])}
                    </span>
                  ) : (
                    <span className="status status-neutral">Non iscritto</span>
                  )}
                </td>
                <td>
                  <div className="mission-chat-cell">
                    {canOpenMissionChat(mission) ? (
                      <button
                        type="button"
                        className={`mission-chat-row-btn mission-action-btn ${selectedMissionChatId === mission.id ? 'is-active' : 'is-enabled'}`}
                        aria-label={`Apri chat missione ${mission.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectMission(mission.id)
                          setEditingMissionId(null)
                          setMode('browse')
                          setIsDetailVisible(true)
                          setDetailPane('chat')
                          setChatReturnTarget('list')
                          onOpenMissionChat(mission.campaignId, mission.id)
                        }}
                      >
                        <Icon name="fa-solid fa-comments" />
                        <span>Chat</span>
                      </button>
                    ) : (
                      <span className="data-table-muted">-</span>
                    )}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="mission-summary-row-btn mission-action-btn"
                    aria-label={`Apri dettaglio missione ${mission.title}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectMission(mission.id)
                      onCloseMissionChat()
                      setEditingMissionId(null)
                      setMode('browse')
                      setIsDetailVisible(true)
                      setDetailPane('summary')
                      setChatReturnTarget('summary')
                    }}
                  >
                    <Icon name="fa-solid fa-magnifying-glass" />
                    <span>Dettaglio</span>
                  </button>
                </td>
              </tr>
            )}
          />)}
        </div>
        )}
        {isDetailVisible && renderMissionDetail()}
      </div>
      <ConfirmActionDialog
        open={confirmAction === 'leave'}
        title="Uscire dalla missione"
        message="Confermi l'uscita dalla missione selezionata?"
        confirmLabel="Conferma uscita"
        tone="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (selectedMission) onLeaveMission(selectedMission.id)
          setConfirmAction(null)
        }}
      />
      <ConfirmActionDialog
        open={confirmAction === 'complete'}
        title="Completare la missione"
        message="Confermi di voler segnare la missione come completata?"
        confirmLabel="Segna completata"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (selectedMission) onCompleteMission(selectedMission.id)
          setConfirmAction(null)
        }}
      />
      <ConfirmActionDialog
        open={confirmAction === 'cancel'}
        title="Cancellare la missione"
        message="Confermi la cancellazione della missione selezionata?"
        confirmLabel="Cancella missione"
        tone="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (selectedMission) onCancelMission(selectedMission.id)
          setConfirmAction(null)
        }}
      />
    </section>
  )
}

function missionDraftToPayload(draft: MissionDraft, setError: (value: string) => void) {
  const sessionAt = toIsoTimestamp(draft.sessionDate, draft.sessionTime)
  const closesAt = toIsoTimestamp(draft.closesDate, draft.closesTime)
  if (sessionAt && closesAt && new Date(closesAt).getTime() >= new Date(sessionAt).getTime()) {
    setError('La chiusura iscrizioni deve precedere la data della sessione.')
    return null
  }

  setError('')
  return {
    title: draft.title,
    description: draft.description,
    isMultiSession: draft.isMultiSession,
    sessionAt: sessionAt || '',
    closesAt: closesAt || '',
    quorum: parseOptionalInt(draft.quorum),
    maxParticipants: parseOptionalInt(draft.maxParticipants),
    autoReopenOnDrop: draft.autoReopenOnDrop,
  }
}

function MissionEditForm({
  mission,
  onSave,
  onCancel,
  renderForm,
}: {
  mission: MissionResponse
  onSave: (payload: MissionPayload) => void
  onCancel: () => void
  renderForm: (
    draft: MissionDraft,
    setDraft: Dispatch<SetStateAction<MissionDraft>>,
    error: string,
    setError: (value: string) => void,
    submitLabel: string,
    onSubmit: () => void,
    onCancel: () => void,
  ) => ReactNode
}) {
  const [draft, setDraft] = useState<MissionDraft>(draftFromMission(mission))
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const payload = missionDraftToPayload(draft, setError)
    if (!payload) return
    onSave(payload)
  }

  return (
    <div className="subpanel mission-form-panel">
      {renderForm(draft, setDraft, error, setError, 'Salva modifica', handleSubmit, onCancel)}
    </div>
  )
}

function MissionCountStepper({
  label,
  value,
  minValue,
  maxValue,
  onChange,
}: {
  label: string
  value: string
  minValue: number
  maxValue: number
  onChange: (value: string) => void
}) {
  return (
    <div className="mission-count-stepper mission-count-stepper--compact" aria-label={label}>
      <span className="mission-time-step-label">{label}</span>
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftCount(value, -1, minValue, maxValue))}>
        <Icon name="fa-solid fa-minus" />
      </button>
      <span className="mission-time-step-value">{value || String(minValue)}</span>
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftCount(value, 1, minValue, maxValue))}>
        <Icon name="fa-solid fa-plus" />
      </button>
    </div>
  )
}
