import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../services/queryClient'
import { queryKeys } from '../services/queryKeys'
import { applyToCampaign, createCharacter, updateCharacterSheet, updateCharacterStatus } from '../services/gateApi'
import type { Character, CharacterSheetResponse, CharacterStatus } from '../types/domain'
import type { Screen } from '../types/ui'

type CharacterMutationsDeps = {
  campaignId: string
  setCharacters: (updater: (prev: Character[]) => Character[]) => void
  setSelectedCharacterId: (value: string) => void
  setCharacterDetail: (value: Character | null) => void
  setCharacterSheetDetail: (value: CharacterSheetResponse | null) => void
  setScreen: (value: Screen) => void
  refreshMissions: (options?: { clearSelection?: boolean; force?: boolean }) => Promise<void>
}

export function useCharacterMutations(deps: CharacterMutationsDeps) {
  const invalidateCharacterBlock = (campaignId: string, characterId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacters(campaignId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacterDetail(campaignId, characterId), exact: false }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignCharacterSheet(campaignId, characterId), exact: false }),
    ])

  const createCharacterMutation = useMutation({
    mutationFn: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) =>
      createCharacter(deps.campaignId, payload),
    onSuccess: (created) => {
      deps.setCharacters((prev) => [created, ...prev])
      deps.setSelectedCharacterId(created.id)
      deps.setScreen('Gestione Personaggi')
      void invalidateCharacterBlock(deps.campaignId, created.id)
    },
  })

  const saveCharacterSheetMutation = useMutation({
    mutationFn: ({ campaignId, characterId, dataJson }: { campaignId: string; characterId: string; dataJson: Record<string, unknown> }) =>
      updateCharacterSheet(campaignId, characterId, { dataJson }),
    onSuccess: async (updatedSheet, variables) => {
      deps.setCharacterSheetDetail(updatedSheet)
      await invalidateCharacterBlock(variables.campaignId, variables.characterId)
    },
  })

  const updateCharacterStatusMutation = useMutation({
    mutationFn: ({ campaignId, characterId, status }: { campaignId: string; characterId: string; status: CharacterStatus }) =>
      updateCharacterStatus(campaignId, characterId, status),
    onSuccess: async (updated, variables) => {
      deps.setCharacters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      deps.setCharacterDetail(updated)
      await invalidateCharacterBlock(variables.campaignId, variables.characterId)
      await deps.refreshMissions({ force: true })
    },
  })

  const applyCharacterToCampaignMutation = useMutation({
    mutationFn: ({ campaignId, characterId }: { campaignId: string; characterId: string }) => applyToCampaign(campaignId, characterId),
    onSuccess: async (_value, variables) => {
      await invalidateCharacterBlock(variables.campaignId, variables.characterId)
    },
  })

  return {
    createCharacter: (payload: { name: string; nickname?: string; portraitUrl?: string; isNpc?: boolean }) =>
      createCharacterMutation.mutateAsync(payload),
    saveCharacterSheet: (campaignId: string, characterId: string, dataJson: Record<string, unknown>) =>
      saveCharacterSheetMutation.mutateAsync({ campaignId, characterId, dataJson }).then((updatedSheet) => {
        if (campaignId === deps.campaignId) {
          deps.setCharacterSheetDetail(updatedSheet)
        }
        return updatedSheet
      }),
    updateCharacterStatus: (campaignId: string, characterId: string, status: CharacterStatus) =>
      updateCharacterStatusMutation.mutateAsync({ campaignId, characterId, status }),
    applyCharacterToCampaign: (campaignId: string, characterId: string) =>
      applyCharacterToCampaignMutation.mutateAsync({ campaignId, characterId }),
  }
}
