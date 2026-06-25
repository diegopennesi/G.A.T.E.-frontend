import { Icon } from './Icon'

export function FieldLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="field-label-with-icon">
      <Icon name={icon} className="field-label-icon" />
      <span>{label}</span>
    </span>
  )
}
