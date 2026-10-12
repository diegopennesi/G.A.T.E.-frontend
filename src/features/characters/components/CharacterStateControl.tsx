import { useRef, useState } from 'react'
import { useCharacterContext } from '../../../context'
import type { Character, CharacterStatus } from '../../../types/domain'

export function CharacterStateControl({ character, disabled, onBusyChange }: { character: Character; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const { canMarkCharacterDead, canReactivateCharacter, updateCharacterStatus } = useCharacterContext()
  const [status, setStatus] = useState<CharacterStatus>(character.characterStatus || 'ACTIVE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const deadAllowed = canMarkCharacterDead(character)
  const reactivationAllowed = canReactivateCharacter(character)
  const blocked = disabled || saving || status === character.characterStatus || (status === 'DEAD' && !deadAllowed) || (status === 'ACTIVE' && character.characterStatus !== 'ACTIVE' && !reactivationAllowed)
  const update = async () => {
    if (blocked || lock.current) return
    lock.current = true; setSaving(true); setError(''); onBusyChange(true)
    try { await updateCharacterStatus(status) }
    catch { setError('Lo stato non è stato aggiornato. Puoi riprovare.') }
    finally { lock.current = false; setSaving(false); onBusyChange(false) }
  }
  return <details className="character-sheet-disclosure">
    <summary>Cambia stato del personaggio</summary>
    <p className="muted">Un personaggio ritirato o deceduto mantiene la scheda in sola lettura.</p>
    <label>Nuovo stato<select value={status} disabled={disabled || saving} onChange={event => setStatus(event.target.value as CharacterStatus)}><option value="ACTIVE" disabled={character.characterStatus !== 'ACTIVE' && !reactivationAllowed}>Attivo</option><option value="RETIRED">Ritirato</option>{deadAllowed && <option value="DEAD">Deceduto</option>}</select></label>
    {!deadAllowed && <p className="muted">Solo master e super master possono segnare un personaggio come deceduto o riattivarlo.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="secondary-btn" disabled={blocked} onClick={() => void update()}>{saving ? 'Aggiornamento…' : 'Aggiorna stato'}</button>
  </details>
}
