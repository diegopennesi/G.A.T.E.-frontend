import { useMemo } from 'react'
import { getSheetBlocks, getSheetOptionLabel, getSheetOptionValue, parseSheetValue, sheetFieldPath, sheetValueAsText } from '../../../shared/utils'
import type { CharacterSheetResponse, SheetSchemaField } from '../../../types/domain'

type FieldProps = { blockKey: string; field: SheetSchemaField; sheet: CharacterSheetResponse; draft: Record<string, unknown>; editable: boolean; update: (path: string, value: unknown) => void }
const abilityKeys = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
function SheetField({ blockKey, field, sheet, draft, editable, update }: FieldProps) {
  const key = field.key?.trim()
  if (!key) return null
  const path = sheetFieldPath(blockKey, key)
  const type = (field.type || 'text').toLowerCase()
  const ability = sheet.gameSystemCode === 'DND5E' && blockKey === 'abilities' && abilityKeys.has(key)
  const current = draft[path] !== undefined ? draft[path] : field.defaultValue ?? (ability ? 10 : type === 'number' ? 0 : type === 'boolean' ? false : type === 'tags' ? [] : '')
  const id = `sheet-${encodeURIComponent(path)}`
  const options = field.options?.length ? field.options : sheet.catalogOptions[field.optionsSource?.trim() || ''] || []
  const numeric = current === '' || current === null ? NaN : Number(current)
  const modifier = Number.isFinite(numeric) ? Math.floor((numeric - 10) / 2) : null
  const props = { id, disabled: !editable || field.readOnly === true, required: field.required === true && type !== 'boolean', 'aria-describedby': field.helpText ? `${id}-help` : undefined }
  const input = type === 'textarea' ? <textarea {...props} rows={4} value={sheetValueAsText(current)} placeholder={field.placeholder || undefined} onChange={event => update(path, event.target.value)} />
    : type === 'number' || ability ? <input {...props} type="number" value={current === null ? '' : String(current)} min={field.min} max={field.max} step={field.step} onChange={event => update(path, parseSheetValue('number', event.target.value))} />
    : type === 'boolean' ? <input {...props} type="checkbox" checked={Boolean(current)} onChange={event => update(path, event.target.checked)} />
    : type === 'select' && options.length > 0 ? <select {...props} value={sheetValueAsText(current)} onChange={event => update(path, event.target.value)}><option value="">Seleziona</option>{options.map(option => <option key={getSheetOptionValue(option) || getSheetOptionLabel(option)} value={getSheetOptionValue(option)}>{getSheetOptionLabel(option)}</option>)}</select>
    : <input {...props} value={sheetValueAsText(current)} placeholder={field.placeholder || (type === 'tags' ? 'Separa le voci con una virgola' : undefined)} onChange={event => update(path, parseSheetValue(type, event.target.value))} />
  return (
    <div className={`sheet-field ${ability ? 'sheet-ability-card' : ''} ${type === 'boolean' ? 'sheet-boolean-field' : ''}`}>
      <div className="sheet-ability-head">
        <label htmlFor={id} className="sheet-field-label">{field.label || key}{field.required && type !== 'boolean' && <span className="sheet-field-required" aria-hidden="true"> *</span>}</label>
        {ability && <output htmlFor={id} className="status status-info sheet-ability-modifier" aria-label={`Modificatore ${field.label || key}`}>{modifier === null ? '—' : modifier >= 0 ? `+${modifier}` : modifier}</output>}
      </div>
      {input}
      {field.helpText && <span id={`${id}-help`} className="sheet-field-help">{field.helpText}</span>}
    </div>
  )
}

export function CharacterSheetFields({ sheet, draft, editable, update }: Omit<FieldProps, 'blockKey' | 'field'>) {
  const blocks = useMemo(() => getSheetBlocks(sheet.schemaJson), [sheet.schemaJson])
  if (!blocks.length) return <p className="muted">La scheda non contiene ancora campi configurati.</p>
  return <div className="sheet-grid">{blocks.map(block => {
    const key = block.key?.trim()
    if (!key) return null
    return <section key={key} className="sheet-block" aria-labelledby={`sheet-block-${encodeURIComponent(key)}`}>
      <div className="sheet-block-head"><h4 id={`sheet-block-${encodeURIComponent(key)}`}>{block.label || key}</h4>{block.description && <p className="muted">{block.description}</p>}</div>
      <div className={sheet.gameSystemCode === 'DND5E' && key === 'abilities' ? 'sheet-abilities-grid' : 'sheet-fields-grid'}>
        {(block.fields || []).map(field => <SheetField key={field.key} blockKey={key} field={field} sheet={sheet} draft={draft} editable={editable} update={update} />)}
      </div>
    </section>
  })}</div>
}
