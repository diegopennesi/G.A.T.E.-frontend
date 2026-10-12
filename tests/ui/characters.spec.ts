import { expect, test } from '@playwright/test'
import { installApi, profile, campaign } from './apiFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

async function setup(page: import('@playwright/test').Page) {
  const state = await installApi(page)
  const common = { nickname: null, portraitUrl: null, isNpc: false, campaignId: campaign.id, createdAt: campaign.createdAt }
  state.characters = [
    { ...common, id: 'elara', userId: profile.id, ownerProfileName: profile.profileName, name: 'Elara delle terre oltre il mare', characterStatus: 'ACTIVE' },
    { ...common, id: 'bruno', userId: 'other-user', ownerProfileName: 'Compagno di tavolo', name: 'Bruno', characterStatus: 'RETIRED' },
    { ...common, id: 'alba', userId: profile.id, ownerProfileName: profile.profileName, name: 'Alba', characterStatus: null },
  ]
  state.members.push({ ...state.members[0], userId: 'other-user', role: 'GIOCATORE', characterStatus: 'RETIRED' })
  return state
}
async function openList(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/personaggi?campaignId=ui-campaign')
  await expect(page.getByRole('heading', { name: 'Personaggi', exact: true })).toBeVisible()
}
const browser = (page: import('@playwright/test').Page) => page.locator('.character-browser')

test('search, ownership, reset and sorting preserve unassigned characters and open the correct sheet', async ({ page }) => {
  await setup(page)
  await openList(page)
  await expect(browser(page).getByRole('status')).toHaveText('3 di 3 personaggi visibili')
  await expect(browser(page).getByText('Non assegnato', { exact: true })).toBeVisible()
  await page.getByLabel('Solo i miei').check()
  await expect(browser(page).getByRole('status')).toHaveText('2 di 3 personaggi visibili')
  await expect(browser(page).getByRole('button', { name: 'Apri scheda Bruno', exact: true })).toHaveCount(0)
  await page.getByLabel('Cerca personaggi', { exact: true }).fill('Elara')
  await expect(browser(page).getByRole('status')).toHaveText('1 di 3 personaggi visibili')
  await page.getByLabel('Cerca personaggi', { exact: true }).fill('inesistente')
  await expect(browser(page).getByRole('heading', { name: 'Nessun risultato' })).toBeVisible()
  await browser(page).getByRole('button', { name: 'Azzera filtri' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Ordina per').selectOption('character-desc')
  await expect(browser(page).locator('article').first()).toContainText('Elara')
  await browser(page).getByRole('button', { name: 'Apri scheda Bruno' }).click()
  await expect(page).toHaveURL(/\/personaggio$/)
  await expect(page.getByRole('heading', { name: 'Scheda PG', exact: true })).toBeVisible()
  await expect(page.getByText('Nessun template configurato', { exact: false })).toBeVisible()
})

test('failed refresh keeps loaded characters and current filters; retry updates results', async ({ page }) => {
  const state = await setup(page)
  await openList(page)
  await expect(browser(page).getByRole('status')).toHaveText('3 di 3 personaggi visibili')
  await page.getByLabel('Solo i miei').check()
  state.failCharacterRead = true
  state.delayCharacterRead = 250
  await browser(page).getByRole('button', { name: 'Aggiorna elenco' }).click()
  await expect(browser(page).getByRole('button', { name: 'Aggiornamento…' })).toBeDisabled()
  await expect(browser(page).getByRole('alert')).toContainText('Quelli già caricati restano visibili')
  await expect(browser(page).getByRole('status')).toHaveText('2 di 3 personaggi visibili')
  await expect(page.getByLabel('Solo i miei')).toBeChecked()
  state.failCharacterRead = false
  state.characters = state.characters.filter(character => character.id === 'elara')
  await browser(page).getByRole('button', { name: 'Riprova' }).click()
  await expect(browser(page).getByRole('status')).toHaveText('1 di 1 personaggi visibili')
  await expect(browser(page).getByRole('alert')).toHaveCount(0)
})

test('creation respects active PG limit and empty list differs from filtered results', async ({ page }) => {
  const state = await setup(page)
  state.membershipRole = 'GIOCATORE'
  await openList(page)
  await expect(browser(page).getByRole('status')).toHaveText('2 di 2 personaggi visibili')
  await expect(browser(page).getByRole('button', { name: 'Crea personaggio', exact: true })).toHaveCount(0)
  await expect(browser(page).getByText('Hai già un PG attivo', { exact: false })).toBeVisible()
  state.characters = []
  await browser(page).getByRole('button', { name: 'Aggiorna elenco' }).click()
  await expect(browser(page).getByRole('heading', { name: 'Nessun personaggio disponibile' })).toBeVisible()
  await browser(page).getByRole('button', { name: 'Crea personaggio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Crea Personaggio', exact: true })).toBeVisible()
})

test('character filters use keyboard disclosure and state labels are Italian', async ({ page }) => {
  await setup(page)
  await openList(page)
  const summary = browser(page).locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  const status = browser(page).getByRole('combobox', { name: /^Stato/ })
  await expect(status).toBeVisible()
  await status.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('option', { name: 'Attivo', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Ritirato', exact: true })).toBeVisible()
  await page.getByRole('option', { name: 'Non assegnato', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(browser(page).getByRole('status')).toHaveText('2 di 3 personaggi visibili')
})

test('character list fits mobile and desktop in both themes with long content and no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const state = await setup(page)
  state.characters[0].name = 'Elara delle terre oltre il mare e delle montagne dimenticate della costa'
  await openList(page)
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(browser(page).getByRole('status')).toHaveText('3 di 3 personaggi visibili')
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width !== 320) await page.screenshot({ path: path.join(directory, `characters-${width}-${theme}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})

test('initial read failure offers retry instead of claiming the list is empty', async ({ page }) => {
  const state = await setup(page)
  state.failCharacterRead = true
  await openList(page)
  await expect(browser(page).getByRole('alert')).toContainText('Non riesco ad aggiornare')
  await expect(browser(page).getByRole('heading', { name: 'Nessun personaggio disponibile' })).toHaveCount(0)
  state.failCharacterRead = false
  await browser(page).getByRole('button', { name: 'Riprova' }).click()
  await expect(browser(page).getByRole('status')).toHaveText('3 di 3 personaggi visibili')
})
