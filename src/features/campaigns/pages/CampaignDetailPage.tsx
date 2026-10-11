import { useMemo, useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { CampaignUpcomingMissions } from '../components/CampaignUpcomingMissions'
import { MultiSelect } from 'primereact/multiselect'
import { useCampaignContext } from '../../../context'
import { BadgeGroup, FieldLabel, Icon, InfoBlock, MobileDataCard, ResponsiveDataList } from '../../../shared/components'
import {
  CAMPAIGN_MODULE_HIDDEN_CODES,
  campaignModuleIconName,
  campaignModuleUnavailable,
  campaignModuleTitle,
  campaignToneLabel,
  catalogEntryDescription,
  catalogEntryLabel,
  formatShortDate,
  gameSystemIconName,
} from '../../../shared/utils'
import type { CampaignCharacterStatus, CampaignRole } from '../../../types/domain'
import { CampaignStatusBadge } from '../components'

type FilterOption<T extends string> = {
  value: T
  label: string
  icon: string
}

const ROLE_FILTER_OPTIONS: Array<FilterOption<CampaignRole>> = [
  { value: 'SUPER_MASTER', label: 'Super master', icon: 'fa-solid fa-shield-halved' },
  { value: 'MASTER', label: 'Master', icon: 'fa-solid fa-book-open' },
  { value: 'CO_MASTER', label: 'Co-master', icon: 'fa-solid fa-user-pen' },
  { value: 'GIOCATORE', label: 'Giocatore', icon: 'fa-solid fa-user' },
]

type MemberCharacterFilter = CampaignCharacterStatus | 'NO_CHARACTER'

const STATUS_FILTER_OPTIONS: Array<FilterOption<MemberCharacterFilter>> = [
  { value: 'ACTIVE', label: 'Attivo', icon: 'fa-solid fa-circle-check' },
  { value: 'RETIRED', label: 'Ritirato', icon: 'fa-solid fa-hourglass-half' },
  { value: 'DEAD', label: 'Deceduto', icon: 'fa-solid fa-circle-xmark' },
  { value: 'NO_CHARACTER', label: 'Senza personaggio', icon: 'fa-solid fa-circle-info' },
]

function roleRank(role: CampaignRole) {
  switch (role) {
    case 'SUPER_MASTER':
      return 4
    case 'MASTER':
      return 3
    case 'CO_MASTER':
      return 2
    case 'GIOCATORE':
    default:
      return 1
  }
}

function roleBadgeMeta(role: CampaignRole) {
  switch (role) {
    case 'SUPER_MASTER':
      return { label: 'Super master', icon: 'fa-solid fa-shield-halved', className: 'is-super-master' }
    case 'MASTER':
      return { label: 'Master', icon: 'fa-solid fa-book-open', className: 'is-master' }
    case 'CO_MASTER':
      return { label: 'Co-master', icon: 'fa-solid fa-user-pen', className: 'is-co-master' }
    case 'GIOCATORE':
    default:
      return { label: 'Giocatore', icon: 'fa-solid fa-user', className: 'is-player' }
  }
}

function characterStateMeta(status: CampaignCharacterStatus | null) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Attivo', icon: 'fa-solid fa-circle-check', className: 'is-active' }
    case 'RETIRED':
      return { label: 'Ritirato', icon: 'fa-solid fa-hourglass-half', className: 'is-retired' }
    case 'DEAD':
      return { label: 'Deceduto', icon: 'fa-solid fa-circle-xmark', className: 'is-dead' }
    default:
      return { label: 'Senza personaggio', icon: 'fa-solid fa-circle-info', className: 'is-neutral' }
  }
}

export function CampaignDetailPage() {
  const {
    campaign,
    currentUserId,
    isActiveCampaign,
    members,
    memberNames,
    availableModules,
    availableGameSystems,
    reloadCampaign: onReload,
    openMember: onOpenMember,
    openManagement: onOpenManagement,
    openCharacters: onOpenCharacters,
    openMissions: onOpenMissions,
    canManageMembers,
    applyCurrentCampaign: onApply,
    activateCurrentCampaign: onActivate,
    leaveCurrentCampaign: onLeaveCampaign,
    deactivateCampaign: onDeactivateCampaign,
    membershipStatus,
    membershipRole,
  } = useCampaignContext()
  const [memberQuery, setMemberQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState<MemberCharacterFilter[]>(['ACTIVE', 'RETIRED', 'DEAD', 'NO_CHARACTER'])
  const [roleFilters, setRoleFilters] = useState<CampaignRole[]>(['SUPER_MASTER', 'MASTER', 'CO_MASTER', 'GIOCATORE'])
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [deactivateConfirmName, setDeactivateConfirmName] = useState('')
  const [deactivationSubmitting, setDeactivationSubmitting] = useState(false)

  const [deactivationError, setDeactivationError] = useState('')

  const normalizedQuery = memberQuery.trim().toLowerCase()
  const approvedMembers = useMemo(() => members.filter((member) => member.memberStatus === 'APPROVED'), [members])
  const filteredMembers = useMemo(() => {
    return approvedMembers
      .filter((member) => {
        const displayName = memberNames[member.userId] || member.userId
        return (
          (normalizedQuery.length === 0 || displayName.toLowerCase().includes(normalizedQuery)) &&
          roleFilters.includes(member.role) &&
          statusFilters.includes(member.characterStatus ?? 'NO_CHARACTER')
        )
      })
      .sort((left, right) => {
        const rankDiff = roleRank(right.role) - roleRank(left.role)
        if (rankDiff !== 0) return rankDiff
        return (memberNames[left.userId] || left.userId).localeCompare(memberNames[right.userId] || right.userId, 'it', {
          sensitivity: 'base',
        })
      })
  }, [approvedMembers, memberNames, normalizedQuery, roleFilters, statusFilters])

  const campaignVisibilityMeta = [
    {
      key: 'open',
      active: campaign?.isOpen ?? false,
      label: campaign?.isOpen ? 'Campagna aperta' : 'Campagna chiusa',
      icon: campaign?.isOpen ? 'fa-solid fa-unlock' : 'fa-solid fa-lock',
    },
    {
      key: 'searchable',
      active: campaign?.isSearchable ?? false,
      label: campaign?.isSearchable ? 'Visibile nella ricerca' : 'Nascosta nella ricerca',
      icon: campaign?.isSearchable ? 'fa-solid fa-magnifying-glass' : 'fa-solid fa-eye-slash',
    },
  ]

  const canOpenManagement = membershipRole === 'MASTER' || membershipRole === 'SUPER_MASTER'
  const canOpenCharacters = membershipStatus === 'APPROVED'
  const canLeaveCampaign = membershipStatus === 'APPROVED' && campaign?.founderId !== currentUserId
  const canDeactivateCampaign = membershipRole === 'SUPER_MASTER'
  const campaignNameForConfirmation = campaign?.name.trim() || ''
  const deactivateConfirmationMatches = deactivateConfirmName.trim() === campaignNameForConfirmation

  const closeDeactivateModal = () => {
    if (deactivationSubmitting) return
    setDeactivateModalOpen(false)
    setDeactivateConfirmName('')
    setDeactivationError('')
  }

  const confirmDeactivateCampaign = async () => {
    if (!campaign || !deactivateConfirmationMatches) return
    setDeactivationSubmitting(true)
    setDeactivationError('')
    try {
      await onDeactivateCampaign()
      setDeactivateModalOpen(false)
      setDeactivateConfirmName('')
    } catch {
      setDeactivationError('La campagna non è stata disattivata. Il nome inserito resta disponibile: puoi riprovare.')
    } finally {
      setDeactivationSubmitting(false)
    }
  }

  return (
    <section className="panel campaign-overview">
      {!campaign && <p className="muted">Carica prima una campagna.</p>}
      {campaign && (
        <>
          {campaign.coverImageUrl && <img className="campaign-cover" src={campaign.coverImageUrl} alt="" />}
          <div className="campaign-hero-head">
            <div className="campaign-hero-title-block">
              <div className="campaign-hero-title-row">
                <h2 className="campaign-hero-title">{campaign.name}</h2>
                <span className="campaign-system-inline" title={catalogEntryDescription(availableGameSystems, campaign.gameSystem) || undefined}>
                  <Icon name={gameSystemIconName(campaign.gameSystem)} />
                  <span>{catalogEntryLabel(availableGameSystems, campaign.gameSystem) || 'Sistema non disponibile'}</span>
                </span>
              </div>
            </div>
            <div className="campaign-hero-status">
              <CampaignStatusBadge isActive={campaign.isActive} />
            </div>
          </div>
          <div className="campaign-section-heading campaign-overview-actions">
            <div className="inline-actions">
              {canOpenCharacters && campaign.isActive && <button type="button" className="primary-btn" onClick={onOpenCharacters}><Icon name="fa-solid fa-user" />Personaggi</button>}
              {canOpenManagement && campaign.isActive && <button type="button" className="secondary-btn" onClick={onOpenManagement}><Icon name="fa-solid fa-book-open" />Gestisci campagna</button>}
            </div>
            <button type="button" className="secondary-btn" onClick={onReload}><Icon name="fa-solid fa-rotate" />Aggiorna scheda</button>
          </div>
          {campaign.summary && <p className="campaign-summary">{campaign.summary}</p>}
          <div className="campaign-hero-toolbar">
            <div className="campaign-hero-meta" aria-label="Stato visibilità campagna">
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
            <div className="inline-actions campaign-detail-actions w-full flex-wrap md:w-auto md:flex-nowrap">
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
            </div>
          </div>
          {membershipStatus === 'APPROVED' && campaign.isActive && campaign.allowedModules.includes('MISSIONI') && (
            <CampaignUpcomingMissions campaignId={campaign.id} since={campaign.createdAt} onOpen={onOpenMissions} />
          )}
          {membershipStatus === 'APPROVED' && (
            <>
              <div className="campaign-section-heading campaign-group-heading">
                <h3 className="section-title">Il gruppo <span className="muted">({approvedMembers.length})</span></h3>
              </div>
              <details className="campaign-group-filters">
                <summary>Cerca e filtra il gruppo</summary>
                <div className="member-filters-panel">
                <div className="member-filter-toolbar">
                  <label className="member-filter-field">
                    <span className="muted">Cerca membro per nome</span>
                    <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="es. Sandro" />
                  </label>
                  <label className="member-filter-field">
                    <span id="member-status-label" className="muted">Personaggio</span>
                    <MultiSelect
                      className="surface-field member-filter-select"
                      panelClassName="surface-field-panel member-filter-select-panel"
                      ariaLabelledBy="member-status-label"
                      value={statusFilters}
                      options={STATUS_FILTER_OPTIONS}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(event) => setStatusFilters(event.value as MemberCharacterFilter[])}
                      placeholder="Tutti gli stati"
                      maxSelectedLabels={2}
                      selectedItemsLabel="{0} selezionati"
                      itemTemplate={(option: FilterOption<MemberCharacterFilter>) => (
                        <span className="member-filter-option-copy">
                          <Icon name={option.icon} />
                          <span>{option.label}</span>
                        </span>
                      )}
                    />
                  </label>
                  <label className="member-filter-field">
                    <span id="member-role-label" className="muted">Ruolo</span>
                    <MultiSelect
                      className="surface-field member-filter-select"
                      panelClassName="surface-field-panel member-filter-select-panel"
                      ariaLabelledBy="member-role-label"
                      value={roleFilters}
                      options={ROLE_FILTER_OPTIONS}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(event) => setRoleFilters(event.value as CampaignRole[])}
                      placeholder="Tutti i gradi"
                      maxSelectedLabels={2}
                      selectedItemsLabel="{0} selezionati"
                      itemTemplate={(option: FilterOption<CampaignRole>) => (
                        <span className="member-filter-option-copy">
                          <Icon name={option.icon} />
                          <span>{option.label}</span>
                        </span>
                      )}
                    />
                  </label>
                </div>
              </div>
              </details>
              {approvedMembers.length === 0 && <p className="muted">Nessun membro</p>}
              {approvedMembers.length > 0 && filteredMembers.length > 0 && (
                <ResponsiveDataList
                  desktopClassName="campaign-members-data-table"
                  columns={[
                    { key: 'member', label: 'Membro' },
                    { key: 'role', label: 'Ruolo' },
                    { key: 'status', label: 'Stato' },
                    { key: 'joinedAt', label: 'Iscritto il' },
                  ]}
                  rows={filteredMembers}
                  getRowKey={(member) => `${member.userId}-${member.role}-${member.memberStatus}`}
                  emptyMessage="Nessun membro trovato con questo filtro."
                  renderDesktopRow={(member) => {
                    const roleMeta = roleBadgeMeta(member.role)
                    const stateMeta = characterStateMeta(member.characterStatus)
                    return (
                      <tr>
                        <td>
                          {canManageMembers ? <button type="button" className="member-table-link" onClick={() => onOpenMember(member)}>{memberNames[member.userId] || member.userId}</button> : <span>{memberNames[member.userId] || member.userId}</span>}
                        </td>
                        <td>
                          <span className={`campaign-role-badge ${roleMeta.className}`}>
                            <Icon name={roleMeta.icon} />
                            <span>{roleMeta.label}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`member-state-badge ${stateMeta.className}`}>
                            <Icon name={stateMeta.icon} />
                            <span>{stateMeta.label}</span>
                          </span>
                        </td>
                        <td className="member-table-muted">{formatShortDate(member.joinedAt)}</td>
                      </tr>
                    )
                  }}
                  renderMobileCard={(member) => {
                    const roleMeta = roleBadgeMeta(member.role)
                    const stateMeta = characterStateMeta(member.characterStatus)
                    return (
                      <MobileDataCard
                        className="campaign-member-row"
                        title={
                          <span className="flex items-start justify-between gap-3">
                            {canManageMembers ? <button type="button" className="member-table-link" onClick={() => onOpenMember(member)}>{memberNames[member.userId] || member.userId}</button> : <span>{memberNames[member.userId] || member.userId}</span>}
                            <span className="shrink-0 text-xs text-[var(--muted)]">{formatShortDate(member.joinedAt)}</span>
                          </span>
                        }
                        badges={
                          <BadgeGroup>
                            <span className={`campaign-role-badge ${roleMeta.className}`}>
                              <Icon name={roleMeta.icon} />
                              <span>{roleMeta.label}</span>
                            </span>
                            <span className={`member-state-badge ${stateMeta.className}`}>
                              <Icon name={stateMeta.icon} />
                              <span>{stateMeta.label}</span>
                            </span>
                          </BadgeGroup>
                        }
                      />
                    )
                  }}
                />
              )}
              {approvedMembers.length > 0 && filteredMembers.length === 0 && (
                <p className="muted">Nessun membro trovato con questo filtro.</p>
              )}
            </>
          )}
          <details className="campaign-about">
            <summary>Storia, regole e strumenti della campagna</summary>
            <p className="campaign-description-muted">{campaign.description || 'Nessuna descrizione'}</p>
            <div className="campaign-profile-grid">
              <InfoBlock title="Ambientazione" value={campaign.setting} />
              <InfoBlock title="Tono" value={campaignToneLabel(campaign.tone)} />
              <InfoBlock title="Regole" value={campaign.rules} />
              <InfoBlock title="Requisiti d'ingresso" value={campaign.requirements} />
            </div>
            <div className="campaign-addon-section">
              <div className="campaign-addon-head">
                <h3 className="section-title">Addon campagna</h3>
                <p className="muted">Moduli disponibili per questa campagna.</p>
              </div>
              {availableModules.filter((module) => !CAMPAIGN_MODULE_HIDDEN_CODES.has(module.code) && !campaignModuleUnavailable(module)).length > 0 ? (
                <div className="campaign-addon-icons" role="list" aria-label="Addon campagna">
                  {availableModules
                    .filter((module) => !CAMPAIGN_MODULE_HIDDEN_CODES.has(module.code) && !campaignModuleUnavailable(module))
                    .map((module) => {
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
          </details>
          {(canLeaveCampaign || canDeactivateCampaign) && (
            <details className="campaign-about campaign-membership-actions">
              <summary>Adesione e chiusura della campagna</summary>
              <div className="inline-actions">
                {canLeaveCampaign && <button type="button" className="danger-btn" onClick={onLeaveCampaign}>Esci dalla campagna</button>}
                {canDeactivateCampaign && campaign.isActive && <button type="button" className="danger-btn" onClick={() => setDeactivateModalOpen(true)}><Icon name="fa-solid fa-ban" />Disattiva campagna</button>}
              </div>
            </details>
          )}
          <Dialog visible={deactivateModalOpen} header="Disattiva campagna" modal draggable={false} resizable={false} className="confirm-action-dialog campaign-deactivate-dialog" onHide={closeDeactivateModal} closable={!deactivationSubmitting} closeOnEscape={!deactivationSubmitting} dismissableMask={false}>
                <div className="leave-warning-box">
                  <p className="leave-warning-title">Operazione irreversibile dal flusso utente</p>
                  <p className="muted">
                    La campagna <strong>{campaign.name}</strong> verrà rimossa dalle liste utente e bloccherà nuovi personaggi, missioni, inviti e ingressi.
                  </p>
                </div>

                <label>
                  <FieldLabel icon="fa-solid fa-signature" label="Scrivi il nome campagna per confermare" />
                  <input
                    value={deactivateConfirmName}
                    placeholder={campaign.name}
                    onChange={(event) => setDeactivateConfirmName(event.target.value)}
                    disabled={deactivationSubmitting}
                  />
                </label>

                {deactivationError && <p role="alert">{deactivationError}</p>}
                <div className="inline-actions">
                  <button type="button" className="secondary-btn" onClick={closeDeactivateModal} disabled={deactivationSubmitting}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => void confirmDeactivateCampaign()}
                    disabled={deactivationSubmitting || !deactivateConfirmationMatches}
                  >
                    <Icon name="fa-solid fa-ban" />
                    {deactivationSubmitting ? 'Disattivazione…' : 'Disattiva campagna'}
                  </button>
                </div>
          </Dialog>
        </>
      )}
    </section>
  )
}
