import { useMemo, useState } from 'react'
import { useCampaignContext } from '../../../context'
import { DataTable, FieldLabel, Icon } from '../../../shared/components'
import type { CampaignCatalogEntry } from '../../../types/domain'
import { CAMPAIGN_TONE_OPTIONS, campaignModuleIconName, catalogEntryDescription } from '../../../shared/utils'

function campaignModuleTitle(module: CampaignCatalogEntry): string {
  return module.label || module.code
}

type CampaignToggleRow = {
  key: string
  title: string
  description: string
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: () => void
}

type CreateCampaignToggleItem = CampaignToggleRow | CampaignCatalogEntry

function CreateCampaignToggleSettingsTable({
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

  const renderRowForModule = (module: CampaignCatalogEntry) => {
    const enabled = selectedModules?.includes(module.code) || false
    return (
      <tr key={module.code}>
        <td>
          <div className="data-table-primary">
            <p className="data-table-title">
              <span className="field-label-with-icon">
                <Icon name={campaignModuleIconName(module)} className="field-label-icon" />
                <span>{campaignModuleTitle(module)}</span>
              </span>
            </p>
          </div>
        </td>
        <td className="data-table-secondary">{module.description || 'Addon campagna'}</td>
        <td>
          <span className={`status ${enabled ? 'status-success' : 'status-neutral'}`}>
            {enabled ? 'Attivo' : 'Disattivo'}
          </span>
        </td>
        <td>
          <label className="switch" aria-label={`${campaignModuleTitle(module)} ${enabled ? 'attivo' : 'disattivo'}`}>
            <input type="checkbox" checked={enabled} onChange={() => onToggle?.(module.code)} />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </label>
        </td>
      </tr>
    )
  }

  const dataRows: CreateCampaignToggleItem[] = rows || availableModules || []
  const isModuleTable = Boolean(availableModules)

  return (
    <div className="campaign-toggle-settings">
      <div className="row-between">
        <div>
          <p className="section-title">{title}</p>
          <p className="muted">{description}</p>
        </div>
        {isModuleTable && availableModules && availableModules.length > 0 ? (
          <span className="readonly-chip">{selectedModules?.length || 0}/{availableModules.length} attivi</span>
        ) : null}
      </div>
      <DataTable
        columns={[
          { key: 'setting', label: 'Impostazione' },
          { key: 'description', label: 'Descrizione' },
          { key: 'status', label: 'Stato' },
          { key: 'toggle', label: 'Toggle' },
        ]}
        rows={dataRows}
        getRowKey={(item) => ('code' in item ? item.code : item.key)}
        emptyMessage={isModuleTable ? 'Nessun addon disponibile.' : 'Nessuna impostazione disponibile.'}
        renderRow={(item) => ('code' in item ? renderRowForModule(item) : renderRowForSetting(item))}
      />
    </div>
  )
}

export function CreateCampaignPage() {
  const { availableModules, availableGameSystems, createCampaign: onCreate } = useCampaignContext()
  const [name, setName] = useState('Nuova Campagna')
  const [description, setDescription] = useState('')
  const [summary, setSummary] = useState('')
  const [setting, setSetting] = useState('')
  const [tone, setTone] = useState('')
  const [rules, setRules] = useState('')
  const [requirements, setRequirements] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [isSearchable, setIsSearchable] = useState(true)
  const [selectedGameSystemChoice, setSelectedGameSystemChoice] = useState('')
  const [selectedModulesDraft, setSelectedModulesDraft] = useState<string[]>([])
  const availableModuleCodes = useMemo(() => availableModules.map((module) => module.code), [availableModules])
  const availableGameSystemCodes = useMemo(() => availableGameSystems.map((item) => item.code), [availableGameSystems])
  const selectedGameSystem =
    availableGameSystemCodes.length === 0
      ? 'DND5E'
      : availableGameSystemCodes.includes(selectedGameSystemChoice)
        ? selectedGameSystemChoice
        : availableGameSystemCodes[0]
  const selectedModules =
    availableModuleCodes.length === 0
      ? []
      : selectedModulesDraft.length === 0
        ? availableModuleCodes
        : selectedModulesDraft.filter((moduleCode) => availableModuleCodes.includes(moduleCode))

  const toggleModule = (moduleCode: string) => {
    setSelectedModulesDraft((prev) => {
      const baseSelection = prev.length === 0 ? availableModuleCodes : prev
      return baseSelection.includes(moduleCode)
        ? baseSelection.filter((item) => item !== moduleCode)
        : [...baseSelection, moduleCode]
    })
  }
  const campaignVisibilityRows = [
    {
      key: 'open',
      title: 'Campagna aperta',
      description: 'Permette richiesta di accesso dall’elenco campagne.',
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
  ]

  const selectedGameSystemDescription = catalogEntryDescription(availableGameSystems, selectedGameSystem)

  return (
    <section className="panel">
      <h2>Crea Campagna</h2>
      <label>
        <FieldLabel icon="fa-solid fa-gamepad" label="Sistema di gioco" />
        <select
          required
          value={selectedGameSystem}
          onChange={(event) => setSelectedGameSystemChoice(event.target.value)}
        >
          {availableGameSystems.length > 0 ? (
            availableGameSystems.map((gameSystem) => (
              <option key={gameSystem.code} value={gameSystem.code}>
                {gameSystem.label || gameSystem.code}
              </option>
            ))
          ) : (
            <option value="DND5E">D&D 5E</option>
          )}
        </select>
        <p className="muted">{selectedGameSystemDescription}</p>
        <p className="muted">Obbligatorio. Definisce il template della scheda e la logica base della campagna.</p>
      </label>
      <label>
        <FieldLabel icon="fa-solid fa-signature" label="Nome" />
        <input value={name} placeholder="Nome della campagna" onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <FieldLabel icon="fa-solid fa-align-left" label="Descrizione" />
        <textarea rows={3} placeholder="Descrizione estesa della campagna" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        <FieldLabel icon="fa-solid fa-quote-right" label="Riassunto breve" />
        <textarea rows={2} placeholder="Riassunto breve visibile in elenco" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={280} />
      </label>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-map-location-dot" label="Ambientazione" />
          <textarea rows={3} placeholder="Ambientazione, mondo o contesto di gioco" value={setting} onChange={(event) => setSetting(event.target.value)} />
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
      <CreateCampaignToggleSettingsTable
        title="Visibilità e accesso"
        description="Impostazioni base di pubblicazione della campagna."
        rows={campaignVisibilityRows}
      />
      <CreateCampaignToggleSettingsTable
        title="Addon campagna"
        description="I moduli sono sempre visibili e puoi attivarli o disattivarli senza passaggi aggiuntivi."
        availableModules={availableModules}
        selectedModules={selectedModules}
        onToggle={toggleModule}
      />
      <button
        type="button"
        className="primary-btn campaign-submit-btn"
        onClick={() =>
          onCreate({
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
            gameSystem: selectedGameSystem,
            allowedModules: selectedModules,
          })
        }
      >
        <Icon name="fa-solid fa-plus" />
        Crea
      </button>
    </section>
  )
}
