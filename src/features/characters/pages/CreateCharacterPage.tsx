import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useCharacterContext } from '../../../context'
import { Icon } from '../../../shared/components'
import { toMessage } from '../../../shared/utils'

type CharacterDraft = { name: string; nickname: string; portraitUrl: string; isNpc: boolean }
const emptyDraft: CharacterDraft = { name: '', nickname: '', portraitUrl: '', isNpc: false }
function readDraft(key: string): CharacterDraft {
  try {
    const candidate: unknown = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!candidate || typeof candidate !== 'object') return { ...emptyDraft }
    const value = candidate as Record<string, unknown>
    return {
      name: typeof value.name === 'string' ? value.name : '',
      nickname: typeof value.nickname === 'string' ? value.nickname : '',
      portraitUrl: typeof value.portraitUrl === 'string' ? value.portraitUrl : '',
      isNpc: value.isNpc === true,
    }
  } catch { return { ...emptyDraft } }
}

export function CreateCharacterPage() {
  const { characterDraftKey, creationCampaignName, closeCreateCharacter, hasActiveCampaign, canCreatePlayerCharacter, canCreateNpc, createCharacter } = useCharacterContext()
  const [draft, setDraft] = useState(() => readDraft(characterDraftKey))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState(false)
  const saveLock = useRef(false)
  const isNpc = canCreateNpc && (draft.isNpc || !canCreatePlayerCharacter)
  const canCreate = hasActiveCampaign && (isNpc ? canCreateNpc : canCreatePlayerCharacter)
  const update = <K extends keyof CharacterDraft>(field: K, value: CharacterDraft[K]) => setDraft(previous => ({ ...previous, [field]: value }))
  useEffect(() => {
    try { sessionStorage.setItem(characterDraftKey, JSON.stringify(draft)) } catch { /* Editing works when storage is unavailable. */ }
  }, [draft, characterDraftKey])
  const leave = () => {
    if (saveLock.current) return
    try { sessionStorage.setItem(characterDraftKey, JSON.stringify(draft)); closeCreateCharacter() }
    catch { setStorageError(true) }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saveLock.current || !canCreate) return
    if (!draft.name.trim()) { setError('Scrivi il nome del personaggio prima di creare.'); return }
    saveLock.current = true
    setSaving(true)
    setError('')
    try {
      await createCharacter({ name: draft.name.trim(), nickname: draft.nickname.trim(), portraitUrl: draft.portraitUrl.trim(), isNpc })
      try { sessionStorage.removeItem(characterDraftKey) } catch { /* Nothing to remove if storage is unavailable. */ }
    } catch (err) { setError(`${toMessage(err)} La bozza resta disponibile: puoi riprovare.`) }
    finally { saveLock.current = false; setSaving(false) }
  }
  return (
    <section className="panel character-compose">
      <header className="character-compose-header">
        <button type="button" className="secondary-btn" disabled={saving} onClick={leave}><Icon name="pi pi-arrow-left" />Torna ai personaggi</button>
        <h2>Crea Personaggio</h2>
        <p>Dagli un nome. Soprannome e ritratto sono facoltativi.</p>
        {creationCampaignName && <p className="character-compose-campaign">Campagna: <strong>{creationCampaignName}</strong></p>}
      </header>
      {!hasActiveCampaign && <p role="status">Seleziona una campagna attiva prima di creare un personaggio.</p>}
      {hasActiveCampaign && !canCreatePlayerCharacter && <p className="character-compose-notice">Hai già un PG attivo in questa campagna.{canCreateNpc ? ' Puoi creare un NPC per il tavolo.' : ' Puoi creare un nuovo PG quando quello attuale è ritirato o deceduto.'}</p>}
      {canCreate && (
        <form onSubmit={event => void submit(event)} aria-busy={saving} onInvalidCapture={event => {
          const details = (event.target as HTMLElement).closest('details')
          if (details) details.open = true
        }}>
          <fieldset disabled={saving} className="character-compose-fields">
            <div className="character-compose-identity">
              <label><span>Nome del personaggio <span className="muted">(obbligatorio)</span></span><input required maxLength={120} autoComplete="off" value={draft.name} placeholder="Es. Elara delle Terre Libere" onChange={event => update('name', event.target.value)} /></label>
              <p className="muted">È il nome che comparirà negli elenchi della campagna.</p>
            </div>
            <fieldset className="character-compose-type">
              <legend>Tipo di personaggio</legend>
              <label className={!isNpc ? 'is-selected' : ''}><input type="radio" name="character-type" checked={!isNpc} disabled={!canCreatePlayerCharacter} onChange={() => update('isNpc', false)} /><span><strong>PG · Personaggio giocante</strong><span className="muted">Il tuo personaggio. Un PG attivo per campagna.</span></span></label>
              <label className={isNpc ? 'is-selected' : ''}><input type="radio" name="character-type" checked={isNpc} disabled={!canCreateNpc} onChange={() => update('isNpc', true)} /><span><strong>NPC · Personaggio non giocante</strong><span className="muted">Un personaggio del tavolo, riservato ai master e co-master.</span></span></label>
            </fieldset>
            <details className="character-compose-extras">
              <summary>Soprannome e ritratto <span className="muted">(facoltativi)</span></summary>
              <div>
                <label>Soprannome<input maxLength={120} value={draft.nickname} placeholder="Come lo chiama il gruppo" onChange={event => update('nickname', event.target.value)} /></label>
                <label>Indirizzo del ritratto<input type="url" maxLength={500} value={draft.portraitUrl} placeholder="https://…" onChange={event => update('portraitUrl', event.target.value)} /></label>
                <p className="muted">Inserisci l’indirizzo di un’immagine già online.</p>
              </div>
            </details>
          </fieldset>
          {error && <p className="character-compose-error" role="alert">{error}</p>}
          <footer className="character-compose-footer">
            <button type="submit" className="primary-btn" disabled={saving}><Icon name="fa-solid fa-plus" />{saving ? 'Creazione in corso…' : isNpc ? 'Crea NPC' : 'Crea personaggio'}</button>
            <p className="muted">Dopo la creazione ritroverai il personaggio nell’elenco.</p>
          </footer>
        </form>
      )}
      {storageError && <div role="alert" className="character-compose-error"><p>Il browser non consente di salvare la bozza. Copia i testi prima di uscire.</p><button type="button" className="secondary-btn" disabled={saving} onClick={closeCreateCharacter}>Esci senza salvare</button></div>}
    </section>
  )
}
