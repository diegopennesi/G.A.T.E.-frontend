import { useUiContext } from '../../../context'
import { BadgeGroup, KeyValueGrid, MobileDataCard, ResponsiveDataList } from '../../../shared/components'

export function LogPage() {
  const { events } = useUiContext()
  return (
    <section className="panel">
      <h2>Log</h2>
      <p className="muted">Registro locale basato su azioni API client.</p>
      <ResponsiveDataList
        desktopClassName="notifications-data-table"
        columns={[
          { key: 'time', label: 'Ora' },
          { key: 'level', label: 'Livello' },
          { key: 'message', label: 'Messaggio' },
        ]}
        rows={events}
        getRowKey={(event) => event.id}
        emptyMessage="Nessun log disponibile."
        renderDesktopRow={(event) => (
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
        renderMobileCard={(event) => (
          <MobileDataCard
            title={event.text}
            badges={
              <BadgeGroup>
                <span className={`status ${event.level === 'error' ? 'status-danger' : event.level === 'ok' ? 'status-success' : 'status-neutral'}`}>
                  {event.level}
                </span>
              </BadgeGroup>
            }
          >
            <KeyValueGrid
              items={[
                {
                  key: 'time',
                  label: 'Ora',
                  value: new Date(event.ts).toLocaleTimeString(),
                },
              ]}
            />
          </MobileDataCard>
        )}
      />
    </section>
  )
}
