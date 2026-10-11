import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
  ariaLabel?: string
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
  ariaLabel = placeholder,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(() => options.find((option) => option.value === value)?.label || '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()

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
  const expanded = open && !disabled && normalizedQuery.length >= minQueryLength
  const highlightedIndex = Math.min(activeIndex, matches.length - 1)

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`searchable-select ${className}`.trim()} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
    }}>
      <div className="searchable-select-control">
        <input
          className="system-inline-select searchable-select-input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && highlightedIndex >= 0 ? `${listId}-${highlightedIndex}` : undefined}
          onFocus={() => { setOpen(true); setActiveIndex(0) }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
              return
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              if (matches.length) {
                setActiveIndex(!expanded ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) :
                  (highlightedIndex + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length)
              }
              return
            }
            if (expanded && (event.key === 'Home' || event.key === 'End')) {
              event.preventDefault()
              setActiveIndex(event.key === 'Home' ? 0 : Math.max(0, matches.length - 1))
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (expanded && matches[highlightedIndex]) handleSelect(matches[highlightedIndex])
            }
          }}
        />
        <Icon name="fa-solid fa-magnifying-glass" className="searchable-select-icon" />
      </div>
      {expanded && (
        <div id={listId} className="searchable-select-panel" role="listbox" aria-label={ariaLabel}>
          {matches.length === 0 ? (
            <div className="searchable-select-empty">Nessuna corrispondenza.</div>
          ) : (
            matches.map((option, index) => (
              <button
                key={option.value}
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                className={`searchable-select-option ${index === highlightedIndex ? 'is-highlighted' : ''}`}
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
