import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { useUnsavedChanges } from '../../../context/NavigationGuardContext'
import { CampaignInvites } from '../components/CampaignInvites'
import { ConfirmActionDialog } from '../../../shared/components'
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
    currentUserId,
    members,
    memberNames,
    leaveCurrentCampaign: onLeave,
  } = useCampaignContext()
  const [newOwnerUserId, setNewOwnerUserId] = useState('')
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
  const [missionRuleDrafts, setMissionRuleDrafts] = useState<Record<string, MissionRuleDraft>>(() => Object.fromEntries((campaign?.missionRules || []).map(rule => [rule.code, { enabled: rule.campaignEnabled, configJson: { ...rule.configJson } }])))
  const [dirty, setDirty] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const saveAction = useAsyncAction()
  const transferAction = useAsyncAction()
  useUnsavedChanges(dirty, saveAction.pending || transferAction.pending)

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
    { action: 'APPROVE_OR_REJECT_APPLICATIONS', label: 'Gestire accessi', description: 'Approva o rifiuta le richieste in attesa.' },
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
      title: 'Ingresso automatico',
      description: "Approva automaticamente l'accesso da app quando la campagna e aperta e visibile.",
      active: autoJoinEnabled,
      activeLabel: 'Automatico',
      inactiveLabel: 'Manuale',
      onToggle: () => setAutoJoinEnabled((prev) => !prev),
    },
  ]

  useEffect(() => { if (campaign?.id && permissions.length === 0) onRefreshPermissions() }, [campaign?.id, permissions.length, onRefreshPermissions])

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode)
        ? prev.filter((item) => item !== moduleCode)
        : [...prev, moduleCode],
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

  const save = async () => {
    if (!name.trim()) { saveAction.setError('Scrivi il nome della campagna.'); return }
    const saved = await saveAction.execute(() => onSave({ name: name.trim(), description, summary, setting, tone, rules, requirements, coverImageUrl, isOpen, isSearchable, autoJoinEnabled, allowedModules: [...selectedModules.filter(code => !availableModuleCodes.includes(code)), ...selectedAvailableModules], missionRules: missionRuleUpdates }), 'Impostazioni salvate.')
    if (saved) setDirty(false)
  }

  return (
    <section className="panel remaining-flow campaign-settings">
      <h2>Gestione campagna</h2>
      <p className="muted">Impostazioni del tavolo, inviti e strumenti. Le modifiche si applicano quando salvi.</p>
      {!campaign && <p className="muted">Apri prima una scheda campagna.</p>}
      {campaign && (
        <>
          <form onSubmit={event => { event.preventDefault(); void save() }} onChangeCapture={() => { setDirty(true); saveAction.setNotice('') }} onClickCapture={event => { if ((event.target as HTMLElement).closest('button[type="button"]')) setDirty(true) }} onInvalidCapture={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true }} aria-busy={saveAction.pending}>
          <fieldset className="flow-fieldset" disabled={saveAction.pending}>
          <p role="status">{dirty ? 'Modifiche non salvate' : saveAction.notice || 'Nessuna modifica da salvare'}</p>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Nome" />
              <input required maxLength={200} value={name} placeholder="Nome della campagna" onChange={(event) => setName(event.target.value)} />
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
          <details className="flow-details"><summary>Storia e presentazione della campagna</summary>
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
            <input type="url" maxLength={500} value={coverImageUrl} placeholder="https://..." onChange={(event) => setCoverImageUrl(event.target.value)} />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
            <input value={catalogEntryLabel(availableGameSystems, campaign.gameSystem) || campaign.gameSystem || ''} disabled />
            <p className="muted">{catalogEntryDescription(availableGameSystems, campaign.gameSystem)}</p>
            <p className="muted">Definito in creazione. Per cambiare sistema va creata una nuova campagna.</p>
          </label>
          </details>
          <CampaignToggleSettingsTable
            title="Visibilità e accesso"
            description="Impostazioni di pubblicazione della campagna, con la stessa logica usata in creazione."
            rows={campaignVisibilityRows}
          />
          <details className="flow-details"><summary>Moduli e regole delle missioni</summary>
          <CampaignToggleSettingsTable
            title="Moduli della campagna"
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
          </details>
          <div className="flow-save-bar"><button type="submit" className="primary-btn" disabled={!dirty}>{saveAction.pending ? 'Salvataggio…' : 'Salva impostazioni'}</button></div>
          </fieldset>
          {saveAction.error && <p role="alert">{saveAction.error}</p>}
          </form>
          <CampaignInvites />
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
                  <span className={`status ${allowed ? 'status-success' : 'status-danger'}`}>{allowed ? 'Consentito' : 'Non consentito'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </details>

      {campaign?.founderId === currentUserId && <details className="flow-details"><summary>Trasferisci la proprietà della campagna</summary><p className="muted">Il nuovo proprietario diventerà super master. Salva le modifiche prima di procedere.</p><label>Nuovo proprietario<select value={newOwnerUserId} onChange={event => setNewOwnerUserId(event.target.value)} disabled={transferAction.pending}><option value="">Seleziona un membro approvato</option>{members.filter(member => member.memberStatus === 'APPROVED' && member.userId !== currentUserId).map(member => <option key={member.userId} value={member.userId}>{memberNames[member.userId] || member.userId}</option>)}</select></label><button type="button" className="secondary-btn" disabled={!newOwnerUserId || dirty || transferAction.pending} onClick={() => setTransferOpen(true)}>Trasferisci proprietà</button>{transferAction.error && <p role="alert">{transferAction.error}</p>}{transferAction.notice && <p role="status">{transferAction.notice}</p>}</details>}
      <ConfirmActionDialog open={transferOpen} title="Trasferire la proprietà?" message="Il membro selezionato diventerà il proprietario della campagna. Il tuo ruolo sarà aggiornato secondo le regole del tavolo." confirmLabel="Trasferisci proprietà" onCancel={() => setTransferOpen(false)} onConfirm={() => { setTransferOpen(false); void transferAction.execute(() => onTransfer(newOwnerUserId), 'Proprietà trasferita.') }} />
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
