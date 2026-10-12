import { useState } from 'react'
import { useCampaignContext } from '../../../context'
import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { ResponsiveDataList, ConfirmActionDialog } from '../../../shared/components'
import type { CampaignApplicationResponse } from '../../../types/domain'

export function ApprovalPage() {
  const { pendingApplications, loadPendingApplications, approvePendingApplication, rejectPendingApplication } = useCampaignContext()
  const action = useAsyncAction()
  const [target, setTarget] = useState('')
  const [reject, setReject] = useState<CampaignApplicationResponse | null>(null)
  const decide = async (item: CampaignApplicationResponse, approve: boolean) => {
    setTarget(item.userId)
    await action.execute(() => (approve ? approvePendingApplication : rejectPendingApplication)(item.userId), `${item.profileName}: richiesta ${approve ? 'approvata' : 'rifiutata'}.`)
  }
  const actions = (item: CampaignApplicationResponse) => <div><div className="inline-actions"><button type="button" className="primary-btn" disabled={action.pending} onClick={() => void decide(item, true)}>{action.pending && target === item.userId ? 'Elaborazione…' : 'Approva accesso'}</button><button type="button" className="secondary-btn" disabled={action.pending} onClick={() => setReject(item)}>Rifiuta richiesta</button></div>{target === item.userId && action.error && <p role="alert">{action.error}</p>}</div>
  return <section className="panel remaining-flow approvals-page">
    <header className="flow-header"><h2>Richieste di accesso</h2><p className="muted">{pendingApplications.length} richieste in attesa. Approva chi entrerà nel tavolo.</p><button type="button" className="secondary-btn" disabled={action.pending} onClick={() => { setTarget(''); void action.execute(loadPendingApplications, 'Elenco aggiornato.') }}>{action.pending && !target ? 'Aggiornamento…' : 'Aggiorna elenco'}</button></header>
    {!target && action.error && <p role="alert">{action.error}</p>}{action.notice && <p role="status">{action.notice}</p>}
    <ResponsiveDataList desktopClassName="approval-data-table" columns={[{ key: 'profile', label: 'Profilo' }, { key: 'requested', label: 'Richiesta' }, { key: 'actions', label: 'Azioni' }]} rows={pendingApplications} getRowKey={item => item.userId} emptyMessage="Nessuna richiesta in attesa. Le nuove richieste compariranno qui." renderDesktopRow={item => <tr><td><strong>{item.profileName}</strong><p className="muted">@{item.username}</p></td><td>{new Date(item.requestedAt).toLocaleDateString('it-IT')}</td><td>{actions(item)}</td></tr>} renderMobileCard={item => <article className="flow-row"><h3>{item.profileName}</h3><p className="muted">@{item.username} · {new Date(item.requestedAt).toLocaleDateString('it-IT')}</p>{actions(item)}</article>} />
    <ConfirmActionDialog open={Boolean(reject)} title="Rifiutare la richiesta?" message={`${reject?.profileName || 'L’utente'} non entrerà nella campagna con questa richiesta.`} confirmLabel="Rifiuta richiesta" tone="danger" onCancel={() => setReject(null)} onConfirm={() => { const item = reject; setReject(null); if (item) void decide(item, false) }} />
  </section>
}
