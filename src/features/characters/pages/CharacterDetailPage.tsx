import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useUnsavedChanges } from '../../../context/NavigationGuardContext'
import { useCharacterContext } from '../../../context'
import { ConfirmActionDialog, Icon } from '../../../shared/components'
import { CharacterSheetFields } from '../components/CharacterSheetFields'
import { CharacterSheetReviews } from '../components/CharacterSheetReviews'
import { CharacterStateControl } from '../components/CharacterStateControl'

const statusLabels = { ACTIVE: 'Attivo', RETIRED: 'Ritirato', DEAD: 'Deceduto' }

export function CharacterDetailPage() {
  const { selectedCharacter, characterDetail, characterSheetDetail: sheet, characterSheetHistory, ownerProfileLabel, campaignNameForCharacter, canReviewSheetChanges, refreshCharacterDetail, saveCharacterSheet, closeCreateCharacter } = useCharacterContext()
  const character = characterDetail || selectedCharacter
  const [source, setSource] = useState(sheet)
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...sheet?.dataJson }))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [operationBusy, setOperationBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const lock = useRef(false)
  // Fresh server data replaces only a clean draft. Background reads preserve edits.
  if (sheet !== source && !dirty) { setSource(sheet); setDraft({ ...sheet?.dataJson }) }
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const pending = sheet?.pendingReview || characterSheetHistory.find(review => review.status === 'PENDING') || null
  const blockedByStatus = character?.characterStatus !== 'ACTIVE'
  const blockedByReview = Boolean(pending && !canReviewSheetChanges)
  const editable = Boolean(sheet?.hasTemplate && sheet.editable && !blockedByStatus && !blockedByReview)
  const busy = saving || refreshing || operationBusy
  useUnsavedChanges(dirty, busy)
  const serverChanged = dirty && sheet && source && (sheet.updatedAt !== source.updatedAt || JSON.stringify(sheet.dataJson) !== JSON.stringify(source.dataJson))
  const refresh = async () => {
    if (busy || dirty) return
    setRefreshing(true); setRefreshError('')
    try { await refreshCharacterDetail() }
    catch { setRefreshError('Non riesco ad aggiornare la scheda. I dati caricati restano visibili: riprova.') }
    finally { setRefreshing(false) }
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lock.current || busy || !dirty || !editable || serverChanged) return
    lock.current = true; setSaving(true); setSaveError(''); setSaveNotice('')
    try { await saveCharacterSheet(draft); setDirty(false); setSaveNotice('Modifiche inviate. Verifica qui l’eventuale approvazione del master.') }
    catch { setSaveError('Non riesco a salvare la scheda. Le modifiche restano nel form: puoi riprovare.') }
    finally { lock.current = false; setSaving(false) }
  }
  const discard = () => {
    setDirty(false); setDraft({ ...sheet?.dataJson }); setSource(sheet); setSaveError(''); setSaveNotice(''); setDiscardOpen(false)
    if (leaving) closeCreateCharacter()
    setLeaving(false)
  }
  const leave = () => {
    if (busy) return
    if (dirty) { setLeaving(true); setDiscardOpen(true) } else closeCreateCharacter()
  }
  return <section className="panel character-sheet-page">
    <div className="character-sheet-toolbar">
      <button type="button" className="secondary-btn" disabled={busy} onClick={leave}><Icon name="pi pi-arrow-left" />Torna ai personaggi</button>
      <button type="button" className="secondary-btn" disabled={busy || dirty} title={dirty ? 'Salva o scarta le modifiche prima di aggiornare.' : undefined} onClick={() => void refresh()}><Icon name="fa-solid fa-rotate" />{refreshing ? 'Aggiornamento…' : 'Aggiorna scheda'}</button>
    </div>
    <header className="character-sheet-heading">
      <h2>{character?.name || 'Scheda PG'}</h2>
      {character?.nickname && <p className="character-sheet-alias">{character.nickname}</p>}
      {character && <><div className="sheet-meta-row"><span className="status status-info">{character.isNpc ? 'NPC' : 'Personaggio giocante'}</span><span className="status status-neutral">{character.characterStatus ? statusLabels[character.characterStatus] : 'Stato non assegnato'}</span></div><p className="muted">{ownerProfileLabel(character.userId, character.ownerProfileName)} · {campaignNameForCharacter(character)}</p></>}
    </header>
    {refreshError && <div role="alert" className="character-sheet-notice"><p>{refreshError}</p><button type="button" className="secondary-btn" disabled={busy || dirty} onClick={() => void refresh()}>Riprova aggiornamento</button></div>}
    {!character && <p className="muted">Seleziona un personaggio dall’elenco per aprire la scheda.</p>}
    {character && <>
      <section className="character-sheet-editor" aria-labelledby="character-sheet-editor-title">
        <div className="character-sheet-editor-heading"><h3 id="character-sheet-editor-title">Scheda di gioco</h3>{sheet?.hasTemplate && <span className="status status-neutral">{editable ? 'Modificabile' : 'Sola lettura'}</span>}</div>
        {blockedByStatus && <p className="character-sheet-notice">La scheda è in sola lettura perché il personaggio non è attivo.</p>}
        {sheet?.hasTemplate && !sheet.editable && !blockedByStatus && !blockedByReview && <p className="character-sheet-notice">Puoi consultare la scheda. Le modifiche non sono disponibili per il tuo ruolo.</p>}
        {!sheet && <p className="muted" role="status">Caricamento della scheda di gioco… Se non compare, usa Aggiorna scheda.</p>}
        {sheet && !sheet.hasTemplate && <p className="muted">Nessun template configurato per il sistema di gioco di questa campagna.</p>}
        <CharacterSheetReviews pending={pending} disabled={busy || dirty} onBusyChange={setOperationBusy} />
        {sheet?.hasTemplate && <form onSubmit={event => void save(event)} aria-busy={saving}>
          <div className="character-sheet-edit-status" role="status">{dirty ? 'Modifiche non salvate' : saveNotice || 'Nessuna modifica da salvare'}</div>
          {serverChanged && <p role="alert">La scheda è stata aggiornata mentre la modificavi. Copia le tue modifiche, poi scarta la bozza per usare la versione aggiornata.</p>}
          <CharacterSheetFields sheet={sheet} draft={draft} editable={editable && !busy} update={(path, next) => { setDraft(previous => ({ ...previous, [path]: next })); setDirty(true); setSaveNotice('') }} />
          {saveError && <p role="alert" className="character-sheet-notice">{saveError}</p>}
          <footer className="character-sheet-save-bar">
            <div>{sheet.updatedAt && <p className="muted">Ultimo aggiornamento: {new Date(sheet.updatedAt).toLocaleString('it-IT')}</p>}{blockedByReview && <p className="muted">Attendi l’approvazione prima di inviare altre modifiche.</p>}</div>
            <div className="inline-actions">
              {dirty && <button type="button" className="secondary-btn" disabled={busy} onClick={() => { setLeaving(false); setDiscardOpen(true) }}>Scarta modifiche</button>}
              <button type="submit" className="primary-btn" disabled={!editable || !dirty || busy || Boolean(serverChanged)}><Icon name="fa-solid fa-floppy-disk" />{saving ? 'Salvataggio…' : 'Salva scheda'}</button>
            </div>
          </footer>
        </form>}
      </section>
      <CharacterStateControl key={`${character.id}-${character.characterStatus}`} character={character} disabled={busy || dirty} onBusyChange={setOperationBusy} />
    </>}
    <ConfirmActionDialog open={discardOpen} title="Scartare le modifiche?" message={leaving ? 'Le modifiche non salvate andranno perse tornando all’elenco.' : 'La scheda tornerà ai valori dell’ultima versione caricata.'} confirmLabel={leaving ? 'Scarta e torna all’elenco' : 'Scarta modifiche'} tone="danger" onConfirm={discard} onCancel={() => { setDiscardOpen(false); setLeaving(false) }} />
  </section>
}
