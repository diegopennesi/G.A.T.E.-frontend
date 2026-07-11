import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { Icon } from '../../../shared/components'
import { POST_LOGIN_RELEASE_NOTES } from '../content/postLoginReleaseNotes'
import { CampaignAccessBadge } from '../components'
import type { CampaignCatalogEntry, CampaignDiscoverResponse, CampaignMemberStatus, PostLoginCampaignEntryResponse } from '../../../types/domain'
import { catalogEntryLabel, gameSystemIconName } from '../../../shared/utils'

type PostLoginLandingPageProps = {
  currentUserId: string
  profileName: string
  realmCode: string
  realmName: string
  canCreateCampaign: boolean
  campaigns: PostLoginCampaignEntryResponse[]
  availableGameSystems: CampaignCatalogEntry[]
  loading: boolean
  busy: boolean
  error: string
  onRefresh: () => void
  onEnterCampaign: (campaignId: string) => void
  onApplyToCampaign: (campaignId: string) => void
  onCreateCampaign: () => void
}

type LandingOption = {
  id: string
  title: string
  systemLabel: string
  systemIcon: string
  badgeItem: CampaignDiscoverResponse
  action: 'enter' | 'apply'
  autoJoinEnabled: boolean
  createdAt: string
}

function buildReleaseNotesKey(userId: string) {
  return `gate_release_notes_hidden:${userId}:${POST_LOGIN_RELEASE_NOTES.version}`
}

function clearOldReleaseNotesKeys(userId: string) {
  const prefix = `gate_release_notes_hidden:${userId}:`
  const activeKey = buildReleaseNotesKey(userId)
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith(prefix) || key === activeKey) continue
    localStorage.removeItem(key)
  }
}

function isApprovedStatus(status: CampaignMemberStatus | null) {
  return status === 'APPROVED'
}

function isRequestableCampaign(campaign: PostLoginCampaignEntryResponse) {
  return campaign.isActive && campaign.isVisible && campaign.isOpen && !isApprovedStatus(campaign.membershipStatus)
}

function isAccessibleCampaign(campaign: PostLoginCampaignEntryResponse) {
  return campaign.isActive && isApprovedStatus(campaign.membershipStatus)
}

function toLandingOption(
  campaign: PostLoginCampaignEntryResponse,
  availableGameSystems: CampaignCatalogEntry[],
): LandingOption {
  const systemLabel = catalogEntryLabel(availableGameSystems, campaign.gameSystem) || campaign.gameSystem?.trim() || 'Sistema'

  if (isApprovedStatus(campaign.membershipStatus)) {
    return {
      id: campaign.id,
      title: campaign.name,
      systemLabel,
      systemIcon: gameSystemIconName(campaign.gameSystem),
      badgeItem: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        summary: campaign.summary,
        coverImageUrl: null,
        founderId: campaign.founderId,
        isOpen: campaign.isOpen,
        isActive: campaign.isActive,
        isSearchable: campaign.isVisible,
        autoJoinEnabled: campaign.autoJoinEnabled,
        gameSystem: campaign.gameSystem,
        createdAt: campaign.createdAt,
        membershipStatus: campaign.membershipStatus,
        membershipRole: campaign.membershipRole,
        moderationReason: campaign.moderationReason,
      },
      action: 'enter',
      autoJoinEnabled: campaign.autoJoinEnabled,
      createdAt: campaign.createdAt,
    }
  }

  return {
    id: campaign.id,
    title: campaign.name,
    systemLabel,
    systemIcon: gameSystemIconName(campaign.gameSystem),
    badgeItem: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      summary: campaign.summary,
      coverImageUrl: null,
      founderId: campaign.founderId,
      isOpen: campaign.isOpen,
      isActive: campaign.isActive,
      isSearchable: campaign.isVisible,
      autoJoinEnabled: campaign.autoJoinEnabled,
      gameSystem: campaign.gameSystem,
      createdAt: campaign.createdAt,
      membershipStatus: campaign.membershipStatus,
      membershipRole: campaign.membershipRole,
      moderationReason: campaign.moderationReason,
    },
    action: 'apply',
    autoJoinEnabled: campaign.autoJoinEnabled,
    createdAt: campaign.createdAt,
  }
}

function compareCampaigns(a: PostLoginCampaignEntryResponse, b: PostLoginCampaignEntryResponse) {
  const aApproved = isApprovedStatus(a.membershipStatus) ? 1 : 0
  const bApproved = isApprovedStatus(b.membershipStatus) ? 1 : 0
  if (aApproved !== bApproved) return bApproved - aApproved
  const dateDelta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  if (dateDelta !== 0 && Number.isFinite(dateDelta)) return dateDelta
  return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
}

function renderCampaignOption(option: LandingOption) {
  return (
    <div className="post-login-option">
      <div className="post-login-option-inline">
        <p className="data-table-title">{option.title}</p>
        <span className="campaign-system-inline post-login-system-inline">
          <Icon name={option.systemIcon} />
          <span>{option.systemLabel}</span>
        </span>
        <CampaignAccessBadge item={option.badgeItem} />
      </div>
    </div>
  )
}

function renderSelectedCampaignValue(option: LandingOption | null, placeholder: string) {
  if (!option) {
    return <span className="post-login-dropdown-placeholder">{placeholder}</span>
  }
  return renderCampaignOption(option)
}

export function PostLoginLandingPage({
  currentUserId,
  profileName,
  realmCode,
  realmName,
  canCreateCampaign,
  campaigns,
  availableGameSystems,
  loading,
  busy,
  error,
  onRefresh,
  onEnterCampaign,
  onApplyToCampaign,
  onCreateCampaign,
}: PostLoginLandingPageProps) {
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false)
  const [hideReleaseNotes, setHideReleaseNotes] = useState(false)
  const [selectedUnifiedCampaignId, setSelectedUnifiedCampaignId] = useState<string>('')
  const [selectedMemberCampaignId, setSelectedMemberCampaignId] = useState<string>('')
  const [selectedRequestCampaignId, setSelectedRequestCampaignId] = useState<string>('')

  useEffect(() => {
    if (!currentUserId.trim()) return
    clearOldReleaseNotesKeys(currentUserId)
    setHideReleaseNotes(false)
    setIsReleaseNotesOpen(localStorage.getItem(buildReleaseNotesKey(currentUserId)) !== '1')
  }, [currentUserId])

  const closeReleaseNotes = () => {
    if (hideReleaseNotes && currentUserId.trim()) {
      localStorage.setItem(buildReleaseNotesKey(currentUserId), '1')
    }
    setIsReleaseNotesOpen(false)
  }

  const accessibleCampaigns = useMemo(
    () => campaigns.filter(isAccessibleCampaign).sort(compareCampaigns),
    [campaigns],
  )

  const requestableCampaigns = useMemo(
    () => campaigns.filter(isRequestableCampaign).sort(compareCampaigns),
    [campaigns],
  )

  const unifiedCampaigns = useMemo(() => {
    const seen = new Set<string>()
    return campaigns
      .filter((campaign) => isAccessibleCampaign(campaign) || isRequestableCampaign(campaign))
      .sort(compareCampaigns)
      .filter((campaign) => {
        if (seen.has(campaign.id)) return false
        seen.add(campaign.id)
        return true
      })
  }, [campaigns])

  const accessibleOptions = useMemo(
    () => accessibleCampaigns.map((campaign) => toLandingOption(campaign, availableGameSystems)),
    [accessibleCampaigns, availableGameSystems],
  )
  const requestableOptions = useMemo(
    () => requestableCampaigns.map((campaign) => toLandingOption(campaign, availableGameSystems)),
    [requestableCampaigns, availableGameSystems],
  )
  const unifiedOptions = useMemo(
    () => unifiedCampaigns.map((campaign) => toLandingOption(campaign, availableGameSystems)),
    [availableGameSystems, unifiedCampaigns],
  )

  useEffect(() => {
    if (!canCreateCampaign) return
    if (!unifiedOptions.some((item) => item.id === selectedUnifiedCampaignId)) {
      setSelectedUnifiedCampaignId(unifiedOptions[0]?.id || '')
    }
  }, [canCreateCampaign, selectedUnifiedCampaignId, unifiedOptions])

  useEffect(() => {
    if (canCreateCampaign) return
    if (!accessibleOptions.some((item) => item.id === selectedMemberCampaignId)) {
      setSelectedMemberCampaignId(accessibleOptions[0]?.id || '')
    }
    if (!requestableOptions.some((item) => item.id === selectedRequestCampaignId)) {
      setSelectedRequestCampaignId(requestableOptions[0]?.id || '')
    }
  }, [accessibleOptions, canCreateCampaign, requestableOptions, selectedMemberCampaignId, selectedRequestCampaignId])

  const selectedUnifiedOption = unifiedOptions.find((item) => item.id === selectedUnifiedCampaignId) || null
  const selectedMemberOption = accessibleOptions.find((item) => item.id === selectedMemberCampaignId) || null
  const selectedRequestOption = requestableOptions.find((item) => item.id === selectedRequestCampaignId) || null

  const primaryActionLabel = selectedUnifiedOption?.action === 'enter'
    ? 'Entra nella campagna'
    : selectedUnifiedOption?.autoJoinEnabled
      ? 'Entra con auto adesione'
      : 'Richiedi accesso'

  return (
    <section className="post-login-landing">
      <Dialog
        header={null}
        visible={isReleaseNotesOpen}
        modal
        className="release-notes-dialog"
        closable={false}
        draggable={false}
        resizable={false}
        dismissableMask={false}
        onHide={() => setIsReleaseNotesOpen(false)}
        footer={(
          <div className="release-notes-footer">
            <label className="release-notes-checkbox">
              <Checkbox
                inputId="release-notes-hide"
                checked={hideReleaseNotes}
                onChange={(event) => setHideReleaseNotes(Boolean(event.checked))}
              />
              <span>Non mostrare piu</span>
            </label>
            <button type="button" className="primary-btn" onClick={closeReleaseNotes}>
              Chiudi
            </button>
          </div>
        )}
      >
        <div className="release-notes-body">
          <div className="release-notes-hero">
            <div>
              <p className="release-notes-eyebrow">{POST_LOGIN_RELEASE_NOTES.eyebrow}</p>
              <h3 className="release-notes-title">{POST_LOGIN_RELEASE_NOTES.title}</h3>
              <p className="release-notes-summary">{POST_LOGIN_RELEASE_NOTES.summary}</p>
            </div>
            <span className="release-notes-version">v{POST_LOGIN_RELEASE_NOTES.version}</span>
          </div>
          <div className="release-notes-list">
            {POST_LOGIN_RELEASE_NOTES.sections.map((section) => (
              <section key={section.title} className="release-notes-section">
                <h4 className="release-notes-section-title">{section.title}</h4>
                <ul className="release-notes-points">
                  {section.items.map((item) => (
                    <li key={item.label} className="release-notes-point">
                      <span className="release-notes-point-label">{item.label}</span>
                      {item.details && item.details.length > 0 && (
                        <ul className="release-notes-subpoints">
                          {item.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </Dialog>

      <div className="panel post-login-landing-panel">
        <div className="post-login-landing-head">
          <div>
            <p className="menu-group-label">Realm di ingresso</p>
            <h2>{realmName}</h2>
            <p className="post-login-landing-copy">
              Accesso eseguito come <strong>{profileName}</strong> nel realm <strong>{realmCode}</strong>.
            </p>
          </div>
          <button type="button" className="secondary-btn" disabled={busy || loading} onClick={onRefresh}>
            Aggiorna elenco
          </button>
        </div>

        {error && <div className="system-inline-alert">{error}</div>}

        {loading ? (
          <div className="post-login-empty-state">
            <p>Caricamento campagne disponibili...</p>
          </div>
        ) : canCreateCampaign ? (
          <div className="post-login-grid">
            <section className="post-login-section">
              <div className="post-login-section-head">
                <div>
                  <h3>Campagne del realm</h3>
                  <p>Trovi qui sia le campagne gia attive per il tuo profilo, sia quelle aperte a cui puoi chiedere accesso.</p>
                </div>
              </div>

              <Dropdown
                className="post-login-dropdown"
                panelClassName="post-login-dropdown-panel"
                options={unifiedOptions}
                optionLabel="title"
                optionValue="id"
                value={selectedUnifiedCampaignId}
                onChange={(event: DropdownChangeEvent) => setSelectedUnifiedCampaignId(String(event.value || ''))}
                filter
                filterBy="title,systemLabel,statusLabel"
                itemTemplate={renderCampaignOption}
                valueTemplate={(option) => renderSelectedCampaignValue(option as LandingOption | null, 'Seleziona campagna')}
                placeholder="Seleziona campagna"
                emptyMessage="Nessuna campagna disponibile in questo realm."
              />

              <div className="post-login-actions">
                <button
                  type="button"
                  className="primary-btn"
                  disabled={busy || !selectedUnifiedOption}
                  onClick={() => {
                    if (!selectedUnifiedOption) return
                    if (selectedUnifiedOption.action === 'enter') {
                      onEnterCampaign(selectedUnifiedOption.id)
                      return
                    }
                    onApplyToCampaign(selectedUnifiedOption.id)
                  }}
                >
                  {primaryActionLabel}
                </button>
              </div>
            </section>

            <aside className="post-login-side-card">
              <div>
                <p className="menu-group-label">Nuova campagna</p>
                <h3>Crea una nuova campagna</h3>
                <p>
                  Hai i privilegi per aprire una campagna nel realm corrente. Le nuove richieste potranno poi seguire
                  approvazione manuale o auto adesione.
                </p>
              </div>
              <button type="button" className="primary-btn" disabled={busy} onClick={onCreateCampaign}>
                Crea nuova campagna
              </button>
            </aside>
          </div>
        ) : (
          <div className="post-login-grid two-columns">
            <section className="post-login-section">
              <div className="post-login-section-head">
                <div>
                  <h3>Le tue campagne attive</h3>
                  <p>Puoi entrare solo nelle campagne dove risulti gia approvato come giocatore o master.</p>
                </div>
              </div>

              <Dropdown
                className="post-login-dropdown"
                panelClassName="post-login-dropdown-panel"
                options={accessibleOptions}
                optionLabel="title"
                optionValue="id"
                value={selectedMemberCampaignId}
                onChange={(event: DropdownChangeEvent) => setSelectedMemberCampaignId(String(event.value || ''))}
                filter
                filterBy="title,systemLabel,statusLabel"
                itemTemplate={renderCampaignOption}
                valueTemplate={(option) => renderSelectedCampaignValue(option as LandingOption | null, 'Seleziona campagna attiva')}
                placeholder="Seleziona campagna attiva"
                emptyMessage="Non hai ancora campagne attive in questo realm."
              />

              <div className="post-login-actions">
                <button
                  type="button"
                  className="primary-btn"
                  disabled={busy || !selectedMemberOption}
                  onClick={() => selectedMemberOption && onEnterCampaign(selectedMemberOption.id)}
                >
                  Entra nella campagna
                </button>
              </div>
            </section>

            <section className="post-login-section">
              <div className="post-login-section-head">
                <div>
                  <h3>Campagne aperte del realm</h3>
                  <p>Qui puoi inviare una richiesta di accesso. Se la campagna usa auto adesione, l'ingresso sara immediato.</p>
                </div>
              </div>

              <Dropdown
                className="post-login-dropdown"
                panelClassName="post-login-dropdown-panel"
                options={requestableOptions}
                optionLabel="title"
                optionValue="id"
                value={selectedRequestCampaignId}
                onChange={(event: DropdownChangeEvent) => setSelectedRequestCampaignId(String(event.value || ''))}
                filter
                filterBy="title,systemLabel,statusLabel"
                itemTemplate={renderCampaignOption}
                valueTemplate={(option) => renderSelectedCampaignValue(option as LandingOption | null, 'Seleziona campagna disponibile')}
                placeholder="Seleziona campagna disponibile"
                emptyMessage="Non ci sono campagne aperte e visibili da richiedere."
              />

              <div className="post-login-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy || !selectedRequestOption}
                  onClick={() => selectedRequestOption && onApplyToCampaign(selectedRequestOption.id)}
                >
                  {selectedRequestOption?.autoJoinEnabled ? 'Entra con auto adesione' : 'Richiedi accesso'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  )
}
