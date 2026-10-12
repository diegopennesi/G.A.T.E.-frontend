import { useState } from 'react'
import { useCampaignContext } from '../../../context'
import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { Icon } from '../../../shared/components'
import type { InviteTokenResponse } from '../../../types/domain'

export function CampaignInvites() {
  const { campaign, createCampaignInviteToken } = useCampaignContext()
  const [automatic, setAutomatic] = useState(false)
  const [expires, setExpires] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [result, setResult] = useState<InviteTokenResponse | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')
  const action = useAsyncAction()
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopyFeedback('Codice copiato.') }
    catch { setCopyFeedback('Copia non disponibile. Seleziona e copia il codice dal campo.') }
  }
  if (!campaign) return null
  return <section className="settings-section" aria-labelledby="campaign-invites-title">
    <h3 id="campaign-invites-title">Inviti al tavolo</h3>
    <p className="muted">Il codice della campagna consente di trovarla anche quando non compare nella ricerca. Restano valide le regole di accesso.</p>
    <div className="inline-actions"><label>Codice della campagna<input value={campaign.inviteCode} readOnly /></label><button type="button" className="secondary-btn" onClick={() => void copy(campaign.inviteCode)}><Icon name="fa-solid fa-copy" />Copia codice</button></div>
    {copyFeedback && <p role="status">{copyFeedback}</p>}
    <details className="flow-details"><summary>Crea un invito con limiti</summary>
      <form onSubmit={event => {
        event.preventDefault()
        const uses = maxUses.trim() ? Number(maxUses) : null
        const expiry = expires ? new Date(expires) : null
        if (uses !== null && (!Number.isInteger(uses) || uses < 1)) { action.setError('Il numero di utilizzi deve essere un intero positivo.'); return }
        if (expiry && (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now())) { action.setError('La scadenza deve essere una data futura.'); return }
        void action.execute(async () => { setResult(await createCampaignInviteToken({ capabilities: automatic ? ['AUTOJOIN'] : [], expiresAt: expiry?.toISOString() || null, maxUses: uses })) }, 'Invito creato. Puoi copiare il codice qui sotto.')
      }} aria-busy={action.pending}>
        <fieldset disabled={action.pending} className="flow-fieldset">
          <label className="flow-check"><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} />Approva automaticamente chi usa questo invito</label>
          <p className="muted">Se disattivato, il master esamina la richiesta di accesso.</p>
          <div className="form-grid"><label>Scadenza (facoltativa)<input type="datetime-local" value={expires} onChange={event => setExpires(event.target.value)} /></label><label>Numero massimo di utilizzi<input type="number" min={1} step={1} value={maxUses} placeholder="Illimitato" onChange={event => setMaxUses(event.target.value)} /></label></div>
          <button type="submit" className="secondary-btn">{action.pending ? 'Creazione in corso…' : 'Crea invito'}</button>
        </fieldset>
      </form>
      {action.error && <p role="alert">{action.error}</p>}{action.notice && <p role="status">{action.notice}</p>}
      {result && <div className="invite-result"><label>Nuovo codice invito<input readOnly value={result.token} /></label><button type="button" className="secondary-btn" onClick={() => void copy(result.token)}>Copia nuovo codice</button><p className="muted">{result.capabilities.includes('AUTOJOIN') ? 'Ingresso automatico' : 'Approvazione del master'} · {result.expiresAt ? `Scade: ${new Date(result.expiresAt).toLocaleString('it-IT')}` : 'Senza scadenza'} · {result.maxUses ? `${result.maxUses} utilizzi` : 'Utilizzi illimitati'}</p></div>}
    </details>
  </section>
}
