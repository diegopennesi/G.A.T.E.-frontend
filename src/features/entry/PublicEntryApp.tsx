import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ApiError } from '../../services/apiClient'
import { resolvePublicEntry } from '../../services/gateApi'
import type { PublicEntryKind, PublicEntryResponse } from '../../types/domain'
import './public-entry.css'

const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim()
const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim()

function textOn(hex: string) {
  const channels = [1, 3, 5].map((position) => Number.parseInt(hex.slice(position, position + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  return (1.05 / (luminance + 0.05)) >= 4.5 ? '#ffffff' : '#000000'
}

function readEntry(): { kind: PublicEntryKind; value: string; appPath: string } | null {
  const segments = window.location.pathname.split('/').filter(Boolean)
  const value = segments[1]?.trim()
  if (!value) return null
  if (segments[0] === 'r') return { kind: 'REALM', value: value.toLowerCase(), appPath: `r/${encodeURIComponent(value.toLowerCase())}` }
  if (segments[0] === 'i') return { kind: 'CAMPAIGN_TOKEN', value, appPath: `i/${encodeURIComponent(value)}` }
  if (segments[0] === 'c') return { kind: 'CAMPAIGN_CODE', value, appPath: `c/${encodeURIComponent(value)}` }
  return null
}

export function PublicEntryApp() {
  const entry = useMemo(() => readEntry(), [])
  const [result, setResult] = useState<PublicEntryResponse | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!entry) return
    let cancelled = false
    void resolvePublicEntry(entry.kind, entry.value).then((value) => { if (!cancelled) setResult(value) }).catch((cause) => {
      if (cancelled) return
      setError(cause instanceof ApiError && cause.status === 404 ? 'Questo invito è scaduto, è stato revocato oppure non è più disponibile.' :
        cause instanceof ApiError && cause.status === 429 ? 'Sono stati fatti troppi tentativi. Attendi un momento e riprova.' :
          !navigator.onLine ? 'Sei offline. Riconnettiti e riprova: il collegamento resta qui.' :
            'Non riesco a verificare il collegamento. Riprova tra poco.')
    })
    return () => { cancelled = true }
  }, [attempt, entry])
  useEffect(() => {
    const retryWhenOnline = () => {
      if (!result && error) { setError(''); setAttempt((value) => value + 1) }
    }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [error, result])
  const visibleError = entry ? error : 'Collegamento incompleto.'

  const accent = result?.realm.accentColor?.match(/^#[0-9a-f]{6}$/i)?.[0] ?? '#245A45'
  const style = { '--entry-accent': accent, '--entry-on-accent': textOn(accent), '--entry-cover': result?.realm.coverImageUrl ? `url("${result.realm.coverImageUrl.replace(/["\\]/g, '')}")` : 'none' } as CSSProperties
  const webPath = result && entry ? `/homepage/${encodeURIComponent(result.realm.code)}/login?entryKind=${entry.kind}&entryValue=${encodeURIComponent(entry.value)}` : '/'
  const isInvite = entry?.kind !== 'REALM'

  return <main className="entry-page" style={style}><section className="entry-shell">
    <div className="entry-cover" aria-hidden="true" />
    <div className="entry-content">
      {result?.realm.logoUrl ? <img className="entry-logo" src={result.realm.logoUrl} alt={`Logo ${result.realm.name}`} /> : <span className="entry-monogram" aria-hidden="true">G</span>}
      <p className="entry-kicker">{isInvite ? 'Invito G.A.T.E.' : 'Il tuo reame'}</p>
      <h1>{result?.realm.name ?? (visibleError ? 'Collegamento non disponibile' : 'Controllo la destinazione…')}</h1>
      {result ? <p className="entry-copy">{isInvite ? result.autoJoin ? 'Questo invito ti porta direttamente al tavolo.' : 'Accedi per inviare la richiesta al tavolo.' : result.realm.description || 'Entra nella community e ritrova le tue campagne.'}</p> : null}
      {visibleError ? <div className="entry-error" role="alert"><p>{visibleError}</p>{entry ? <button type="button" onClick={() => { setError(''); setResult(null); setAttempt((value) => value + 1) }}>Riprova</button> : null}</div> : null}
      {result && entry ? <div className="entry-actions">
        <a className="entry-primary" href={`gate://${entry.appPath}`}>Apri nell’app</a>
        <a className="entry-secondary" href={webPath}>Continua dal browser</a>
      </div> : null}
      {result && (APP_STORE_URL || PLAY_STORE_URL) ? <div className="entry-stores" aria-label="Scarica l’app">
        {APP_STORE_URL ? <a href={APP_STORE_URL}>App Store</a> : null}
        {PLAY_STORE_URL ? <a href={PLAY_STORE_URL}>Google Play</a> : null}
      </div> : null}
      <p className="entry-footnote">Un solo account, tutti i reami che visiti.</p>
    </div>
  </section></main>
}
