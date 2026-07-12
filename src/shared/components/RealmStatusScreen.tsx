import { Icon } from './Icon'

export function RealmStatusScreen({
  realmCode,
  state,
  message,
}: {
  realmCode: string
  state: 'loading' | 'unavailable'
  message?: string
}) {
  return (
    <div className="realm-status-screen">
      <section className="realm-status-panel" aria-live="polite">
        <div className={`realm-status-icon ${state === 'loading' ? 'is-loading' : ''}`}>
          <Icon name={state === 'loading' ? 'fa-solid fa-circle-notch' : 'fa-solid fa-ban'} />
        </div>
        <p className="menu-group-label">Realm {realmCode}</p>
        <h1>{state === 'loading' ? 'Caricamento realm' : 'Realm non disponibile'}</h1>
        <p className="muted">
          {message ||
            (state === 'loading'
              ? 'Verifica configurazione e stato del realm.'
              : 'Il realm richiesto non esiste, e spento oppure non e abilitato alla navigazione.')}
        </p>
      </section>
    </div>
  )
}
