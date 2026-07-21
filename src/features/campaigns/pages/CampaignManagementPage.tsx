import { useEffect, useMemo, useState } from 'react'
import { useCampaignContext } from '../../../context'
import { ActionStack, BadgeGroup, FieldLabel, Icon, KeyValueGrid, MobileDataCard, ResponsiveDataList } from '../../../shared/components'
import {
  CAMPAIGN_MODULE_HIDDEN_CODES,
  CAMPAIGN_MODULE_UNAVAILABLE_HINT,
  CAMPAIGN_TONE_OPTIONS,
  catalogEntryDescription,
  catalogEntryLabel,
  campaignModuleDescription,
  campaignModuleUnavailable,
} from '../../../shared/utils'
import type {
  CampaignCatalogEntry,
  CampaignMissionRuleResponse,
  CreateInviteTokenRequest,
  InviteTokenResponse,
  UpdateCampaignMissionRuleRequest,
} from '../../../types/domain'

type CampaignToggleRow = {
  key: string
  title: string
  description: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
}

type MissionRuleDraft = {
  enabled: boolean
  configJson: Record<string, unknown>
}

function missionRuleStatusLabel(rule: CampaignMissionRuleResponse) {
  if (!rule.globallyActive) return 'Globale off'
  return rule.effectiveEnabled ? 'Attiva' : 'Disattiva'
}

function missionRuleConfigString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function missionRuleConfigNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function CampaignToggleSettingsTable({
  title,
  description,
  rows,
  availableModules,
  selectedModules,
  onToggle,
}: {
  title: string
  description: string
  rows?: CampaignToggleRow[]
  availableModules?: CampaignCatalogEntry[]
  selectedModules?: string[]
  onToggle?: (moduleCode: string) => void
}) {
  const visibleModules = availableModules?.filter((module) => !CAMPAIGN_MODULE_HIDDEN_CODES.has(module.code)) || []

  const renderRowForSetting = (setting: CampaignToggleRow) => (
    <tr key={setting.key}>
      <td>
        <div className="data-table-primary">
          <p className="data-table-title">{setting.title}</p>
        </div>
      </td>
      <td className="data-table-secondary">{setting.description}</td>
      <td>
        <span className={`status ${setting.active ? 'status-success' : 'status-neutral'}`}>
          {setting.active ? setting.activeLabel : setting.inactiveLabel}
        </span>
      </td>
      <td>
        <label className="switch" aria-label={`${setting.title} ${setting.active ? 'attivo' : 'disattivo'}`}>
          <input type="checkbox" checked={setting.active} onChange={setting.onToggle} />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
        </label>
      </td>
    </tr>
  )

  const renderMobileCardForSetting = (setting: CampaignToggleRow) => (
    <MobileDataCard
      title={setting.title}
      badges={
        <BadgeGroup>
          <span className={`status ${setting.active ? 'status-success' : 'status-neutral'}`}>
            {setting.active ? setting.activeLabel : setting.inactiveLabel}
          </span>
        </BadgeGroup>
      }
      actions={
        <ActionStack>
          <label className="switch w-fit" aria-label={`${setting.title} ${setting.active ? 'attivo' : 'disattivo'}`}>
            <input type="checkbox" checked={setting.active} onChange={setting.onToggle} />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </label>
        </ActionStack>
      }
    >
      <KeyValueGrid items={[{ key: setting.key, label: 'Descrizione', value: setting.description }]} />
    </MobileDataCard>
  )

  const renderRowForModule = (module: CampaignCatalogEntry) => {
    const enabled = selectedModules?.includes(module.code) || false
    const unavailable = campaignModuleUnavailable(module)
    const moduleTitle = module.label || module.code
    return (
      <tr key={module.code}>
        <td>
          <div className="data-table-primary">
            <p className="data-table-title">{moduleTitle}</p>
            <p className="data-table-meta">{module.code}</p>
          </div>
        </td>
        <td className="data-table-secondary">{campaignModuleDescription(module)}</td>
        <td>
          <span className={`status ${enabled && !unavailable ? 'status-success' : 'status-neutral'}`}>
            {unavailable ? 'Non disponibile' : enabled ? 'Attivo' : 'Disattivo'}
          </span>
        </td>
        <td>
          <label
            className={`switch ${unavailable ? 'is-disabled' : ''}`}
            aria-label={`${moduleTitle} ${unavailable ? CAMPAIGN_MODULE_UNAVAILABLE_HINT : enabled ? 'attivo' : 'disattivo'}`}
            title={unavailable ? CAMPAIGN_MODULE_UNAVAILABLE_HINT : undefined}
          >
            <input type="checkbox" checked={enabled && !unavailable} disabled={unavailable} onChange={() => onToggle?.(module.code)} />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </label>
        </td>
      </tr>
    )
  }

  const renderMobileCardForModule = (module: CampaignCatalogEntry) => {
    const enabled = selectedModules?.includes(module.code) || false
    const unavailable = campaignModuleUnavailable(module)
    const moduleTitle = module.label || module.code
    return (
      <MobileDataCard
        title={moduleTitle}
        subtitle={module.code}
        badges={
          <BadgeGroup>
            <span className={`status ${enabled && !unavailable ? 'status-success' : 'status-neutral'}`}>
              {unavailable ? 'Non disponibile' : enabled ? 'Attivo' : 'Disattivo'}
            </span>
          </BadgeGroup>
        }
        actions={
          <ActionStack>
            <label
              className={`switch w-fit ${unavailable ? 'is-disabled' : ''}`}
              aria-label={`${moduleTitle} ${unavailable ? CAMPAIGN_MODULE_UNAVAILABLE_HINT : enabled ? 'attivo' : 'disattivo'}`}
              title={unavailable ? CAMPAIGN_MODULE_UNAVAILABLE_HINT : undefined}
            >
              <input type="checkbox" checked={enabled && !unavailable} disabled={unavailable} onChange={() => onToggle?.(module.code)} />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </label>
          </ActionStack>
        }
      >
        <KeyValueGrid items={[{ key: module.code, label: 'Descrizione', value: campaignModuleDescription(module) }]} />
      </MobileDataCard>
    )
  }

  return (
    <div className="campaign-toggle-table-block">
      <div className="row-between">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="muted">{description}</p>
        </div>
        {visibleModules.length > 0 ? (
          <span className="readonly-chip">
            {visibleModules.filter((module) => selectedModules?.includes(module.code)).length}/{visibleModules.length} attivi
          </span>
        ) : (
          <span className="readonly-chip">{rows?.filter((row) => row.active).length || 0}/{rows?.length || 0} attivi</span>
        )}
      </div>
      {rows && rows.length > 0 ? (
        <ResponsiveDataList
          desktopClassName="campaign-settings-table"
          columns={[
            { key: 'setting', label: 'Impostazione' },
            { key: 'description', label: 'Descrizione' },
            { key: 'state', label: 'Stato' },
            { key: 'toggle', label: 'Attivo' },
          ]}
          rows={rows}
          getRowKey={(row) => row.key}
          emptyMessage="Nessuna impostazione disponibile."
          renderDesktopRow={renderRowForSetting}
          renderMobileCard={renderMobileCardForSetting}
        />
      ) : visibleModules.length > 0 ? (
        <ResponsiveDataList
          desktopClassName="campaign-modules-table"
          columns={[
            { key: 'module', label: 'Modulo' },
            { key: 'description', label: 'Descrizione' },
            { key: 'state', label: 'Stato' },
            { key: 'toggle', label: 'Attivo' },
          ]}
          rows={visibleModules}
          getRowKey={(module) => module.code}
          emptyMessage="Lista addon non ancora disponibile."
          renderDesktopRow={renderRowForModule}
          renderMobileCard={renderMobileCardForModule}
        />
      ) : (
        <p className="muted">Lista addon non ancora disponibile.</p>
      )}
    </div>
  )
}

export function CampaignManagementPage() {
  const {
    campaign,
    availableModules,
    availableGameSystems,
    permissions,
    saveCampaign: onSave,
    refreshPermissionChecklist: onRefreshPermissions,
    transferCampaignOwnership: onTransfer,
    createCampaignInviteToken: onCreateInviteToken,
    currentUserId,
    leaveCurrentCampaign: onLeave,
  } = useCampaignContext()
  const [newOwnerUserId, setNewOwnerUserId] = useState('')
  const [inviteCopyFeedback, setInviteCopyFeedback] = useState('')
  const [inviteTokenAutoJoin, setInviteTokenAutoJoin] = useState(false)
  const [inviteTokenExpiresAt, setInviteTokenExpiresAt] = useState('')
  const [inviteTokenMaxUses, setInviteTokenMaxUses] = useState('')
  const [inviteTokenResult, setInviteTokenResult] = useState<InviteTokenResponse | null>(null)
  const [inviteTokenFeedback, setInviteTokenFeedback] = useState('')
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
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(campaign?.autoJoinEnabled ?? false)
  const [selectedModules, setSelectedModules] = useState<string[]>(campaign?.allowedModules || [])
  const [missionRuleDrafts, setMissionRuleDrafts] = useState<Record<string, MissionRuleDraft>>({})

  const availableModuleCodes = useMemo(
    () =>
      availableModules
        .filter((module) => !CAMPAIGN_MODULE_HIDDEN_CODES.has(module.code) && !campaignModuleUnavailable(module))
        .map((module) => module.code),
    [availableModules],
  )
  const selectedAvailableModules =
    availableModuleCodes.length === 0
      ? []
      : selectedModules.filter((moduleCode) => availableModuleCodes.includes(moduleCode))

  const permissionChecklist: Array<{ action: string; label: string; description: string }> = [
    { action: 'APPROVE_OR_REJECT_APPLICATIONS', label: 'Gestire accessi', description: 'Approva o rifiuta le richieste pending.' },
    { action: 'TRANSFER_OWNERSHIP', label: 'Trasferire proprietà', description: 'Cedere la leadership della campagna.' },
    { action: 'MANAGE_CAMPAIGN_SETTINGS', label: 'Modificare impostazioni', description: 'Aggiornare regole, requisiti e visibilità.' },
  ]

  const campaignVisibilityRows: CampaignToggleRow[] = [
    {
      key: 'open',
      title: 'Campagna aperta',
      description: "Permette richiesta di accesso dall'elenco campagne.",
      active: isOpen,
      activeLabel: 'Aperta',
      inactiveLabel: 'Privata',
      onToggle: () => setIsOpen((prev) => !prev),
    },
    {
      key: 'searchable',
      title: 'Visibile nella ricerca',
      description: 'La campagna può essere trovata nella ricerca pubblica.',
      active: isSearchable,
      activeLabel: 'Ricercabile',
      inactiveLabel: 'Nascosta',
      onToggle: () => setIsSearchable((prev) => !prev),
    },
    {
      key: 'auto-join',
      title: 'Auto join',
      description: "Approva automaticamente l'accesso da app quando la campagna e aperta e visibile.",
      active: autoJoinEnabled,
      activeLabel: 'Automatico',
      inactiveLabel: 'Manuale',
      onToggle: () => setAutoJoinEnabled((prev) => !prev),
    },
  ]

  useEffect(() => {
    if (!campaign) return
    setName(campaign.name || '')
    setDescription(campaign.description || '')
    setSummary(campaign.summary || '')
    setSetting(campaign.setting || '')
    setTone(campaign.tone || '')
    setRules(campaign.rules || '')
    setRequirements(campaign.requirements || '')
    setCoverImageUrl(campaign.coverImageUrl || '')
    setIsOpen(campaign.isOpen ?? true)
    setIsSearchable(campaign.isSearchable ?? true)
    setAutoJoinEnabled(campaign.autoJoinEnabled ?? false)
    setSelectedModules(campaign.allowedModules || [])
    setMissionRuleDrafts(
      Object.fromEntries(
        (campaign.missionRules || []).map((rule) => [
          rule.code,
          {
            enabled: rule.campaignEnabled,
            configJson: { ...(rule.configJson || {}) },
          },
        ]),
      ),
    )
    if (permissions.length === 0) {
      onRefreshPermissions()
    }
  }, [campaign?.id, permissions.length])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode)
        ? prev.filter((item) => item !== moduleCode)
        : [...prev.filter((item) => availableModuleCodes.includes(item)), moduleCode],
    )
  }

  const updateMissionRuleDraft = (ruleCode: string, updater: (draft: MissionRuleDraft) => MissionRuleDraft) => {
    const baseRule = campaign?.missionRules?.find((rule) => rule.code === ruleCode)
    setMissionRuleDrafts((prev) => {
      const current = prev[ruleCode] || {
        enabled: baseRule?.campaignEnabled || false,
        configJson: { ...(baseRule?.configJson || {}) },
      }
      return { ...prev, [ruleCode]: updater(current) }
    })
  }

  const missionRuleUpdates: UpdateCampaignMissionRuleRequest[] = (campaign?.missionRules || []).map((rule) => {
    const draft = missionRuleDrafts[rule.code] || { enabled: rule.campaignEnabled, configJson: rule.configJson || {} }
    return {
      code: rule.code,
      enabled: draft.enabled,
      configJson: draft.configJson,
    }
  })

  const copyInviteCode = async () => {
    const value = campaign?.inviteCode?.trim()
    if (!value) {
      setInviteCopyFeedback('Codice non disponibile.')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setInviteCopyFeedback('Codice copiato.')
    } catch {
      setInviteCopyFeedback('Copia non disponibile.')
    }
  }

  const createInviteToken = async () => {
    const expiresAt = inviteTokenExpiresAt.trim()
    const maxUsesValue = inviteTokenMaxUses.trim()
    const maxUses =
      maxUsesValue.length === 0 ? null : Number.isFinite(Number(maxUsesValue)) && Number(maxUsesValue) > 0 ? Number(maxUsesValue) : NaN
    if (Number.isNaN(maxUses)) {
      setInviteTokenFeedback('Max utilizzi non valido.')
      return
    }
    setInviteTokenFeedback('')
    const payload: CreateInviteTokenRequest = {
      capabilities: inviteTokenAutoJoin ? ['AUTOJOIN'] : [],
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      maxUses: maxUses === null ? null : maxUses,
    }
    const created = await onCreateInviteToken(payload)
    setInviteTokenResult(created)
    setInviteTokenFeedback('Token creato.')
  }

  const inviteTokenModeLabel = inviteTokenAutoJoin ? 'AUTOJOIN attivo' : 'Richiesta manuale'

  return (
    <section className="panel">
      <h2>Gestione Campagna</h2>
      {!campaign && <p className="muted">Apri prima una scheda campagna.</p>}
      {campaign && (
        <>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Nome" />
              <input value={name} placeholder="Nome della campagna" onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-wand-magic-sparkles" label="Tono" />
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
            <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
            <textarea rows={3} placeholder="Descrizione estesa della campagna" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-quote-right" label="Riassunto breve" />
            <textarea rows={2} placeholder="Riassunto breve visibile in elenco" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-map-location-dot" label="Ambientazione" />
            <textarea rows={3} placeholder="Ambientazione, mondo o contesto di gioco" value={setting} onChange={(event) => setSetting(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-gavel" label="Regole" />
            <textarea rows={3} placeholder="Regole principali della campagna" value={rules} onChange={(event) => setRules(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-door-open" label="Requisiti d'ingresso" />
            <textarea rows={3} placeholder="Requisiti richiesti per entrare" value={requirements} onChange={(event) => setRequirements(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-image" label="URL immagine copertina" />
            <input value={coverImageUrl} placeholder="https://..." onChange={(event) => setCoverImageUrl(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
            <input value={catalogEntryLabel(availableGameSystems, campaign.gameSystem) || campaign.gameSystem || ''} disabled />
            <p className="muted">{catalogEntryDescription(availableGameSystems, campaign.gameSystem)}</p>
            <p className="muted">Definito in creazione. Per cambiare sistema va creata una nuova campagna.</p>
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-key" label="Codice invito" />
            <div className="invite-code-row">
              <input className="invite-code-input" value={campaign.inviteCode} readOnly />
              <button type="button" className="secondary-btn" onClick={copyInviteCode}>
                <Icon name="fa-solid fa-copy" />
                Copia
              </button>
            </div>
            <p className="muted">
              Condividilo per accedere anche quando la campagna non è ricercabile. La chiusura della campagna resta attiva.
            </p>
            {inviteCopyFeedback && <p className="muted invite-copy-feedback">{inviteCopyFeedback}</p>}
          </label>
          <div className="campaign-token-panel">
            <div className="campaign-token-panel-head">
              <div>
                <p className="section-title">Token invito</p>
                <p className="muted">Crea un link opaco con approvazione automatica o manuale.</p>
              </div>
              <span className="readonly-chip">{inviteTokenModeLabel}</span>
            </div>
            <div className="campaign-token-form">
              <label className="campaign-token-switch">
                <FieldLabel icon="fa-solid fa-wand-magic-sparkles" label="Auto join" />
                <label className="switch" aria-label="Auto join token">
                  <input
                    type="checkbox"
                    checked={inviteTokenAutoJoin}
                    onChange={(event) => setInviteTokenAutoJoin(event.target.checked)}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </label>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-calendar-day" label="Scadenza" />
                <input
                  type="datetime-local"
                  value={inviteTokenExpiresAt}
                  onChange={(event) => setInviteTokenExpiresAt(event.target.value)}
                />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-hashtag" label="Max utilizzi" />
                <input
                  type="number"
                  min={1}
                  placeholder="Illimitato"
                  value={inviteTokenMaxUses}
                  onChange={(event) => setInviteTokenMaxUses(event.target.value)}
                />
              </label>
            </div>
            <div className="campaign-token-actions">
              <button type="button" className="primary-btn" onClick={createInviteToken}>
                <Icon name="fa-solid fa-circle-plus" />
                Crea token
              </button>
            </div>
            {inviteTokenFeedback && <p className="muted invite-copy-feedback">{inviteTokenFeedback}</p>}
            {inviteTokenResult && (
              <div className="campaign-token-result">
                <div className="row-between campaign-invite-preview-head">
                  <div className="data-table-primary">
                    <p className="data-table-title">{inviteTokenResult.token}</p>
                    <p className="data-table-secondary">
                      {inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'Approvazione automatica' : 'Richiesta manuale'}
                    </p>
                  </div>
                  <div className="campaign-invite-preview-badges">
                    <span className={`status ${inviteTokenResult.isActive ? 'status-success' : 'status-neutral'}`}>
                      {inviteTokenResult.isActive ? 'Attivo' : 'Disattivo'}
                    </span>
                    <span className={`status ${inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'status-success' : 'status-warning'}`}>
                      {inviteTokenResult.capabilities.includes('AUTOJOIN') ? 'AUTOJOIN' : 'MANUALE'}
                    </span>
                  </div>
                </div>
                <div className="invite-token-copy-row">
                  <input className="invite-code-input" value={inviteTokenResult.token} readOnly />
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteTokenResult.token)
                        setInviteTokenFeedback('Token copiato.')
                      } catch {
                        setInviteTokenFeedback('Copia non disponibile.')
                      }
                    }}
                  >
                    <Icon name="fa-solid fa-copy" />
                    Copia
                  </button>
                </div>
                <p className="data-table-meta">
                  {inviteTokenResult.expiresAt ? `Scade il ${inviteTokenResult.expiresAt}` : 'Nessuna scadenza'}
                  {inviteTokenResult.maxUses ? ` • max ${inviteTokenResult.maxUses} utilizzi` : ' • utilizzi illimitati'}
                </p>
              </div>
            )}
          </div>
          <CampaignToggleSettingsTable
            title="Visibilità e accesso"
            description="Impostazioni di pubblicazione della campagna, con la stessa logica usata in creazione."
            rows={campaignVisibilityRows}
          />
          <CampaignToggleSettingsTable
            title="Addon campagna"
            description="I moduli disponibili possono essere attivati o disattivati senza ricaricare la lista."
            availableModules={availableModules}
            selectedModules={selectedAvailableModules}
            onToggle={toggleModule}
          />
          {(campaign.missionRules || []).length > 0 && (
            <div className="campaign-toggle-table-block">
              <div className="row-between">
                <div>
                  <h3 className="section-title">Regole missione</h3>
                  <p className="muted">Regole effettive per iscrizioni titolare e panchina nella campagna.</p>
                </div>
                <span className="readonly-chip">
                  {(campaign.missionRules || []).filter((rule) => missionRuleDrafts[rule.code]?.enabled ?? rule.campaignEnabled).length}/{campaign.missionRules?.length || 0} attive
                </span>
              </div>
              <div className="mission-rule-settings-list">
                {(campaign.missionRules || []).map((rule) => {
                  const draft = missionRuleDrafts[rule.code] || { enabled: rule.campaignEnabled, configJson: rule.configJson || {} }
                  const disabled = !rule.globallyActive || !rule.availableForGameSystem
                  const windowMode = missionRuleConfigString(draft.configJson.windowMode, 'CALENDAR_WEEK')
                  const rollingDays = missionRuleConfigNumber(draft.configJson.rollingDays, 7)
                  return (
                    <div key={rule.code} className="mission-rule-setting-row">
                      <div className="data-table-primary">
                        <p className="data-table-title">{rule.label || rule.code}</p>
                        <p className="data-table-meta">{rule.description || rule.defaultMessage}</p>
                      </div>
                      <span className={`status ${draft.enabled && !disabled ? 'status-success' : 'status-neutral'}`}>
                        {disabled ? missionRuleStatusLabel(rule) : draft.enabled ? 'Attiva' : 'Disattiva'}
                      </span>
                      <label className={`switch ${disabled ? 'is-disabled' : ''}`} aria-label={`${rule.label} ${draft.enabled ? 'attiva' : 'disattiva'}`}>
                        <input
                          type="checkbox"
                          checked={draft.enabled && !disabled}
                          disabled={disabled}
                          onChange={(event) => updateMissionRuleDraft(rule.code, (current) => ({ ...current, enabled: event.target.checked }))}
                        />
                        <span className="switch-track" aria-hidden="true">
                          <span className="switch-thumb" />
                        </span>
                      </label>
                      {rule.code === 'WEEKLY_TITULAR_LIMIT' && (
                        <div className="mission-rule-config-row">
                          <select
                            value={windowMode}
                            disabled={disabled}
                            onChange={(event) =>
                              updateMissionRuleDraft(rule.code, (current) => ({
                                ...current,
                                configJson: { ...current.configJson, windowMode: event.target.value },
                              }))
                            }
                          >
                            <option value="CALENDAR_WEEK">Settimana lun-dom</option>
                            <option value="ROLLING_DAYS">Finestra mobile</option>
                          </select>
                          {windowMode === 'ROLLING_DAYS' && (
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={rollingDays}
                              disabled={disabled}
                              onChange={(event) =>
                                updateMissionRuleDraft(rule.code, (current) => ({
                                  ...current,
                                  configJson: { ...current.configJson, rollingDays: Number(event.target.value) || 7 },
                                }))
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
                autoJoinEnabled,
                allowedModules: selectedAvailableModules,
                missionRules: missionRuleUpdates,
              })
            }
          >
            <Icon name="fa-solid fa-floppy-disk" />
            Salva anagrafica
          </button>
          <div className="divider" />
        </>
      )}
      <details className="utility-box">
        <summary className="utility-box-summary">
          <div>
            <p className="section-title">Tabella permessi</p>
            <p className="muted">Apri solo se ti serve vedere i dettagli delle azioni consentite.</p>
          </div>
          <span className="readonly-chip">{permissions.length || permissionChecklist.length} voci</span>
        </summary>
        <div className="utility-box-body">
          <div className="row-between utility-box-actions">
            <p className="muted">Checklist delle azioni realmente disponibili per il tuo ruolo nella campagna attiva.</p>
            <button type="button" className="secondary-btn" onClick={onRefreshPermissions}>
              <Icon name="fa-solid fa-rotate-right" />
              Aggiorna
            </button>
          </div>
          <div className="permission-table">
            {permissionChecklist.map((item) => {
              const permission = permissions.find((entry) => entry.action === item.action)
              const allowed = permission?.allowed ?? false
              return (
                <div key={item.action} className="permission-table-row">
                  <div className="permission-check-main">
                    <span className={`permission-check-icon ${allowed ? 'is-allowed' : 'is-denied'}`}>
                      <Icon name={allowed ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
                    </span>
                    <div>
                      <p className="permission-action-name">{item.label}</p>
                      <p className="muted">{item.description}</p>
                    </div>
                  </div>
                  <span className={`status ${allowed ? 'status-success' : 'status-danger'}`}>{allowed ? 'OK' : 'KO'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </details>

      <div className="divider" />
      <label>
        <FieldLabel icon="fa-solid fa-user-pen" label="New owner userId" />
        <input value={newOwnerUserId} placeholder="ID utente del nuovo proprietario" onChange={(event) => setNewOwnerUserId(event.target.value)} />
      </label>
      <button type="button" className="secondary-btn" onClick={() => onTransfer(newOwnerUserId)}>
        <Icon name="fa-solid fa-right-left" />
        Transfer ownership
      </button>

      <div className="divider" />
      {campaign && campaign.founderId !== currentUserId && (
        <div className="leave-campaign-block">
          <p className="muted">Uscendo dalla campagna il tuo personaggio attivo verrà ritirato.</p>
          <button type="button" className="danger-btn" onClick={onLeave}>
            <Icon name="fa-solid fa-right-from-bracket" />
            Esci dalla campagna
          </button>
        </div>
      )}
    </section>
  )
}
