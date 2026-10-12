import { useMemo, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { useCharacterContext } from '../../../context'
import { Icon, ResponsiveDataList } from '../../../shared/components'
import type { CharacterStatus } from '../../../types/domain'

type CharacterTypeFilter = 'NPC' | 'PG'
type CharacterStateFilter = CharacterStatus | 'UNSPECIFIED'
const statusLabels = { ACTIVE: 'Attivo', RETIRED: 'Ritirato', DEAD: 'Deceduto' }

type FilterOption<T extends string> = {
  value: T
  label: string
  icon: string
}

const TYPE_FILTER_OPTIONS: Array<FilterOption<CharacterTypeFilter>> = [
  { value: 'PG', label: 'Personaggio', icon: 'fa-solid fa-user' },
  { value: 'NPC', label: 'NPC', icon: 'fa-solid fa-mask' },
]

const STATUS_FILTER_OPTIONS: Array<FilterOption<CharacterStateFilter>> = [
  { value: 'ACTIVE', label: 'Attivo', icon: 'fa-solid fa-circle-check' },
  { value: 'RETIRED', label: 'Ritirato', icon: 'fa-solid fa-hourglass-half' },
  { value: 'DEAD', label: 'Deceduto', icon: 'fa-solid fa-circle-xmark' },
  { value: 'UNSPECIFIED', label: 'Non assegnato', icon: 'fa-solid fa-circle-info' },
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
      <span>{status ? statusLabels[status] : 'Non assegnato'}</span>
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
    currentUserId,
    charactersLoaded,
    charactersLoadFailed,
    managedCharacters: characters,
    hasActiveCampaign,
    canCreatePlayerCharacter,
    canCreateNpc,
    selectedCharacterId,
    selectCharacter: onSelectCharacter,
    canOpenCharacterSheet,
    ownerProfileLabel,
    campaignNameForCharacter,
    openCreateCharacter: onCreateScreen,
    reloadCharacters: onReload,
  } = useCharacterContext()
  const [typeFilters, setTypeFilters] = useState<CharacterTypeFilter[]>(['NPC', 'PG'])
  const [statusFilters, setStatusFilters] = useState<CharacterStateFilter[]>(['ACTIVE', 'RETIRED', 'DEAD', 'UNSPECIFIED'])
  const [onlyMine, setOnlyMine] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'character' | 'campaign'>('character')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const normalizedSearchText = searchText.trim().toLowerCase()
  const filteredCharacters = useMemo(() => {
    const list = characters.filter((character) => {
      if (onlyMine && character.userId !== currentUserId) return false
      if (!statusFilters.includes(character.characterStatus ?? 'UNSPECIFIED')) return false
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
  }, [characters, onlyMine, currentUserId, statusFilters, typeFilters, normalizedSearchText, sortBy, sortDirection, ownerProfileLabel, campaignNameForCharacter])

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

  const listError = refreshError || (charactersLoadFailed ? 'Non riesco ad aggiornare i personaggi. Quelli già caricati restano visibili: riprova.' : '')
  const canCreate = hasActiveCampaign && (canCreatePlayerCharacter || canCreateNpc)
  const filtersActive = Boolean(searchText || onlyMine || typeFilters.length !== 2 || statusFilters.length !== 4)
  const resetFilters = () => {
    setSearchText('')
    setOnlyMine(false)
    setTypeFilters(['NPC', 'PG'])
    setStatusFilters(['ACTIVE', 'RETIRED', 'DEAD', 'UNSPECIFIED'])
  }
  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setRefreshError('')
    try { await onReload() } catch {
      setRefreshError('Non riesco ad aggiornare i personaggi. Quelli già caricati restano visibili: riprova.')
    } finally { setRefreshing(false) }
  }

  return (
    <section className="panel character-browser">
      <div className="character-browser-heading">
        <div>
          <h2>Personaggi</h2>
          <p className="muted">Ritrova i personaggi delle tue campagne e apri la loro scheda.</p>
        </div>
        <div className="inline-actions character-page-actions">
          <button type="button" className="secondary-btn" disabled={refreshing} onClick={() => void refresh()}>
            <Icon name="fa-solid fa-rotate" />{refreshing ? 'Aggiornamento…' : 'Aggiorna elenco'}
          </button>
          {canCreate && <button type="button" className="primary-btn" onClick={onCreateScreen}><Icon name="fa-solid fa-plus" />Crea personaggio</button>}
        </div>
      </div>
      {!hasActiveCampaign && <p className="muted">Seleziona una campagna attiva per creare un personaggio.</p>}
      {hasActiveCampaign && !canCreatePlayerCharacter && <p className="muted">Hai già un PG attivo in questa campagna.{canCreateNpc ? ' Puoi ancora creare un NPC.' : ' Apri la sua scheda dall’elenco.'}</p>}
      {listError && <div className="character-refresh-error" role="alert"><p>{listError}</p><button type="button" className="secondary-btn" disabled={refreshing} onClick={() => void refresh()}>Riprova</button></div>}
      <div className="character-browser-search">
        <label><span>Cerca personaggi</span><input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Nome, profilo o campagna" /></label>
        <label className="character-mine-toggle"><input type="checkbox" checked={onlyMine} onChange={event => setOnlyMine(event.target.checked)} /><span>Solo i miei</span></label>
      </div>
      <details className="character-browser-filters">
        <summary>Filtra per tipo e stato</summary>
      <div className="member-filters-panel">
        <div className="character-filter-toolbar">
          <label className="member-filter-field">
            <span id="character-type-label" className="muted">Tipo</span>
            <MultiSelect
              className="surface-field member-filter-select"
              panelClassName="surface-field-panel member-filter-select-panel"
              ariaLabelledBy="character-type-label"
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
            <span id="character-status-label" className="muted">Stato</span>
            <MultiSelect
              className="surface-field member-filter-select"
              panelClassName="surface-field-panel member-filter-select-panel"
              ariaLabelledBy="character-status-label"
              value={statusFilters}
              options={STATUS_FILTER_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setStatusFilters(event.value as CharacterStateFilter[])}
              placeholder="Tutti gli stati"
              maxSelectedLabels={2}
              selectedItemsLabel="{0} selezionati"
              itemTemplate={(option: FilterOption<CharacterStateFilter>) => (
                <span className="member-filter-option-copy">
                  <Icon name={option.icon} />
                  <span>{option.label}</span>
                </span>
              )}
            />
          </label>
        </div>
      </div>
      </details>
      <div className="character-results-toolbar">
        <p className="muted" role="status">{charactersLoaded ? `${filteredCharacters.length} di ${characters.length} personaggi visibili` : 'Caricamento dei personaggi…'}</p>
        {filtersActive && <button type="button" className="secondary-btn" onClick={resetFilters}>Azzera filtri</button>}
        <label className="character-sort-control"><span>Ordina per</span><select value={`${sortBy}-${sortDirection}`} onChange={event => {
          const [key, direction] = event.target.value.split('-')
          setSortBy(key as typeof sortBy)
          setSortDirection(direction as typeof sortDirection)
        }}><option value="character-asc">Nome: A–Z</option><option value="character-desc">Nome: Z–A</option><option value="campaign-asc">Campagna: A–Z</option><option value="campaign-desc">Campagna: Z–A</option></select></label>
      </div>
      {charactersLoaded && characters.length === 0 && !listError && <div className="character-empty-state"><h3>Nessun personaggio disponibile</h3><p className="muted">Qui compariranno i personaggi che puoi consultare nelle tue campagne.{canCreate ? ' Usa Crea personaggio per iniziare.' : ''}</p></div>}
      {characters.length > 0 && filteredCharacters.length === 0 && <div className="character-empty-state"><h3>Nessun risultato</h3><p className="muted">Prova un altro nome o azzera i filtri per rivedere l’elenco.</p></div>}
      {filteredCharacters.length > 0 && <ResponsiveDataList
        desktopClassName="character-list-data-table"
        columns={[
          { key: 'character', label: 'Personaggio', sortKey: 'character' },
          { key: 'status', label: 'Stato' },
          { key: 'type', label: 'Tipo' },
          { key: 'campaign', label: 'Campagna', sortKey: 'campaign' },
          { key: 'profile', label: 'Profilo' },
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
                  aria-label={`Apri scheda ${character.name}`}
                  onClick={() => onSelectCharacter(character)}
                  disabled={!canOpen}
                >
                  <span className="char-kind-icon" aria-hidden="true">
                    <Icon name={character.isNpc ? 'fa-solid fa-mask' : 'fa-solid fa-user'} />
                  </span>{' '}
                  {character.name}
                </button>
                {character.nickname && <p className="data-table-secondary">{character.nickname}</p>}
              </td>
              <td>{characterStatusBadge(character.characterStatus)}</td>
              <td>{characterTypeBadge(character.isNpc)}</td>
              <td className="data-table-secondary">{campaignNameForCharacter(character)}</td>
              <td className="data-table-secondary">{ownerProfileLabel(character.userId, character.ownerProfileName)}{character.userId === currentUserId && <span className="character-own-label">Il tuo personaggio</span>}</td>
            </tr>
          )
        }}
        renderMobileCard={(character) => {
          const canOpen = canOpenCharacterSheet(character)
          return (
            <article className="character-browser-row">
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--text)]">{character.name}</p>
                      {character.nickname && <p className="text-sm text-[var(--muted)]">{character.nickname}</p>}
                    </div>
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
                    <p className="text-sm text-[var(--text-soft)]">{ownerProfileLabel(character.userId, character.ownerProfileName)}{character.userId === currentUserId && <span className="character-own-label">Il tuo personaggio</span>}</p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Apri scheda ${character.name}`}
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
      />}
    </section>
  )
}
