import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listContentReports, updateContentReport } from '../../../services/gateApi'
import { formatShortDate, toMessage } from '../../../shared/utils'
import type { ContentReportReason, ContentReportStatus } from '../../../types/domain'
import { Icon } from '../../../shared/components'

const reasonLabels: Record<ContentReportReason, string> = {
  HARASSMENT: 'Molestie o minacce',
  HATE: 'Odio o discriminazione',
  SPAM: 'Spam o contenuto ingannevole',
  SEXUAL: 'Contenuto sessuale inappropriato',
  OTHER: 'Altro',
}

const statusLabels: Record<ContentReportStatus, string> = {
  OPEN: 'Da esaminare', REVIEWED: 'Esaminata', DISMISSED: 'Archiviata', ACTIONED: 'Provvedimento preso',
}

export function SystemContentReportsPage() {
  const [page, setPage] = useState(0)
  const client = useQueryClient()
  const reports = useQuery({ queryKey: ['admin', 'content-reports', page], queryFn: () => listContentReports(page) })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentReportStatus }) => updateContentReport(id, status),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['admin', 'content-reports'] }),
  })

  if (reports.isPending) return <p className="muted">Caricamento segnalazioni...</p>
  if (reports.error) return <div className="system-inline-alert"><Icon name="fa-solid fa-triangle-exclamation" /><span>{toMessage(reports.error)}</span></div>

  return <div className="content-report-list">
    {!reports.data?.items.length ? <div className="system-empty-state"><Icon name="fa-solid fa-shield" /><p>Nessuna segnalazione presente.</p></div> : null}
    {reports.data?.items.map((report) => <article className="content-report-card" key={report.id}>
      <div className="content-report-head">
        <div>
          <p className="menu-group-label">{reasonLabels[report.reason]}</p>
          <h3>{report.reportedProfileName}</h3>
          <p className="muted">Segnalato {formatShortDate(report.createdAt)}</p>
        </div>
        <span className={`status ${report.status === 'OPEN' ? 'status-warning' : report.status === 'ACTIONED' ? 'status-success' : 'status-neutral'}`}>
          {statusLabels[report.status]}
        </span>
      </div>
      <blockquote className="content-report-snapshot">{report.contentSnapshot}</blockquote>
      {report.details ? <p><strong>Nota:</strong> {report.details}</p> : null}
      <p className="system-user-id">Campagna {report.campaignId} · Missione {report.missionId}</p>
      <div className="inline-actions">
        <button type="button" className="refresh-btn" disabled={update.isPending || report.status === 'REVIEWED'}
          onClick={() => update.mutate({ id: report.id, status: 'REVIEWED' })}>Esaminata</button>
        <button type="button" className="refresh-btn" disabled={update.isPending || report.status === 'DISMISSED'}
          onClick={() => update.mutate({ id: report.id, status: 'DISMISSED' })}>Archivia</button>
        <button type="button" className="primary-btn" disabled={update.isPending || report.status === 'ACTIONED'}
          onClick={() => update.mutate({ id: report.id, status: 'ACTIONED' })}>Provvedimento preso</button>
      </div>
    </article>)}
    {update.error ? <div className="system-inline-alert"><Icon name="fa-solid fa-triangle-exclamation" /><span>{toMessage(update.error)}</span></div> : null}
    <div className="system-pagination">
      <p className="muted">Totale {reports.data?.totalElements ?? 0}</p>
      <div className="system-pagination-controls">
        <button type="button" className="refresh-btn" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Precedente</button>
        <button type="button" className="refresh-btn" disabled={!reports.data?.hasNext} onClick={() => setPage((value) => value + 1)}>Successiva</button>
      </div>
    </div>
  </div>
}
