import { useState } from 'react'
import type {
  CampaignApplicationResponse,
  CampaignCatalogEntry,
  CampaignDiscoverResponse,
  CampaignMembershipResponse,
  CampaignPermissionResponse,
  CampaignResponse,
  MyCampaignMembershipResponse,
  RoomResponse,
  UserProfile,
} from '../types/domain'

type KnownCampaignMeta = { id: string; name: string }

export function useCampaignState() {
  const [campaignId, setCampaignId] = useState('')
  const [knownCampaignIds, setKnownCampaignIds] = useState<string[]>([])
  const [knownCampaignMeta, setKnownCampaignMeta] = useState<KnownCampaignMeta[]>([])
  const [myCampaigns, setMyCampaigns] = useState<MyCampaignMembershipResponse[]>([])
  const [discoverableCampaigns, setDiscoverableCampaigns] = useState<CampaignDiscoverResponse[]>([])
  const [campaignDetailsById, setCampaignDetailsById] = useState<Record<string, CampaignResponse>>({})
  const [pendingApplications, setPendingApplications] = useState<CampaignApplicationResponse[]>([])
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null)
  const [members, setMembers] = useState<CampaignMembershipResponse[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [campaignMembersForManagement, setCampaignMembersForManagement] = useState<CampaignMembershipResponse[]>([])
  const [canManageCampaignMembers, setCanManageCampaignMembers] = useState(false)
  const [campaignFounderNames, setCampaignFounderNames] = useState<Record<string, string>>({})
  const [permissions, setPermissions] = useState<CampaignPermissionResponse[]>([])
  const [campaignModules, setCampaignModules] = useState<CampaignCatalogEntry[]>([])
  const [campaignGameSystems, setCampaignGameSystems] = useState<CampaignCatalogEntry[]>([])
  const [pendingApplicationsByCampaignId, setPendingApplicationsByCampaignId] = useState<Record<string, CampaignApplicationResponse[]>>({})
  const [selectedCampaignMember, setSelectedCampaignMember] = useState<CampaignMembershipResponse | null>(null)
  const [selectedCampaignMemberProfile, setSelectedCampaignMemberProfile] = useState<UserProfile | null>(null)
  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [isLeaveCampaignOpen, setIsLeaveCampaignOpen] = useState(false)

  return {
    campaignId,
    setCampaignId,
    knownCampaignIds,
    setKnownCampaignIds,
    knownCampaignMeta,
    setKnownCampaignMeta,
    myCampaigns,
    setMyCampaigns,
    discoverableCampaigns,
    setDiscoverableCampaigns,
    campaignDetailsById,
    setCampaignDetailsById,
    pendingApplications,
    setPendingApplications,
    campaign,
    setCampaign,
    members,
    setMembers,
    memberNames,
    setMemberNames,
    campaignMembersForManagement,
    setCampaignMembersForManagement,
    canManageCampaignMembers,
    setCanManageCampaignMembers,
    campaignFounderNames,
    setCampaignFounderNames,
    permissions,
    setPermissions,
    campaignModules,
    setCampaignModules,
    campaignGameSystems,
    setCampaignGameSystems,
    pendingApplicationsByCampaignId,
    setPendingApplicationsByCampaignId,
    selectedCampaignMember,
    setSelectedCampaignMember,
    selectedCampaignMemberProfile,
    setSelectedCampaignMemberProfile,
    rooms,
    setRooms,
    isLeaveCampaignOpen,
    setIsLeaveCampaignOpen,
  }
}
