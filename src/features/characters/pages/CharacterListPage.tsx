import { useMemo, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { useCharacterContext } from '../../../context'
import { DataTable, Icon } from '../../../shared/components'
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
              className="member-filter-select"
              panelClassName="member-filter-select-panel"
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
              className="member-filter-select"
              panelClassName="member-filter-select-panel"
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
      <DataTable
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
        renderRow={(character) => {
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
              <td>
                <span className={`member-state-badge character-state-badge is-${String(character.characterStatus || 'neutral').toLowerCase()}`}>
                  <Icon
                    name={
                      character.characterStatus === 'ACTIVE'
                        ? 'fa-solid fa-circle-check'
                        : character.characterStatus === 'RETIRED'
                          ? 'fa-solid fa-hourglass-half'
                          : character.characterStatus === 'DEAD'
                            ? 'fa-solid fa-circle-xmark'
                            : 'fa-solid fa-circle-info'
                    }
                  />
                  <span>{character.characterStatus || 'N/A'}</span>
                </span>
              </td>
              <td>
                <span className={`character-kind-badge ${character.isNpc ? 'is-npc' : 'is-pg'}`}>
                  <Icon name={character.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
                  <span>{character.isNpc ? 'NPC' : 'PG'}</span>
                </span>
              </td>
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
      />
    </section>
  )
}
