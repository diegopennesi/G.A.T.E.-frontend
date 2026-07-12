import { useState } from 'react'
import type {
  MissionChatResponse,
  MissionParticipantResponse,
  MissionParticipationType,
  MissionResponse,
} from '../types/domain'

export function useMissionState() {
  const [missions, setMissions] = useState<MissionResponse[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [missionParticipantsById, setMissionParticipantsById] = useState<Record<string, MissionParticipantResponse[]>>({})
  const [myMissionParticipationById, setMyMissionParticipationById] = useState<Record<string, MissionParticipationType>>({})
  const [missionParticipantCharacterLabelById, setMissionParticipantCharacterLabelById] = useState<Record<string, string>>({})
  const [selectedMissionChatContext, setSelectedMissionChatContext] = useState<{ campaignId: string; missionId: string } | null>(null)
  const [missionChat, setMissionChat] = useState<MissionChatResponse | null>(null)
  const [missionChatBusy, setMissionChatBusy] = useState(false)
  const [missionChatError, setMissionChatError] = useState('')

  return {
    missions,
    setMissions,
    selectedMissionId,
    setSelectedMissionId,
    missionParticipantsById,
    setMissionParticipantsById,
    myMissionParticipationById,
    setMyMissionParticipationById,
    missionParticipantCharacterLabelById,
    setMissionParticipantCharacterLabelById,
    selectedMissionChatContext,
    setSelectedMissionChatContext,
    missionChat,
    setMissionChat,
    missionChatBusy,
    setMissionChatBusy,
    missionChatError,
    setMissionChatError,
  }
}
