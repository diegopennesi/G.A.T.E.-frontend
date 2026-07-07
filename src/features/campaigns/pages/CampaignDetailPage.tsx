import { useState } from 'react'
import { Icon, InfoBlock } from '../../../shared/components'
import { campaignModuleIconName, campaignModuleTitle, campaignToneLabel, catalogEntryDescription, catalogEntryLabel } from '../../../shared/utils'
import type { CampaignCatalogEntry, CampaignMemberStatus, CampaignMembershipResponse, CampaignResponse, CampaignRole } from '../../../types/domain'
import { CampaignStatusBadge } from '../components'

export function CampaignDetailPage({
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
    'APPROVED', 'PENDING', 'BLOCKED', 'BANNED', 'REJECTED',
  ])
  const [roleFilters, setRoleFilters] = useState<CampaignRole[]>([
    'GIOCATORE', 'CO_MASTER', 'MASTER', 'SUPER_MASTER',
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
