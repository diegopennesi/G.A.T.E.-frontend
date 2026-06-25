import { useState } from 'react'
import { DataTable, FieldLabel, Icon } from '../../../shared/components'
import type { RoomResponse } from '../../../types/domain'

export function RoomsPage({
  rooms,
  canCreateRoom,
  onCreate,
}: {
  rooms: RoomResponse[]
  canCreateRoom: boolean
  onCreate: (payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number }) => void
}) {
  const [name, setName] = useState('Piazza Centrale')
  const [type, setType] = useState<'ROLEPLAY' | 'SPAM'>('ROLEPLAY')
  const [ttlHours, setTtlHours] = useState(72)
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0)

  return (
    <section className="panel">
      <h2>Stanze</h2>
      {canCreateRoom ? (
        <>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-signature" label="Nome" />
              <input value={name} placeholder="Nome della stanza" onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-layer-group" label="Tipo" />
              <select value={type} onChange={(event) => setType(event.target.value as 'ROLEPLAY' | 'SPAM')}>
                <option value="ROLEPLAY">ROLEPLAY</option>
                <option value="SPAM">SPAM</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              <FieldLabel icon="fa-solid fa-hourglass-half" label="TTL hours" />
              <input
                type="number"
                min={1}
                max={72}
                placeholder="72"
                value={ttlHours}
                onChange={(event) => setTtlHours(Number(event.target.value))}
              />
            </label>
            <label>
              <FieldLabel icon="fa-solid fa-stopwatch" label="Slowmode seconds" />
              <input
                type="number"
                min={0}
                max={600}
                placeholder="0"
                value={slowmodeSeconds}
                onChange={(event) => setSlowmodeSeconds(Number(event.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onCreate({ name, type, ttlHours, slowmodeSeconds })}
          >
            <Icon name="fa-solid fa-circle-plus" />
            Crea Stanza
          </button>
        </>
      ) : (
        <div className="info-box">
          <p className="section-title">Creazione non disponibile</p>
          <p className="muted">
            Solo i ruoli <strong>MASTER</strong> e <strong>SUPER_MASTER</strong> possono creare stanze.
          </p>
        </div>
      )}

      <div className="divider" />
      <h3 className="section-title">Elenco Stanze</h3>
      <DataTable
        columns={[
          { key: 'room', label: 'Stanza' },
          { key: 'type', label: 'Tipo' },
          { key: 'ttl', label: 'TTL' },
          { key: 'slowmode', label: 'Slowmode' },
        ]}
        rows={rooms}
        getRowKey={(room) => room.id}
        emptyMessage="Nessuna stanza disponibile."
        renderRow={(room) => (
          <tr>
            <td>
              <div className="data-table-primary">
                <p className="data-table-title">{room.name}</p>
              </div>
            </td>
            <td>{room.type}</td>
            <td className="data-table-muted">{room.ttlHours}h</td>
            <td className="data-table-muted">{room.slowmodeSeconds}s</td>
          </tr>
        )}
      />
    </section>
  )
}
