import { useMemo, useState } from 'react'
import { useCharacterContext } from '../../../context'
import { Icon } from '../../../shared/components'
import {
  getSheetBlocks,
  getSheetOptionLabel,
  getSheetOptionValue,
  parseSheetValue,
  sheetFieldPath,
  sheetValueAsText,
  statusTone,
} from '../../../shared/utils'
import type { CharacterStatus, SheetSchemaBlock, SheetSchemaField } from '../../../types/domain'

export function CharacterDetailPage() {
  const {
    selectedCharacter: character,
    characterDetail: externalDetail,
    characterSheetDetail: sheet,
    ownerProfileLabel,
    campaignNameForCharacter,
    canMarkCharacterDead,
    canReactivateCharacter,
    refreshCharacterDetail: onRefresh,
    updateCharacterStatus: onUpdateStatus,
    saveCharacterSheet: onSaveSheet,
  } = useCharacterContext()
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>(value?.characterStatus || 'ACTIVE')
  const [sheetDraft, setSheetDraft] = useState<Record<string, unknown>>(() => sheet?.dataJson || {})
  const [sheetDirty, setSheetDirty] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const sheetBlocks = useMemo(() => getSheetBlocks(sheet?.schemaJson || {}), [sheet?.schemaJson])

  const deadAllowed = canMarkCharacterDead(value)
  const effectiveStatus = status === 'DEAD' && !deadAllowed ? 'RETIRED' : status
  const canReactivate = canReactivateCharacter(value)
  const sheetLockedBecauseInactive = value?.characterStatus !== 'ACTIVE'
  const canEditSheet = Boolean(sheet?.editable && !sheetLockedBecauseInactive)

  const updateSheetField = (fieldPath: string, nextValue: unknown) => {
    setSheetDraft((prev) => ({ ...prev, [fieldPath]: nextValue }))
    setSheetDirty(true)
  }

  const saveSheet = async () => {
    if (!canEditSheet || !sheetDirty || sheetSaving) return
    setSheetSaving(true)
    try {
      await onSaveSheet(sheetDraft)
      setSheetDirty(false)
    } finally {
      setSheetSaving(false)
    }
  }

  const renderSheetField = (blockKey: string, field: SheetSchemaField) => {
    const fieldKey = field.key?.trim()
    if (!fieldKey) return null
    const path = sheetFieldPath(blockKey, fieldKey)
    const type = (field.type || 'text').toLowerCase()
    const currentValue =
      sheetDraft[path] !== undefined
        ? sheetDraft[path]
        : field.defaultValue !== undefined
          ? field.defaultValue
          : type === 'number'
            ? 0
            : type === 'boolean'
              ? false
              : type === 'tags'
                ? []
                : ''
    const disabled = !canEditSheet

    return (
      <div key={path} className="sheet-field">
        <span className="sheet-field-label">
          {field.label || fieldKey}
          {field.required && <span className="sheet-field-required">*</span>}
        </span>
        {type === 'textarea' ? (
          <textarea
            rows={4}
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, event.target.value)}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        ) : type === 'boolean' ? (
          <label className="sheet-checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              disabled={disabled}
              onChange={(event) => updateSheetField(path, parseSheetValue(type, '', event.target.checked))}
            />
            <span>{field.placeholder || 'Valore booleano'}</span>
          </label>
        ) : type === 'select' && Array.isArray(field.options) && field.options.length > 0 ? (
          <select
            value={sheetValueAsText(currentValue)}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, event.target.value)}
          >
            <option value="">Seleziona</option>
            {field.options.map((option: unknown) => {
              const optionValue = getSheetOptionValue(option)
              const optionLabel = getSheetOptionLabel(option)
              return (
                <option key={optionValue || optionLabel} value={optionValue}>
                  {optionLabel || optionValue}
                </option>
              )
            })}
          </select>
        ) : type === 'tags' ? (
          <input
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || 'tag1, tag2'}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        ) : (
          <input
            value={sheetValueAsText(currentValue)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, parseSheetValue(type, event.target.value))}
          />
        )}
        {field.helpText && <span className="sheet-field-help">{field.helpText}</span>}
      </div>
    )
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Scheda PG</h2>
        <button type="button" className="secondary-btn" onClick={onRefresh}>
          Reload dettaglio
        </button>
      </div>
      {!value && <p className="muted">Seleziona un personaggio.</p>}
      {value && (
        <>
          <p>
            <strong>
              <span className="char-kind-icon" aria-hidden="true">
                <Icon name={value.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
              </span>{' '}
              {value.name}
            </strong>
            {value.nickname && <em className="character-alias">({value.nickname})</em>}
          </p>
          <div className="sheet-meta-row">
            <span className="status status-info">{value.isNpc ? 'NPC' : 'Personaggio'}</span>
            <span className={`status ${statusTone(value.characterStatus)}`}>{value.characterStatus || 'N/A'}</span>
            <span className="status status-neutral">{campaignNameForCharacter(value)}</span>
          </div>
          <p className="muted">profilo: {ownerProfileLabel(value.userId, value.ownerProfileName)}</p>
          {value.characterStatus !== 'ACTIVE' && (
            <p className="form-error">Scheda bloccata: il personaggio non e' attivo.</p>
          )}
          {sheet && (
            <div className="sheet-header">
              <span className="status status-neutral">{sheet.sheetTypeCode || 'Scheda non assegnata'}</span>
              <span className={`status ${sheet.hasTemplate ? 'status-success' : 'status-warning'}`}>
                {sheet.hasTemplate ? 'Template configurato' : 'Template mancante'}
              </span>
              <span className="status status-info">Version {sheet.schemaVersion}</span>
              <span className={`status ${canEditSheet ? 'status-success' : 'status-neutral'}`}>
                {canEditSheet ? 'Modificabile' : 'Sola lettura'}
              </span>
            </div>
          )}
          <label>
            Nuovo status
            <select value={effectiveStatus} onChange={(event) => setStatus(event.target.value as CharacterStatus)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RETIRED">RETIRED</option>
              {deadAllowed && <option value="DEAD">DEAD</option>}
            </select>
          </label>
          {!deadAllowed && <p className="muted">Non hai permessi per impostare lo stato DEAD.</p>}
          {effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate && (
            <p className="muted">Non hai permessi per riportare il personaggio ad ACTIVE.</p>
          )}
          <button
            type="button"
            className="primary-btn"
            disabled={(effectiveStatus === 'DEAD' && !deadAllowed) || (effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate)}
            title={
              effectiveStatus === 'DEAD' && !deadAllowed
                ? 'Non hai permessi per impostare DEAD.'
                : effectiveStatus === 'ACTIVE' && value.characterStatus !== 'ACTIVE' && !canReactivate
                  ? 'Non hai permessi per riportare il personaggio ad ACTIVE.'
                  : undefined
            }
            onClick={() => onUpdateStatus(effectiveStatus)}
          >
            Aggiorna Status
          </button>
          <div className="divider" />
          <div className="row-between">
            <h3 className="section-title">Scheda sistema</h3>
            <button type="button" className="secondary-btn" onClick={onRefresh}>
              Reload dettaglio
            </button>
          </div>
          {!sheet && <p className="muted">Caricamento scheda sistema...</p>}
          {sheet && !sheet.hasTemplate && (
            <p className="muted">Nessun template configurato per il sistema di gioco di questa campagna.</p>
          )}
          {sheet && sheet.hasTemplate && (
            <>
              {sheetBlocks.length === 0 ? (
                <p className="muted">La scheda non espone blocchi configurati.</p>
              ) : (
                <div className="sheet-grid">
                  {sheetBlocks.map((block: SheetSchemaBlock) => {
                    const blockKey = block.key?.trim()
                    if (!blockKey) return null
                    return (
                      <section key={blockKey} className="sheet-block">
                        <div className="sheet-block-head">
                          <div>
                            <h4>{block.label || blockKey}</h4>
                            {block.description && <p className="muted">{block.description}</p>}
                          </div>
                        </div>
                        <div className="sheet-fields-grid">
                          {(block.fields || []).map((field: SheetSchemaField) => renderSheetField(blockKey, field))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
              <div className="sheet-actions">
                {sheet.updatedAt && <p className="muted">Ultimo salvataggio: {new Date(sheet.updatedAt).toLocaleString('it-IT')}</p>}
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!canEditSheet || !sheetDirty || sheetSaving}
                  title={!canEditSheet ? 'La scheda non e modificabile quando il personaggio non e attivo.' : undefined}
                  onClick={() => void saveSheet()}
                >
                  <Icon name="fa-solid fa-floppy-disk" />
                  <span>{sheetSaving ? 'Salvataggio...' : 'Salva scheda'}</span>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
