/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Character, CharacterStatus, CharacterSheetResponse, CharacterSheetReviewResponse } from '../types/domain'

export type CharacterContextValue = {
  characters: Character[]
  selectedCharacterId: string
  selectCharacter: (character: Character) => void
  canOpenCharacterSheet: (character: Character) => boolean
  ownerProfileLabel: (userId: string | null, ownerProfileName?: string | null) => string
  campaignNameForCharacter: (character: Character) => string
  openCreateCharacter: () => void
  reloadCharacters: () => void
  selectedCharacter: Character | null
  characterDetail: Character | null
  characterSheetDetail: CharacterSheetResponse | null
  characterSheetHistory: CharacterSheetReviewResponse[]
  refreshCharacterDetail: () => void
  saveCharacterSheet: (dataJson: Record<string, unknown>) => Promise<void>
  canViewSheetHistory: boolean
  canReviewSheetChanges: boolean
  approveCharacterSheetReview: (reviewId: string, note?: string) => Promise<void>
  rejectCharacterSheetReview: (reviewId: string, note?: string) => Promise<void>
  canMarkCharacterDead: (character: Character | null) => boolean
  canReactivateCharacter: (character: Character | null) => boolean
  updateCharacterStatus: (status: CharacterStatus) => void
  preferredCharacterId: string
  applyCharacterToCampaign: (characterId: string) => void
  hasActiveCampaign: boolean
  canCreatePlayerCharacter: boolean
  canCreateNpc: boolean
  createCharacter: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) => void
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ value, children }: { value: CharacterContextValue; children: ReactNode }) {
  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>
}

export function useCharacterContext() {
  const value = useContext(CharacterContext)
  if (!value) throw new Error('CharacterContext non disponibile')
  return value
}
