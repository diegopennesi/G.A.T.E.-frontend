import { queryOptions } from '@tanstack/react-query'
import { getCharacter, getCharacterSheet } from '../gateApi'
import { queryKeys } from '../queryKeys'

export const characterQueries = {
  detail: (campaignId: string, characterId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignCharacterDetail(campaignId, characterId),
      queryFn: () => getCharacter(campaignId, characterId),
    }),
  sheet: (campaignId: string, characterId: string) =>
    queryOptions({
      queryKey: queryKeys.campaignCharacterSheet(campaignId, characterId),
      queryFn: () => getCharacterSheet(campaignId, characterId),
    }),
} as const
