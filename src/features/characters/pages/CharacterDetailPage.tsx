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
import type {
  CharacterSheetChangeResponse,
  CharacterSheetReviewResponse,
  CharacterSheetReviewSummaryResponse,
  CharacterSheetReviewStatus,
  CharacterStatus,
  SheetSchemaBlock,
  SheetSchemaField,
} from '../../../types/domain'

const DND_ABILITY_FIELD_KEYS = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
type SheetReviewListItem = CharacterSheetReviewResponse | CharacterSheetReviewSummaryResponse

function isSheetReviewDetail(review: SheetReviewListItem): review is CharacterSheetReviewResponse {
  return 'reviewedAt' in review
}

export function CharacterDetailPage() {
  const {
    selectedCharacter: character,
    characterDetail: externalDetail,
    characterSheetDetail: sheet,
    characterSheetHistory,
    ownerProfileLabel,
    canMarkCharacterDead,
    canReactivateCharacter,
    canViewSheetHistory,
    canReviewSheetChanges,
    refreshCharacterDetail: onRefresh,
    updateCharacterStatus: onUpdateStatus,
    saveCharacterSheet: onSaveSheet,
    approveCharacterSheetReview: onApproveSheetReview,
    rejectCharacterSheetReview: onRejectSheetReview,
  } = useCharacterContext()
  const value = externalDetail || character
  const [status, setStatus] = useState<CharacterStatus>(value?.characterStatus || 'ACTIVE')
  const [sheetDraft, setSheetDraft] = useState<Record<string, unknown>>(() => sheet?.dataJson || {})
  const [sheetDirty, setSheetDirty] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const [reviewBusyId, setReviewBusyId] = useState('')
  const [reviewNoteById, setReviewNoteById] = useState<Record<string, string>>({})
  const sheetBlocks = useMemo(() => getSheetBlocks(sheet?.schemaJson || {}), [sheet?.schemaJson])
  const derivedSheetValues = useMemo(() => {
    const next: Record<string, unknown> = { ...(sheet?.derivedJson || {}) }
    if (sheet?.gameSystemCode === 'DND5E') {
      for (const fieldKey of DND_ABILITY_FIELD_KEYS) {
        const path = sheetFieldPath('abilities', fieldKey)
        const rawValue = sheetDraft[path]
        const score =
          typeof rawValue === 'number'
            ? rawValue
            : typeof rawValue === 'string'
              ? Number.parseInt(rawValue, 10)
              : NaN
        if (!Number.isNaN(score)) {
          next[sheetFieldPath('abilities', `${fieldKey}Modifier`)] = Math.floor((score - 10) / 2)
        }
      }
    }
    return next
  }, [sheet?.derivedJson, sheet?.gameSystemCode, sheetDraft])

  const deadAllowed = canMarkCharacterDead(value)
  const effectiveStatus = status === 'DEAD' && !deadAllowed ? 'RETIRED' : status
  const canReactivate = canReactivateCharacter(value)
  const sheetLockedBecauseInactive = value?.characterStatus !== 'ACTIVE'
  const pendingReview: SheetReviewListItem | null =
    sheet?.pendingReview || characterSheetHistory.find((review) => review.status === 'PENDING') || null
  const sheetLockedBecausePending = Boolean(pendingReview && !canReviewSheetChanges)
  const canEditSheet = Boolean(sheet?.editable && !sheetLockedBecauseInactive && !sheetLockedBecausePending)
  const visibleReviews: SheetReviewListItem[] = canViewSheetHistory ? characterSheetHistory : pendingReview ? [pendingReview] : []

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

  const formatReviewValue = (value: unknown) => {
    if (Array.isArray(value)) return value.join(', ')
    if (value === null || value === undefined || value === '') return 'vuoto'
    if (typeof value === 'boolean') return value ? 'si' : 'no'
    return String(value)
  }

  const reviewStatusLabel = (status: CharacterSheetReviewStatus) => {
    if (status === 'PENDING') return 'Pending'
    if (status === 'APPROVED') return 'Approvata'
    return 'Rifiutata'
  }

  const reviewStatusTone = (status: CharacterSheetReviewStatus) => {
    if (status === 'PENDING') return 'status-warning'
    if (status === 'APPROVED') return 'status-success'
    return 'status-danger'
  }

  const reviewDate = (value: string | null | undefined) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('it-IT')
  }

  const renderReviewChanges = (changes: CharacterSheetChangeResponse[]) => {
    if (changes.length === 0) return <p className="muted">Nessuna differenza registrata.</p>
    return (
      <ul className="sheet-review-change-list">
        {changes.map((change) => (
          <li key={`${change.path}-${formatReviewValue(change.oldValue)}-${formatReviewValue(change.newValue)}`}>
            <span>{change.label || change.path}</span>
            <strong>
              {formatReviewValue(change.oldValue)} {'->'} {formatReviewValue(change.newValue)}
            </strong>
          </li>
        ))}
      </ul>
    )
  }

  const submitReview = async (review: CharacterSheetReviewResponse | CharacterSheetReviewSummaryResponse, action: 'approve' | 'reject') => {
    if (!canReviewSheetChanges || reviewBusyId) return
    setReviewBusyId(review.id)
    try {
      const note = reviewNoteById[review.id] || ''
      if (action === 'approve') {
        await onApproveSheetReview(review.id, note)
      } else {
        await onRejectSheetReview(review.id, note)
      }
      setReviewNoteById((prev) => {
        const next = { ...prev }
        delete next[review.id]
        return next
      })
    } finally {
      setReviewBusyId('')
    }
  }

  const resolveCatalogOptions = (field: SheetSchemaField) => {
    const source = field.optionsSource?.trim()
    if (!source || !sheet?.catalogOptions) return []
    return Array.isArray(sheet.catalogOptions[source]) ? sheet.catalogOptions[source] : []
  }

  const formatModifier = (value: unknown) => {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : NaN
    if (Number.isNaN(numericValue)) return '--'
    return numericValue >= 0 ? `+${numericValue}` : String(numericValue)
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
    const disabled = !canEditSheet || field.readOnly === true
    const selectOptions = Array.isArray(field.options) && field.options.length > 0 ? field.options : resolveCatalogOptions(field)

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
            min={field.min}
            max={field.max}
            step={field.step}
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
        ) : type === 'select' && selectOptions.length > 0 ? (
          <select
            value={sheetValueAsText(currentValue)}
            disabled={disabled}
            onChange={(event) => updateSheetField(path, event.target.value)}
          >
            <option value="">Seleziona</option>
            {selectOptions.map((option: unknown) => {
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

  const renderDndAbilityField = (blockKey: string, field: SheetSchemaField) => {
    const fieldKey = field.key?.trim()
    if (!fieldKey) return null
    const path = sheetFieldPath(blockKey, fieldKey)
    const currentValue =
      sheetDraft[path] !== undefined
        ? sheetDraft[path]
        : field.defaultValue !== undefined
          ? field.defaultValue
          : 10
    const modifierValue = derivedSheetValues[sheetFieldPath(blockKey, `${fieldKey}Modifier`)]
    const disabled = !canEditSheet || field.readOnly === true

    return (
      <div key={path} className="sheet-ability-card">
        <div className="sheet-ability-head">
          <span className="sheet-field-label">
            {field.label || fieldKey}
            {field.required && <span className="sheet-field-required">*</span>}
          </span>
          <span className="status status-info sheet-ability-modifier">{formatModifier(modifierValue)}</span>
        </div>
        <input
          type="number"
          value={currentValue === null || currentValue === undefined ? '' : String(currentValue)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(event) => updateSheetField(path, parseSheetValue('number', event.target.value))}
        />
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
          </div>
          <p className="muted">profilo: {ownerProfileLabel(value.userId, value.ownerProfileName)}</p>
          {value.characterStatus !== 'ACTIVE' && (
            <p className="form-error">Scheda bloccata: il personaggio non e' attivo.</p>
          )}
          {pendingReview && (
            <section className="sheet-review-panel sheet-review-panel-pending">
              <div className="sheet-review-panel-head">
                <div>
                  <h3>Modifica scheda pending</h3>
                  <p className="muted">
                    Inviata {reviewDate(pendingReview.submittedAt) || 'in data non disponibile'}
                  </p>
                </div>
                <span className={`status ${reviewStatusTone(pendingReview.status)}`}>
                  {reviewStatusLabel(pendingReview.status)}
                </span>
              </div>
              {renderReviewChanges(pendingReview.changes)}
              {!canReviewSheetChanges && (
                <p className="muted">La scheda resta in sola lettura finche' la modifica non viene processata.</p>
              )}
              {canReviewSheetChanges && pendingReview.status === 'PENDING' && (
                <div className="sheet-review-actions">
                  <textarea
                    rows={2}
                    value={reviewNoteById[pendingReview.id] || ''}
                    placeholder="Nota opzionale"
                    onChange={(event) =>
                      setReviewNoteById((prev) => ({ ...prev, [pendingReview.id]: event.target.value }))
                    }
                  />
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-btn danger-btn"
                      disabled={reviewBusyId === pendingReview.id}
                      onClick={() => void submitReview(pendingReview, 'reject')}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={reviewBusyId === pendingReview.id}
                      onClick={() => void submitReview(pendingReview, 'approve')}
                    >
                      Conferma
                    </button>
                  </div>
                </div>
              )}
            </section>
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
                      <section key={blockKey} className="surface-card sheet-block">
                        <div className="sheet-block-head">
                          <div>
                            <h4>{block.label || blockKey}</h4>
                            {block.description && <p className="muted">{block.description}</p>}
                          </div>
                        </div>
                        <div className={sheet?.gameSystemCode === 'DND5E' && blockKey === 'abilities' ? 'sheet-abilities-grid' : 'sheet-fields-grid'}>
                          {(block.fields || []).map((field: SheetSchemaField) =>
                            sheet?.gameSystemCode === 'DND5E' && blockKey === 'abilities'
                              ? renderDndAbilityField(blockKey, field)
                              : renderSheetField(blockKey, field),
                          )}
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
                  title={
                    sheetLockedBecausePending
                      ? 'Una modifica scheda e gia pending.'
                      : !canEditSheet
                        ? 'La scheda non e modificabile quando il personaggio non e attivo.'
                        : undefined
                  }
                  onClick={() => void saveSheet()}
                >
                  <Icon name="fa-solid fa-floppy-disk" />
                  <span>{sheetSaving ? 'Salvataggio...' : 'Salva scheda'}</span>
                </button>
              </div>
              {visibleReviews.length > 0 && (
                <section className="sheet-review-panel">
                  <div className="sheet-review-panel-head">
                    <div>
                      <h3>Storico modifiche scheda</h3>
                      <p className="muted">
                        {canViewSheetHistory ? 'Revisioni consultabili da co-master in su.' : 'Ultima modifica pending.'}
                      </p>
                    </div>
                  </div>
                  <div className="sheet-review-list">
                    {visibleReviews.map((review) => (
                      <article key={review.id} className="sheet-review-item">
                        <div className="sheet-review-item-head">
                          <div>
                            <strong>{reviewDate(review.submittedAt) || 'Data non disponibile'}</strong>
                            {isSheetReviewDetail(review) && review.reviewedAt && (
                              <span className="muted">processata {reviewDate(review.reviewedAt)}</span>
                            )}
                          </div>
                          <span className={`status ${reviewStatusTone(review.status)}`}>
                            {reviewStatusLabel(review.status)}
                          </span>
                        </div>
                        {renderReviewChanges(review.changes)}
                        {isSheetReviewDetail(review) && review.reviewNote && (
                          <p className="sheet-review-note">{review.reviewNote}</p>
                        )}
                        {canReviewSheetChanges && review.status === 'PENDING' && review.id !== pendingReview?.id && (
                          <div className="sheet-review-actions">
                            <textarea
                              rows={2}
                              value={reviewNoteById[review.id] || ''}
                              placeholder="Nota opzionale"
                              onChange={(event) =>
                                setReviewNoteById((prev) => ({ ...prev, [review.id]: event.target.value }))
                              }
                            />
                            <div className="button-row">
                              <button
                                type="button"
                                className="secondary-btn danger-btn"
                                disabled={reviewBusyId === review.id}
                                onClick={() => void submitReview(review, 'reject')}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={reviewBusyId === review.id}
                                onClick={() => void submitReview(review, 'approve')}
                              >
                                Conferma
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
