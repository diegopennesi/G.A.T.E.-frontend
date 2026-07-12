import { ApiError } from '../services/apiClient'
import type { CampaignCatalogEntry, Character, SheetSchemaBlock, SheetSchemaField } from '../types/domain'

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.payload?.fields
      ? ` (${Object.entries(error.payload.fields)
          .map(([key, value]) => `${key}:${value}`)
          .join(', ')})`
      : ''
    return `${error.message}${fields}`
  }
  if (error instanceof Error) return error.message
  return 'Errore non gestito'
}

export const catalogEntryByCode = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): CampaignCatalogEntry | null => {
  if (!code) return null
  return entries.find((entry) => entry.code === code) || null
}

export const catalogEntryLabel = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): string | null => {
  return catalogEntryByCode(entries, code)?.label || code || null
}

export const catalogEntryDescription = (
  entries: CampaignCatalogEntry[],
  code: string | null | undefined,
): string | null => {
  if (!code) return null
  return catalogEntryByCode(entries, code)?.description || null
}

export const CAMPAIGN_TONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'EPIC_FANTASY', label: 'Fantasy Epico' },
  { value: 'HEROIC', label: 'Eroico' },
  { value: 'DARK', label: 'Dark' },
  { value: 'MYSTERY', label: 'Mistero' },
  { value: 'HORROR', label: 'Horror' },
  { value: 'POLITICAL_INTRIGUE', label: 'Intrigo Politico' },
  { value: 'ADVENTURE', label: 'Avventura' },
  { value: 'LIGHTHEARTED', label: 'Leggero' },
]

export const campaignToneLabel = (value: string | null | undefined): string | null => {
  if (!value) return null
  const match = CAMPAIGN_TONE_OPTIONS.find((opt) => opt.value === value)
  return match?.label || value
}

export function scopedStorageKey(baseKey: string, userId?: string | null): string {
  return userId ? `${baseKey}:${userId}` : baseKey
}

export function readStoredJson<T>(storage: Storage, key: string, fallback: T): T {
  const raw = storage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export type SortDirection = 'asc' | 'desc'

export const compareSortableValues = (
  left: unknown,
  right: unknown,
  direction: SortDirection,
): number => {
  const factor = direction === 'asc' ? 1 : -1
  const normalize = (value: unknown) => {
    if (typeof value === 'boolean') return value ? 1 : 0
    if (typeof value === 'number') return value
    return String(value ?? '').toLowerCase()
  }
  const a = normalize(left)
  const b = normalize(right)
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * factor
  return String(a).localeCompare(String(b), 'it') * factor
}

export const formatShortDate = (value: string | null | undefined): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date)
}

// --- Campaign module helpers ---

export const CAMPAIGN_MODULE_UNAVAILABLE_HINT = 'Non attualmente disponibile'
export const CAMPAIGN_MODULE_HIDDEN_CODES = new Set(['NOTIFICATIONS'])
export const CAMPAIGN_MODULE_UNAVAILABLE_CODES = new Set(['STANZE'])

export function campaignModuleIconName(module: CampaignCatalogEntry): string {
  const token = `${module.code} ${module.label}`.toLowerCase()
  if (token.includes('mission') || token.includes('quest') || token.includes('board') || token.includes('bacheca')) return 'lucide:Flag'
  if (token.includes('stanza') || token.includes('room') || token.includes('door')) return 'lucide:DoorOpen'
  if (token.includes('chat') || token.includes('messag') || token.includes('comment')) return 'lucide:MessagesSquare'
  if (token.includes('notif')) return 'lucide:Bell'
  return 'lucide:Gamepad2'
}

export function gameSystemIconName(value: string | null | undefined): string {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s._-]+/g, '')

  const matchesAny = (aliases: string[]) => aliases.some((alias) => token.includes(alias))

  if (matchesAny(['DND', 'DND5E', 'DND2024', 'DUNGEONSANDDRAGONS', 'DUNGEONSDRAGONS'])) return 'lucide:Swords'
  if (matchesAny(['PATHFINDER', 'PF2', 'PF2E', 'PF1', 'PF1E'])) return 'lucide:Map'
  if (matchesAny(['CALL_OF_CTHULHU'.replace(/_/g, ''), 'CALLOFCTHULHU', 'CTHULHU', 'COC7', 'COC'])) return 'lucide:Eye'
  if (matchesAny(['VAMPIRE', 'VTM', 'MASQUERADE', 'V5'])) return 'lucide:MoonStar'
  if (matchesAny(['WARHAMMER', 'WH40K', 'WARHAMMER40K', 'ROGUETRADER'])) return 'lucide:Shield'
  if (matchesAny(['CYBERPUNK', 'CPRED', 'CYBERPUNKRED'])) return 'lucide:Gamepad2'
  if (matchesAny(['FABULAULTIMA', 'FABULA'])) return 'lucide:BookOpen'
  if (matchesAny(['SEVENTHSEA', '7THSEA'])) return 'lucide:ScrollText'
  return 'lucide:ScrollText'
}

export function campaignModuleTitle(module: CampaignCatalogEntry): string {
  return module.label || module.code
}

export function campaignModuleDescription(module: CampaignCatalogEntry): string {
  switch (module.code) {
    case 'MISSIONI':
      return 'Abilita missioni, iscrizioni, chiusure e la chat dedicata della missione, accessibile solo a titolari e panchina.'
    case 'STANZE':
      return 'Spazi dedicati alla campagna. Non attualmente disponibile.'
    default:
      return module.description || 'Addon disponibile per la campagna.'
  }
}

export function campaignModuleUnavailable(module: CampaignCatalogEntry): boolean {
  return CAMPAIGN_MODULE_UNAVAILABLE_CODES.has(module.code)
}

// --- Character helpers ---

export function statusTone(status: Character['characterStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'RETIRED') return 'warning'
  if (status === 'DEAD') return 'danger'
  return 'neutral'
}

export function platformRoleLabel(role: string): string {
  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'SYSTEM') return 'SYSTEM'
  return 'USER'
}

// --- Character sheet helpers ---

export function getSheetBlocks(schemaJson: Record<string, unknown>): SheetSchemaBlock[] {
  const rawBlocks = Array.isArray(schemaJson.blocks) ? schemaJson.blocks : []
  const blocks: SheetSchemaBlock[] = []
  for (const block of rawBlocks) {
    if (!block || typeof block !== 'object') continue
    const item = block as Record<string, unknown>
    const rawFields = Array.isArray(item.fields) ? item.fields : []
    const fields: SheetSchemaField[] = []
    for (const field of rawFields) {
      if (!field || typeof field !== 'object') continue
      fields.push(field as SheetSchemaField)
    }
    blocks.push({
      key: typeof item.key === 'string' ? item.key : undefined,
      label: typeof item.label === 'string' ? item.label : undefined,
      description: typeof item.description === 'string' ? item.description : null,
      fields,
    })
  }
  return blocks
}

export function sheetFieldPath(blockKey: string, fieldKey: string): string {
  return `${blockKey}.${fieldKey}`
}

export function getSheetOptionValue(option: unknown): string {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return String(option)
  }
  if (!option || typeof option !== 'object') return ''
  const record = option as Record<string, unknown>
  return String(record.value ?? record.code ?? record.key ?? record.label ?? '')
}

export function getSheetOptionLabel(option: unknown): string {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    return String(option)
  }
  if (!option || typeof option !== 'object') return ''
  const record = option as Record<string, unknown>
  return String(record.label ?? record.name ?? record.title ?? record.value ?? record.code ?? record.key ?? '')
}

export function sheetValueAsText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

export function parseSheetValue(type: string | undefined, rawValue: string, checked?: boolean): unknown {
  switch ((type || 'text').toLowerCase()) {
    case 'number':
      return rawValue.trim() === '' ? null : Number.parseInt(rawValue, 10)
    case 'boolean':
      return Boolean(checked)
    case 'tags':
      return rawValue.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
    default:
      return rawValue
  }
}
