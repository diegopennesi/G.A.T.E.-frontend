import { useState } from 'react'
import { useCampaignContext } from '../../../context'
import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { useUnsavedChanges } from '../../../context/NavigationGuardContext'
import { ResponsiveDataList } from '../../../shared/components'

export function RoomsPage() {
  const { rooms, canCreateRoom, createRoom } = useCampaignContext()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'ROLEPLAY' | 'SPAM'>('ROLEPLAY')
  const [ttl, setTtl] = useState('72')
  const [slowmode, setSlowmode] = useState('0')
  const action = useAsyncAction()
  useUnsavedChanges(creating && Boolean(name), action.pending)
  return <section className="panel remaining-flow rooms-browser">
    <header className="flow-header"><h2>Stanze della campagna</h2><p className="muted">Spazi del tavolo per gioco di ruolo o conversazioni libere.</p>{canCreateRoom && !creating && <button type="button" className="primary-btn" onClick={() => setCreating(true)}>Crea stanza</button>}</header>
    {creating && canCreateRoom && <form onInvalidCapture={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true }} onSubmit={event => {
      event.preventDefault()
      if (!name.trim()) { action.setError('Scrivi il nome della stanza.'); return }
      void action.execute(async () => { await createRoom({ name: name.trim(), type, ttlHours: Number(ttl), slowmodeSeconds: Number(slowmode) }); setName(''); setCreating(false) }, 'Stanza creata.')
    }} aria-busy={action.pending}>
      <fieldset className="flow-fieldset" disabled={action.pending}>
        <h3>Nuova stanza</h3>
        <div className="form-grid"><label>Nome della stanza<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><label>Tipo di conversazione<select value={type} onChange={event => setType(event.target.value as typeof type)}><option value="ROLEPLAY">Gioco di ruolo</option><option value="SPAM">Conversazione libera</option></select></label></div>
        <details className="flow-details"><summary>Durata e ritmo dei messaggi</summary><div className="form-grid"><label>Durata della stanza (ore)<input type="number" min={1} max={72} step={1} required value={ttl} onChange={event => setTtl(event.target.value)} /></label><label>Attesa tra messaggi (secondi)<input type="number" min={0} max={600} step={1} required value={slowmode} onChange={event => setSlowmode(event.target.value)} /></label></div><p className="muted">Usa 0 secondi per consentire messaggi senza attesa.</p></details>
        <div className="inline-actions"><button type="submit" className="primary-btn">{action.pending ? 'Creazione…' : 'Crea stanza'}</button><button type="button" className="secondary-btn" onClick={() => setCreating(false)}>Torna all’elenco</button></div>
      </fieldset>
    </form>}
    {!canCreateRoom && <p className="muted">Puoi consultare le stanze. Solo master e super master possono crearne una.</p>}
    {action.error && <p role="alert">{action.error}</p>}{action.notice && <p role="status">{action.notice}</p>}
    <ResponsiveDataList desktopClassName="rooms-data-table" columns={[{ key: 'name', label: 'Stanza' }, { key: 'type', label: 'Conversazione' }, { key: 'duration', label: 'Durata' }, { key: 'pace', label: 'Attesa messaggi' }]} rows={rooms} getRowKey={room => room.id} emptyMessage="Nessuna stanza disponibile." renderDesktopRow={room => <tr><td>{room.name}</td><td>{room.type === 'ROLEPLAY' ? 'Gioco di ruolo' : 'Conversazione libera'}</td><td>{room.ttlHours} ore</td><td>{room.slowmodeSeconds === 0 ? 'Nessuna attesa' : `${room.slowmodeSeconds} secondi`}</td></tr>} renderMobileCard={room => <article className="flow-row"><h3>{room.name}</h3><p className="muted">{room.type === 'ROLEPLAY' ? 'Gioco di ruolo' : 'Conversazione libera'} · {room.ttlHours} ore · {room.slowmodeSeconds === 0 ? 'Nessuna attesa tra messaggi' : `${room.slowmodeSeconds} secondi tra messaggi`}</p></article>} />
  </section>
}
