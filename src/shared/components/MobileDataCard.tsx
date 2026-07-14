import type { ReactNode } from 'react'

export function MobileDataCard({
  title,
  subtitle,
  badges,
  children,
  actions,
  selected = false,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  badges?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  selected?: boolean
  className?: string
}) {
  return (
    <article
      className={`rounded-lg border bg-white/4 p-4 shadow-sm ${
        selected ? 'border-amber-400/30 ring-1 ring-amber-400/35' : 'border-white/10'
      } ${className}`.trim()}
    >
      <div className="grid gap-3">
        <div className="grid gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[var(--text)]">{title}</p>
            {subtitle ? <div className="mt-1 text-sm text-[var(--muted)]">{subtitle}</div> : null}
          </div>
          {badges ? <div>{badges}</div> : null}
        </div>
        {children}
        {actions ? <div>{actions}</div> : null}
      </div>
    </article>
  )
}
