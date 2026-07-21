import { Fragment, useEffect, useMemo, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { useAdminContext } from '../../../context'
import { FieldLabel, Icon } from '../../../shared/components'
import type {
  AdminGameSystemRuleUpsertRequest,
  AdminMissionRuleUpsertRequest,
} from '../../../types/domain'

type MissionRuleDraft = {
  code: string
  label: string
  description: string
  globallyActive: boolean
  benchReasonCode: string
  defaultMessage: string
  sortOrder: string
}

type GameSystemRuleCreateDraft = MissionRuleDraft & {
  selectedGameSystemCodes: string[]
  defaultEnabled: boolean
  configJsonText: string
}

type GameSystemOption = {
  value: string
  label: string
  description: string
}

export function SystemGameSystemRulesPage() {
  const {
    busy,
    gameSystems,
    missionRules,
    gameSystemRules,
    refreshSystemCatalogs: onRefresh,
    createMissionRule: onCreateMissionRule,
    saveMissionRule: onSaveMissionRule,
    saveGameSystemRule: onSaveGameSystemRule,
  } = useAdminContext()

  const createDefaultRuleDraft = (): MissionRuleDraft => ({
    code: '',
    label: '',
    description: '',
    globallyActive: true,
    benchReasonCode: '',
    defaultMessage: '',
    sortOrder: '0',
  })

  const createDefaultCreateDraft = (): GameSystemRuleCreateDraft => ({
    ...createDefaultRuleDraft(),
    selectedGameSystemCodes: [],
    defaultEnabled: true,
    configJsonText: '{}',
  })

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [newRule, setNewRule] = useState<GameSystemRuleCreateDraft>(createDefaultCreateDraft)
  const [newRuleError, setNewRuleError] = useState('')
  const [missionRuleDrafts, setMissionRuleDrafts] = useState<Record<string, MissionRuleDraft>>({})
  const [missionRuleErrors, setMissionRuleErrors] = useState<Record<string, string>>({})
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, { defaultEnabled: boolean; configJsonText: string }>>({})
  const [mappingErrors, setMappingErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setMissionRuleDrafts(
      Object.fromEntries(
        missionRules.map((item) => [
          item.code,
          {
            code: item.code,
            label: item.label,
            description: item.description || '',
            globallyActive: item.globallyActive,
            benchReasonCode: item.benchReasonCode,
            defaultMessage: item.defaultMessage,
            sortOrder: String(item.sortOrder),
          },
        ]),
      ),
    )
    setMissionRuleErrors({})
  }, [missionRules])

  useEffect(() => {
    setMappingDrafts(
      Object.fromEntries(
        gameSystemRules.map((item) => [
          `${item.gameSystemCode}:${item.ruleCode}`,
          {
            defaultEnabled: item.defaultEnabled,
            configJsonText: JSON.stringify(item.configJson || {}, null, 2),
          },
        ]),
      ),
    )
    setMappingErrors({})
  }, [gameSystemRules])

  const gameSystemOptions: GameSystemOption[] = useMemo(
    () =>
      gameSystems
        .filter((item) => item.active)
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
          return left.label.localeCompare(right.label, 'it')
        })
        .map((item) => ({
          value: item.code,
          label: item.label || item.code,
          description: item.code,
        })),
    [gameSystems],
  )

  const sortedMissionRules = [...missionRules].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const sortedGameSystemRules = [...gameSystemRules].sort((left, right) => {
    if (left.ruleCode !== right.ruleCode) return left.ruleCode.localeCompare(right.ruleCode, 'it')
    return left.gameSystemCode.localeCompare(right.gameSystemCode, 'it')
  })

  const attachedGameSystemCodesByRule = useMemo(() => {
    const byRule: Record<string, string[]> = {}
    gameSystemRules.forEach((item) => {
      byRule[item.ruleCode] = [...(byRule[item.ruleCode] || []), item.gameSystemCode]
    })
    return byRule
  }, [gameSystemRules])

  const parseConfigJson = (text: string): Record<string, unknown> => {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('configJson deve essere un oggetto JSON')
    }
    return parsed as Record<string, unknown>
  }

  const toNumberOrThrow = (value: string, fieldLabel: string) => {
    const parsed = Number.parseInt(value.trim(), 10)
    if (!Number.isFinite(parsed)) throw new Error(`${fieldLabel} non valido`)
    return parsed
  }

  const missionRulePayload = (draft: MissionRuleDraft): AdminMissionRuleUpsertRequest => {
    const code = draft.code.trim()
    const label = draft.label.trim()
    const benchReasonCode = draft.benchReasonCode.trim()
    const defaultMessage = draft.defaultMessage.trim()
    if (!code || !label || !benchReasonCode || !defaultMessage) {
      throw new Error('Codice, label, motivo panchina e messaggio sono obbligatori')
    }
    return {
      code,
      label,
      description: draft.description.trim(),
      globallyActive: draft.globallyActive,
      benchReasonCode,
      defaultMessage,
      sortOrder: toNumberOrThrow(draft.sortOrder, 'Ordine'),
    }
  }

  const submitNewGameRule = async () => {
    if (newRule.selectedGameSystemCodes.length === 0) {
      setNewRuleError('Seleziona almeno un game system')
      return
    }
    let configJson: Record<string, unknown>
    try {
      configJson = parseConfigJson(newRule.configJsonText)
    } catch (err) {
      setNewRuleError(err instanceof Error ? err.message : 'configJson non valido')
      return
    }

    try {
      const payload = missionRulePayload(newRule)
      setNewRuleError('')
      await onCreateMissionRule(payload)
      await Promise.all(
        newRule.selectedGameSystemCodes.map((gameSystemCode) =>
          onSaveGameSystemRule({
            gameSystemCode,
            ruleCode: payload.code,
            defaultEnabled: newRule.defaultEnabled,
            configJson,
          }),
        ),
      )
      setNewRule(createDefaultCreateDraft())
      setShowCreatePanel(false)
    } catch (err) {
      setNewRuleError(err instanceof Error ? err.message : 'Game rule non valida')
    }
  }

  const saveMissionRule = async (code: string) => {
    const draft = missionRuleDrafts[code]
    if (!draft) return
    try {
      const payload = missionRulePayload({ ...draft, code })
      setMissionRuleErrors((prev) => ({ ...prev, [code]: '' }))
      await onSaveMissionRule(code, payload)
    } catch (err) {
      setMissionRuleErrors((prev) => ({ ...prev, [code]: err instanceof Error ? err.message : 'Game rule non valida' }))
    }
  }

  const saveMapping = async (gameSystemCode: string, ruleCode: string) => {
    const key = `${gameSystemCode}:${ruleCode}`
    const draft = mappingDrafts[key]
    if (!draft) return
    let configJson: Record<string, unknown>
    try {
      configJson = parseConfigJson(draft.configJsonText)
    } catch (err) {
      setMappingErrors((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'configJson non valido' }))
      return
    }

    const payload: AdminGameSystemRuleUpsertRequest = {
      gameSystemCode,
      ruleCode,
      defaultEnabled: draft.defaultEnabled,
      configJson,
    }
    setMappingErrors((prev) => ({ ...prev, [key]: '' }))
    await onSaveGameSystemRule(payload)
  }

  return (
    <div className="system-catalogs-layout">
      <section className="system-catalog-hero">
        <div className="system-catalog-hero-copy">
          <p className="menu-group-label">SYSTEM / GAME SYSTEM RULES</p>
          <h3>Game System Rules</h3>
          <p className="muted">Regole disponibili e mapping verso i game system.</p>
        </div>
        <div className="system-catalog-hero-meta">
          <span className="status status-neutral">Regole {missionRules.length}</span>
          <span className="status status-info">Mapping {gameSystemRules.length}</span>
          <button type="button" className="refresh-btn" disabled={busy} onClick={onRefresh}>
            <Icon name="fa-solid fa-rotate-right" />
            <span>Ricarica</span>
          </button>
          <button type="button" className="primary-btn" disabled={busy} onClick={() => setShowCreatePanel((prev) => !prev)}>
            <Icon name="fa-solid fa-plus" />
            <span>Aggiungi game rule</span>
          </button>
        </div>
      </section>

      {showCreatePanel && (
        <section className="system-catalog-panel system-catalog-panel-wide">
          <div className="system-catalog-panel-head">
            <div>
              <h3 className="section-title">Nuova game rule</h3>
              <p className="muted">Crea la regola e agganciala subito a uno o piu' game system.</p>
            </div>
          </div>

          <div className="system-catalog-form system-catalog-form-compact">
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-key" label="Codice" />
                <input value={newRule.code} onChange={(event) => setNewRule((prev) => ({ ...prev, code: event.target.value }))} placeholder="LEVEL_RANGE_GATE" />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-signature" label="Label" />
                <input value={newRule.label} onChange={(event) => setNewRule((prev) => ({ ...prev, label: event.target.value }))} placeholder="Range livello personaggio" />
              </label>
            </div>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-triangle-exclamation" label="Motivo panchina" />
                <input value={newRule.benchReasonCode} onChange={(event) => setNewRule((prev) => ({ ...prev, benchReasonCode: event.target.value }))} placeholder="OUT_OF_LEVEL_RANGE" />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-message" label="Messaggio default" />
                <input value={newRule.defaultMessage} onChange={(event) => setNewRule((prev) => ({ ...prev, defaultMessage: event.target.value }))} placeholder="Fuori range livello" />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-gamepad" label="Game system collegati" />
              <MultiSelect
                className="surface-field member-filter-select"
                panelClassName="surface-field-panel member-filter-select-panel"
                value={newRule.selectedGameSystemCodes}
                options={gameSystemOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(event) => setNewRule((prev) => ({ ...prev, selectedGameSystemCodes: event.value as string[] }))}
                placeholder="Seleziona game system"
                maxSelectedLabels={3}
                selectedItemsLabel="{0} selezionati"
                itemTemplate={(option: GameSystemOption) => (
                  <span className="member-filter-option-copy">
                    <Icon name="fa-solid fa-gamepad" />
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </span>
                )}
              />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
              <textarea rows={3} value={newRule.description} onChange={(event) => setNewRule((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descrizione amministrativa della regola" />
            </label>
            <div className="system-toggle-row">
              <label className="system-status-option">
                <span className="system-status-label"><strong>Attiva globalmente</strong><small>Disponibile per i game system collegati.</small></span>
                <span className="switch system-user-switch">
                  <input type="checkbox" checked={newRule.globallyActive} onChange={(event) => setNewRule((prev) => ({ ...prev, globallyActive: event.target.checked }))} />
                  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                </span>
              </label>
              <label className="system-status-option">
                <span className="system-status-label"><strong>Default enabled</strong><small>Le nuove campagne partono con la regola accesa.</small></span>
                <span className="switch system-user-switch">
                  <input type="checkbox" checked={newRule.defaultEnabled} onChange={(event) => setNewRule((prev) => ({ ...prev, defaultEnabled: event.target.checked }))} />
                  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                </span>
              </label>
            </div>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                <input type="number" value={newRule.sortOrder} onChange={(event) => setNewRule((prev) => ({ ...prev, sortOrder: event.target.value }))} />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-diagram-project" label="Config JSON" />
              <textarea className="system-json-editor" rows={8} value={newRule.configJsonText} onChange={(event) => setNewRule((prev) => ({ ...prev, configJsonText: event.target.value }))} />
            </label>
            {newRuleError && <p className="system-inline-error">{newRuleError}</p>}
            <button type="button" className="primary-btn" disabled={busy || gameSystemOptions.length === 0} onClick={() => void submitNewGameRule()}>
              <Icon name="fa-solid fa-floppy-disk" />
              <span>Salva game rule</span>
            </button>
          </div>
        </section>
      )}

      <section className="system-catalog-panel system-catalog-panel-wide">
        <div className="system-catalog-panel-head">
          <div>
            <h3 className="section-title">Lista game rules</h3>
            <p className="muted">Regole globali con game system collegati.</p>
          </div>
          <span className="readonly-chip">{missionRules.length} record</span>
        </div>

        <div className="system-sheet-list">
          {sortedMissionRules.length === 0 ? (
            <div className="system-empty-cell system-sheet-empty">Nessuna game rule configurata.</div>
          ) : (
            sortedMissionRules.map((item) => {
              const draft = missionRuleDrafts[item.code] || {
                code: item.code,
                label: item.label,
                description: item.description || '',
                globallyActive: item.globallyActive,
                benchReasonCode: item.benchReasonCode,
                defaultMessage: item.defaultMessage,
                sortOrder: String(item.sortOrder),
              }
              const isDirty =
                draft.label !== item.label || (draft.description || '') !== (item.description || '') ||
                draft.globallyActive !== item.globallyActive || draft.benchReasonCode !== item.benchReasonCode ||
                draft.defaultMessage !== item.defaultMessage || draft.sortOrder !== String(item.sortOrder)
              const attachedCodes = attachedGameSystemCodesByRule[item.code] || []

              return (
                <article key={item.code} className="surface-card system-sheet-card">
                  <div className="system-sheet-card-head">
                    <div>
                      <div className="system-sheet-title-row">
                        <h4>{item.label}</h4>
                        <span className="readonly-chip">{item.code}</span>
                        {!item.globallyActive && <span className="status status-neutral">Disattiva</span>}
                      </div>
                      <p className="muted">
                        {attachedCodes.length > 0 ? attachedCodes.join(', ') : 'Nessun game system collegato'}
                      </p>
                    </div>
                    <div className="system-row-actions">
                      <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>{isDirty ? 'Da salvare' : 'Salvata'}</span>
                      <button type="button" className="refresh-btn" disabled={busy || !isDirty} onClick={() => void saveMissionRule(item.code)}>
                        <Icon name="fa-solid fa-floppy-disk" /><span>Salva</span>
                      </button>
                    </div>
                  </div>

                  <div className="system-catalog-form-grid">
                    <label>
                      <FieldLabel icon="fa-solid fa-signature" label="Label" />
                      <input value={draft.label} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, label: event.target.value } }))} />
                    </label>
                    <label>
                      <FieldLabel icon="fa-solid fa-triangle-exclamation" label="Motivo panchina" />
                      <input value={draft.benchReasonCode} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, benchReasonCode: event.target.value } }))} />
                    </label>
                  </div>
                  <div className="system-catalog-form-grid">
                    <label>
                      <FieldLabel icon="fa-solid fa-message" label="Messaggio default" />
                      <input value={draft.defaultMessage} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, defaultMessage: event.target.value } }))} />
                    </label>
                    <label>
                      <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                      <input type="number" value={draft.sortOrder} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, sortOrder: event.target.value } }))} />
                    </label>
                  </div>
                  <label>
                    <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
                    <textarea rows={3} value={draft.description} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, description: event.target.value } }))} />
                  </label>
                  <div className="system-toggle-row">
                    <label className="system-status-option">
                      <span className="system-status-label"><strong>Attiva globalmente</strong><small>Spegnila per disabilitare la regola ovunque.</small></span>
                      <span className="switch system-user-switch">
                        <input type="checkbox" checked={draft.globallyActive} onChange={(event) => setMissionRuleDrafts((prev) => ({ ...prev, [item.code]: { ...draft, globallyActive: event.target.checked } }))} />
                        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                      </span>
                    </label>
                  </div>
                  {missionRuleErrors[item.code] && <p className="system-inline-error">{missionRuleErrors[item.code]}</p>}
                </article>
              )
            })
          )}
        </div>
      </section>

      <section className="system-catalog-panel system-catalog-panel-wide">
        <div className="system-catalog-panel-head">
          <div>
            <h3 className="section-title">Mapping game system</h3>
            <p className="muted">Config specifica della regola per ogni game system.</p>
          </div>
          <span className="readonly-chip">{gameSystemRules.length} record</span>
        </div>

        <div className="system-catalog-table-wrap">
          <table className="system-catalog-table">
            <thead>
              <tr>
                <th>Regola</th><th>Game system</th><th>Default</th><th>Config</th><th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sortedGameSystemRules.length === 0 ? (
                <tr><td className="system-empty-cell" colSpan={5}>Nessuna game rule agganciata a un game system.</td></tr>
              ) : (
                sortedGameSystemRules.map((item) => {
                  const key = `${item.gameSystemCode}:${item.ruleCode}`
                  const draft = mappingDrafts[key] || {
                    defaultEnabled: item.defaultEnabled,
                    configJsonText: JSON.stringify(item.configJson || {}, null, 2),
                  }
                  const isDirty = draft.defaultEnabled !== item.defaultEnabled || draft.configJsonText !== JSON.stringify(item.configJson || {}, null, 2)
                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>{missionRules.find((rule) => rule.code === item.ruleCode)?.label || item.ruleCode}</td>
                        <td>{gameSystems.find((system) => system.code === item.gameSystemCode)?.label || item.gameSystemCode}</td>
                        <td>
                          <label className="switch system-user-switch" aria-label={`${key} ${draft.defaultEnabled ? 'enabled' : 'disabled'}`}>
                            <input type="checkbox" checked={draft.defaultEnabled} onChange={(event) => setMappingDrafts((prev) => ({ ...prev, [key]: { ...draft, defaultEnabled: event.target.checked } }))} />
                            <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                          </label>
                        </td>
                        <td><textarea className="system-inline-textarea" rows={4} value={draft.configJsonText} onChange={(event) => setMappingDrafts((prev) => ({ ...prev, [key]: { ...draft, configJsonText: event.target.value } }))} /></td>
                        <td>
                          <div className="system-row-actions">
                            <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>{isDirty ? 'Da salvare' : 'Salvato'}</span>
                            <button type="button" className="refresh-btn" disabled={busy || !isDirty} onClick={() => void saveMapping(item.gameSystemCode, item.ruleCode)}>
                              <Icon name="fa-solid fa-floppy-disk" /><span>Salva</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {mappingErrors[key] && <tr><td colSpan={5} className="system-inline-error-row">{mappingErrors[key]}</td></tr>}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
