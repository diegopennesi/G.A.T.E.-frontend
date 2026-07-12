import { Fragment, cloneElement, isValidElement } from 'react'
import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { Icon } from './Icon'

export type DataTableColumn = {
  key: string
  label: string
  className?: string
  sortKey?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  renderRow,
  emptyMessage,
  className,
  sortBy,
  sortDirection,
  onSortChange,
  onRowClick,
  selectedRowKey,
}: {
  columns: DataTableColumn[]
  rows: T[]
  getRowKey: (row: T) => string
  renderRow: (row: T) => ReactNode
  emptyMessage: string
  className?: string
  sortBy?: string | null
  sortDirection?: 'asc' | 'desc'
  onSortChange?: (sortKey: string) => void
  onRowClick?: (row: T) => void
  selectedRowKey?: string | null
}) {
  return (
    <div className={`data-table-shell ${className || ''}`.trim()}>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.className}
                  aria-sort={
                    column.sortKey && sortBy === column.sortKey
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {column.sortKey && onSortChange ? (
                    <button
                      type="button"
                      className={`data-table-sort-btn ${sortBy === column.sortKey ? 'is-active' : ''}`}
                      onClick={() => onSortChange(column.sortKey as string)}
                    >
                      <span>{column.label}</span>
                      <Icon
                        name={
                          sortBy === column.sortKey
                            ? sortDirection === 'asc'
                              ? 'fa-solid fa-arrow-up-wide-short'
                              : 'fa-solid fa-arrow-down-wide-short'
                            : 'fa-solid fa-sort'
                        }
                      />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="data-table-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = getRowKey(row)
                const renderedRow = renderRow(row)
                const rowClassName = rowKey === selectedRowKey ? 'is-selected' : undefined
                if (isValidElement(renderedRow)) {
                  const rowElement = renderedRow as ReactElement<{
                    className?: string
                    onClick?: () => void
                    onKeyDown?: (event: KeyboardEvent<HTMLTableRowElement>) => void
                    tabIndex?: number
                    role?: string
                    'aria-selected'?: boolean
                  }>
                  return cloneElement(rowElement, {
                    key: rowKey,
                    className: [rowElement.props.className, rowClassName].filter(Boolean).join(' ') || undefined,
                    onClick: onRowClick ? () => onRowClick(row) : rowElement.props.onClick,
                    onKeyDown: onRowClick
                      ? (event: KeyboardEvent<HTMLTableRowElement>) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : rowElement.props.onKeyDown,
                    tabIndex: onRowClick ? 0 : rowElement.props.tabIndex,
                    role: onRowClick ? 'button' : rowElement.props.role,
                    'aria-selected': rowClassName ? true : rowElement.props['aria-selected'],
                  })
                }
                return <Fragment key={rowKey}>{renderedRow}</Fragment>
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
