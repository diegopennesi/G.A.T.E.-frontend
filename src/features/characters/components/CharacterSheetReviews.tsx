import { useRef, useState } from 'react'
import { useCharacterContext } from '../../../context'
import type { CharacterSheetReviewResponse, CharacterSheetReviewSummaryResponse } from '../../../types/domain'

type Review = CharacterSheetReviewResponse | CharacterSheetReviewSummaryResponse
const labels = { PENDING: 'In attesa', APPROVED: 'Approvata', REJECTED: 'Rifiutata' }
const formatValue = (value: unknown): string => Array.isArray(value) ? value.join(', ') : value === null || value === undefined || value === '' ? 'vuoto' : typeof value === 'boolean' ? value ? 'sì' : 'no' : String(value)

export function CharacterSheetReviews({ pending, disabled, onBusyChange }: { pending: Review | null; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const { characterSheetHistory, canViewSheetHistory, canReviewSheetChanges, approveCharacterSheetReview, rejectCharacterSheetReview } = useCharacterContext()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [completed, setCompleted] = useState<Partial<Record<string, 'APPROVED' | 'REJECTED'>>>({})
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const submit = async (review: Review, action: 'approve' | 'reject') => {
    if (lock.current || disabled || !canReviewSheetChanges || completed[review.id]) return
    lock.current = true
    setBusyId(review.id)
    onBusyChange(true)
    setError('')
    try {
      await (action === 'approve' ? approveCharacterSheetReview : rejectCharacterSheetReview)(review.id, notes[review.id] || '')
      setCompleted(previous => ({ ...previous, [review.id]: action === 'approve' ? 'APPROVED' : 'REJECTED' }))
      setNotes(previous => ({ ...previous, [review.id]: '' }))
    } catch { setError('La revisione non è stata completata. La nota resta disponibile: puoi riprovare.') }
    finally { lock.current = false; setBusyId(''); onBusyChange(false) }
  }
  const entry = (review: Review) => {
    const status = completed[review.id] || review.status
    return <article key={review.id} className="sheet-review-item">
      <div className="sheet-review-item-head"><strong>{new Date(review.submittedAt).toLocaleString('it-IT')}</strong><span className="status status-neutral">{labels[status]}</span></div>
      {review.changes.length > 0 ? <ul className="sheet-review-change-list">{review.changes.map(change => <li key={change.path}><span>{change.label || change.path}</span><strong>{formatValue(change.oldValue)} → {formatValue(change.newValue)}</strong></li>)}</ul> : <p className="muted">Nessuna differenza registrata.</p>}
      {'reviewNote' in review && review.reviewNote && <p className="sheet-review-note">{review.reviewNote}</p>}
      {canReviewSheetChanges && status === 'PENDING' && <div className="sheet-review-actions">
        <label>Nota per la revisione<textarea rows={2} value={notes[review.id] || ''} disabled={disabled || Boolean(busyId)} onChange={event => setNotes(previous => ({ ...previous, [review.id]: event.target.value }))} /></label>
        <div className="button-row"><button type="button" className="secondary-btn danger-btn" disabled={disabled || Boolean(busyId)} onClick={() => void submit(review, 'reject')}>Rifiuta modifica</button><button type="button" className="primary-btn" disabled={disabled || Boolean(busyId)} onClick={() => void submit(review, 'approve')}>{busyId === review.id ? 'Revisione in corso…' : 'Approva modifica'}</button></div>
      </div>}
    </article>
  }
  const history = canViewSheetHistory ? characterSheetHistory.filter(review => review.id !== pending?.id) : []
  return <>
    {pending && <section className="sheet-review-panel sheet-review-panel-pending" aria-labelledby="pending-review-title"><h3 id="pending-review-title">{pending && (completed[pending.id] || pending.status) !== 'PENDING' ? 'Revisione completata' : 'Modifica in attesa di approvazione'}</h3>{entry(pending)}{!canReviewSheetChanges && <p className="muted">Puoi consultare la scheda. Il master deve esaminare la modifica prima di un nuovo invio.</p>}</section>}
    {error && <p role="alert">{error}</p>}
    {history.length > 0 && <details className="character-sheet-disclosure"><summary>Storico delle revisioni ({history.length})</summary><div className="sheet-review-list">{history.map(entry)}</div></details>}
  </>
}
