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

test('campaign management reuses cached campaign block on re-entry', async ({ page }) => {
  const suffix = Date.now()
  const ownerUsername = `owner_manage_${suffix}`
  const ownerPassword = 'Password123!'
  const ownerProfile = `Owner Manage ${suffix}`

  const ownerAuth = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { username: ownerUsername, password: ownerPassword, profileName: ownerProfile },
  })

  const campaign = await apiRequest('/api/v1/campaigns', {
    method: 'POST',
    token: ownerAuth.accessToken,
    body: {
      name: `Management Campaign ${suffix}`,
      description: 'Campaign used to verify management cache re-entry',
      summary: 'Management cache regression test',
      gameSystem: 'DND5E',
      allowedModules: ['MISSIONI', 'STANZE'],
      isOpen: true,
      isSearchable: true,
      autoJoinEnabled: true,
    },
  })

  await page.addInitScript(
    ({ accessToken, refreshToken, realmCode, campaignId }) => {
      localStorage.setItem('gate_access_token', accessToken)
      localStorage.setItem('gate_refresh_token', refreshToken)
      localStorage.setItem('gate_realm_code', realmCode)
      localStorage.setItem('gate_campaign_id', campaignId)
      localStorage.setItem('gate_known_campaign_ids', JSON.stringify([campaignId]))
      localStorage.setItem(
        'gate_known_campaign_meta',
        JSON.stringify([{ id: campaignId, name: 'Management Campaign' }]),
      )
    },
    {
      accessToken: ownerAuth.accessToken,
      refreshToken: ownerAuth.refreshToken,
      realmCode: REALM_CODE,
      campaignId: campaign.id,
    },
  )

  const apiCounts = new Map<string, number>()
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(API_BASE)) return
    const path = new URL(url).pathname.replace(/^\/api\/v1/, '')
    apiCounts.set(path, (apiCounts.get(path) || 0) + 1)
  })

  await page.goto(`${FE_BASE}/homepage/${REALM_CODE}/app/campagne`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Lista Campagne' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Seleziona campagna' })).toBeVisible()

  await page.getByRole('button', { name: 'Seleziona campagna' }).click()
  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()
  const detailManagementButton = page.locator('button.campaign-outline-action--gold')
  await expect(detailManagementButton).toBeVisible()

  await detailManagementButton.click()
  await expect(page.getByRole('heading', { name: 'Gestione Campagna' })).toBeVisible()
  await expect.poll(() => countMatchingPaths(apiCounts, new RegExp(`^/campaigns/${campaign.id}/permissions/`))).toBeGreaterThanOrEqual(5)
  const firstSnapshot = snapshotApiCounts(apiCounts)

  const detailScreenButton = page.getByRole('button', { name: 'Scheda campagna', exact: true })
  await detailScreenButton.scrollIntoViewIfNeeded()
  await detailScreenButton.dispatchEvent('click')
  await expect(page.getByRole('heading', { name: 'Scheda Campagna' })).toBeVisible()
  await expect(detailManagementButton).toBeVisible()

  await detailManagementButton.click()
  await expect(page.getByRole('heading', { name: 'Gestione Campagna' })).toBeVisible()

  await page.waitForTimeout(1000)
  expect(snapshotApiCounts(apiCounts)).toEqual(firstSnapshot)
})
