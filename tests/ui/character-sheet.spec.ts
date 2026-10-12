import { expect, test } from '@playwright/test'
import { installSheet } from './sheetFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
const editor = (page: import('@playwright/test').Page) => page.locator('.character-sheet-page')
async function openSheet(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/personaggio?campaignId=ui-campaign')
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('3')
}

test('schema fields have labels, native validation and DND modifiers update from draft', async ({ page }) => {
  const state = await installSheet(page)
  await openSheet(page)
  await expect(page.getByRole('combobox', { name: 'Classe', exact: true })).toHaveValue('ranger')
  await expect(page.getByLabel('Storia', { exact: true })).toHaveValue('Una cartografa tra le montagne.')
  await page.getByLabel('Ispirazione', { exact: true }).check()
  await page.getByLabel('Equipaggiamento', { exact: true }).fill('Mappa, Bussola, Corda')
  await page.getByRole('spinbutton', { name: 'Forza', exact: true }).fill('18')
  await expect(page.getByLabel('Modificatore Forza')).toHaveText('+4')
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('21')
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  expect(state.sheetSaves).toBe(0)
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toBeFocused()
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('')
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  expect(state.sheetSaves).toBe(0)
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('4')
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  await expect(editor(page).locator('.character-sheet-edit-status')).toContainText('Modifiche inviate')
  expect(state.lastSheetPayload).toMatchObject({ 'identity.level': 4, 'identity.inspiration': true, 'identity.equipment': ['Mappa', 'Bussola', 'Corda'], 'abilities.strength': 18 })
})

test('failed save retains edits and blocks parallel requests; returning requires explicit discard', async ({ page }) => {
  const state = await installSheet(page)
  await openSheet(page)
  await page.getByLabel('Storia', { exact: true }).fill('Una storia ancora da salvare')
  await expect(editor(page).getByRole('button', { name: 'Aggiorna scheda' })).toBeDisabled()
  state.failSheetSave = true
  state.delayMutation = 350
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  await expect(editor(page).getByRole('button', { name: 'Salvataggio…' })).toBeDisabled()
  await expect(page.getByLabel('Storia', { exact: true })).toBeDisabled()
  await expect(editor(page).getByRole('alert')).toContainText('Le modifiche restano nel form')
  await expect(page.getByLabel('Storia', { exact: true })).toHaveValue('Una storia ancora da salvare')
  expect(state.sheetSaves).toBe(1)
  await editor(page).getByRole('button', { name: 'Torna ai personaggi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Scartare le modifiche?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
  await expect(page.getByLabel('Storia', { exact: true })).toHaveValue('Una storia ancora da salvare')
  state.failSheetSave = false
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  await expect(editor(page).locator('.character-sheet-edit-status')).toContainText('Modifiche inviate')
  expect(state.sheetSaves).toBe(2)
})

test('acknowledged save with failed reread does not offer a second write', async ({ page }) => {
  const state = await installSheet(page)
  await openSheet(page)
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('8')
  state.failSheetRead = true
  await editor(page).getByRole('button', { name: 'Salva scheda', exact: true }).click()
  await expect(editor(page).locator('.character-sheet-edit-status')).toContainText('Modifiche inviate')
  await expect(editor(page).getByRole('button', { name: 'Salva scheda', exact: true })).toBeDisabled()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('8')
  expect(state.sheetSaves).toBe(1)
  state.failSheetRead = false
  await editor(page).getByRole('button', { name: 'Aggiorna scheda' }).click()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('8')
})

test('pending review locks player editing; retired character stays read only with restricted reactivation', async ({ page }) => {
  const state = await installSheet(page)
  state.membershipRole = 'GIOCATORE'
  state.sheets['sheet-character'].pendingReview = { id: 'review-1', status: 'PENDING', submittedByUserId: 'ui-user', submittedAt: '2026-10-12T09:00:00Z', changes: [{ path: 'identity.level', label: 'Livello', oldValue: 3, newValue: 4 }] }
  await openSheet(page)
  await expect(page.getByRole('heading', { name: 'Modifica in attesa di approvazione' })).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toBeDisabled()
  await expect(editor(page).getByRole('button', { name: 'Approva modifica' })).toHaveCount(0)
  state.sheets['sheet-character'].pendingReview = null
  state.characters[0].characterStatus = 'RETIRED'
  await editor(page).getByRole('button', { name: 'Aggiorna scheda' }).click()
  await expect(editor(page).getByText('La scheda è in sola lettura perché il personaggio non è attivo.')).toBeVisible()
  await editor(page).locator('summary').filter({ hasText: 'Cambia stato' }).click()
  await expect(page.getByLabel('Nuovo stato').locator('option[value="ACTIVE"]')).toHaveAttribute('disabled', '')
  await expect(page.getByLabel('Nuovo stato').locator('option[value="DEAD"]')).toHaveCount(0)
  await page.getByLabel('Nuovo stato').focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByLabel('Nuovo stato')).toHaveValue('RETIRED')
})

test('review failure retains note; retry approves changes and history opens with keyboard', async ({ page }) => {
  const state = await installSheet(page)
  state.sheets['sheet-character'].pendingReview = { id: 'review-1', status: 'PENDING', submittedByUserId: 'ui-user', submittedAt: '2026-10-12T09:00:00Z', changes: [{ path: 'identity.level', label: 'Livello', oldValue: 3, newValue: 4 }] }
  await openSheet(page)
  await page.getByLabel('Nota per la revisione').fill('Confermo la progressione')
  state.failReview = true
  state.delayMutation = 350
  await editor(page).getByRole('button', { name: 'Approva modifica' }).click()
  await expect(editor(page).getByRole('button', { name: 'Revisione in corso…' })).toBeDisabled()
  await expect(editor(page).getByRole('alert')).toContainText('La nota resta disponibile')
  await expect(page.getByLabel('Nota per la revisione')).toHaveValue('Confermo la progressione')
  state.failReview = false
  await editor(page).getByRole('button', { name: 'Approva modifica' }).click()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('4')
  expect(state.reviewSubmissions).toBe(2)
  expect(state.lastReviewPayload?.note).toBe('Confermo la progressione')
  const summary = editor(page).locator('summary').filter({ hasText: 'Storico delle revisioni' })
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(editor(page).getByText('Confermo la progressione', { exact: true })).toBeVisible()
})

test('status update is secondary, retries failures and makes retired sheet read only', async ({ page }) => {
  const state = await installSheet(page)
  await openSheet(page)
  await editor(page).locator('summary').filter({ hasText: 'Cambia stato' }).click()
  await page.getByLabel('Nuovo stato').selectOption('RETIRED')
  state.failStatusUpdate = true
  state.delayMutation = 300
  await editor(page).getByRole('button', { name: 'Aggiorna stato' }).click()
  await expect(editor(page).getByRole('button', { name: 'Aggiornamento…' })).toBeDisabled()
  await expect(editor(page).getByRole('alert')).toContainText('Lo stato non è stato aggiornato')
  state.failStatusUpdate = false
  await editor(page).getByRole('button', { name: 'Aggiorna stato' }).click()
  await expect(editor(page).getByText('La scheda è in sola lettura perché il personaggio non è attivo.')).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toBeDisabled()
  expect(state.statusUpdates).toBe(2)
})

test('refresh failure preserves current data and allows retry; discard restores server version', async ({ page }) => {
  const state = await installSheet(page)
  await openSheet(page)
  state.failSheetRead = true
  await editor(page).getByRole('button', { name: 'Aggiorna scheda' }).click()
  await expect(editor(page).getByRole('alert')).toContainText('I dati caricati restano visibili')
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('3')
  state.failSheetRead = false
  await editor(page).getByRole('button', { name: 'Riprova aggiornamento' }).click()
  await expect(editor(page).getByRole('alert')).toHaveCount(0)
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('5')
  await editor(page).getByRole('button', { name: 'Scarta modifiche', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Scarta modifiche', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('3')
})

test('sheet layout fits Taste breakpoints and both themes without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await installSheet(page)
  await openSheet(page)
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('3')
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(directory, `character-sheet-${width}-${theme}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})
