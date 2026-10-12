import type { Page } from '@playwright/test'
import type { Character, CharacterSheetResponse, CharacterSheetReviewResponse, CampaignResponse, CampaignMembershipResponse, CampaignApplicationResponse, RoomResponse, CampaignRole, MissionResponse, UserProfile } from '../../src/types/domain'

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
    profile: { ...profile }, failProfileSave: false, profileSaves: 0,
    failPassword: false, passwordChanges: 0,
    failCampaignSave: false, campaignSaves: 0,
    failInvite: false, inviteCreates: 0,
    pending: [] as CampaignApplicationResponse[], failDecision: false, decisions: 0, failPendingRead: false,
    memberActions: 0, failMemberAction: false,
    rooms: [] as RoomResponse[], roomCreates: 0, failRoomCreate: false,
    failCampaignCreate: false, failCampaignRefresh: false, campaignCreates: 0,
    lastCampaignPayload: null as Record<string, unknown> | null,
    membershipRole: 'SUPER_MASTER' as CampaignRole,
    campaign: { ...campaign },
    failMissionRead: false, missionReads: 0, delayMissionRead: 0,
    members: [{ userId: profile.id, campaignId: campaign.id, characterId: null, joinedAt: now, role: 'SUPER_MASTER', memberStatus: 'APPROVED', characterStatus: null, moderationReason: null, moderationByUserId: null, moderationAt: null }] as CampaignMembershipResponse[],
    lastMissionPayload: null as Record<string, unknown> | null,
    missions: [initialMission],
    characters: [] as Character[], failCharacterRead: false, delayCharacterRead: 0,
    sheets: {} as Record<string, CharacterSheetResponse>, sheetSaves: 0, failSheetSave: false, failSheetRead: false, lastSheetPayload: null as Record<string, unknown> | null,
    sheetHistory: [] as CharacterSheetReviewResponse[], reviewSubmissions: 0, failReview: false, lastReviewPayload: null as Record<string, unknown> | null,
    statusUpdates: 0, failStatusUpdate: false,
    characterCreates: 0, failCharacterCreate: false, lastCharacterPayload: null as Record<string, unknown> | null,
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
    if (path === '/users/me' || path === `/users/${profile.id}`) {
      if (method === 'PATCH') { state.profileSaves++; await mutation(); if (state.failProfileSave) return error(); state.profile = { ...state.profile, ...request.postDataJSON() }; return reply(state.profile) }
      return reply(state.profile)
    }
    if (path === '/auth/password' && method === 'PATCH') { state.passwordChanges++; await mutation(); if (state.failPassword) return error(); return reply({ accessToken: 'ui-new-token', refreshToken: 'ui-new-refresh', user: state.profile }) }
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
    if (path === `/campaigns/${campaign.id}`) {
      if (method === 'PATCH') { state.campaignSaves++; await mutation(); if (state.failCampaignSave) return error(); state.campaign = { ...state.campaign, ...request.postDataJSON() } }
      return reply(state.campaign)
    }
    if (path === `/campaigns/${campaign.id}/invite-tokens`) {
      if (method === 'POST') { state.inviteCreates++; await mutation(); if (state.failInvite) return error(); return reply({ id: 'invite-test', resourceType: 'CAMPAIGN', resourceId: campaign.id, token: 'invito-di-collaudo', capabilities: request.postDataJSON().capabilities, createdByUserId: profile.id, expiresAt: request.postDataJSON().expiresAt, maxUses: request.postDataJSON().maxUses, useCount: 0, isActive: true, createdAt: now }) }
      return reply([])
    }
    if (path === `/campaigns/${campaign.id}/applications/pending`) return state.failPendingRead ? error() : reply(state.pending)
    const decisionMatch = path.match(/\/applications\/([^/]+)\/(approve|reject)$/)
    if (decisionMatch && method === 'POST') {
      state.decisions++; await mutation(); if (state.failDecision) return error()
      state.pending = state.pending.filter(item => item.userId !== decisionMatch[1])
      return reply({ ...state.members[0], userId: decisionMatch[1], role: 'GIOCATORE', memberStatus: decisionMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED' })
    }
    const memberMatch = path.match(/\/members\/([^/]+)(?:\/(role|ban|suspend|unsuspend|unban|approve))?$/)
    if (memberMatch && memberMatch[1] !== 'all') {
      const member = state.members.find(item => item.userId === memberMatch[1])
      if (member) {
        if (method !== 'GET') {
          state.memberActions++; await mutation(); if (state.failMemberAction) return error()
          const command = memberMatch[2]
          if (command === 'role') member.role = request.postDataJSON().role
          if (command === 'ban') member.memberStatus = 'BANNED'
          if (command === 'suspend') member.memberStatus = 'BLOCKED'
          if (command === 'unsuspend' || command === 'unban' || command === 'approve') member.memberStatus = 'APPROVED'
        }
        return reply(member)
      }
    }
    if (path === `/campaigns/${campaign.id}/rooms`) {
      if (method === 'POST') { state.roomCreates++; await mutation(); if (state.failRoomCreate) return error(); const room: RoomResponse = { ...request.postDataJSON(), id: 'new-room', campaignId: campaign.id, createdBy: profile.id, isActive: true, createdAt: now }; state.rooms.push(room); return reply(room) }
      return reply(state.rooms)
    }
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
      if (method === 'POST') {
        state.characterCreates++
        state.lastCharacterPayload = request.postDataJSON()
        await mutation()
        if (state.failCharacterCreate) return error()
        const created: Character = { id: `created-character-${state.characterCreates}`, userId: profile.id, ownerProfileName: profile.profileName, name: String(state.lastCharacterPayload?.name), nickname: String(state.lastCharacterPayload?.nickname || '') || null, portraitUrl: String(state.lastCharacterPayload?.portraitUrl || '') || null, isNpc: state.lastCharacterPayload?.isNpc === true, campaignId: campaign.id, characterStatus: 'ACTIVE', createdAt: now }
        state.characters.push(created)
        return reply(created)
      }
      if (state.delayCharacterRead) await new Promise(resolve => setTimeout(resolve, state.delayCharacterRead))
      return state.failCharacterRead ? error() : reply(state.characters)
    }
    const reviewMatch = path.match(/\/characters\/([^/]+)\/sheet\/reviews\/([^/]+)\/(approve|reject)$/)
    if (reviewMatch && method === 'POST') {
      state.reviewSubmissions++
      state.lastReviewPayload = request.postDataJSON()
      await mutation()
      if (state.failReview) return error()
      const sheet = state.sheets[reviewMatch[1]]
      const pending = sheet.pendingReview
      if (pending) {
        const status = reviewMatch[3] === 'approve' ? 'APPROVED' : 'REJECTED'
        const review = { ...pending, campaignId: campaign.id, characterId: reviewMatch[1], sheetTypeCode: sheet.sheetTypeCode || '', gameSystemCode: sheet.gameSystemCode || '', schemaVersion: sheet.schemaVersion, status, reviewedByUserId: profile.id, baseDataJson: sheet.dataJson, proposedDataJson: sheet.dataJson, reviewNote: request.postDataJSON().note || null, reviewedAt: '2026-10-12T10:00:00Z' }
        if (status === 'APPROVED') for (const change of pending.changes) sheet.dataJson = { ...sheet.dataJson, [change.path]: change.newValue }
        sheet.pendingReview = null
        state.sheetHistory = [review as CharacterSheetReviewResponse]
        return reply(review)
      }
    }
    const statusMatch = path.match(/\/characters\/([^/]+)\/status$/)
    if (statusMatch && method === 'PATCH') {
      state.statusUpdates++
      await mutation()
      if (state.failStatusUpdate) return error()
      const character = state.characters.find(item => item.id === statusMatch[1])
      if (character) { character.characterStatus = request.postDataJSON().status; return reply(character) }
    }
    const characterMatch = path.match(/\/characters\/([^/]+)(\/sheet(?:\/history)?)?$/)
    if (characterMatch) {
      const character = state.characters.find(item => item.id === characterMatch[1])
      if (characterMatch[2] === '/sheet/history') return reply(state.sheetHistory)
      if (characterMatch[2] === '/sheet') {
        if (method === 'PATCH') {
          state.sheetSaves++
          state.lastSheetPayload = request.postDataJSON().dataJson
          await mutation()
          if (state.failSheetSave) return error()
          state.sheets[characterMatch[1]] = { ...state.sheets[characterMatch[1]], dataJson: request.postDataJSON().dataJson, updatedAt: '2026-10-12T10:00:00Z' }
          return reply(state.sheets[characterMatch[1]])
        }
        if (state.failSheetRead) return error()
        if (state.sheets[characterMatch[1]]) return reply(state.sheets[characterMatch[1]])
        return reply({ characterId: character?.id, campaignId: campaign.id, gameSystemCode: 'DND5E', sheetTypeCode: null, schemaVersion: 1, schemaJson: {}, dataJson: {}, catalogOptions: {}, derivedJson: {}, hasTemplate: false, editable: true, updatedAt: now })
      }
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
