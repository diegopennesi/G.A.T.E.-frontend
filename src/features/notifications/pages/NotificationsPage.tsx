import { DataTable } from '../../../shared/components'

type UiEvent = {
  id: string
  ts: string
  text: string
  level: 'info' | 'ok' | 'error'
}

export function NotificationsPage({ events }: { events: UiEvent[] }) {
  return (
    <section className="panel">
      <h2>Notifiche</h2>
      <p className="muted">Feed locale basato su azioni API client.</p>
      <DataTable
        columns={[
          { key: 'time', label: 'Ora' },
          { key: 'level', label: 'Livello' },
          { key: 'message', label: 'Messaggio' },
        ]}
        rows={events}
        getRowKey={(event) => event.id}
        emptyMessage="Nessuna notifica disponibile."
        renderRow={(event) => (
          <tr>
            <td className="data-table-muted">{new Date(event.ts).toLocaleTimeString()}</td>
            <td>
              <span className={`status ${event.level === 'error' ? 'status-danger' : event.level === 'ok' ? 'status-success' : 'status-neutral'}`}>
                {event.level}
              </span>
            </td>
            <td>{event.text}</td>
          </tr>
        )}
      />
    </section>
  )
}
