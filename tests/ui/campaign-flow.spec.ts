import { expect, test } from '@playwright/test'
import { installApi } from './apiFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const draftKey = 'gate_campaign_draft:gate:ui-user'
async function expand(page: import('@playwright/test').Page, name: string) {
  const details = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: name }) })
  if (!await details.evaluate((element: HTMLDetailsElement) => element.open)) await details.locator('summary').click()
  await expect(details).toHaveAttribute('open', '')
}
async function openComposer(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/ingresso')
  await page.getByRole('button', { name: 'Crea nuova campagna', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Crea il tuo tavolo' })).toBeVisible()
}

test('campaign draft survives leaving and reload, with optional fields and zero modules preserved', async ({ page }) => {
  const state = await installApi(page)
  await openComposer(page)
  const name = page.getByLabel('Nome della campagna', { exact: true })
  await name.fill('Il tavolo del giovedì')
  await expect(page.getByLabel('Descrizione', { exact: true })).toBeHidden()
  await expand(page, 'Storia e presentazione')
  await page.getByLabel('Descrizione', { exact: true }).fill('Una storia da ritrovare')
  await page.getByLabel('Indirizzo immagine di copertina').fill('https://example.com/copertina.jpg')
  await expand(page, 'Strumenti della campagna')
  await page.getByRole('checkbox', { name: 'Missioni', exact: true }).uncheck()
  await expect(page.getByRole('checkbox', { name: 'Missioni', exact: true })).not.toBeChecked()
  await page.getByRole('button', { name: 'Torna alle campagne' }).click()
  await page.goto('/homepage/gate/app/ingresso')
  await page.getByRole('button', { name: 'Crea nuova campagna', exact: true }).click()
  await expect(name).toHaveValue('Il tavolo del giovedì')
  await page.reload()
  await expect(name).toHaveValue('Il tavolo del giovedì')
  await expand(page, 'Storia e presentazione')
  await expect(page.getByRole('textbox', { name: 'Descrizione', exact: true })).toHaveValue('Una storia da ritrovare')
  await expand(page, 'Strumenti della campagna')
  await expect(page.getByRole('checkbox', { name: 'Missioni', exact: true })).not.toBeChecked()
  state.failCampaignCreate = true
  state.delayMutation = 300
  await page.locator('.campaign-compose').getByRole('button', { name: 'Crea campagna', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Creazione in corso…' })).toBeDisabled()
  await expect(page.getByRole('alert').filter({ hasText: 'La bozza resta disponibile' })).toBeVisible()
  await expect(name).toHaveValue('Il tavolo del giovedì')
  expect(state.lastCampaignPayload?.allowedModules).toEqual([])
  expect(state.lastCampaignPayload?.description).toBe('Una storia da ritrovare')
  state.failCampaignCreate = false
  state.failCampaignRefresh = true
  await page.locator('.campaign-compose').getByRole('button', { name: 'Crea campagna', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Crea il tuo tavolo' })).toHaveCount(0)
  expect(state.campaignCreates).toBe(2)
  expect(await page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull()
})

test('required name and invalid optional URL block creation and expose the field', async ({ page }) => {
  const state = await installApi(page)
  await openComposer(page)
  await page.locator('.campaign-compose').getByRole('button', { name: 'Crea campagna', exact: true }).click()
  expect(state.campaignCreates).toBe(0)
  await expect(page.getByLabel('Nome della campagna', { exact: true })).toBeFocused()
  await page.getByLabel('Nome della campagna', { exact: true }).fill('Una campagna valida')
  await expand(page, 'Storia e presentazione')
  await page.getByLabel('Indirizzo immagine di copertina').fill('indirizzo non valido')
  await page.locator('summary').filter({ hasText: 'Storia e presentazione' }).click()
  await page.locator('.campaign-compose').getByRole('button', { name: 'Crea campagna', exact: true }).click()
  await expect(page.getByLabel('Indirizzo immagine di copertina')).toBeVisible()
  expect(state.campaignCreates).toBe(0)
})

test('news are requested explicitly, return focus on close and stay read after reload', async ({ page }) => {
  await installApi(page)
  await page.goto('/homepage/gate/app/ingresso')
  await expect(page.getByRole('button', { name: 'Entra nella campagna', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const news = page.getByRole('button', { name: 'Novità da leggere', exact: true })
  await news.click()
  const dialog = page.getByRole('dialog', { name: 'Novità di G.A.T.E.' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Chiudi', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Novità', exact: true })).toBeFocused()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Novità', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('creation flow fits mobile and desktop in both themes, details work with keyboard', async ({ page }) => {
  await installApi(page)
  await openComposer(page)
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width !== 320) await page.screenshot({ path: path.join(directory, `campaign-compose-${width}-${theme}.png`), fullPage: true })
    }
  }
  const summary = page.locator('summary').filter({ hasText: 'Storia e presentazione' })
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Descrizione', { exact: true })).toBeVisible()
})
