import type { ReactNode } from 'react'

export function BadgeGroup({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`flex flex-wrap items-start gap-2 ${className}`.trim()}>{children}</div>
}
