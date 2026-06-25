import { DataTable } from '../../../shared/components'
import type { CampaignApplicationResponse } from '../../../types/domain'

export function ApprovalPage({
  pendingApplications,
  onLoadPending,
  onApprove,
  onReject,
}: {
  pendingApplications: CampaignApplicationResponse[]
  onLoadPending: () => void
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
}) {
  return (
    <section className="panel">
      <h2>Approvazione Accessi</h2>
      <div className="row-between">
        <p className="muted">Le richieste si caricano automaticamente quando entri in questa pagina.</p>
        <button type="button" className="secondary-btn" onClick={onLoadPending}>
          Aggiorna elenco
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'profile', label: 'Profilo' },
          { key: 'username', label: 'Username' },
          { key: 'status', label: 'Stato' },
          { key: 'actions', label: 'Azioni' },
        ]}
        rows={pendingApplications}
        getRowKey={(item) => item.userId}
        emptyMessage="Nessuna richiesta pending."
        renderRow={(item) => (
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
      />
    </section>
  )
}
