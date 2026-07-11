import { useMemo, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { useCampaignContext } from '../../../context'
import { Icon, InfoBlock } from '../../../shared/components'
import {
  campaignModuleIconName,
  campaignModuleTitle,
  campaignToneLabel,
  catalogEntryDescription,
  catalogEntryLabel,
  formatShortDate,
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

const STATUS_FILTER_OPTIONS: Array<FilterOption<CampaignCharacterStatus>> = [
  { value: 'ACTIVE', label: 'Active', icon: 'fa-solid fa-circle-check' },
  { value: 'RETIRED', label: 'Retired', icon: 'fa-solid fa-hourglass-half' },
  { value: 'DEAD', label: 'Dead', icon: 'fa-solid fa-circle-xmark' },
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
      return { label: 'Active', icon: 'fa-solid fa-circle-check', className: 'is-active' }
    case 'RETIRED':
      return { label: 'Retired', icon: 'fa-solid fa-hourglass-half', className: 'is-retired' }
    case 'DEAD':
      return { label: 'Dead', icon: 'fa-solid fa-circle-xmark', className: 'is-dead' }
    default:
      return { label: 'N/A', icon: 'fa-solid fa-circle-info', className: 'is-neutral' }
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
    canManageMembers,
    applyCurrentCampaign: onApply,
    activateCurrentCampaign: onActivate,
    leaveCurrentCampaign: onLeaveCampaign,
    membershipStatus,
    membershipRole,
  } = useCampaignContext()
  const [memberQuery, setMemberQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState<CampaignCharacterStatus[]>(['ACTIVE', 'RETIRED', 'DEAD'])
  const [roleFilters, setRoleFilters] = useState<CampaignRole[]>(['SUPER_MASTER', 'MASTER', 'CO_MASTER', 'GIOCATORE'])

  const normalizedQuery = memberQuery.trim().toLowerCase()
  const approvedMembers = useMemo(() => members.filter((member) => member.memberStatus === 'APPROVED'), [members])
  const filteredMembers = useMemo(() => {
    return approvedMembers
      .filter((member) => {
        const displayName = memberNames[member.userId] || member.userId
        return (
          (normalizedQuery.length === 0 || displayName.toLowerCase().includes(normalizedQuery)) &&
          roleFilters.includes(member.role) &&
          Boolean(member.characterStatus && statusFilters.includes(member.characterStatus))
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
          {campaign.coverImageUrl && <img className="campaign-cover" src={campaign.coverImageUrl} alt="" />}
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
              <button type="button" className="campaign-outline-action campaign-outline-action--gold" onClick={onOpenManagement}>
                <Icon name="fa-solid fa-book-open" />
                <span>Gestione Campagna</span>
              </button>
            )}
            {membershipStatus === 'APPROVED' && (
              <button type="button" className="campaign-outline-action campaign-outline-action--violet" onClick={onOpenCharacters}>
                <Icon name="fa-solid fa-user" />
                <span>Gestione Personaggi</span>
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
                <div className="member-filter-toolbar">
                  <label className="member-filter-field">
                    <span className="muted">Cerca membro per nome</span>
                    <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="es. Sandro" />
                  </label>
                  <label className="member-filter-field">
                    <span className="muted">Stato</span>
                    <MultiSelect
                      className="member-filter-select"
                      panelClassName="member-filter-select-panel"
                      value={statusFilters}
                      options={STATUS_FILTER_OPTIONS}
                      optionLabel="label"
                      optionValue="value"
                      onChange={(event) => setStatusFilters(event.value as CampaignCharacterStatus[])}
                      placeholder="Tutti gli stati"
                      maxSelectedLabels={2}
                      selectedItemsLabel="{0} selezionati"
                      itemTemplate={(option: FilterOption<CampaignCharacterStatus>) => (
                        <span className="member-filter-option-copy">
                          <Icon name={option.icon} />
                          <span>{option.label}</span>
                        </span>
                      )}
                    />
                  </label>
                  <label className="member-filter-field">
                    <span className="muted">Grado</span>
                    <MultiSelect
                      className="member-filter-select"
                      panelClassName="member-filter-select-panel"
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
              {approvedMembers.length === 0 && <p className="muted">Nessun membro</p>}
              {approvedMembers.length > 0 && filteredMembers.length > 0 && (
                <div className="member-table-shell">
                  <div className="member-table-wrap">
                    <table className="member-table">
                      <thead>
                        <tr>
                          <th scope="col">Membro</th>
                          <th scope="col">Ruolo</th>
                          <th scope="col">Stato</th>
                          <th scope="col">Iscritto il</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => {
                          const roleMeta = roleBadgeMeta(member.role)
                          const stateMeta = characterStateMeta(member.characterStatus)
                          return (
                            <tr key={`${member.userId}-${member.role}-${member.memberStatus}`}>
                              <td>
                                <button type="button" className="member-table-link" onClick={() => onOpenMember(member)}>
                                  {memberNames[member.userId] || member.userId}
                                </button>
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
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {approvedMembers.length > 0 && filteredMembers.length === 0 && (
                <p className="muted">Nessun membro trovato con questo filtro.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
