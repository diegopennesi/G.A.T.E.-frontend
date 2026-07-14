import type { ReactNode } from 'react'
import { DataTable } from './DataTable'
import type { DataTableColumn } from './DataTable'

export function ResponsiveDataList<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  desktopClassName,
  mobileListClassName,
  sortBy,
  sortDirection,
  onSortChange,
  selectedRowKey,
  renderDesktopRow,
  renderMobileCard,
}: {
  columns: DataTableColumn[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyMessage: string
  desktopClassName?: string
  mobileListClassName?: string
  sortBy?: string | null
  sortDirection?: 'asc' | 'desc'
  onSortChange?: (sortKey: string) => void
  selectedRowKey?: string | null
  renderDesktopRow: (row: T) => ReactNode
  renderMobileCard: (row: T) => ReactNode
}) {
  return (
    <>
      <div className="hidden md:block">
        <DataTable
          className={desktopClassName}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          emptyMessage={emptyMessage}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          selectedRowKey={selectedRowKey}
          renderRow={renderDesktopRow}
        />
      </div>
      <div className={`space-y-3 md:hidden ${mobileListClassName || ''}`.trim()} role="list" aria-label="Lista elementi">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/10 border-dashed px-4 py-4 text-center text-sm text-[var(--muted)]">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row) => (
            <div key={getRowKey(row)} role="listitem">
              {renderMobileCard(row)}
            </div>
          ))
        )}
      </div>
    </>
  )
}
