import { useState } from 'react'
import { FieldLabel, Icon } from '../../../shared/components'
import type { Character } from '../../../types/domain'

export function SelectCharacterPage({
  characters,
  preferredCharacterId,
  onApply,
}: {
  characters: Character[]
  preferredCharacterId: string
  onApply: (characterId: string) => void
}) {
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

export function CreateCharacterPage({
  hasActiveCampaign,
  canCreatePlayerCharacter,
  canCreateNpc,
  onCreate,
}: {
  hasActiveCampaign: boolean
  canCreatePlayerCharacter: boolean
  canCreateNpc: boolean
  onCreate: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) => void
}) {
  const [name, setName] = useState('Nuovo PG')
  const [nickname, setNickname] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [isNpcChoice, setIsNpcChoice] = useState(false)
  const isNpc = isNpcChoice && canCreateNpc ? true : !canCreatePlayerCharacter && canCreateNpc
  const canCreateSelectedType = isNpc ? canCreateNpc : canCreatePlayerCharacter
  const saveDisabled =
    !hasActiveCampaign ||
    (!canCreatePlayerCharacter && !canCreateNpc) ||
    !canCreateSelectedType ||
    name.trim().length === 0

  return (
    <section className="panel">
      <h2>Crea Personaggio</h2>
      {!hasActiveCampaign && <p className="muted">Per creare un personaggio devi prima attivare una campagna.</p>}
      {hasActiveCampaign && !canCreatePlayerCharacter && (
        <div className="character-create-warning" role="alert" aria-live="polite">
          <Icon name="fa-solid fa-triangle-exclamation" className="character-create-warning-icon" />
          <div>
            <p className="character-create-warning-title">Limite raggiunto</p>
            <p className="character-create-warning-text">
              Hai già un PG attivo in questa campagna: non puoi crearne un altro.
              {canCreateNpc
                ? ' Se ti serve un personaggio aggiuntivo, puoi creare solo un NPC.'
                : ' I PG morti o ritirati non bloccano la creazione di un nuovo PG.'}
            </p>
          </div>
        </div>
      )}
      {hasActiveCampaign && !canCreateNpc && (
        <p className="muted">Con ruolo GIOCATORE non puoi creare NPC.</p>
      )}
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-signature" label="Nome" />
          <input value={name} placeholder="Nome del personaggio" onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-quote-right" label="Nickname" />
          <input value={nickname} placeholder="Soprannome o alias" onChange={(event) => setNickname(event.target.value)} />
        </label>
      </div>
      <label>
        <FieldLabel icon="fa-solid fa-image" label="Portrait URL" />
        <input value={portraitUrl} placeholder="https://..." onChange={(event) => setPortraitUrl(event.target.value)} />
      </label>
      <div>
        <div className="field-label">Tipo</div>
        <div className="segmented">
          <button
            type="button"
            className={`segmented-btn ${!isNpc ? 'is-active' : ''}`}
            disabled={!canCreatePlayerCharacter}
            onClick={() => setIsNpcChoice(false)}
          >
            <span className="char-kind-icon" aria-hidden="true">
              <Icon name="fa-solid fa-user" />
            </span>
            Personaggio
          </button>
          <button
            type="button"
            className={`segmented-btn ${isNpc ? 'is-active' : ''}`}
            disabled={!canCreateNpc}
            onClick={() => setIsNpcChoice(true)}
          >
            <span className="char-kind-icon" aria-hidden="true">
              <Icon name="fa-solid fa-mask" />
            </span>
            NPC
          </button>
        </div>
      </div>
      <button
        type="button"
        className="primary-btn"
        disabled={saveDisabled}
        onClick={() => onCreate({ name, nickname, portraitUrl, isNpc })}
      >
        <Icon name="fa-solid fa-plus" />
        Crea
      </button>
    </section>
  )
}
