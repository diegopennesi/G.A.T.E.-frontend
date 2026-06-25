export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`${name} ${className}`.trim()} />
}
