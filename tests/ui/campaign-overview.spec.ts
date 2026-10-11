import { expect, test } from '@playwright/test'
import { installApi, initialMission } from './apiFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

async function openOverview(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/campagna?campaignId=ui-campaign')
  await expect(page.locator('.campaign-overview')).toBeVisible()
}

test('overview prioritizes upcoming sessions, excludes finished and past missions, and includes members without characters', async ({ page }) => {
  const state = await installApi(page)
  state.missions = [
    { ...initialMission, id: 'later', title: 'La torre di domani', sessionAt: '2099-11-01T18:00:00Z' },
    { ...initialMission, id: 'first', title: 'Prima sessione', sessionAt: '2099-10-01T18:00:00Z' },
    { ...initialMission, id: 'undated', title: 'Avventura da organizzare', sessionAt: null },
    { ...initialMission, id: 'past', title: 'Sessione passata', sessionAt: '2020-01-01T18:00:00Z' },
    { ...initialMission, id: 'cancelled', title: 'Sessione annullata', status: 'CANCELLED' },
    { ...initialMission, id: 'finished', title: 'Sessione completata', status: 'COMPLETED' },
  ]
  await openOverview(page)
  const upcoming = page.getByRole('region', { name: 'Prossime missioni' })
  await expect(upcoming.locator('h4')).toHaveText(['Prima sessione', 'La torre di domani', 'Avventura da organizzare'])
  await expect(upcoming.getByText('Data da definire')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Il gruppo (1)' })).toBeVisible()
  await expect(page.locator('.campaign-members-data-table').getByText('Senza personaggio')).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Cerca e filtra il gruppo' }).click()
  await page.getByLabel('Cerca membro per nome').fill('nessun-risultato')
  await expect(page.getByText('Nessun membro trovato con questo filtro.')).toBeVisible()
  await page.getByLabel('Cerca membro per nome').clear()
  await expect(page.locator('.campaign-members-data-table').getByText('Senza personaggio')).toBeVisible()
  await page.getByRole('button', { name: 'Vedi tutte le missioni' }).click()
  await expect(page.getByPlaceholder('Titolo, descrizione o campagna')).toBeVisible()
})

test('overview refresh failure is recoverable and does not hide cached sessions', async ({ page }) => {
  const state = await installApi(page)
  await openOverview(page)
  const upcoming = page.getByRole('region', { name: 'Prossime missioni' })
  await expect(upcoming.getByRole('heading', { name: initialMission.title })).toBeVisible()
  state.failMissionRead = true
  await page.getByRole('button', { name: 'Aggiorna scheda' }).click()
  await expect(upcoming.getByRole('alert')).toContainText('Non riesco ad aggiornare')
  await expect(upcoming.getByRole('heading', { name: initialMission.title })).toBeVisible()
  state.failMissionRead = false
  state.missions = []
  await upcoming.getByRole('button', { name: 'Riprova' }).click()
  await expect(upcoming.getByText('Nessuna missione in programma.', { exact: false })).toBeVisible()
  await expect(upcoming.getByRole('alert')).toHaveCount(0)
})

test('player sees the group and character shortcut without management actions; disabled modules hide overview', async ({ page }) => {
  const state = await installApi(page)
  state.membershipRole = 'GIOCATORE'
  await openOverview(page)
  await expect(page.getByRole('heading', { name: 'Il gruppo (1)' })).toBeVisible()
  await expect(page.locator('.campaign-overview').getByRole('button', { name: 'Gestisci campagna' })).toHaveCount(0)
  await expect(page.locator('.campaign-overview').getByRole('button', { name: 'Disattiva campagna' })).toHaveCount(0)
  await expect(page.locator('.campaign-members-data-table').getByRole('button')).toHaveCount(0)
  await page.locator('.campaign-overview').getByRole('button', { name: 'Personaggi', exact: true }).click()
  await expect(page).toHaveURL(/personaggi/)
  state.campaign.allowedModules = []
  await openOverview(page)
  await expect(page.getByRole('region', { name: 'Prossime missioni' })).toHaveCount(0)
})

test('campaign details use keyboard disclosure and deactivation requires exact name with protected focus', async ({ page }) => {
  const state = await installApi(page)
  await openOverview(page)
  const about = page.locator('summary').filter({ hasText: 'Storia, regole e strumenti' })
  await about.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Campagna dimostrativa per test locali')).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Adesione e chiusura' }).click()
  const trigger = page.locator('.campaign-overview').getByRole('button', { name: 'Disattiva campagna' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Disattiva campagna' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Disattiva campagna' })).toBeDisabled()
  await dialog.getByLabel('Scrivi il nome campagna per confermare').fill(state.campaign.name)
  await expect(dialog.getByRole('button', { name: 'Disattiva campagna' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('failed deactivation retains typed confirmation and blocks duplicate submission', async ({ page }) => {
  const state = await installApi(page)
  let submissions = 0
  await page.route('**/api/v1/campaigns/ui-campaign/deactivate', async route => {
    submissions++
    await new Promise(resolve => setTimeout(resolve, 350))
    await route.fulfill({ status: 500, json: { message: 'Connessione interrotta' } })
  })
  await openOverview(page)
  await page.locator('summary').filter({ hasText: 'Adesione e chiusura' }).click()
  await page.locator('.campaign-overview').getByRole('button', { name: 'Disattiva campagna' }).click()
  const dialog = page.getByRole('dialog', { name: 'Disattiva campagna' })
  const confirmation = dialog.getByLabel('Scrivi il nome campagna per confermare')
  await confirmation.fill(state.campaign.name)
  await dialog.getByRole('button', { name: 'Disattiva campagna' }).click()
  await expect(dialog.getByRole('button', { name: 'Disattivazione…' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Annulla' })).toBeDisabled()
  await expect(dialog.getByRole('alert')).toContainText('Il nome inserito resta disponibile')
  await expect(confirmation).toHaveValue(state.campaign.name)
  expect(submissions).toBe(1)
  await dialog.getByRole('button', { name: 'Disattiva campagna' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(submissions).toBe(2)
})

test('campaign overview fits long content on mobile and desktop in both themes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const state = await installApi(page)
  state.missions[0] = { ...initialMission, title: 'Una missione molto lunga nelle profondità del sottosuolo oltre le montagne dimenticate' }
  await openOverview(page)
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(page.getByRole('region', { name: 'Prossime missioni' }).locator('h4')).toBeVisible()
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width !== 320) await page.screenshot({ path: path.join(directory, `campaign-overview-${width}-${theme}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})
