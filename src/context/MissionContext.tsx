/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type {
  CampaignRole,
  MissionChatResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
} from '../types/domain'

export type MissionContextValue = {
  missions: MissionResponse[]
  selectedMission: MissionResponse | null
  canCreateMissions: boolean
  activeCampaignId: string
  activeCampaignRole: CampaignRole | null
  activeCampaignCharacterId: string
  campaignNameById: Record<string, string>
  campaignGameSystemById: Record<string, string>
  campaignCanBeOpenedById: Record<string, boolean>
  missionParticipantsById: Record<string, MissionParticipantResponse[]>
  missionParticipantLabelByUserId: Record<string, string>
  missionParticipantCharacterLabelById: Record<string, string>
  myMissionParticipationById: Record<string, MissionParticipationType>
  currentUserId: string
  selectedMissionChatId: string | null
  missionChat: MissionChatResponse | null
  missionChatBusy: boolean
  missionChatError: string
  createMission: (payload: {
    title: string
    description?: string
    isMultiSession?: boolean
    sessionAt?: string
    closesAt?: string
    quorum?: number | null
    maxParticipants?: number | null
    autoReopenOnDrop?: boolean
  }) => void
  selectMission: (missionId: string) => void
  openMissionChat: (campaignId: string, missionId: string) => void
  closeMissionChat: () => void
  sendMissionChatMessage: (body: string) => Promise<void>
  joinMission: (missionId: string, participationType: MissionParticipationType) => void
  leaveMission: (missionId: string) => void
  openMissionCampaign: (campaignId: string) => void
  browseCampaigns: () => void
  openCreateCharacter: () => void
  updateMission: (missionId: string, payload: {
    title: string
    description?: string
    isMultiSession?: boolean
    sessionAt?: string
    closesAt?: string
    quorum?: number | null
    maxParticipants?: number | null
    autoReopenOnDrop?: boolean
  }) => void
  completeMission: (missionId: string) => void
  cancelMission: (missionId: string) => void
}

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ value, children }: { value: MissionContextValue; children: ReactNode }) {
  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
}

export function useMissionContext() {
  const value = useContext(MissionContext)
  if (!value) throw new Error('MissionContext non disponibile')
  return value
}
