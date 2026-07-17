import { ProgressSpinner } from 'primereact/progressspinner'
import { useLoadingOverlayState } from '../../services/loadingOverlay'

export function GlobalApiLoader() {
  const { pendingCount, latestLabel } = useLoadingOverlayState()

  if (pendingCount === 0) return null

  return (
    <div className="global-api-loader" role="status" aria-live="polite" aria-label={latestLabel || 'Caricamento in corso'}>
      <div className="surface-card global-api-loader-card">
        <ProgressSpinner strokeWidth="4" style={{ width: '3rem', height: '3rem' }} />
        <div className="global-api-loader-copy">
          <strong>{latestLabel || 'Caricamento dati'}</strong>
          <span>{pendingCount > 1 ? `${pendingCount} richieste in corso` : 'Richiesta in corso'}</span>
        </div>
      </div>
    </div>
  )
}
