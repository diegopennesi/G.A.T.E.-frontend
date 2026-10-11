import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useCampaignContext } from '../../../context'
import { Icon } from '../../../shared/components'
import { CAMPAIGN_MODULE_HIDDEN_CODES, CAMPAIGN_MODULE_UNAVAILABLE_CODES, CAMPAIGN_TONE_OPTIONS, catalogEntryDescription, toMessage } from '../../../shared/utils'

type CampaignDraft = {
  name: string; description: string; summary: string; setting: string; tone: string
  rules: string; requirements: string; coverImageUrl: string; gameSystem: string
  isOpen: boolean; isSearchable: boolean; autoJoinEnabled: boolean
  allowedModules: string[] | null
}
const emptyDraft: CampaignDraft = {
  name: '', description: '', summary: '', setting: '', tone: '', rules: '', requirements: '',
  coverImageUrl: '', gameSystem: '', isOpen: true, isSearchable: true, autoJoinEnabled: false, allowedModules: null,
}
function readDraft(key: string): CampaignDraft {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!stored || typeof stored !== 'object') return { ...emptyDraft }
    const candidate = stored as Record<string, unknown>
    const draft = { ...emptyDraft }
    for (const field of Object.keys(emptyDraft) as Array<keyof CampaignDraft>) {
      const value = candidate[field]
      if (field === 'allowedModules') {
        if (Array.isArray(value) && value.every(item => typeof item === 'string')) draft.allowedModules = value
      } else if (typeof value === typeof emptyDraft[field]) Object.assign(draft, { [field]: value })
    }
    return draft
  } catch { return { ...emptyDraft } }
}

export function CreateCampaignPage() {
  const { availableModules, availableGameSystems, currentUserId, realmCode, closeCreateCampaign, createCampaign } = useCampaignContext()
  const draftKey = `gate_campaign_draft:${realmCode}:${currentUserId}`
  const [draft, setDraft] = useState(() => readDraft(draftKey))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState(false)
  const saveLock = useRef(false)
  const modules = availableModules.filter(module => !CAMPAIGN_MODULE_HIDDEN_CODES.has(module.code) && !CAMPAIGN_MODULE_UNAVAILABLE_CODES.has(module.code))
  const selectedModules = draft.allowedModules === null ? modules.map(module => module.code) : draft.allowedModules.filter(code => modules.some(module => module.code === code))
  const gameSystem = availableGameSystems.some(system => system.code === draft.gameSystem) ? draft.gameSystem : availableGameSystems[0]?.code || 'DND5E'
  const update = <K extends keyof CampaignDraft>(field: K, value: CampaignDraft[K]) => setDraft(previous => ({ ...previous, [field]: value }))
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)) } catch { /* The editor still works without browser storage. */ }
  }, [draft, draftKey])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saveLock.current) return
    if (!draft.name.trim()) { setError('Dai un nome alla campagna prima di crearla.'); return }
    saveLock.current = true
    setSaving(true)
    setError('')
    try {
      await createCampaign({ ...draft, name: draft.name.trim(), gameSystem, allowedModules: selectedModules })
      try { sessionStorage.removeItem(draftKey) } catch { /* No stored draft to clear. */ }
    } catch (err) { setError(`${toMessage(err)} La bozza resta disponibile: puoi riprovare.`) }
    finally { saveLock.current = false; setSaving(false) }
  }
  const leave = () => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); closeCreateCampaign() }
    catch { setStorageError(true) }
  }
  return (
    <section className="panel campaign-compose">
      <header className="campaign-compose-header">
        <button type="button" className="secondary-btn" disabled={saving} onClick={leave}><Icon name="pi pi-arrow-left" /> Torna alle campagne</button>
        <h2>Crea il tuo tavolo</h2>
        <p>Scegli un nome e il sistema di gioco. Puoi aggiungere la storia e personalizzare gli strumenti quando vuoi.</p>
      </header>
      <form onSubmit={event => void submit(event)} aria-busy={saving} onInvalidCapture={event => {
        const details = (event.target as HTMLElement).closest('details')
        if (details) details.open = true
      }}>
        <fieldset disabled={saving} className="campaign-compose-fields">
          <section className="campaign-compose-section" aria-labelledby="campaign-basics-title">
            <h3 id="campaign-basics-title">La tua campagna</h3>
            <p className="muted">Nome e sistema di gioco sono obbligatori.</p>
            <label>Nome della campagna<input required maxLength={200} value={draft.name} onChange={event => update('name', event.target.value)} placeholder="Es. Le cronache di Waterdeep" /></label>
            <label>Sistema di gioco<select required value={gameSystem} onChange={event => update('gameSystem', event.target.value)}>
              {availableGameSystems.length ? availableGameSystems.map(system => <option key={system.code} value={system.code}>{system.label || system.code}</option>) : <option value="DND5E">D&D 5E</option>}
            </select><span className="muted">{catalogEntryDescription(availableGameSystems, gameSystem) || 'Determina la scheda personaggio e le regole di base.'}</span></label>
          </section>
          <section className="campaign-compose-section" aria-labelledby="campaign-access-title">
            <h3 id="campaign-access-title">Come entra il gruppo</h3>
            <p className="muted">Visibilità e accesso sono indipendenti: puoi rendere visibile anche una campagna chiusa.</p>
            <label className="campaign-choice"><input type="checkbox" checked={draft.isSearchable} onChange={event => update('isSearchable', event.target.checked)} /><span><strong>Visibile nella ricerca</strong><span>Gli altri giocatori possono trovare la campagna.</span></span></label>
            <label className="campaign-choice"><input type="checkbox" checked={draft.isOpen} onChange={event => update('isOpen', event.target.checked)} /><span><strong>Accetta richieste di accesso</strong><span>Chi trova la campagna può chiedere di entrare.</span></span></label>
            <label className="campaign-choice"><input type="checkbox" checked={draft.autoJoinEnabled} onChange={event => update('autoJoinEnabled', event.target.checked)} /><span><strong>Approva automaticamente</strong><span>Le richieste vengono approvate automaticamente quando la campagna è aperta e visibile.</span></span></label>
          </section>
          <details className="campaign-compose-details">
            <summary>Storia e presentazione <span>Facoltativi</span></summary>
            <div className="campaign-compose-section">
              <label>Riassunto breve<textarea rows={2} maxLength={280} value={draft.summary} onChange={event => update('summary', event.target.value)} placeholder="La premessa che i giocatori vedranno nell’elenco" /><span className="muted">{draft.summary.length}/280 caratteri</span></label>
              <label>Descrizione<textarea rows={4} value={draft.description} onChange={event => update('description', event.target.value)} placeholder="Racconta l’avventura al gruppo" /></label>
              <div className="form-grid">
                <label>Ambientazione<textarea rows={3} value={draft.setting} onChange={event => update('setting', event.target.value)} placeholder="Mondo e contesto di gioco" /></label>
                <label>Tono<select value={draft.tone} onChange={event => update('tone', event.target.value)}><option value="">Non specificato</option>{CAMPAIGN_TONE_OPTIONS.map(tone => <option key={tone.value} value={tone.value}>{tone.label}</option>)}</select></label>
              </div>
              <label>Regole<textarea rows={3} value={draft.rules} onChange={event => update('rules', event.target.value)} /></label>
              <label>Requisiti d’ingresso<textarea rows={3} value={draft.requirements} onChange={event => update('requirements', event.target.value)} /></label>
              <label>Indirizzo immagine di copertina<input type="url" value={draft.coverImageUrl} onChange={event => update('coverImageUrl', event.target.value)} placeholder="https://…" /></label>
            </div>
          </details>
          <details className="campaign-compose-details">
            <summary>Strumenti della campagna <span>{selectedModules.length} attivi</span></summary>
            <div className="campaign-compose-section">
              <p className="muted">Scegli i moduli opzionali da rendere disponibili al gruppo.</p>
              {modules.length ? modules.map(module => <label className="campaign-choice" key={module.code}>
                <input type="checkbox" checked={selectedModules.includes(module.code)} onChange={() => update('allowedModules', selectedModules.includes(module.code) ? selectedModules.filter(code => code !== module.code) : [...selectedModules, module.code])} />
                <span><strong>{module.label || module.code}</strong>{module.description && <span>{module.description}</span>}</span>
              </label>) : <p className="muted">Non ci sono moduli disponibili per questo reame.</p>}
            </div>
          </details>
          {error && <p className="form-error" role="alert">{error}</p>}
          {storageError && <p className="form-error" role="alert">Il browser non può conservare la bozza. Copia i testi prima di uscire. <button type="button" className="secondary-btn" onClick={closeCreateCampaign}>Esci comunque</button></p>}
          <footer className="campaign-compose-footer">
            <p className="muted">La bozza resta in questa sessione del browser quando torni alle campagne.</p>
            <button type="submit" className="primary-btn">{saving ? 'Creazione in corso…' : 'Crea campagna'}<Icon name="pi pi-arrow-right" /></button>
          </footer>
        </fieldset>
      </form>
    </section>
  )
}
