import { useEffect, useMemo, useState } from 'react'
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

type CampaignActionButtonConfig = {
  label: string
  icon: string
}

function buildReleaseNotesKey(userId: string) {
  return `gate_release_notes_hidden:${userId}:${POST_LOGIN_RELEASE_NOTES.version}`
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
  return (
    <div className="post-login-option post-login-option--selected">
      <div className="post-login-option-inline post-login-option-inline--selected">
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

function getCampaignActionButtonConfig(option: LandingOption | null): CampaignActionButtonConfig | null {
  if (!option) return null
  if (option.badgeItem.membershipStatus === 'APPROVED') {
    return { label: 'Entra nella campagna', icon: 'lucide:LogIn' }
  }
  if (option.autoJoinEnabled) {
    return { label: 'Entra con auto-adesione', icon: 'lucide:Users' }
  }
  return { label: 'Richiedi accesso', icon: 'lucide:Shield' }
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
  const releaseNotesStorageKey = currentUserId.trim() ? buildReleaseNotesKey(currentUserId) : ''
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(
    () => Boolean(releaseNotesStorageKey && localStorage.getItem(releaseNotesStorageKey) !== '1'),
  )
  const [hideReleaseNotes, setHideReleaseNotes] = useState(
    () => Boolean(releaseNotesStorageKey && localStorage.getItem(releaseNotesStorageKey) === '1'),
  )
  const [selectedUnifiedCampaignId, setSelectedUnifiedCampaignId] = useState<string>('')
  const [selectedMemberCampaignId, setSelectedMemberCampaignId] = useState<string>('')
  const [selectedRequestCampaignId, setSelectedRequestCampaignId] = useState<string>('')

  useEffect(() => {
    if (!currentUserId.trim()) return
    const isHidden = releaseNotesStorageKey ? localStorage.getItem(releaseNotesStorageKey) === '1' : false
    setHideReleaseNotes(isHidden)
    setIsReleaseNotesOpen(!isHidden)
  }, [currentUserId, releaseNotesStorageKey])

  const closeReleaseNotes = () => {
    setIsReleaseNotesOpen(false)
  }

  const setReleaseNotesHidden = (hidden: boolean) => {
    setHideReleaseNotes(hidden)
    if (!currentUserId.trim()) return
    if (hidden) {
      localStorage.setItem(releaseNotesStorageKey, '1')
      return
    }
    localStorage.removeItem(releaseNotesStorageKey)
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
  const isConstructionState = !canCreateCampaign && accessibleOptions.length === 0 && requestableOptions.length === 0
  const unifiedActionButton = getCampaignActionButtonConfig(selectedUnifiedOption)
  const memberActionButton = getCampaignActionButtonConfig(selectedMemberOption)
  const requestActionButton = getCampaignActionButtonConfig(selectedRequestOption)

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
        onHide={closeReleaseNotes}
        footer={(
          <div className="release-notes-footer">
            <label className="release-notes-checkbox">
              <input
                id="release-notes-hide"
                type="checkbox"
                checked={hideReleaseNotes}
                onChange={(event) => setReleaseNotesHidden(event.target.checked)}
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
            <p className="menu-group-label">Reame di ingresso</p>
            <h2>{realmName}</h2>
            <p className="post-login-landing-copy">
              Accesso eseguito come <strong>{profileName}</strong> nel realm <strong>{realmName}</strong>
              {realmCode.trim() ? <span> ({realmCode})</span> : null}.
            </p>
          </div>
          <button type="button" className="secondary-btn" disabled={busy || loading} onClick={onRefresh}>
            <Icon name="lucide:RotateCcw" />
            Aggiorna elenco
          </button>
        </div>

        {error && <div className="system-inline-alert">{error}</div>}

        {loading ? (
          <div className="post-login-empty-state">
            <p>Caricamento campagne disponibili...</p>
          </div>
        ) : isConstructionState ? (
          <div className="post-login-construction-state">
            <div className="post-login-construction-copy">
              <p className="menu-group-label"></p>
              <h3>Questo reame non ha ancora campagne disponibili</h3>
              <p>
                Al momento non sei membro di nessuna campagna visibile o nascosta, non esistono campagne attive e non
                hai i permessi per creare una nuova campagna.
                Riprova piu tardi o attendi di ricevere sul tuo profilo autorizzazione alla creazione di nuove campagne
              </p>
            </div>
            <div className="post-login-construction-actions">
              <button type="button" className="primary-btn" disabled={busy || loading} onClick={onRefresh}>
                <Icon name="lucide:RotateCcw" />
                Aggiorna stato
              </button>
            </div>
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
                className="surface-field post-login-dropdown"
                panelClassName="surface-field-panel post-login-dropdown-panel"
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
                  disabled={busy || !selectedUnifiedOption || !unifiedActionButton}
                  onClick={() => {
                    if (!selectedUnifiedOption) return
                    if (selectedUnifiedOption.action === 'enter') {
                      onEnterCampaign(selectedUnifiedOption.id)
                      return
                    }
                    onApplyToCampaign(selectedUnifiedOption.id)
                  }}
                >
                  <Icon name={unifiedActionButton?.icon || 'lucide:LogIn'} />
                  <span>{unifiedActionButton?.label || 'Seleziona campagna'}</span>
                </button>
              </div>
            </section>

            <aside className="post-login-side-card">
              <div>
                <p className="menu-group-label">Nuova campagna</p>
                <h3>Crea una nuova campagna</h3>
                <p>
                  Apri una nuova campagna, racconta la tua storia o crea un tavolo virtuale dove coordinare te
                  ed il tuo gruppo!
                </p>
              </div>
              <button type="button" className="primary-btn" disabled={busy} onClick={onCreateCampaign}>
                <Icon name="lucide:CirclePlus" />
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
                  <p>Fai nuovamente accesso ad una campagna dove sei giá membro.</p>
                </div>
              </div>

              <Dropdown
                className="surface-field post-login-dropdown"
                panelClassName="surface-field-panel post-login-dropdown-panel"
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
                  disabled={busy || !selectedMemberOption || !memberActionButton}
                  onClick={() => selectedMemberOption && onEnterCampaign(selectedMemberOption.id)}
                >
                  <Icon name={memberActionButton?.icon || 'lucide:LogIn'} />
                  <span>{memberActionButton?.label || 'Entra nella campagna'}</span>
                </button>
              </div>
            </section>

            <section className="post-login-section">
              <div className="post-login-section-head">
                <div>
                  <h3>Campagne aperte del realm</h3>
                  Richiedi accesso ad una campagna gia esistente, entra in uno dei vari mondi disponibili
                  ed inizia subito la tua avventura!
                </div>
              </div>

              <Dropdown
                className="surface-field post-login-dropdown"
                panelClassName="surface-field-panel post-login-dropdown-panel"
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
                  className="primary-btn"
                  disabled={busy || !selectedRequestOption || !requestActionButton}
                  onClick={() => selectedRequestOption && onApplyToCampaign(selectedRequestOption.id)}
                >
                  <Icon name={requestActionButton?.icon || 'lucide:Shield'} />
                  <span>{requestActionButton?.label || 'Richiedi accesso'}</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  )
}
