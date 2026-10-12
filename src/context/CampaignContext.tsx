/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { InviteAccessPreview, LeaveCampaignContext } from '../types/ui'
import type {
  CampaignApplicationResponse,
  CampaignCatalogEntry,
  CampaignDiscoverResponse,
  CampaignMemberStatus,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
  CampaignResponse,
  CampaignRole,
  CreateInviteTokenRequest,
  InviteTokenResponse,
  RoomResponse,
  UpdateCampaignMissionRuleRequest,
  UserProfile,
} from '../types/domain'

export type CampaignContextValue = {
  realmCode: string
  closeCreateCampaign: () => void
  campaigns: CampaignDiscoverResponse[]
  founderNames: Record<string, string>
  missionAlertsByCampaign: Record<string, number>
  pendingApplicationsByCampaignId: Record<string, CampaignApplicationResponse[]>
  discoverCampaigns: () => void
  openCampaign: (campaignId: string) => void
  applyCampaign: (campaignId: string) => void
  applyInviteAccess: (inviteValue: string) => Promise<void>
  previewInviteAccess: (inviteValue: string) => Promise<InviteAccessPreview>
  openCreateCampaign: () => void
  canCreateCampaign: boolean
  activeCampaignId: string
  activeCampaignName: string
  campaign: CampaignResponse | null
  currentUserId: string
  isActiveCampaign: boolean
  members: CampaignMembershipResponse[]
  memberNames: Record<string, string>
  availableModules: CampaignCatalogEntry[]
  availableGameSystems: CampaignCatalogEntry[]
  reloadCampaign: () => void
  openMember: (member: CampaignMembershipResponse) => void
  openManagement: () => void
  openCharacters: () => void
  openMissions: () => void
  canManageMembers: boolean
  applyCurrentCampaign: () => void
  activateCurrentCampaign: () => void
  leaveCurrentCampaign: () => void
  membershipStatus: CampaignMemberStatus | null
  membershipRole: CampaignRole | null
  pendingApplications: CampaignApplicationResponse[]
  loadPendingApplications: () => Promise<void>
  approvePendingApplication: (userId: string) => Promise<void>
  rejectPendingApplication: (userId: string) => Promise<void>
  createCampaign: (payload: {
    name: string
    description: string
    summary: string
    setting: string
    tone: string
    rules: string
    requirements: string
    coverImageUrl: string
    isOpen: boolean
    isSearchable: boolean
    autoJoinEnabled?: boolean
    gameSystem: string
    allowedModules: string[]
  }) => Promise<void>
  permissions: CampaignPermissionResponse[]
  saveCampaign: (payload: {
    name: string
    description: string
    summary: string
    setting: string
    tone: string
    rules: string
    requirements: string
    coverImageUrl: string
    isOpen: boolean
    isSearchable: boolean
    autoJoinEnabled?: boolean
    allowedModules: string[]
    missionRules?: UpdateCampaignMissionRuleRequest[]
  }) => Promise<void>
  refreshPermissionChecklist: () => void
  transferCampaignOwnership: (newOwnerId: string) => Promise<void>
  deactivateCampaign: () => Promise<void>
  createCampaignInviteToken: (payload: CreateInviteTokenRequest) => Promise<InviteTokenResponse>
  selectedCampaignMember: CampaignMembershipResponse | null
  selectedCampaignMemberProfile: UserProfile | null
  refreshSelectedCampaignMember: () => Promise<void>
  updateSelectedMemberRole: (role: CampaignRole) => Promise<void>
  banSelectedMember: (reason: string) => Promise<void>
  suspendSelectedMember: (reason: string) => Promise<void>
  unsuspendSelectedMember: () => Promise<void>
  unbanSelectedMember: () => Promise<void>
  approveSelectedMember: () => Promise<void>
  rooms: RoomResponse[]
  canCreateRoom: boolean
  createRoom: (payload: { name: string; type: 'ROLEPLAY' | 'SPAM'; ttlHours: number; slowmodeSeconds: number }) => Promise<void>
  hasActiveCampaign: boolean
  isLeaveCampaignOpen: boolean
  leaveCampaignContext: LeaveCampaignContext
  closeLeaveCampaignModal: () => void
  confirmLeaveCampaign: () => void
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ value, children }: { value: CampaignContextValue; children: ReactNode }) {
  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>
}

export function useCampaignContext() {
  const value = useContext(CampaignContext)
  if (!value) throw new Error('CampaignContext non disponibile')
  return value
}
