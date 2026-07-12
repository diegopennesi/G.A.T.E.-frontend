import { useState } from 'react'
import type { Character, CharacterSheetResponse } from '../types/domain'

export function useCharacterState() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [characterDetail, setCharacterDetail] = useState<Character | null>(null)
  const [characterSheetDetail, setCharacterSheetDetail] = useState<CharacterSheetResponse | null>(null)

  return {
    characters,
    setCharacters,
    selectedCharacterId,
    setSelectedCharacterId,
    characterDetail,
    setCharacterDetail,
    characterSheetDetail,
    setCharacterSheetDetail,
  }
}
