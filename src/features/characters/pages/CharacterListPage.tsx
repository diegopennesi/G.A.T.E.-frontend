import { useMemo, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { useCharacterContext } from '../../../context'
import { Icon, ResponsiveDataList } from '../../../shared/components'
import type { CharacterStatus } from '../../../types/domain'

type CharacterTypeFilter = 'NPC' | 'PG'

type FilterOption<T extends string> = {
  value: T
  label: string
  icon: string
}

const TYPE_FILTER_OPTIONS: Array<FilterOption<CharacterTypeFilter>> = [
  { value: 'PG', label: 'Personaggio', icon: 'fa-solid fa-user' },
  { value: 'NPC', label: 'NPC', icon: 'fa-solid fa-mask' },
]

const STATUS_FILTER_OPTIONS: Array<FilterOption<CharacterStatus>> = [
  { value: 'ACTIVE', label: 'Active', icon: 'fa-solid fa-circle-check' },
  { value: 'RETIRED', label: 'Retired', icon: 'fa-solid fa-hourglass-half' },
  { value: 'DEAD', label: 'Dead', icon: 'fa-solid fa-circle-xmark' },
]

function characterStatusBadge(status: CharacterStatus | null | undefined) {
  return (
    <span className={`member-state-badge character-state-badge is-${String(status || 'neutral').toLowerCase()}`}>
      <Icon
        name={
          status === 'ACTIVE'
            ? 'fa-solid fa-circle-check'
            : status === 'RETIRED'
              ? 'fa-solid fa-hourglass-half'
              : status === 'DEAD'
                ? 'fa-solid fa-circle-xmark'
                : 'fa-solid fa-circle-info'
        }
      />
      <span>{status || 'N/A'}</span>
    </span>
  )
}

function characterTypeBadge(isNpc: boolean) {
  return (
    <span className={`character-kind-badge ${isNpc ? 'is-npc' : 'is-pg'}`}>
      <Icon name={isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
      <span>{isNpc ? 'NPC' : 'PG'}</span>
    </span>
  )
}

export function CharacterListPage() {
  const {
    characters,
    selectedCharacterId,
    selectCharacter: onSelectCharacter,
    canOpenCharacterSheet,
    ownerProfileLabel,
    campaignNameForCharacter,
    openCreateCharacter: onCreateScreen,
    reloadCharacters: onReload,
  } = useCharacterContext()
  const [typeFilters, setTypeFilters] = useState<CharacterTypeFilter[]>(['NPC', 'PG'])
  const [statusFilters, setStatusFilters] = useState<CharacterStatus[]>(['ACTIVE', 'RETIRED', 'DEAD'])
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'character' | 'campaign'>('character')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const normalizedSearchText = searchText.trim().toLowerCase()
  const filteredCharacters = useMemo(() => {
    const list = characters.filter((character) => {
      if (!character.characterStatus || !statusFilters.includes(character.characterStatus)) return false
      const type = character.isNpc ? 'NPC' : 'PG'
      if (!typeFilters.includes(type)) return false
      if (!normalizedSearchText) return true
      const owner = ownerProfileLabel(character.userId, character.ownerProfileName).toLowerCase()
      const name = character.name.toLowerCase()
      const campaignName = campaignNameForCharacter(character).toLowerCase()
      return owner.includes(normalizedSearchText) || name.includes(normalizedSearchText) || campaignName.includes(normalizedSearchText)
    })

    const directionMultiplier = sortDirection === 'asc' ? 1 : -1
    const sortString = (left: string, right: string) => left.localeCompare(right, 'it', { sensitivity: 'base' }) * directionMultiplier
    return [...list].sort((left, right) => {
      switch (sortBy) {
        case 'campaign':
          return sortString(campaignNameForCharacter(left), campaignNameForCharacter(right))
        case 'character':
        default:
          return sortString(left.name, right.name)
      }
    })
  }, [characters, statusFilters, typeFilters, normalizedSearchText, sortBy, sortDirection, ownerProfileLabel, campaignNameForCharacter])

  const handleSortChange = (nextSortBy: string) => {
    setSortBy((prev) => {
      const nextKey = nextSortBy as typeof sortBy
      if (prev === nextKey) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return nextKey
    })
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Gestione Personaggi</h2>
        <div className="inline-actions character-page-actions">
          <button type="button" className="secondary-btn" onClick={onReload}>
            <Icon name="fa-solid fa-rotate" />
            Reload
          </button>
          <button type="button" className="primary-btn" onClick={onCreateScreen}>
            <Icon name="fa-solid fa-plus" />
            Crea Personaggio
          </button>
        </div>
      </div>
      <div className="member-filters-panel">
        <div className="character-filter-toolbar">
          <label className="member-filter-field">
            <span className="muted">Tipo</span>
            <MultiSelect
              className="surface-field member-filter-select"
              panelClassName="surface-field-panel member-filter-select-panel"
              value={typeFilters}
              options={TYPE_FILTER_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setTypeFilters(event.value as CharacterTypeFilter[])}
              placeholder="Tutti i tipi"
              maxSelectedLabels={2}
              selectedItemsLabel="{0} selezionati"
              itemTemplate={(option: FilterOption<CharacterTypeFilter>) => (
                <span className="member-filter-option-copy">
                  <Icon name={option.icon} />
                  <span>{option.label}</span>
                </span>
              )}
            />
          </label>
          <label className="member-filter-field">
            <span className="muted">Stato</span>
            <MultiSelect
              className="surface-field member-filter-select"
              panelClassName="surface-field-panel member-filter-select-panel"
              value={statusFilters}
              options={STATUS_FILTER_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setStatusFilters(event.value as CharacterStatus[])}
              placeholder="Tutti gli stati"
              maxSelectedLabels={2}
              selectedItemsLabel="{0} selezionati"
              itemTemplate={(option: FilterOption<CharacterStatus>) => (
                <span className="member-filter-option-copy">
                  <Icon name={option.icon} />
                  <span>{option.label}</span>
                </span>
              )}
            />
          </label>
          <label className="member-filter-field">
            <span className="muted">Ricerca</span>
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Nome, profilo o campagna" />
          </label>
        </div>
      </div>
      <ResponsiveDataList
        desktopClassName="character-list-data-table"
        columns={[
          { key: 'character', label: 'Personaggio', sortKey: 'character' },
          { key: 'status', label: 'Stato' },
          { key: 'type', label: 'Tipo' },
          { key: 'campaign', label: 'Campagna', sortKey: 'campaign' },
          { key: 'profile', label: 'Profilo' },
          { key: 'edit', label: '' },
        ]}
        rows={filteredCharacters}
        getRowKey={(character) => character.id}
        emptyMessage="Nessun personaggio per i filtri selezionati."
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        renderDesktopRow={(character) => {
          const canOpen = canOpenCharacterSheet(character)
          return (
            <tr className={selectedCharacterId === character.id ? 'is-selected' : ''}>
              <td>
                <button
                  type="button"
                  className="data-table-link"
                  onClick={() => onSelectCharacter(character)}
                  disabled={!canOpen}
                >
                  <span className="char-kind-icon" aria-hidden="true">
                    <Icon name={character.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
                  </span>{' '}
                  {character.name}
                </button>
                <p className="data-table-secondary">{character.nickname || 'no nickname'}</p>
              </td>
              <td>{characterStatusBadge(character.characterStatus)}</td>
              <td>{characterTypeBadge(character.isNpc)}</td>
              <td className="data-table-secondary">{campaignNameForCharacter(character)}</td>
              <td className="data-table-secondary">{ownerProfileLabel(character.userId, character.ownerProfileName)}</td>
              <td>
                <button
                  type="button"
                  className="character-edit-btn"
                  onClick={() => onSelectCharacter(character)}
                  disabled={!canOpen}
                  aria-label={canOpen ? `Modifica scheda ${character.name}` : `Scheda non modificabile ${character.name}`}
                  title={canOpen ? 'Modifica scheda' : 'Scheda non modificabile'}
                >
                  <Icon name={canOpen ? 'fa-solid fa-pen' : 'fa-solid fa-lock'} />
                </button>
              </td>
            </tr>
          )
        }}
        renderMobileCard={(character) => {
          const canOpen = canOpenCharacterSheet(character)
          return (
            <article className={`rounded-lg border border-white/10 bg-white/4 p-4 shadow-sm ${selectedCharacterId === character.id ? 'ring-1 ring-amber-400/35' : ''}`}>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--text)]">{character.name}</p>
                      <p className="text-sm text-[var(--muted)]">{character.nickname || 'no nickname'}</p>
                    </div>
                    <button
                      type="button"
                      className="character-edit-btn shrink-0"
                      onClick={() => onSelectCharacter(character)}
                      disabled={!canOpen}
                      aria-label={canOpen ? `Modifica scheda ${character.name}` : `Scheda non modificabile ${character.name}`}
                      title={canOpen ? 'Modifica scheda' : 'Scheda non modificabile'}
                    >
                      <Icon name={canOpen ? 'fa-solid fa-pen' : 'fa-solid fa-lock'} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm max-[360px]:grid-cols-1">
                  <div className="grid gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">Stato</p>
                    {characterStatusBadge(character.characterStatus)}
                  </div>
                  <div className="grid gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">Tipo</p>
                    {characterTypeBadge(character.isNpc)}
                  </div>
                  <div className="grid gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">Campagna</p>
                    <p className="text-sm text-[var(--text-soft)]">{campaignNameForCharacter(character)}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">Profilo</p>
                    <p className="text-sm text-[var(--text-soft)]">{ownerProfileLabel(character.userId, character.ownerProfileName)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`w-full justify-center ${canOpen ? 'secondary-btn' : 'secondary-btn opacity-60'}`}
                  onClick={() => onSelectCharacter(character)}
                  disabled={!canOpen}
                >
                  {canOpen ? 'Apri scheda' : 'Scheda non disponibile'}
                </button>
              </div>
            </article>
          )
        }}
      />
    </section>
  )
}
