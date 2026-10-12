import { useState } from 'react'
import { useCharacterContext } from '../../../context'
import { FieldLabel, Icon } from '../../../shared/components'

export function SelectCharacterPage() {
  const { characters, preferredCharacterId, applyCharacterToCampaign: onApply } = useCharacterContext()
  const [characterId, setCharacterId] = useState(() => {
    if (preferredCharacterId && characters.some((character) => character.id === preferredCharacterId)) {
      return preferredCharacterId
    }
    return characters[0]?.id || ''
  })
  return (
    <section className="panel">
      <h2>Seleziona PG</h2>
      <label>
        <FieldLabel icon="fa-solid fa-user" label="Personaggio" />
        <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name} ({character.characterStatus || 'N/A'})
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="primary-btn" onClick={() => characterId && onApply(characterId)}>
        <Icon name="fa-solid fa-arrow-right" />
        Apply alla campagna con PG
      </button>
    </section>
  )
}

export { CreateCharacterPage } from './CreateCharacterPage'
