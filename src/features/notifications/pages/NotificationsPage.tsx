import { useMemo, useState } from 'react'
import { useUiContext } from '../../../context'
import { BadgeGroup, KeyValueGrid, MobileDataCard, ResponsiveDataList } from '../../../shared/components'

export function LogPage() {
  const { events } = useUiContext()
  const [filter, setFilter] = useState('all')
  const visible = useMemo(() => events.filter(event => filter === 'all' || event.level === filter), [events, filter])
  const levelLabel = (level: string) => level === 'ok' ? 'Completata' : level === 'error' ? 'Errore' : 'Informazione'
  return (
    <section className="panel remaining-flow activity-log">
      <h2>Attività recenti</h2>
      <p className="muted">Operazioni di questa sessione del browser. Il registro viene azzerato quando ricarichi l’app.</p>
<label>Filtra attività<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tutte le attività</option><option value="error">Errori</option><option value="ok">Operazioni completate</option><option value="info">Informazioni</option></select></label>
      <ResponsiveDataList
        desktopClassName="notifications-data-table"
        columns={[
          { key: 'time', label: 'Ora' },
          { key: 'level', label: 'Livello' },
          { key: 'message', label: 'Messaggio' },
        ]}
        rows={visible}
        getRowKey={(event) => event.id}
        emptyMessage="Nessuna attività per questo filtro."
        renderDesktopRow={(event) => (
          <tr>
            <td className="data-table-muted">{new Date(event.ts).toLocaleTimeString()}</td>
            <td>
              <span className={`status ${event.level === 'error' ? 'status-danger' : event.level === 'ok' ? 'status-success' : 'status-neutral'}`}>
                {levelLabel(event.level)}
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
                  {levelLabel(event.level)}
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
