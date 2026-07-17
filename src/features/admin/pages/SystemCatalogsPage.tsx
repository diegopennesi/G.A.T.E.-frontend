import { Fragment, useEffect, useState } from 'react'
import { useAdminContext } from '../../../context'
import { FieldLabel, Icon } from '../../../shared/components'
import type {
  SheetEntityType,
} from '../../../types/domain'

export function SystemCatalogsPage() {
  const {
    busy,
    gameSystems,
    sheetTypes,
    refreshSystemCatalogs: onRefresh,
    createGameSystem: onCreateGameSystem,
    saveGameSystem: onSaveGameSystem,
    createSheetType: onCreateSheetType,
    saveSheetType: onSaveSheetType,
  } = useAdminContext()
  type GameSystemDraft = {
    code: string
    label: string
    description: string
    active: boolean
    sortOrder: number
  }
  type SheetTypeDraft = {
    code: string
    label: string
    description: string
    gameSystemCode: string
    entityType: SheetEntityType
    schemaVersion: string
    sortOrder: string
    active: boolean
    isDefault: boolean
    schemaJsonText: string
  }

  const entityTypeOptions: Array<{ value: SheetEntityType; label: string }> = [
    { value: 'CHARACTER', label: 'Character' },
    { value: 'ARMY', label: 'Army' },
    { value: 'DECK', label: 'Deck' },
  ]

  const createDefaultGameSystemDraft = (): GameSystemDraft => ({
    code: '', label: '', description: '', active: true, sortOrder: 0,
  })

  const createDefaultSheetTypeDraft = (defaultGameSystemCode: string): SheetTypeDraft => ({
    code: '',
    label: '',
    description: '',
    gameSystemCode: defaultGameSystemCode,
    entityType: 'CHARACTER',
    schemaVersion: '1',
    sortOrder: '0',
    active: true,
    isDefault: false,
    schemaJsonText: JSON.stringify(
      { version: 1, blocks: [{ code: 'identity', label: 'Identita', order: 1 }, { code: 'core', label: 'Core', order: 2 }, { code: 'notes', label: 'Notes', order: 3 }] },
      null, 2,
    ),
  })

  const parseSchemaJson = (text: string): Record<string, unknown> => {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('schemaJson deve essere un oggetto JSON')
    }
    return parsed as Record<string, unknown>
  }

  const toNumberOrThrow = (value: string, fieldLabel: string) => {
    const parsed = Number.parseInt(value.trim(), 10)
    if (!Number.isFinite(parsed)) throw new Error(`${fieldLabel} non valido`)
    return parsed
  }

  const [newGameSystem, setNewGameSystem] = useState<GameSystemDraft>(createDefaultGameSystemDraft)
  const [newGameSystemError, setNewGameSystemError] = useState('')
  const [gameSystemDrafts, setGameSystemDrafts] = useState<Record<string, GameSystemDraft>>({})
  const [gameSystemErrors, setGameSystemErrors] = useState<Record<string, string>>({})
  const [newSheetType, setNewSheetType] = useState<SheetTypeDraft>(createDefaultSheetTypeDraft(gameSystems[0]?.code || ''))
  const [newSheetTypeError, setNewSheetTypeError] = useState('')
  const [sheetTypeDrafts, setSheetTypeDrafts] = useState<Record<string, SheetTypeDraft>>({})
  const [sheetTypeErrors, setSheetTypeErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setGameSystemDrafts(
      Object.fromEntries(
        gameSystems.map((item) => [item.code, { code: item.code, label: item.label, description: item.description || '', active: item.active, sortOrder: item.sortOrder }]),
      ),
    )
    setGameSystemErrors({})
  }, [gameSystems])

  useEffect(() => {
    const defaultGameSystemCode = gameSystems[0]?.code || ''
    setNewSheetType((prev) =>
      prev.gameSystemCode && gameSystems.some((item) => item.code === prev.gameSystemCode)
        ? prev
        : createDefaultSheetTypeDraft(defaultGameSystemCode),
    )
  }, [gameSystems])

  useEffect(() => {
    setSheetTypeDrafts(
      Object.fromEntries(
        sheetTypes.map((item) => [
          item.code,
          {
            code: item.code, label: item.label, description: item.description || '',
            gameSystemCode: item.gameSystemCode, entityType: item.entityType,
            schemaVersion: String(item.schemaVersion), sortOrder: String(item.sortOrder),
            active: item.active, isDefault: item.isDefault,
            schemaJsonText: JSON.stringify(item.schemaJson || {}, null, 2),
          },
        ]),
      ),
    )
    setSheetTypeErrors({})
  }, [sheetTypes])

  const sortedGameSystems = [...gameSystems].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const sortedSheetTypes = [...sheetTypes].sort((left, right) => {
    if (left.gameSystemCode !== right.gameSystemCode) return left.gameSystemCode.localeCompare(right.gameSystemCode, 'it')
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const submitNewGameSystem = async () => {
    const code = newGameSystem.code.trim()
    const label = newGameSystem.label.trim()
    if (!code || !label) { setNewGameSystemError('Codice e label sono obbligatori'); return }
    setNewGameSystemError('')
    await onCreateGameSystem({ code, label, description: newGameSystem.description.trim(), active: newGameSystem.active, sortOrder: Number.isFinite(newGameSystem.sortOrder) ? newGameSystem.sortOrder : 0 })
    setNewGameSystem(createDefaultGameSystemDraft())
  }

  const saveGameSystem = async (code: string) => {
    const draft = gameSystemDrafts[code]
    if (!draft) return
    const normalizedCode = code.trim()
    const label = draft.label.trim()
    if (!normalizedCode || !label) { setGameSystemErrors((prev) => ({ ...prev, [code]: 'Codice e label sono obbligatori' })); return }
    await onSaveGameSystem(code, { code: normalizedCode, label, description: draft.description.trim(), active: draft.active, sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0 })
  }

  const submitNewSheetType = async () => {
    const code = newSheetType.code.trim()
    const label = newSheetType.label.trim()
    const gameSystemCode = newSheetType.gameSystemCode.trim()
    if (!code || !label || !gameSystemCode) { setNewSheetTypeError('Codice, label e sistema di gioco sono obbligatori'); return }
    let schemaJson: Record<string, unknown>
    try { schemaJson = parseSchemaJson(newSheetType.schemaJsonText) } catch (err) { setNewSheetTypeError(err instanceof Error ? err.message : 'schemaJson non valido'); return }
    setNewSheetTypeError('')
    await onCreateSheetType({ code, label, description: newSheetType.description.trim(), gameSystemCode, entityType: newSheetType.entityType, schemaVersion: toNumberOrThrow(newSheetType.schemaVersion, 'Schema version'), sortOrder: toNumberOrThrow(newSheetType.sortOrder, 'Sort order'), active: newSheetType.active, isDefault: newSheetType.isDefault, schemaJson })
    setNewSheetType(createDefaultSheetTypeDraft(gameSystems[0]?.code || ''))
  }

  const saveSheetType = async (code: string) => {
    const draft = sheetTypeDrafts[code]
    if (!draft) return
    const normalizedCode = code.trim()
    const label = draft.label.trim()
    const gameSystemCode = draft.gameSystemCode.trim()
    if (!normalizedCode || !label || !gameSystemCode) { setSheetTypeErrors((prev) => ({ ...prev, [code]: 'Codice, label e sistema di gioco sono obbligatori' })); return }
    let schemaJson: Record<string, unknown>
    try { schemaJson = parseSchemaJson(draft.schemaJsonText) } catch (err) { setSheetTypeErrors((prev) => ({ ...prev, [code]: err instanceof Error ? err.message : 'schemaJson non valido' })); return }
    setSheetTypeErrors((prev) => ({ ...prev, [code]: '' }))
    await onSaveSheetType(code, { code: normalizedCode, label, description: draft.description.trim(), gameSystemCode, entityType: draft.entityType, schemaVersion: toNumberOrThrow(draft.schemaVersion, 'Schema version'), sortOrder: toNumberOrThrow(draft.sortOrder, 'Sort order'), active: draft.active, isDefault: draft.isDefault, schemaJson })
  }

  return (
    <div className="system-catalogs-layout">
      <section className="system-catalog-hero">
        <div className="system-catalog-hero-copy">
          <p className="menu-group-label">SYSTEM / SCHEDE</p>
          <h3>Cataloghi configurabili, riusabili e versionati</h3>
          <p className="muted">
            Qui definisci i sistemi di gioco censiti a database e la struttura scheda che poi il frontend usera'
            per comporre i moduli runtime.
          </p>
        </div>
        <div className="system-catalog-hero-meta">
          <span className="status status-neutral">Sistemi {gameSystems.length}</span>
          <span className="status status-info">Schede {sheetTypes.length}</span>
          <button type="button" className="refresh-btn" disabled={busy} onClick={onRefresh}>
            <Icon name="fa-solid fa-rotate-right" />
            <span>Ricarica</span>
          </button>
        </div>
      </section>

      <div className="system-catalogs-grid">
        <section className="system-catalog-panel">
          <div className="system-catalog-panel-head">
            <div>
              <h3 className="section-title">Sistemi di gioco</h3>
              <p className="muted">Catalogo amministrativo dei mondi di gioco disponibili.</p>
            </div>
            <span className="readonly-chip">{gameSystems.length} record</span>
          </div>

          <div className="system-catalog-form">
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-key" label="Codice nuovo sistema" />
                <input value={newGameSystem.code} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, code: event.target.value }))} placeholder="DND5E" />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-signature" label="Label" />
                <input value={newGameSystem.label} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, label: event.target.value }))} placeholder="D&D 5E" />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
              <textarea rows={3} value={newGameSystem.description} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descrizione amministrativa del sistema" />
            </label>
            <div className="system-toggle-row">
              <label className="system-status-option">
                <span className="system-status-label">
                  <strong>Attivo</strong>
                  <small>Visibile nelle campagne e nei template.</small>
                </span>
                <span className="switch system-user-switch">
                  <input type="checkbox" checked={newGameSystem.active} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, active: event.target.checked }))} />
                  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                </span>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                <input type="number" value={String(newGameSystem.sortOrder)} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, sortOrder: Number.parseInt(event.target.value || '0', 10) }))} />
              </label>
            </div>
            {newGameSystemError && <p className="system-inline-error">{newGameSystemError}</p>}
            <button type="button" className="primary-btn" disabled={busy} onClick={() => void submitNewGameSystem()}>
              <Icon name="fa-solid fa-plus" />
              <span>Crea sistema</span>
            </button>
          </div>

          <div className="system-catalog-table-wrap">
            <table className="system-catalog-table">
              <thead>
                <tr>
                  <th>Codice</th><th>Label</th><th>Descrizione</th><th>Stato</th><th>Ordine</th><th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedGameSystems.length === 0 ? (
                  <tr><td className="system-empty-cell" colSpan={6}>Nessun sistema di gioco censito.</td></tr>
                ) : (
                  sortedGameSystems.map((item) => {
                    const draft = gameSystemDrafts[item.code] || { code: item.code, label: item.label, description: item.description || '', active: item.active, sortOrder: item.sortOrder }
                    const isDirty = draft.label !== item.label || (draft.description || '') !== (item.description || '') || draft.active !== item.active || draft.sortOrder !== item.sortOrder
                    return (
                      <Fragment key={item.code}>
                        <tr>
                          <td><div className="system-catalog-code-block"><span className="system-user-username">{item.code}</span><span className="system-user-id">Readonly code</span></div></td>
                          <td><input className="system-inline-input" value={draft.label} onChange={(event) => setGameSystemDrafts((prev) => ({ ...prev, [item.code]: { ...draft, label: event.target.value } }))} /></td>
                          <td><textarea className="system-inline-textarea" rows={3} value={draft.description} onChange={(event) => setGameSystemDrafts((prev) => ({ ...prev, [item.code]: { ...draft, description: event.target.value } }))} /></td>
                          <td>
                            <label className="switch system-user-switch" aria-label={`${item.code} ${draft.active ? 'attivo' : 'disattivo'}`}>
                              <input type="checkbox" checked={draft.active} onChange={(event) => setGameSystemDrafts((prev) => ({ ...prev, [item.code]: { ...draft, active: event.target.checked } }))} />
                              <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                            </label>
                          </td>
                          <td><input className="system-inline-input system-inline-input-narrow" type="number" value={String(draft.sortOrder)} onChange={(event) => setGameSystemDrafts((prev) => ({ ...prev, [item.code]: { ...draft, sortOrder: Number.parseInt(event.target.value || '0', 10) } }))} /></td>
                          <td>
                            <div className="system-row-actions">
                              <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>{isDirty ? 'Da salvare' : 'Salvato'}</span>
                              <button type="button" className="refresh-btn" disabled={busy || !isDirty} onClick={() => void saveGameSystem(item.code)}>
                                <Icon name="fa-solid fa-floppy-disk" /><span>Salva</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {gameSystemErrors[item.code] && <tr><td colSpan={6} className="system-inline-error-row">{gameSystemErrors[item.code]}</td></tr>}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="system-catalog-panel system-catalog-panel-wide">
          <div className="system-catalog-panel-head">
            <div>
              <h3 className="section-title">Sheet type</h3>
              <p className="muted">Definisci i template scheda per character, army o deck.</p>
            </div>
            <span className="readonly-chip">{sheetTypes.length} record</span>
          </div>

          <div className="system-catalog-form system-catalog-form-compact">
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-key" label="Codice nuovo sheet type" />
                <input value={newSheetType.code} onChange={(event) => setNewSheetType((prev) => ({ ...prev, code: event.target.value }))} placeholder="DND5E_CHARACTER" />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-signature" label="Label" />
                <input value={newSheetType.label} onChange={(event) => setNewSheetType((prev) => ({ ...prev, label: event.target.value }))} placeholder="D&D Character Sheet" />
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
              <textarea rows={3} value={newSheetType.description} onChange={(event) => setNewSheetType((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descrizione del template scheda" />
            </label>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
                <select value={newSheetType.gameSystemCode} onChange={(event) => setNewSheetType((prev) => ({ ...prev, gameSystemCode: event.target.value }))}>
                  {gameSystems.length > 0 ? gameSystems.map((item) => <option key={item.code} value={item.code}>{item.label || item.code}</option>) : <option value="">Nessun sistema disponibile</option>}
                </select>
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-layer-group" label="Entity type" />
                <select value={newSheetType.entityType} onChange={(event) => setNewSheetType((prev) => ({ ...prev, entityType: event.target.value as SheetEntityType }))}>
                  {entityTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            <div className="system-catalog-form-grid">
              <label>
                <FieldLabel icon="fa-solid fa-code-branch" label="Schema version" />
                <input type="number" value={newSheetType.schemaVersion} onChange={(event) => setNewSheetType((prev) => ({ ...prev, schemaVersion: event.target.value }))} />
              </label>
              <label>
                <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                <input type="number" value={newSheetType.sortOrder} onChange={(event) => setNewSheetType((prev) => ({ ...prev, sortOrder: event.target.value }))} />
              </label>
            </div>
            <div className="system-toggle-row">
              <label className="system-status-option">
                <span className="system-status-label"><strong>Attivo</strong><small>Utilizzabile dalle campagne.</small></span>
                <span className="switch system-user-switch">
                  <input type="checkbox" checked={newSheetType.active} onChange={(event) => setNewSheetType((prev) => ({ ...prev, active: event.target.checked }))} />
                  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                </span>
              </label>
              <label className="system-status-option">
                <span className="system-status-label"><strong>Default</strong><small>Template base per il sistema e la entity.</small></span>
                <span className="switch system-user-switch">
                  <input type="checkbox" checked={newSheetType.isDefault} onChange={(event) => setNewSheetType((prev) => ({ ...prev, isDefault: event.target.checked }))} />
                  <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                </span>
              </label>
            </div>
            <label>
              <FieldLabel icon="fa-solid fa-diagram-project" label="Schema JSON" />
              <textarea className="system-json-editor" rows={10} value={newSheetType.schemaJsonText} onChange={(event) => setNewSheetType((prev) => ({ ...prev, schemaJsonText: event.target.value }))} />
            </label>
            <p className="muted">Il JSON deve essere un oggetto valido. Serve al FE per comporre i blocchi in modo configurabile.</p>
            {newSheetTypeError && <p className="system-inline-error">{newSheetTypeError}</p>}
            <button type="button" className="primary-btn" disabled={busy || gameSystems.length === 0} onClick={() => void submitNewSheetType()}>
              <Icon name="fa-solid fa-plus" /><span>Crea sheet type</span>
            </button>
          </div>

          <div className="system-sheet-list">
            {sortedSheetTypes.length === 0 ? (
              <div className="system-empty-cell system-sheet-empty">Nessuno sheet type configurato.</div>
            ) : (
              sortedSheetTypes.map((item) => {
                const draft = sheetTypeDrafts[item.code] || {
                  code: item.code, label: item.label, description: item.description || '',
                  gameSystemCode: item.gameSystemCode, entityType: item.entityType,
                  schemaVersion: String(item.schemaVersion), sortOrder: String(item.sortOrder),
                  active: item.active, isDefault: item.isDefault,
                  schemaJsonText: JSON.stringify(item.schemaJson || {}, null, 2),
                }
                const isDirty =
                  draft.label !== item.label || (draft.description || '') !== (item.description || '') ||
                  draft.gameSystemCode !== item.gameSystemCode || draft.entityType !== item.entityType ||
                  draft.schemaVersion !== String(item.schemaVersion) || draft.sortOrder !== String(item.sortOrder) ||
                  draft.active !== item.active || draft.isDefault !== item.isDefault ||
                  draft.schemaJsonText !== JSON.stringify(item.schemaJson || {}, null, 2)

                return (
                  <article key={item.code} className="surface-card system-sheet-card">
                    <div className="system-sheet-card-head">
                      <div>
                        <div className="system-sheet-title-row">
                          <h4>{item.label}</h4>
                          <span className="readonly-chip">{item.code}</span>
                          {item.isDefault && <span className="status status-info">Default</span>}
                          {!item.active && <span className="status status-neutral">Disattivo</span>}
                        </div>
                        <p className="muted">
                          {gameSystems.find((system) => system.code === item.gameSystemCode)?.label || item.gameSystemCode} · {item.entityType} · v{item.schemaVersion}
                        </p>
                      </div>
                      <div className="system-row-actions">
                        <span className={`status ${isDirty ? 'status-warning' : 'status-neutral'}`}>{isDirty ? 'Da salvare' : 'Salvato'}</span>
                        <button type="button" className="refresh-btn" disabled={busy || !isDirty} onClick={() => void saveSheetType(item.code)}>
                          <Icon name="fa-solid fa-floppy-disk" /><span>Salva</span>
                        </button>
                      </div>
                    </div>

                    <div className="system-catalog-form-grid">
                      <label>
                        <FieldLabel icon="fa-solid fa-signature" label="Label" />
                        <input value={draft.label} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, label: event.target.value } }))} />
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
                        <select value={draft.gameSystemCode} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, gameSystemCode: event.target.value } }))}>
                          {gameSystems.map((system) => <option key={system.code} value={system.code}>{system.label || system.code}</option>)}
                        </select>
                      </label>
                    </div>

                    <div className="system-catalog-form-grid">
                      <label>
                        <FieldLabel icon="fa-solid fa-layer-group" label="Entity type" />
                        <select value={draft.entityType} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, entityType: event.target.value as SheetEntityType } }))}>
                          {entityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-code-branch" label="Schema version" />
                        <input type="number" value={draft.schemaVersion} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, schemaVersion: event.target.value } }))} />
                      </label>
                      <label>
                        <FieldLabel icon="fa-solid fa-sort" label="Ordine" />
                        <input type="number" value={draft.sortOrder} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, sortOrder: event.target.value } }))} />
                      </label>
                    </div>

                    <label>
                      <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
                      <textarea rows={3} value={draft.description} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, description: event.target.value } }))} />
                    </label>

                    <div className="system-toggle-row">
                      <label className="system-status-option">
                        <span className="system-status-label"><strong>Attivo</strong><small>Disponibile per la selezione runtime.</small></span>
                        <span className="switch system-user-switch">
                          <input type="checkbox" checked={draft.active} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, active: event.target.checked } }))} />
                          <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                        </span>
                      </label>
                      <label className="system-status-option">
                        <span className="system-status-label"><strong>Default</strong><small>Template base per questo sistema/entity.</small></span>
                        <span className="switch system-user-switch">
                          <input type="checkbox" checked={draft.isDefault} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, isDefault: event.target.checked } }))} />
                          <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                        </span>
                      </label>
                    </div>

                    <label>
                      <FieldLabel icon="fa-solid fa-diagram-project" label="Schema JSON" />
                      <textarea className="system-json-editor" rows={10} value={draft.schemaJsonText} onChange={(event) => setSheetTypeDrafts((prev) => ({ ...prev, [item.code]: { ...draft, schemaJsonText: event.target.value } }))} />
                    </label>
                    <p className="muted">Edita il JSON senza reflection. Il backend lo salva versionato e il FE lo interpreta per blocchi.</p>
                    {sheetTypeErrors[item.code] && <p className="system-inline-error">{sheetTypeErrors[item.code]}</p>}
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
