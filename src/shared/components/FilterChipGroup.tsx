export type FilterChipOption<T extends string> = {
  value: T
  label: string
  title?: string
  className?: string
}

export function FilterChipGroup<T extends string>({
  label,
  options,
  selectedValues,
  onToggle,
}: {
  label: string
  options: Array<FilterChipOption<T>>
  selectedValues: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="filter-chip-group">
      <p className="muted">{label}</p>
      <div className="filter-chip-row">
        {options.map((option) => {
          const active = selectedValues.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className={`filter-chip ${option.className || ''} ${active ? 'is-active' : ''}`.trim()}
              onClick={() => onToggle(option.value)}
              title={option.title || option.label}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
