import type { Page } from '@playwright/test'
import type { Character, CampaignResponse, CampaignMembershipResponse, CampaignRole, MissionResponse, UserProfile } from '../../src/types/domain'

const now = '2026-07-23T10:00:00Z'
export const profile: UserProfile = {
  id: 'ui-user', username: 'giocatore', platformRole: 'USER', profileName: 'Giocatore demo',
  bio: null, avatarUrl: null, whatsapp: null, socialLinks: {}, createdAt: now,
}
export const campaign: CampaignResponse = {
  id: 'ui-campaign', name: 'Le cronache di Waterdeep e delle terre oltre il mare',
  description: 'Campagna dimostrativa per test locali', summary: 'Sessioni settimanali',
  setting: null, tone: null, rules: null, requirements: null, coverImageUrl: null,
  founderId: profile.id, isOpen: true, isActive: true, isSearchable: true, autoJoinEnabled: false,
  inviteCode: 'ui-invite', gameSystem: 'DND5E', allowedModules: ['MISSIONI'], missionRules: [], createdAt: now,
}
export const initialMission: MissionResponse = {
  id: 'ui-mission', campaignId: campaign.id, title: 'La torre perduta', description: 'Esplora la torre',
  createdBy: profile.id, status: 'OPEN', statusReason: null, isMultiSession: false,
  sessionAt: '2099-10-15T18:00:00Z', closesAt: '2099-10-14T18:00:00Z',
  quorum: null, maxParticipants: null, minCharacterLevel: null, maxCharacterLevel: null,
  participantCount: 0, autoReopenOnDrop: false, createdAt: now,
}

/** Local deterministic API responses: no accounts or data are written to a backend. */
export async function installApi(page: Page, authenticated = true) {
  const state = {
    failCreate: false, failUpdate: false, failSend: false, failChatRefresh: false,
    creates: 0, updates: 0, sends: 0,
    delayMutation: 0,
    failCampaignCreate: false, failCampaignRefresh: false, campaignCreates: 0,
    lastCampaignPayload: null as Record<string, unknown> | null,
    membershipRole: 'SUPER_MASTER' as CampaignRole,
    campaign: { ...campaign },
    failMissionRead: false, missionReads: 0, delayMissionRead: 0,
    members: [{ userId: profile.id, campaignId: campaign.id, characterId: null, joinedAt: now, role: 'SUPER_MASTER', memberStatus: 'APPROVED', characterStatus: null, moderationReason: null, moderationByUserId: null, moderationAt: null }] as CampaignMembershipResponse[],
    lastMissionPayload: null as Record<string, unknown> | null,
    missions: [initialMission],
    characters: [] as Character[], failCharacterRead: false, delayCharacterRead: 0,
    messages: [] as Array<Record<string, unknown>>,
    unknown: [] as string[],
  }
  await page.addInitScript(({ authenticated, userId, campaignId }) => {
    if (!localStorage.getItem('gate_theme')) localStorage.setItem('gate_theme', 'light')
    if (authenticated) {
      localStorage.setItem('gate_access_token', 'ui-test-token')
      localStorage.setItem('gate_refresh_token', 'ui-test-refresh')
      localStorage.setItem(`gate_campaign_id:${userId}`, campaignId)
      localStorage.setItem(`gate_known_campaign_ids:${userId}`, JSON.stringify([campaignId]))
    }
  }, { authenticated, userId: profile.id, campaignId: campaign.id })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    const reply = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    const error = () => reply({ status: 500, error: 'Test failure', message: 'Connessione interrotta' }, 500)
    const mutation = async () => {
      if (state.delayMutation) await new Promise((resolve) => setTimeout(resolve, state.delayMutation))
    }
    if (path.startsWith('/public/realms/')) return reply({ code: 'gate', name: 'Taverna del Codice', type: 'GATE_OPEN', logoUrl: null, allowUserCampaignCreation: true })
    if (path === '/users/me' || path === `/users/${profile.id}`) return reply(profile)
    if (path.startsWith('/users/') && state.members.some(member => member.userId === path.split('/').at(-1))) return reply({ ...profile, id: path.split('/').at(-1), profileName: 'Compagno di tavolo' })
    if (path === '/realms/me/permissions') return reply({ realmId: 'ui-realm', realmCode: 'gate', platformRole: 'USER', realmRole: 'USER', explicitRealmAccess: true, permissions: { createCampaign: true, manageRealm: false, manageRealmUsers: false, viewRealmAdmin: false } })
    if (path === '/campaigns/me/memberships') return reply([{ campaignId: campaign.id, campaignName: campaign.name, role: state.membershipRole, memberStatus: 'APPROVED', characterStatus: null, moderationReason: null, isFounder: state.membershipRole === 'SUPER_MASTER' }])
    if (path === '/campaigns/discover') return state.failCampaignRefresh ? error() : reply([{ ...state.campaign, membershipStatus: 'APPROVED', membershipRole: state.membershipRole, moderationReason: null }])
    if (path === '/campaigns/post-login-summary') return state.failCampaignRefresh ? error() : reply({ canCreateCampaign: true, campaigns: [{ ...state.campaign, isVisible: true, membershipStatus: 'APPROVED', membershipRole: state.membershipRole, moderationReason: null }] })
    if (path === '/campaigns/modules') return reply([{ code: 'MISSIONI', label: 'Missioni', description: null, active: true, sortOrder: 1 }])
    if (path === '/campaigns/game-systems') return reply([{ code: 'DND5E', label: 'Dungeons & Dragons 5e', description: null, active: true, sortOrder: 1 }])
    if (path === '/campaigns' && method === 'POST') {
      state.campaignCreates++
      state.lastCampaignPayload = request.postDataJSON()
      await mutation()
      if (state.failCampaignCreate) return error()
      return reply({ ...campaign, ...state.lastCampaignPayload })
    }
    if (path === `/campaigns/${campaign.id}`) return reply(state.campaign)
    if (/\/members(\/all)?$/.test(path)) return reply(state.members)
    if (path.includes('/permissions/')) return reply({ campaignId: campaign.id, action: path.split('/').at(-1), allowed: state.membershipRole !== 'GIOCATORE' })
    if (/\/missions$/.test(path)) {
      if (method === 'POST') {
        state.creates++
        state.lastMissionPayload = request.postDataJSON()
        await mutation()
        if (state.failCreate) return error()
        const created = { ...initialMission, ...request.postDataJSON(), id: `created-${state.creates}` }
        state.missions.push(created)
        return reply(created)
      }
      state.missionReads++
      if (state.delayMissionRead) await new Promise(resolve => setTimeout(resolve, state.delayMissionRead))
      if (state.failMissionRead) return error()
      return reply(state.missions)
    }
    if (path === `/campaigns/${campaign.id}/missions/${initialMission.id}` && method === 'PATCH') {
      state.updates++
      await mutation()
      if (state.failUpdate) return error()
      state.missions[0] = { ...state.missions[0], ...request.postDataJSON() }
      return reply(state.missions[0])
    }
    if (/\/mission-chat\/[^/]+\/messages$/.test(path) && method === 'POST') {
      state.sends++
      await mutation()
      if (state.failSend) return error()
      const message = { id: `message-${state.sends}`, roomId: 'ui-chat', authorUserId: profile.id, authorName: 'giocatore', authorProfileName: profile.profileName, authorCharacterName: null, authorBadge: 'SUPER_MASTER', body: request.postDataJSON().body, createdAt: now }
      state.messages.push(message)
      return reply(message)
    }
    if (/\/mission-chat\/[^/]+$/.test(path)) {
      if (state.failChatRefresh && state.messages.length) return error()
      return reply({ room: { id: 'ui-chat', campaignId: campaign.id, roomType: 'MISSION', missionId: initialMission.id, title: 'Chat della torre', slowmodeSeconds: 0, maxPersistedMessages: 100, pruneAfterHours: null, isActive: true, createdAt: now }, messages: state.messages })
    }
    if (path === `/campaigns/${campaign.id}/characters`) {
      if (state.delayCharacterRead) await new Promise(resolve => setTimeout(resolve, state.delayCharacterRead))
      return state.failCharacterRead ? error() : reply(state.characters)
    }
    const characterMatch = path.match(/\/characters\/([^/]+)(\/sheet(?:\/history)?)?$/)
    if (characterMatch) {
      const character = state.characters.find(item => item.id === characterMatch[1])
      if (characterMatch[2] === '/sheet/history') return reply([])
      if (characterMatch[2] === '/sheet') return reply({ characterId: character?.id, campaignId: campaign.id, gameSystemCode: 'DND5E', sheetTypeCode: null, schemaVersion: 1, schemaJson: {}, dataJson: {}, catalogOptions: {}, derivedJson: {}, hasTemplate: false, editable: true, updatedAt: now })
      if (character) return reply(character)
    }
    if (/\/(characters|rooms|participants|pending|mission-rules)$/.test(path)) return reply([])
    if (request.headers().accept?.includes('text/event-stream')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': fixture\n\n' })
    state.unknown.push(`${method} ${path}`)
    return reply({ message: `Unhandled test endpoint: ${method} ${path}` }, 404)
  })
  return state
}

export async function openMissions(page: Page) {
  await page.goto(`/homepage/gate/app/missioni?campaignId=${campaign.id}`)
}
