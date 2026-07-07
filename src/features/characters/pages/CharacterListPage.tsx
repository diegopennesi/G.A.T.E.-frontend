import { useMemo, useState } from 'react'
import { DataTable, FilterChipGroup, Icon } from '../../../shared/components'
import { statusTone } from '../../../shared/utils'
import type { Character, CharacterStatus } from '../../../types/domain'

export function CharacterListPage({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  canOpenCharacterSheet,
  ownerProfileLabel,
  campaignNameForCharacter,
  onCreateScreen,
  onReload,
}: {
  characters: Character[]
  selectedCharacterId: string
  onSelectCharacter: (character: Character) => void
  canOpenCharacterSheet: (character: Character) => boolean
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  campaignNameForCharacter: (character: Character) => string
  onCreateScreen: () => void
  onReload: () => void
}) {
  const [typeFilters, setTypeFilters] = useState<Array<'NPC' | 'PG'>>(['NPC', 'PG'])
  const [statusFilters, setStatusFilters] = useState<CharacterStatus[]>(['ACTIVE', 'RETIRED', 'DEAD'])
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'character' | 'profile' | 'campaign' | 'type' | 'status' | 'access'>('character')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const toggleTypeFilter = (type: 'NPC' | 'PG') => {
    setTypeFilters((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== type)
      }
      return [...prev, type]
    })
  }

  const toggleStatusFilter = (status: CharacterStatus) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== status)
      }
      return [...prev, status]
    })
  }

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
    const sortBoolean = (left: boolean, right: boolean) => (Number(left) - Number(right)) * directionMultiplier

    return [...list].sort((left, right) => {
      switch (sortBy) {
        case 'profile':
          return sortString(ownerProfileLabel(left.userId, left.ownerProfileName), ownerProfileLabel(right.userId, right.ownerProfileName))
        case 'campaign':
          return sortString(campaignNameForCharacter(left), campaignNameForCharacter(right))
        case 'type':
          return sortString(left.isNpc ? 'NPC' : 'PG', right.isNpc ? 'NPC' : 'PG')
        case 'status':
          return sortString(left.characterStatus || '', right.characterStatus || '')
        case 'access':
          return sortBoolean(canOpenCharacterSheet(left), canOpenCharacterSheet(right))
        case 'character':
        default:
          return sortString(left.name, right.name)
      }
    })
  }, [characters, statusFilters, typeFilters, normalizedSearchText, sortBy, sortDirection, ownerProfileLabel, campaignNameForCharacter, canOpenCharacterSheet])

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
        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onReload}>
            Reload
          </button>
          <button type="button" className="primary-btn" onClick={onCreateScreen}>
            Crea Personaggio
          </button>
        </div>
      </div>
      <div className="character-filter-toolbar">
        <FilterChipGroup
          label="Tipo"
          options={[
            { value: 'PG', label: 'Personaggio', title: 'Mostra i personaggi giocanti' },
            { value: 'NPC', label: 'NPC', title: 'Mostra i personaggi non giocanti' },
          ]}
          selectedValues={typeFilters}
          onToggle={toggleTypeFilter}
        />
        <FilterChipGroup
          label="Stato"
          options={[
            { value: 'ACTIVE', label: 'ACTIVE', className: 'filter-chip--status-approved', title: 'Stato attivo' },
            { value: 'RETIRED', label: 'RETIRED', className: 'filter-chip--status-rejected', title: 'Stato ritirato' },
            { value: 'DEAD', label: 'DEAD', className: 'filter-chip--status-blocked', title: 'Stato morto' },
          ]}
          selectedValues={statusFilters}
          onToggle={toggleStatusFilter}
        />
        <label className="character-filter-field">
          <span className="muted">Ricerca</span>
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Nome, profilo o campagna" />
        </label>
      </div>
      <DataTable
        columns={[
          { key: 'character', label: 'Personaggio', sortKey: 'character' },
          { key: 'profile', label: 'Profilo', sortKey: 'profile' },
          { key: 'campaign', label: 'Campagna', sortKey: 'campaign' },
          { key: 'type', label: 'Tipo', sortKey: 'type' },
          { key: 'status', label: 'Stato', sortKey: 'status' },
          { key: 'access', label: 'Accesso', sortKey: 'access' },
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
              <td className="data-table-secondary">{ownerProfileLabel(character.userId, character.ownerProfileName)}</td>
              <td className="data-table-secondary">{campaignNameForCharacter(character)}</td>
              <td>{character.isNpc ? 'NPC' : 'PG'}</td>
              <td>
                <span className={`status status-${statusTone(character.characterStatus)}`}>{character.characterStatus || 'N/A'}</span>
              </td>
              <td>
                <span
                  className={`editability-icon ${canOpen ? 'is-editable' : 'is-readonly'}`}
                  aria-label={canOpen ? 'Modificabile' : 'Non modificabile'}
                  title={canOpen ? 'Modificabile' : 'Non modificabile'}
                >
                  <Icon name={canOpen ? 'fa-solid fa-pen' : 'fa-solid fa-lock'} />
                </span>
              </td>
            </tr>
          )
        }}
      />
    </section>
  )
}
