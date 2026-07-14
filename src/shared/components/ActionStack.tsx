import type { ReactNode } from 'react'

export function ActionStack({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`grid gap-2 ${className}`.trim()}>{children}</div>
}
