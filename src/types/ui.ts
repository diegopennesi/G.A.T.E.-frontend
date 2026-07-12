import type { CampaignRole } from './domain'

export type Screen =
  | 'Ingresso'
  | 'Lista Campagne'
  | 'Crea Campagna'
  | 'Scheda Campagna'
  | 'Approvazione Accessi'
  | 'Missioni'
  | 'Stanze'
  | 'Log'
  | 'Profilo'
  | 'Modifica Profilo'
  | 'Gestione Personaggi'
  | 'Scheda PG'
  | 'Gestione Campagna'
  | 'Profilo Membro Campagna'
  | 'Seleziona PG'
  | 'Crea Personaggio'

export type AuthMode = 'login' | 'register' | 'recover'

export type UiEvent = {
  id: string
  ts: string
  text: string
  level: 'info' | 'ok' | 'error'
}

export type BreadcrumbItem = {
  label: string
  target?: Screen
}

export type ThemeMode = 'light' | 'dark'
export type EffectiveThemeMode = ThemeMode | 'sysadmin'

export type CampaignPickerCampaign = {
  campaignId: string
  campaignName: string
  role: CampaignRole
  isActive: boolean
  disabled: boolean
}

export type LeaveCampaignContext = {
  campaignName: string
  characterWillBeRetired: boolean
}

export type InviteAccessPreview = {
  campaignId: string
  campaignName: string
  campaignSummary: string | null
  coverImageUrl: string | null
  founderId: string
  isOpen: boolean
  gameSystem: string | null
  capabilities: string[]
  modeLabel: string
  modeTone: 'success' | 'warning'
}

export const SCREEN_PATH_SEGMENTS: Record<Screen, string> = {
  Ingresso: 'ingresso',
  Profilo: 'profilo',
  'Modifica Profilo': 'profilo-modifica',
  'Lista Campagne': 'campagne',
  'Crea Campagna': 'campagne-nuova',
  'Scheda Campagna': 'campagna',
  'Approvazione Accessi': 'campagna-accessi',
  Missioni: 'missioni',
  Stanze: 'stanze',
  Log: 'log',
  'Gestione Personaggi': 'personaggi',
  'Scheda PG': 'personaggio',
  'Gestione Campagna': 'campagna-gestione',
  'Profilo Membro Campagna': 'membro',
  'Seleziona PG': 'personaggi-seleziona',
  'Crea Personaggio': 'personaggi-nuovo',
}

export const SCREEN_LABELS: Record<Screen, string> = {
  Ingresso: 'Ingresso',
  'Lista Campagne': 'Campagne',
  'Crea Campagna': 'Crea campagna',
  'Scheda Campagna': 'Scheda campagna',
  'Approvazione Accessi': 'Accessi',
  Missioni: 'Missioni',
  Stanze: 'Stanze',
  Log: 'Log',
  Profilo: 'Profilo',
  'Modifica Profilo': 'Modifica profilo',
  'Gestione Personaggi': 'Personaggi',
  'Scheda PG': 'Scheda PG',
  'Gestione Campagna': 'Gestione campagna',
  'Profilo Membro Campagna': 'Profilo membro',
  'Seleziona PG': 'Seleziona PG',
  'Crea Personaggio': 'Crea personaggio',
}

export type NavigationSection = {
  label: string
  description: string
  items: Screen[]
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    label: 'Essenziali',
    description: 'Le viste che userai più spesso.',
    items: ['Profilo', 'Lista Campagne', 'Missioni', 'Gestione Personaggi', 'Log'],
  },
  {
    label: 'Strumenti',
    description: 'Operazioni di supporto e dettagli.',
    items: [
      'Crea Campagna',
      'Scheda Campagna',
      'Approvazione Accessi',
      'Gestione Campagna',
      'Stanze',
      'Modifica Profilo',
      'Scheda PG',
      'Crea Personaggio',
    ],
  },
]

export const SCREEN_ICONS: Record<Screen, string> = {
  Ingresso: 'fa-solid fa-door-open',
  'Lista Campagne': 'fa-solid fa-layer-group',
  'Crea Campagna': 'fa-solid fa-circle-plus',
  'Scheda Campagna': 'fa-solid fa-book-open',
  'Approvazione Accessi': 'fa-solid fa-shield-halved',
  Missioni: 'lucide:Flag',
  Stanze: 'fa-solid fa-door-open',
  Log: 'fa-solid fa-list-check',
  Profilo: 'fa-solid fa-user',
  'Modifica Profilo': 'fa-solid fa-user-gear',
  'Gestione Personaggi': 'fa-solid fa-users',
  'Scheda PG': 'fa-solid fa-id-card',
  'Gestione Campagna': 'fa-solid fa-sliders',
  'Profilo Membro Campagna': 'fa-solid fa-address-card',
  'Seleziona PG': 'fa-solid fa-address-book',
  'Crea Personaggio': 'fa-solid fa-wand-magic-sparkles',
}
