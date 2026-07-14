import type { ReactNode } from 'react'

type KeyValueItem = {
  key: string
  label: string
  value: ReactNode
}

export function KeyValueGrid({
  items,
  className = '',
}: {
  items: KeyValueItem[]
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 text-sm max-[360px]:grid-cols-1 ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.key} className="grid gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">{item.label}</p>
          <div className="text-sm text-[var(--text-soft)]">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
