import { useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { DataTable, FieldLabel, Icon } from '../../../shared/components'
import type {
  CampaignRole,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
  MissionStatusReason,
} from '../../../types/domain'

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

const missionTimeConfig = {
  hourMin: 0,
  hourMax: 23,
  minuteStep: 15,
  defaultTime: '15:30',
} as const

const pad2 = (value: number) => value.toString().padStart(2, '0')

const missionMinutes = Array.from({ length: 60 / missionTimeConfig.minuteStep }, (_, index) => index * missionTimeConfig.minuteStep)

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

function parseTimeParts(value: string) {
  const [hourText = '0', minuteText = '0'] = value.split(':')
  const hour = Number.parseInt(hourText, 10)
  const minute = Number.parseInt(minuteText, 10)
  return {
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, missionTimeConfig.hourMin), missionTimeConfig.hourMax) : missionTimeConfig.hourMin,
    minute: missionMinutes.includes(minute) ? minute : 0,
  }
}

function formatTimeParts(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function shiftHour(value: string, direction: 1 | -1) {
  const { hour, minute } = parseTimeParts(value)
  const nextHour = Math.min(Math.max(hour + direction, missionTimeConfig.hourMin), missionTimeConfig.hourMax)
  return formatTimeParts(nextHour, minute)
}

function shiftMinute(value: string, direction: 1 | -1) {
  const { hour, minute } = parseTimeParts(value)
  const currentIndex = missionMinutes.indexOf(minute)
  const nextIndex = currentIndex + direction
  if (nextIndex < 0) {
    if (hour === missionTimeConfig.hourMin) return formatTimeParts(hour, missionMinutes[0])
    return formatTimeParts(hour - 1, missionMinutes[missionMinutes.length - 1])
  }
  if (nextIndex >= missionMinutes.length) {
    if (hour === missionTimeConfig.hourMax) return formatTimeParts(hour, missionMinutes[missionMinutes.length - 1])
    return formatTimeParts(hour + 1, missionMinutes[0])
  }
  return formatTimeParts(hour, missionMinutes[nextIndex])
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
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' }).format(date)
}

function formatMissionTime(value: string | null | undefined): string {
  if (!value) return 'Ora non impostata'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date)
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

function formatMissionQuorum(mission: MissionResponse) {
  return mission.quorum ? `${mission.quorum} titolari` : 'Non impostato'
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

export function MissionsPage({
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
  onCreate,
  onSelectMission,
  onJoinMission,
  onLeaveMission,
  onOpenCampaign,
  onBrowseCampaigns,
  onUpdateMission,
  onCompleteMission,
  onCancelMission,
}: {
  missions: MissionResponse[]
  selectedMission: MissionResponse | null
  canCreateMissions: boolean
  activeCampaignId: string
  activeCampaignRole: CampaignRole | null
  activeCampaignCharacterId: string
  campaignNameById: Record<string, string>
  campaignGameSystemById: Record<string, string>
  campaignCanBeOpenedById: Record<string, boolean>
  missionParticipantsById: Record<string, MissionParticipantResponse[]>
  missionParticipantLabelByUserId: Record<string, string>
  missionParticipantCharacterLabelById: Record<string, string>
  myMissionParticipationById: Record<string, MissionParticipationType>
  onCreate: (payload: Required<Pick<MissionPayload, 'title'>> & {
    description: string
    isMultiSession: boolean
    sessionAt: string
    closesAt: string
    quorum: number | null
    maxParticipants: number | null
    autoReopenOnDrop: boolean
  }) => void
  onSelectMission: (id: string) => void
  onJoinMission: (missionId: string, participationType: MissionParticipationType) => void
  onLeaveMission: (missionId: string) => void
  onOpenCampaign: (campaignId: string) => void
  onBrowseCampaigns: () => void
  onUpdateMission: (missionId: string, payload: MissionPayload) => void
  onCompleteMission: (missionId: string) => void
  onCancelMission: (missionId: string) => void
}) {
  const [mode, setMode] = useState<'browse' | 'create'>('browse')
  const [createDraft, setCreateDraft] = useState<MissionDraft>(defaultDraft)
  const [createError, setCreateError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [campaignFilters, setCampaignFilters] = useState<Record<string, string>>({})
  const [showExpired, setShowExpired] = useState(false)
  const [sortBy, setSortBy] = useState<MissionSortKey>('session')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [now, setNow] = useState(Date.now)
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null)

  const hasActiveCampaign = Boolean(activeCampaignId)
  const canUseCreateMode = canCreateMissions && hasActiveCampaign
  const visibleMode = mode === 'create' && canUseCreateMode ? 'create' : 'browse'
  const selectedMissionInActiveCampaign = Boolean(selectedMission && selectedMission.campaignId === activeCampaignId)
  const campaignFilter = activeCampaignId ? campaignFilters[activeCampaignId] || 'all' : 'all'
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
    if (showExpired) {
      if (!isExpired) return false
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
          <input type="date" value={draft.sessionDate} onChange={(event) => setDraft((prev) => ({ ...prev, sessionDate: event.target.value }))} />
          <MissionTimeStepper value={draft.sessionTime} onChange={(value) => setDraft((prev) => ({ ...prev, sessionTime: value }))} />
        </div>
        <div className="mission-inline-table-row">
          <span className="mission-inline-table-label">Chiusura</span>
          <input type="date" value={draft.closesDate} onChange={(event) => setDraft((prev) => ({ ...prev, closesDate: event.target.value }))} />
          <MissionTimeStepper value={draft.closesTime} onChange={(value) => setDraft((prev) => ({ ...prev, closesTime: value }))} />
        </div>
        <div className="mission-inline-table-row">
          <span className="mission-inline-table-label">Capienza</span>
          <MissionCountStepper label="Quorum" value={draft.quorum} minValue={1} maxValue={99} onChange={(value) => setDraft((prev) => ({ ...prev, quorum: value }))} />
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
    const detailRows: MissionDetailRow[] = [
      { key: 'title', label: 'Titolo', value: selectedMission.title },
      { key: 'session', label: 'Sessione', value: formatMissionDateTime(selectedMission.sessionAt) },
      { key: 'closing', label: 'Chiusura', value: formatMissionDateTime(selectedMission.closesAt) },
      { key: 'capacity', label: 'Partecipanti', value: formatMissionParticipants(selectedMission) },
      { key: 'quorum', label: 'Quorum', value: formatMissionQuorum(selectedMission) },
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
            <h3 className="section-title">Missione</h3>
            <p className="muted">Campagna: <strong>{missionCampaignName}</strong></p>
          </div>
          <div
            className="mission-title-badges"
            title={selectedMissionBelowQuorum ? 'Stato incoerente: Confermata sotto quorum.' : selectedMissionStatusReason || undefined}
          >
            <span className={missionStatusClassName(selectedMission.status)}>
              {missionStatusLabel(selectedMission.status)}
            </span>
            <span className="mission-count">{formatMissionParticipants(selectedMission)}</span>
          </div>
        </div>

        <div className="mission-description-block">
          <p className="mission-card-label">Missione</p>
          <p className="mission-description-text">{renderMissionText(selectedMission.description)}</p>
        </div>

        <DataTable
          className="mission-detail-data-table"
          columns={[
            { key: 'field', label: 'Campo' },
            { key: 'value', label: 'Valore' },
          ]}
          rows={detailRows}
          getRowKey={(row) => row.key}
          emptyMessage="Nessun dettaglio disponibile."
          renderRow={(row) => (
            <tr>
              <td className="data-table-muted">{row.label}</td>
              <td>
                <div className="data-table-primary">
                  <p className="data-table-title">{row.value}</p>
                </div>
              </td>
            </tr>
          )}
        />

        <div className="mission-join-table">
          <div>
            <FieldLabel icon="fa-solid fa-people-group" label="Come entrare" />
            <div className="segmented-btn-group mission-participation-control">
              <button
                type="button"
                className={`segmented-btn ${myMissionParticipation === 'TITOLARE' ? 'is-active' : ''}`}
                onClick={() => {
                  onJoinMission(selectedMission.id, 'TITOLARE')
                }}
                disabled={!canChooseParticipation}
                title={participationUnavailableReason || undefined}
              >
                Titolare
              </button>
              <button
                type="button"
                className={`segmented-btn ${myMissionParticipation === 'NON_TITOLARE' ? 'is-active' : ''}`}
                onClick={() => {
                  onJoinMission(selectedMission.id, 'NON_TITOLARE')
                }}
                disabled={!canChooseParticipation}
                title={participationUnavailableReason || undefined}
              >
                Panchina
              </button>
              {canChangeSelectedMissionParticipation && (
                <button
                  type="button"
                  className="segmented-btn mission-exit-btn"
                  onClick={() => onLeaveMission(selectedMission.id)}
                >
                  Esci
                </button>
              )}
            </div>
          </div>
        </div>
        {participationUnavailableReason && selectedMissionInActiveCampaign && (
          <div className="mission-campaign-entry">
            <p className="muted">{participationUnavailableReason}</p>
          </div>
        )}

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
            { key: 'user', label: 'Giocatore' },
            { key: 'character', label: 'Personaggio' },
            { key: 'type', label: 'Ingresso' },
          ]}
          rows={selectedMissionParticipants}
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
            </tr>
          )}
        />

        {(canEditSelectedMission || canResolveSelectedMission) && editingMissionId !== selectedMission.id && (
          <div className="inline-actions mission-actions">
            {canEditSelectedMission && (
              <button type="button" className="secondary-btn" onClick={() => setEditingMissionId(selectedMission.id)}>
                <Icon name="fa-solid fa-pen-to-square" />
                Modifica missione
              </button>
            )}
            {canResolveSelectedMission && (
              <>
                <button type="button" className="secondary-btn" onClick={() => onCompleteMission(selectedMission.id)}>
                  <Icon name="fa-solid fa-circle-check" />
                  Segna completata
                </button>
                <button type="button" className="danger-btn" onClick={() => onCancelMission(selectedMission.id)}>
                  <Icon name="fa-solid fa-ban" />
                  Cancella sessione
                </button>
              </>
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
          {hasActiveCampaign && visibleMode !== 'create' && (
            <button
              type="button"
              className="secondary-btn"
              disabled={!canCreateMissions}
              title={!canCreateMissions ? 'Creazione missioni non disponibile: modulo Missioni non attivo o permessi insufficienti' : undefined}
              onClick={() => {
                if (!canCreateMissions) return
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
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Titolo, descrizione o campagna" />
        </label>
        {campaignOptions.length > 1 && (
          <label className="mission-campaign-filter">
            <FieldLabel icon="fa-solid fa-folder-open" label="Campagna" />
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
          </label>
        )}
        <div className="segmented-btn-group mission-status-toggle">
          <button
            type="button"
            className={`segmented-btn ${showExpired ? 'is-active' : ''}`}
            title="Mostra solo missioni con data sessione precedente a ora"
            onClick={() => {
              setNow(Date.now())
              setShowExpired((prev) => !prev)
            }}
          >
            Scadute
          </button>
        </div>
      </div>

      <div className="mission-grid">
        <div className="subpanel mission-block mission-list-block">
          <div className="row-between">
            <div>
              <h3 className="section-title">Risultati</h3>
              <p className="muted">
                {showExpired
                  ? 'Missioni con data sessione gia passata.'
                  : 'Missioni aperte, riaperte o confermate non ancora scadute.'}
              </p>
            </div>
            <span className="mission-count">{sortedMissions.length}</span>
          </div>
          <DataTable
            className="mission-data-table"
            columns={[
              { key: 'title', label: 'Missione', sortKey: 'title' },
              { key: 'status', label: 'Stato', sortKey: 'status' },
              { key: 'participants', label: 'Partecipanti', sortKey: 'participants' },
              { key: 'role', label: 'Ruolo', sortKey: 'role' },
              { key: 'session', label: 'Sessione', sortKey: 'session' },
              { key: 'campaign', label: 'Campagna', sortKey: 'campaign' },
              { key: 'module', label: 'Modulo', sortKey: 'module' },
            ]}
            rows={sortedMissions}
            getRowKey={(mission) => `${mission.campaignId}-${mission.id}`}
            emptyMessage="Nessuna missione corrisponde ai filtri."
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            selectedRowKey={selectedMission ? `${selectedMission.campaignId}-${selectedMission.id}` : null}
            onRowClick={(mission) => {
              onSelectMission(mission.id)
              setEditingMissionId(null)
              setMode('browse')
            }}
            renderRow={(mission) => (
              <tr>
                <td>
                  <div className="data-table-primary">
                    <p className="data-table-title">{mission.title}</p>
                    {mission.description && <p className="data-table-secondary">{mission.description}</p>}
                  </div>
                </td>
                <td>
                  <span
                    className={missionStatusClassName(mission.status)}
                    title={missionStatusReasonLabel(mission.statusReason) || undefined}
                  >
                    {missionStatusLabel(mission.status)}
                  </span>
                </td>
                <td>
                  <span className="status status-info">{formatMissionParticipants(mission)}</span>
                </td>
                <td>
                  {myMissionParticipationById[mission.id] ? (
                    <span className={`status ${myMissionParticipationById[mission.id] === 'TITOLARE' ? 'status-success' : 'status-warning'}`}>
                      {participationLabel(myMissionParticipationById[mission.id])}
                    </span>
                  ) : (
                    <span className="status status-neutral">Non iscritto</span>
                  )}
                </td>
                <td>
                  <div className="data-table-primary">
                    <p className="data-table-title">{formatMissionShortDay(mission.sessionAt)}</p>
                    <p className="data-table-meta">{formatMissionTime(mission.sessionAt)}</p>
                  </div>
                </td>
                <td className="data-table-muted">{campaignNameById[mission.campaignId] || mission.campaignId}</td>
                <td>
                  <span className="campaign-system-inline mission-module-chip">
                    <Icon name="fa-solid fa-dice-d20" />
                    <span>{campaignGameSystemById[mission.campaignId] || 'N/D'}</span>
                  </span>
                </td>
              </tr>
            )}
          />
        </div>
        {renderMissionDetail()}
      </div>
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

function MissionTimeStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { hour, minute } = parseTimeParts(value || missionTimeConfig.defaultTime)
  return (
    <div className="mission-time-stepper mission-time-stepper--compact">
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftHour(value, -1))}>
        <Icon name="fa-solid fa-minus" />
      </button>
      <span className="mission-time-step-value">{pad2(hour)}</span>
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftHour(value, 1))}>
        <Icon name="fa-solid fa-plus" />
      </button>
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftMinute(value, -1))}>
        <Icon name="fa-solid fa-minus" />
      </button>
      <span className="mission-time-step-value">{pad2(minute)}</span>
      <button type="button" className="secondary-btn mission-time-step-btn" onClick={() => onChange(shiftMinute(value, 1))}>
        <Icon name="fa-solid fa-plus" />
      </button>
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
