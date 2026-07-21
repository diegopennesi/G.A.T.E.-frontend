import { Fragment, useEffect, useState } from 'react'
import { useAdminContext } from '../../../context'
import { FieldLabel, Icon } from '../../../shared/components'

export function SystemCatalogsPage() {
  const {
    busy,
    gameSystems,
    refreshSystemCatalogs: onRefresh,
    createGameSystem: onCreateGameSystem,
    saveGameSystem: onSaveGameSystem,
  } = useAdminContext()

  type GameSystemDraft = {
    code: string
    label: string
    description: string
    active: boolean
    sortOrder: number
  }

  const createDefaultGameSystemDraft = (): GameSystemDraft => ({
    code: '',
    label: '',
    description: '',
    active: true,
    sortOrder: 0,
  })

  const [newGameSystem, setNewGameSystem] = useState<GameSystemDraft>(createDefaultGameSystemDraft)
  const [newGameSystemError, setNewGameSystemError] = useState('')
  const [gameSystemDrafts, setGameSystemDrafts] = useState<Record<string, GameSystemDraft>>({})
  const [gameSystemErrors, setGameSystemErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setGameSystemDrafts(
      Object.fromEntries(
        gameSystems.map((item) => [
          item.code,
          {
            code: item.code,
            label: item.label,
            description: item.description || '',
            active: item.active,
            sortOrder: item.sortOrder,
          },
        ]),
      ),
    )
    setGameSystemErrors({})
  }, [gameSystems])

  const sortedGameSystems = [...gameSystems].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.label.localeCompare(right.label, 'it')
  })

  const submitNewGameSystem = async () => {
    const code = newGameSystem.code.trim()
    const label = newGameSystem.label.trim()
    if (!code || !label) {
      setNewGameSystemError('Codice e label sono obbligatori')
      return
    }
    setNewGameSystemError('')
    await onCreateGameSystem({
      code,
      label,
      description: newGameSystem.description.trim(),
      active: newGameSystem.active,
      sortOrder: Number.isFinite(newGameSystem.sortOrder) ? newGameSystem.sortOrder : 0,
    })
    setNewGameSystem(createDefaultGameSystemDraft())
  }

  const saveGameSystem = async (code: string) => {
    const draft = gameSystemDrafts[code]
    if (!draft) return
    const normalizedCode = code.trim()
    const label = draft.label.trim()
    if (!normalizedCode || !label) {
      setGameSystemErrors((prev) => ({ ...prev, [code]: 'Codice e label sono obbligatori' }))
      return
    }
    await onSaveGameSystem(code, {
      code: normalizedCode,
      label,
      description: draft.description.trim(),
      active: draft.active,
      sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    })
  }

  return (
    <div className="system-catalogs-layout">
      <section className="system-catalog-hero">
        <div className="system-catalog-hero-copy">
          <p className="menu-group-label">SYSTEM / GAME SYSTEM</p>
          <h3>Game system</h3>
          <p className="muted">Anagrafica amministrativa dei sistemi di gioco disponibili.</p>
        </div>
        <div className="system-catalog-hero-meta">
          <span className="status status-neutral">Game system {gameSystems.length}</span>
          <button type="button" className="refresh-btn" disabled={busy} onClick={onRefresh}>
            <Icon name="fa-solid fa-rotate-right" />
            <span>Ricarica</span>
          </button>
        </div>
      </section>

      <section className="system-catalog-panel">
        <div className="system-catalog-panel-head">
          <div>
            <h3 className="section-title">Lista game system</h3>
            <p className="muted">Crea e aggiorna solo il catalogo dei game system.</p>
          </div>
          <span className="readonly-chip">{gameSystems.length} record</span>
        </div>

        <div className="system-catalog-form">
          <div className="system-catalog-form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-key" label="Codice nuovo game system" />
              <input value={newGameSystem.code} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, code: event.target.value }))} placeholder="DND5E" />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Label" />
              <input value={newGameSystem.label} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, label: event.target.value }))} placeholder="D&D 5E" />
            </label>
          </div>
          <label>
            <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
            <textarea rows={3} value={newGameSystem.description} onChange={(event) => setNewGameSystem((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descrizione amministrativa del game system" />
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
            <span>Crea game system</span>
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
                <tr><td className="system-empty-cell" colSpan={6}>Nessun game system censito.</td></tr>
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
    </div>
  )
}
