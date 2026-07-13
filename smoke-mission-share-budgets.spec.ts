import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 412, height: 915 },
  hasTouch: true,
  isMobile: true,
})

const API_BASE = 'http://localhost:8080'
const FE_BASE = 'http://127.0.0.1:5175'
const REALM_CODE = 'gate'

async function apiRequest(
  path: string,
  options: {
    method?: string
    token?: string
    body?: unknown
  } = {},
) {
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

test('approved campaign bootstrap keeps network calls bounded', async ({ page }) => {
  const suffix = Date.now()
  const ownerUsername = `owner_budget_${suffix}`
  const ownerPassword = 'Password123!'
  const ownerProfile = `Owner Budget ${suffix}`
  const playerUsername = `player_budget_${suffix}`
  const playerPassword = 'Password123!'
  const playerProfile = `Player Budget ${suffix}`

  const ownerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword, profileName: ownerProfile },
  })

  const playerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: playerUsername, password: playerPassword, profileName: playerProfile },
  })

  const campaign = await apiRequest('/api/v1/campaigns', {
    method: 'POST',
    token: ownerAuth.accessToken,
      body: {
        name: `Budget Campaign ${suffix}`,
        description: 'Campaign used to measure shared flow budgets',
        summary: 'Network budget regression test',
        gameSystem: 'DND5E',
        allowedModules: ['MISSIONI'],
        isOpen: true,
        isSearchable: false,
        autoJoinEnabled: true,
      },
    })

  const mission = await apiRequest(`/api/v1/campaigns/${campaign.id}/missions`, {
    method: 'POST',
    token: ownerAuth.accessToken,
    body: {
      title: `Budget Mission ${suffix}`,
      description: 'Mission used to measure request budgets',
      isMultiSession: false,
      autoReopenOnDrop: true,
    },
  })

  await apiRequest(`/api/v1/campaigns/${campaign.id}/apply`, {
    method: 'POST',
    token: playerAuth.accessToken,
    body: { characterId: null },
  })

  const shareUrl = `${FE_BASE}/homepage/${REALM_CODE}/app/missioni?campaignId=${campaign.id}&missionId=${mission.id}`
  const apiCounts = new Map<string, number>()

  await page.addInitScript(
    ({ accessToken, refreshToken, realmCode }) => {
      localStorage.setItem('gate_access_token', accessToken)
      localStorage.setItem('gate_refresh_token', refreshToken)
      localStorage.setItem('gate_realm_code', realmCode)
    },
    {
      accessToken: playerAuth.accessToken,
      refreshToken: playerAuth.refreshToken,
      realmCode: REALM_CODE,
    },
  )

  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(API_BASE)) return
    const path = new URL(url).pathname.replace(/^\/api\/v1/, '')
    apiCounts.set(path, (apiCounts.get(path) || 0) + 1)
  })

  await page.goto(shareUrl, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()
  await expect(page.getByText('Budget Campaign')).toBeVisible()

  await page.waitForTimeout(1000)
  const stableSnapshot = snapshotApiCounts(apiCounts)

  await page.waitForTimeout(4000)
  expect(snapshotApiCounts(apiCounts)).toEqual(stableSnapshot)

  expect(countMatchingPaths(apiCounts, '/users/me')).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, '/campaigns/me/memberships')).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, '/campaigns/post-login-summary')).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, '/campaigns/discover')).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, '/realms/me/permissions')).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/members$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/members\/all$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/characters$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/missions(\?.*)?$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/rooms$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/permissions\/PROMOTE_CO_MASTER_OR_MASTER$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/applications\/pending$/)).toBeLessThanOrEqual(2)
  expect(countMatchingPaths(apiCounts, /^\/campaigns\/[^/]+\/missions\/[^/]+\/participants$/)).toBeLessThanOrEqual(2)

  console.log(`NETWORK_COUNTS ${JSON.stringify(snapshotApiCounts(apiCounts))}`)
})
