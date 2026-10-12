import { expect, test } from '@playwright/test'
import { installApi, campaign, profile } from './apiFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
const draftKey = 'gate_character_draft:gate:ui-user:ui-campaign'
const composer = (page: import('@playwright/test').Page) => page.locator('.character-compose')
async function openCreate(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/personaggi-nuovo?campaignId=ui-campaign')
  await expect(composer(page).getByRole('heading', { name: 'Crea Personaggio' })).toBeVisible()
}
async function extras(page: import('@playwright/test').Page) {
  const details = composer(page).locator('details')
  if (!await details.evaluate((element: HTMLDetailsElement) => element.open)) await details.locator('summary').click()
}

test('draft survives return and reload, preserves optional fields and NPC choice', async ({ page }) => {
  await installApi(page)
  await openCreate(page)
  const name = page.getByLabel(/^Nome del personaggio/)
  await expect(name).toHaveValue('')
  await name.fill('Elara del giovedì')
  await extras(page)
  await page.getByLabel('Soprannome', { exact: true }).fill('La cartografa')
  await page.getByLabel('Indirizzo del ritratto').fill('https://example.com/elara.jpg')
  await page.getByRole('radio', { name: /^NPC/ }).check()
  await composer(page).getByRole('button', { name: 'Torna ai personaggi' }).click()
  await expect(page.locator('.character-browser')).toBeVisible()
  await page.locator('.character-browser').getByRole('button', { name: 'Crea personaggio', exact: true }).click()
  await expect(name).toHaveValue('Elara del giovedì')
  await page.reload()
  await expect(name).toHaveValue('Elara del giovedì')
  await expect(page.getByRole('radio', { name: /^NPC/ })).toBeChecked()
  await extras(page)
  await expect(page.getByLabel('Soprannome', { exact: true })).toHaveValue('La cartografa')
  await expect(page.getByLabel('Indirizzo del ritratto')).toHaveValue('https://example.com/elara.jpg')
})

test('native validation blocks empty names and invalid optional portrait, revealing hidden field', async ({ page }) => {
  const state = await installApi(page)
  await openCreate(page)
  const submit = composer(page).getByRole('button', { name: 'Crea personaggio', exact: true })
  await submit.click()
  await expect(page.getByLabel(/^Nome del personaggio/)).toBeFocused()
  expect(state.characterCreates).toBe(0)
  await page.getByLabel(/^Nome del personaggio/).fill('   ')
  await submit.click()
  await expect(composer(page).getByRole('alert')).toContainText('Scrivi il nome')
  await page.getByLabel(/^Nome del personaggio/).fill('Nome valido')
  await extras(page)
  await page.getByLabel('Indirizzo del ritratto').fill('ritratto non valido')
  await composer(page).locator('summary').click()
  await submit.click()
  await expect(page.getByLabel('Indirizzo del ritratto')).toBeVisible()
  expect(state.characterCreates).toBe(0)
})

test('failed create preserves draft and locks duplicate submission; success clears draft even if list refresh fails', async ({ page }) => {
  const state = await installApi(page)
  await openCreate(page)
  await page.getByLabel(/^Nome del personaggio/).fill('  La cartografa  ')
  state.failCharacterCreate = true
  state.delayMutation = 300
  await composer(page).getByRole('button', { name: 'Crea personaggio', exact: true }).click()
  await expect(composer(page).getByRole('button', { name: 'Creazione in corso…' })).toBeDisabled()
  await expect(composer(page).getByRole('button', { name: 'Torna ai personaggi' })).toBeDisabled()
  await expect(composer(page).getByRole('alert')).toContainText('La bozza resta disponibile')
  await expect(page.getByLabel(/^Nome del personaggio/)).toHaveValue('  La cartografa  ')
  expect(state.characterCreates).toBe(1)
  expect(state.lastCharacterPayload?.name).toBe('La cartografa')
  state.failCharacterCreate = false
  state.failCharacterRead = true
  await composer(page).getByRole('button', { name: 'Crea personaggio', exact: true }).click()
  await expect(composer(page)).toHaveCount(0)
  await expect(page.locator('.character-browser')).toBeVisible()
  expect(state.characterCreates).toBe(2)
  expect(await page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull()
})

test('master with active PG creates only NPC and player cannot select NPC', async ({ page }) => {
  const state = await installApi(page)
  state.characters = [{ id: 'existing', userId: profile.id, ownerProfileName: profile.profileName, name: 'PG attivo', nickname: null, portraitUrl: null, isNpc: false, campaignId: campaign.id, characterStatus: 'ACTIVE', createdAt: campaign.createdAt }]
  await openCreate(page)
  await expect(page.getByRole('radio', { name: /^PG/ })).toBeDisabled()
  await expect(page.getByRole('radio', { name: /^NPC/ })).toBeChecked()
  await page.getByLabel(/^Nome del personaggio/).fill('Il bibliotecario')
  await composer(page).getByRole('button', { name: 'Crea NPC', exact: true }).click()
  await expect(composer(page)).toHaveCount(0)
  expect(state.lastCharacterPayload?.isNpc).toBe(true)
  state.membershipRole = 'GIOCATORE'
  state.characters = []
  await openCreate(page)
  await expect(page.getByRole('radio', { name: /^NPC/ })).toBeDisabled()
  await expect(page.getByRole('radio', { name: /^PG/ })).toBeChecked()
})

test('creation fits Taste breakpoints and both themes, optional section is keyboard accessible', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await installApi(page)
  await openCreate(page)
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(page.getByLabel(/^Nome del personaggio/)).toBeVisible()
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(directory, `character-create-${width}-${theme}.png`), fullPage: true })
    }
  }
  await composer(page).locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Indirizzo del ritratto')).toBeVisible()
  await page.getByRole('radio', { name: /^PG/ }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: /^NPC/ })).toBeChecked()
  expect(errors).toEqual([])
})

test('unrelated user and campaign drafts are ignored; storage failure allows explicit exit', async ({ page }) => {
  await installApi(page)
  await page.addInitScript(() => {
    sessionStorage.setItem('gate_character_draft:gate:another-user:ui-campaign', JSON.stringify({ name: 'Non mio' }))
    sessionStorage.setItem('gate_character_draft:gate:ui-user:another-campaign', JSON.stringify({ name: 'Altro tavolo' }))
  })
  await openCreate(page)
  await expect(page.getByLabel(/^Nome del personaggio/)).toHaveValue('')
  await page.getByLabel(/^Nome del personaggio/).fill('Una bozza da copiare')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('gate_character_draft:')) throw new Error('Storage unavailable in test')
      original.call(this, key, value)
    }
  })
  await composer(page).getByRole('button', { name: 'Torna ai personaggi' }).click()
  await expect(composer(page).getByRole('alert')).toContainText('Copia i testi prima di uscire')
  await expect(page.getByLabel(/^Nome del personaggio/)).toHaveValue('Una bozza da copiare')
  await composer(page).getByRole('button', { name: 'Esci senza salvare' }).click()
  await expect(page.locator('.character-browser')).toBeVisible()
})
