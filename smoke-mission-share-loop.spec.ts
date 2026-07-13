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

test('mission share link stays stable for users without approved campaigns', async ({ page }) => {
  const suffix = Date.now()
  const ownerUsername = `owner_share_${suffix}`
  const ownerPassword = 'Password123!'
  const ownerProfile = `Owner Share ${suffix}`
  const playerUsername = `player_share_${suffix}`
  const playerPassword = 'Password123!'
  const playerProfile = `Player Share ${suffix}`

  const ownerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword, profileName: ownerProfile },
  })

  const campaign = await apiRequest('/api/v1/campaigns', {
    method: 'POST',
    token: ownerAuth.accessToken,
    body: {
      name: `Share Campaign ${suffix}`,
      description: 'Campaign used to verify share link stability',
      summary: 'Share regression test',
      gameSystem: 'DND5E',
      allowedModules: ['MISSIONI'],
      isOpen: false,
      isSearchable: false,
      autoJoinEnabled: false,
    },
  })

  const mission = await apiRequest(`/api/v1/campaigns/${campaign.id}/missions`, {
    method: 'POST',
    token: ownerAuth.accessToken,
    body: {
      title: `Share Mission ${suffix}`,
      description: 'Mission used to reproduce the share-link redirect loop',
      isMultiSession: false,
      autoReopenOnDrop: true,
    },
  })

  const shareUrl = `${FE_BASE}/homepage/${REALM_CODE}/app/missioni?campaignId=${campaign.id}&missionId=${mission.id}`
  const apiCounts = new Map<string, number>()

  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(API_BASE)) return
    const path = new URL(url).pathname.replace(/^\/api\/v1/, '')
    apiCounts.set(path, (apiCounts.get(path) || 0) + 1)
  })

  await page.goto(shareUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Registrazione/ }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(playerUsername)
  await page.locator('input[type="password"]').first().fill(playerPassword)
  await page.getByLabel('Profile Name').fill(playerProfile)
  await page.getByRole('button', { name: /Crea account/ }).click()

  await expect(page.getByText('Reame di ingresso')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'G.A.T.E. Open' })).toBeVisible()
  await expect(page).toHaveURL(/\/homepage\/gate\/app\/ingresso$/)

  await page.waitForTimeout(1000)
  const stableSnapshot = snapshotApiCounts(apiCounts)

  await page.waitForTimeout(4000)
  expect(snapshotApiCounts(apiCounts)).toEqual(stableSnapshot)
  expect(apiCounts.get('/campaigns/me/memberships') || 0).toBeLessThanOrEqual(1)
  expect(apiCounts.get('/campaigns/post-login-summary') || 0).toBeLessThanOrEqual(1)
  expect(apiCounts.get('/campaigns/discover') || 0).toBeLessThanOrEqual(1)
})
