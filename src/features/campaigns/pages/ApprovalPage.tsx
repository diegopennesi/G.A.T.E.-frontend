import { useCampaignContext } from '../../../context'
import { ResponsiveDataList } from '../../../shared/components'

export function ApprovalPage() {
  const {
    pendingApplications,
    loadPendingApplications: onLoadPending,
    approvePendingApplication: onApprove,
    rejectPendingApplication: onReject,
  } = useCampaignContext()
  return (
    <section className="panel">
      <h2>Approvazione Accessi</h2>
      <div className="row-between">
        <p className="muted">Le richieste si caricano automaticamente quando entri in questa pagina.</p>
        <button type="button" className="secondary-btn" onClick={onLoadPending}>
          Aggiorna elenco
        </button>
      </div>
      <ResponsiveDataList
        desktopClassName="approval-data-table"
        columns={[
          { key: 'profile', label: 'Profilo' },
          { key: 'username', label: 'Username' },
          { key: 'status', label: 'Stato' },
          { key: 'actions', label: 'Azioni' },
        ]}
        rows={pendingApplications}
        getRowKey={(item) => item.userId}
        emptyMessage="Nessuna richiesta pending."
        renderDesktopRow={(item) => (
          <tr>
            <td>
              <div className="data-table-primary">
                <p className="data-table-title">{item.profileName}</p>
              </div>
            </td>
            <td className="data-table-muted">@{item.username}</td>
            <td>
              <span className="status status-warning">PENDING</span>
            </td>
            <td>
              <div className="data-table-actions">
                <button type="button" className="primary-btn" onClick={() => onApprove(item.userId)}>
                  Approva
                </button>
                <button type="button" className="secondary-btn" onClick={() => onReject(item.userId)}>
                  Rifiuta
                </button>
              </div>
            </td>
          </tr>
        )}
        renderMobileCard={(item) => (
          <article className="rounded-lg border border-white/10 bg-white/4 p-4 shadow-sm">
            <div className="grid gap-3">
              <div className="grid gap-1">
                <p className="text-base font-semibold text-[var(--text)]">{item.profileName}</p>
                <p className="text-sm text-[var(--muted)]">@{item.username}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">Stato</p>
                <span className="status status-warning w-fit">PENDING</span>
              </div>
              <div className="grid gap-2">
                <button type="button" className="primary-btn w-full justify-center" onClick={() => onApprove(item.userId)}>
                  Approva
                </button>
                <button type="button" className="secondary-btn w-full justify-center" onClick={() => onReject(item.userId)}>
                  Rifiuta
                </button>
              </div>
            </div>
          </article>
        )}
      />
    </section>
  )
}
