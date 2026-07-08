import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

export type SearchableSelectOption = {
  value: string
  label: string
  description?: string | null
}

type SearchableSelectProps = {
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  minQueryLength?: number
  disabled?: boolean
  className?: string
}

function getMatchScore(option: SearchableSelectOption, query: string) {
  const label = option.label.toLowerCase()
  const description = (option.description || '').toLowerCase()
  if (label.startsWith(query)) return 0
  if (label.includes(query)) return 1
  if (description.includes(query)) return 2
  return 3
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Cerca...',
  minQueryLength = 3,
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(() => options.find((option) => option.value === value)?.label || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (normalizedQuery.length < minQueryLength) return []
    return [...options]
      .filter((option) => {
        const label = option.label.toLowerCase()
        const description = (option.description || '').toLowerCase()
        return label.includes(normalizedQuery) || description.includes(normalizedQuery)
      })
      .sort((left, right) => {
        const leftScore = getMatchScore(left, normalizedQuery)
        const rightScore = getMatchScore(right, normalizedQuery)
        if (leftScore !== rightScore) return leftScore - rightScore
        return left.label.localeCompare(right.label, 'it')
      })
      .slice(0, 12)
  }, [minQueryLength, normalizedQuery, options])

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`searchable-select ${className}`.trim()}>
      <div className="searchable-select-control">
        <input
          className="system-inline-select searchable-select-input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (matches[0]) handleSelect(matches[0])
            }
          }}
        />
        <Icon name="fa-solid fa-magnifying-glass" className="searchable-select-icon" />
      </div>
      {open && normalizedQuery.length >= minQueryLength && (
        <div className="searchable-select-panel" role="listbox">
          {matches.length === 0 ? (
            <div className="searchable-select-empty">Nessuna corrispondenza.</div>
          ) : (
            matches.map((option) => (
              <button
                key={option.value}
                type="button"
                className="searchable-select-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                <span className="searchable-select-option-label">{option.label}</span>
                {option.description && <span className="searchable-select-option-description">{option.description}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
