import { useState } from 'react'
import type { Character, CharacterSheetResponse, CharacterSheetReviewResponse } from '../types/domain'

export function useCharacterState() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [characterDetail, setCharacterDetail] = useState<Character | null>(null)
  const [characterSheetDetail, setCharacterSheetDetail] = useState<CharacterSheetResponse | null>(null)
  const [characterSheetHistory, setCharacterSheetHistory] = useState<CharacterSheetReviewResponse[]>([])

  return {
    characters,
    setCharacters,
    selectedCharacterId,
    setSelectedCharacterId,
    characterDetail,
    setCharacterDetail,
    characterSheetDetail,
    setCharacterSheetDetail,
    characterSheetHistory,
    setCharacterSheetHistory,
  }
}
