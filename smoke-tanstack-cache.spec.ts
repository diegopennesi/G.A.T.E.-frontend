import { expect, test, type Page } from '@playwright/test'

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true,
})

const API_BASE = 'http://localhost:8080'
const FE_BASE = 'http://127.0.0.1:5175'
const REALM_CODE = 'gate'

type ApiRequestOptions = {
  method?: string
  token?: string
  body?: unknown
}

async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-GATE-Realm-Code': REALM_CODE,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status} ${JSON.stringify(payload)}`)
  }

  return payload
}

function installAuthState(
  page: Page,
  params: { accessToken: string; refreshToken: string; campaignId?: string },
) {
  return page.addInitScript(
    ({ accessToken, refreshToken, realmCode, campaignId }) => {
      localStorage.setItem('gate_access_token', accessToken)
      localStorage.setItem('gate_refresh_token', refreshToken)
      localStorage.setItem('gate_realm_code', realmCode)
      if (campaignId) {
        localStorage.setItem('gate_campaign_id', campaignId)
        localStorage.setItem('gate_known_campaign_ids', JSON.stringify([campaignId]))
        localStorage.setItem(
          'gate_known_campaign_meta',
          JSON.stringify([{ id: campaignId, name: 'TanStack Cache Campaign' }]),
        )
      }
    },
    {
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      realmCode: REALM_CODE,
      campaignId: params.campaignId,
    },
  )
}

async function createCampaignViaUi(page: Page, campaignName: string) {
  const responsePromise = page.waitForResponse((response) => {
    return response.url().endsWith('/api/v1/campaigns') && response.request().method() === 'POST'
  })

  await page.getByRole('button', { name: 'Apri menu' }).dispatchEvent('click')
  await page.getByRole('button', { name: 'Crea campagna' }).dispatchEvent('click')
  await expect(page.getByRole('heading', { name: 'Crea Campagna' })).toBeVisible()
  await page.getByLabel('Nome').fill(campaignName)
  await page.getByRole('button', { name: /^Crea$/ }).click()

  const response = await responsePromise
  const payload = await response.json()
  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()
  await expect(page.getByRole('heading', { name: campaignName })).toBeVisible()
  return payload.id as string
}

function trackApiRequests(page: Page) {
  const counts = new Map<string, number>()
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(API_BASE)) return
    const path = new URL(url).pathname.replace(/^\/api\/v1/, '')
    counts.set(path, (counts.get(path) || 0) + 1)
  })
  return counts
}

function snapshotApiCounts(counts: Map<string, number>) {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

function countMatchingPaths(counts: Map<string, number>, pattern: RegExp | string) {
  const matcher = typeof pattern === 'string' ? (value: string) => value === pattern : (value: string) => pattern.test(value)
  let total = 0
  for (const [path, count] of counts.entries()) {
    if (matcher(path)) total += count
  }
  return total
}

function snapshotCampaignDetailCounts(counts: Map<string, number>, campaignId: string) {
  const prefix = `/campaigns/${campaignId}`
  return {
    [`${prefix}/members`]: counts.get(`${prefix}/members`) || 0,
    [`${prefix}/members/all`]: counts.get(`${prefix}/members/all`) || 0,
    [`${prefix}/characters`]: counts.get(`${prefix}/characters`) || 0,
    [`${prefix}/missions`]: counts.get(`${prefix}/missions`) || 0,
    [`${prefix}/rooms`]: counts.get(`${prefix}/rooms`) || 0,
    [`${prefix}/applications/pending`]: counts.get(`${prefix}/applications/pending`) || 0,
    [`${prefix}/permissions/APPROVE_OR_REJECT_APPLICATIONS`]:
      counts.get(`${prefix}/permissions/APPROVE_OR_REJECT_APPLICATIONS`) || 0,
    [`${prefix}/permissions/CREATE_ROOM`]: counts.get(`${prefix}/permissions/CREATE_ROOM`) || 0,
    [`${prefix}/permissions/MANAGE_CAMPAIGN_SETTINGS`]: counts.get(`${prefix}/permissions/MANAGE_CAMPAIGN_SETTINGS`) || 0,
    [`${prefix}/permissions/PROMOTE_CO_MASTER_OR_MASTER`]:
      counts.get(`${prefix}/permissions/PROMOTE_CO_MASTER_OR_MASTER`) || 0,
    [`${prefix}/permissions/TRANSFER_OWNERSHIP`]: counts.get(`${prefix}/permissions/TRANSFER_OWNERSHIP`) || 0,
  }
}

test('campaign re-entry reuses cached block until backend invalidates it', async ({ page }) => {
  const suffix = Date.now()
  const ownerUsername = `owner_cache_${suffix}`
  const ownerPassword = 'Password123!'
  const ownerProfile = `Owner Cache ${suffix}`
  const campaignName = `TanStack Cache ${suffix}`
  const updatedCampaignName = `${campaignName} Updated`

  const ownerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword, profileName: ownerProfile },
  })

  await installAuthState(page, {
    accessToken: ownerAuth.accessToken,
    refreshToken: ownerAuth.refreshToken,
  })

  await page.goto(`${FE_BASE}/homepage/${REALM_CODE}/app/campagne`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()

  const campaignId = await createCampaignViaUi(page, campaignName)
  await page.evaluate(
    ({ id, name }) => {
      localStorage.setItem('gate_campaign_id', id)
      localStorage.setItem('gate_known_campaign_ids', JSON.stringify([id]))
      localStorage.setItem('gate_known_campaign_meta', JSON.stringify([{ id, name }]))
    },
    { id: campaignId, name: campaignName },
  )

  const apiCounts = trackApiRequests(page)

  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()

  await page.goto(`${FE_BASE}/homepage/${REALM_CODE}/app/campagne`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerca campagne' }).click()
  await expect(page.getByRole('button', { name: 'Seleziona campagna' })).toBeVisible()
  await page.getByRole('button', { name: 'Seleziona campagna' }).click()
  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()

  await page.waitForTimeout(1500)
  const firstSnapshot = snapshotCampaignDetailCounts(apiCounts, campaignId)

  await page.goto(`${FE_BASE}/homepage/${REALM_CODE}/app/campagne`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerca campagne' }).click()
  await expect(page.getByRole('button', { name: 'Seleziona campagna' })).toBeVisible()
  await page.getByRole('button', { name: 'Seleziona campagna' }).click()
  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()

  await page.waitForTimeout(1000)
  expect(snapshotCampaignDetailCounts(apiCounts, campaignId)).toEqual(firstSnapshot)

  await apiRequest(`/api/v1/campaigns/${campaignId}`, {
    method: 'PATCH',
    token: ownerAuth.accessToken,
    body: {
      name: updatedCampaignName,
      description: 'Campaign used to verify TanStack cache behavior',
      summary: 'TanStack cache test',
      setting: null,
      tone: null,
      rules: null,
      requirements: null,
      coverImageUrl: null,
      isOpen: true,
      isSearchable: true,
      autoJoinEnabled: true,
      allowedModules: ['MISSIONI', 'STANZE'],
    },
  })

  await expect(page.getByRole('heading', { name: updatedCampaignName, exact: true })).toBeVisible()
  await expect.poll(() => countMatchingPaths(apiCounts, new RegExp(`^/campaigns/${campaignId}$`))).toBeGreaterThan(firstSnapshot[`/campaigns/${campaignId}`] || 0)
})

test('campaign summary refetches after SSE invalidation from another client', async ({ page }) => {
  const suffix = Date.now()
  const ownerUsername = `owner_sse_${suffix}`
  const ownerPassword = 'Password123!'
  const ownerProfile = `Owner SSE ${suffix}`
  const campaignName = `TanStack SSE ${suffix}`
  const updatedCampaignName = `${campaignName} Updated`

  const ownerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword, profileName: ownerProfile },
  })

  await installAuthState(page, {
    accessToken: ownerAuth.accessToken,
    refreshToken: ownerAuth.refreshToken,
  })

  await page.goto(`${FE_BASE}/homepage/${REALM_CODE}/app/campagne`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()
  const campaignId = await createCampaignViaUi(page, campaignName)

  const apiCounts = trackApiRequests(page)

  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()

  const beforeDetails = apiCounts.get(`/campaigns/${campaignId}`) || 0
  const beforeMembers = apiCounts.get(`/campaigns/${campaignId}/members`) || 0

  await apiRequest(`/api/v1/campaigns/${campaignId}`, {
    method: 'PATCH',
    token: ownerAuth.accessToken,
    body: {
      name: updatedCampaignName,
      description: 'Campaign used to verify SSE-driven cache invalidation',
      summary: 'TanStack SSE test',
      setting: null,
      tone: null,
      rules: null,
      requirements: null,
      coverImageUrl: null,
      isOpen: true,
      isSearchable: true,
      autoJoinEnabled: true,
      allowedModules: ['MISSIONI'],
    },
  })

  await expect(page.getByRole('heading', { name: updatedCampaignName, exact: true })).toBeVisible()
  await expect.poll(() => (apiCounts.get(`/campaigns/${campaignId}`) || 0)).toBeGreaterThan(beforeDetails)
  await expect.poll(() => (apiCounts.get(`/campaigns/${campaignId}/members`) || 0)).toBeGreaterThan(beforeMembers)
})
