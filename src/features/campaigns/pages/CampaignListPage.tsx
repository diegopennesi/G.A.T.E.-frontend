import { useMemo, useState } from 'react'
import { Skeleton } from 'primereact/skeleton'
import { useCampaignContext } from '../../../context'
import { DataTable, FieldLabel, Icon } from '../../../shared/components'
import { toMessage } from '../../../shared/utils'
import type { InviteAccessPreview } from '../../../types/ui'
import type { CampaignRole } from '../../../types/domain'
import { CampaignAccessBadge, CampaignOpenBadge, CampaignStatusBadge } from '../components'
import { useLoadingOverlayState } from '../../../services/loadingOverlay'

export function CampaignListPage() {
  const {
    campaigns,
    founderNames,
    missionAlertsByCampaign,
    pendingApplicationsByCampaignId,
    discoverCampaigns: onDiscover,
    openCampaign: onOpenCampaign,
    applyCampaign: onApplyCampaign,
    applyInviteAccess: onApplyInviteAccess,
    previewInviteAccess: onPreviewInviteAccess,
    openCreateCampaign: onCreateCampaign,
    canCreateCampaign,
    activeCampaignName,
  } = useCampaignContext()
  const [membershipFilter, setMembershipFilter] = useState<'all' | 'inside' | 'outside' | 'pending' | 'blocked'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | CampaignRole>('all')
  const [inviteValue, setInviteValue] = useState('')
  const [invitePreview, setInvitePreview] = useState<InviteAccessPreview | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const { pendingCount } = useLoadingOverlayState()
  const showLoadingSkeleton = pendingCount > 0 && campaigns.length === 0

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
          <button
            type="button"
            className="primary-btn"
            onClick={onCreateCampaign}
            disabled={!canCreateCampaign}
            title={canCreateCampaign ? 'Crea campagna' : 'Creazione campagne disabilitata per il tuo ruolo in questo realm'}
          >
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
            {showLoadingSkeleton ? (
              <Skeleton height="2.75rem" borderRadius="8px" />
            ) : (
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
            )}
          </label>
          <div className="campaign-invite-actions">
            {showLoadingSkeleton ? (
              <>
                <Skeleton width="8rem" height="2.75rem" borderRadius="8px" />
                <Skeleton width="10rem" height="2.75rem" borderRadius="8px" />
              </>
            ) : (
              <>
                <button type="button" className="secondary-btn" onClick={previewCampaignByCode} disabled={inviteBusy}>
                  <Icon name="fa-solid fa-magnifying-glass" />
                  Verifica
                </button>
                <button type="button" className="primary-btn" onClick={applyCampaignByCode} disabled={inviteBusy}>
                  <Icon name="fa-solid fa-paper-plane" />
                  Richiedi accesso
                </button>
              </>
            )}
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
          {showLoadingSkeleton ? (
            <Skeleton height="2.75rem" borderRadius="8px" />
          ) : (
            <select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value as typeof membershipFilter)}>
              <option value="all">Tutte</option>
              <option value="inside">Dentro</option>
              <option value="outside">Fuori</option>
              <option value="pending">In attesa</option>
              <option value="blocked">Bloccate</option>
            </select>
          )}
        </label>
        <label className="campaign-list-filter">
          <FieldLabel icon="fa-solid fa-user-shield" label="Ruolo" />
          {showLoadingSkeleton ? (
            <Skeleton height="2.75rem" borderRadius="8px" />
          ) : (
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
              <option value="all">Tutti i ruoli</option>
              <option value="GIOCATORE">Giocatore</option>
              <option value="CO_MASTER">Co-master</option>
              <option value="MASTER">Master</option>
              <option value="SUPER_MASTER">Super master</option>
            </select>
          )}
        </label>
      </div>
      {activeCampaignName && <p className="muted">Campagna attiva: <strong>{activeCampaignName}</strong></p>}
      {showLoadingSkeleton && (
        <div className="campaign-table-skeleton" aria-hidden="true">
          <Skeleton height="2.5rem" borderRadius="8px" />
          <Skeleton height="6rem" borderRadius="8px" />
          <Skeleton height="6rem" borderRadius="8px" />
          <Skeleton height="6rem" borderRadius="8px" />
        </div>
      )}
      {!showLoadingSkeleton && campaigns.length === 0 && <p className="muted">Nessuna campagna visibile. Premi "Cerca campagne".</p>}
      {!showLoadingSkeleton && campaigns.length > 0 && (
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
                      <span className="campaign-access-alert" title={`${pendingCount} richieste di accesso in attesa`}>
                        <Icon name="fa-solid fa-triangle-exclamation" />
                        <span>{pendingCount}</span>
                      </span>
                    )}
                    {missionAlertsByCampaign[item.id] === 0 && pendingCount === 0 && (
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
                        title={isDisabled ? 'Campagna disattivata: selezione non disponibile' : undefined}
                      >
                        Seleziona campagna
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
