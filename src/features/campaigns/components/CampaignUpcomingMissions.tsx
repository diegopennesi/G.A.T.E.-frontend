import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { campaignQueries } from '../../../services/queries/campaignQueries'

const statusLabels = { OPEN: 'Iscrizioni aperte', REOPENED: 'Iscrizioni riaperte', CONFIRMED: 'Confermata', CLOSED: 'Iscrizioni chiuse' }
const dateFormatter = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' })

export function CampaignUpcomingMissions({ campaignId, since, onOpen }: { campaignId: string; since: string; onOpen: () => void }) {
  const [now] = useState(() => Date.now())
  const query = useQuery({ ...campaignQueries.missions(campaignId, since), retry: false, staleTime: 60_000 })
  const upcoming = (query.data ?? [])
    .filter(mission => mission.status !== 'CANCELLED' && mission.status !== 'COMPLETED'
      && (!mission.sessionAt || Date.parse(mission.sessionAt) >= now))
    .sort((left, right) => (left.sessionAt ? Date.parse(left.sessionAt) : Infinity) - (right.sessionAt ? Date.parse(right.sessionAt) : Infinity))
  return (
    <section className="campaign-overview-section" aria-labelledby="upcoming-missions-title">
      <div className="campaign-section-heading">
        <h3 id="upcoming-missions-title">Prossime missioni</h3>
        <button type="button" className="secondary-btn" onClick={onOpen}>Vedi tutte le missioni</button>
      </div>
      {query.isPending && <p className="muted" role="status">Caricamento delle missioni…</p>}
      {query.isError && (
        <div className="campaign-overview-error" role="alert">
          <p>Non riesco ad aggiornare le missioni. Riprova tra poco.</p>
          <button type="button" className="secondary-btn" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? 'Aggiornamento…' : 'Riprova'}
          </button>
        </div>
      )}
      {!query.isPending && !query.isError && upcoming.length === 0 && <p className="muted">Nessuna missione in programma. Puoi consultare lo storico nella lista missioni.</p>}
      {upcoming.length > 0 && (
        <ul className="campaign-upcoming-list">
          {upcoming.slice(0, 3).map(mission => (
            <li key={mission.id}>
              <div>
                <h4>{mission.title}</h4>
                <p className="muted">{statusLabels[mission.status as keyof typeof statusLabels]} · {mission.participantCount} partecipanti</p>
              </div>
              {mission.sessionAt ? <time dateTime={mission.sessionAt}>{dateFormatter.format(new Date(mission.sessionAt))}</time> : <span className="muted">Data da definire</span>}
            </li>
          ))}
        </ul>
      )}
      {upcoming.length > 3 && <p className="muted">Altre {upcoming.length - 3} missioni nella lista completa.</p>}
    </section>
  )
}
