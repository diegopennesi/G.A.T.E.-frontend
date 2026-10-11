import { expect, test } from '@playwright/test'
import { initialMission, installApi, openMissions } from './apiFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

async function capture(page: import('@playwright/test').Page, name: string) {
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: path.join(directory, name), fullPage: true })
}

test('desktop login fits and exposes selected mode, mobile retains realm identity', async ({ page }) => {
  await installApi(page, false)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const submit = page.getByRole('button', { name: 'Accedi', exact: true })
  await expect(submit).toBeInViewport()
  await expect(page.getByRole('button', { name: /^Login\./ })).toHaveAttribute('aria-pressed', 'true')
  await capture(page, 'login-desktop-light.png')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Taverna del Codice' })).toBeVisible()
  await expect(submit).toBeInViewport()
  await capture(page, 'login-mobile-light.png')
})

test('campaign landing fits small screens with long campaign names in both themes', async ({ page }) => {
  await installApi(page)
  for (const theme of ['light', 'dark']) {
    await page.goto('/homepage/gate/app/ingresso')
    await page.evaluate((theme) => localStorage.setItem('gate_theme', theme), theme)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('button', { name: 'Entra nella campagna' })).toBeVisible()
    const closeNotes = page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true })
    if (await closeNotes.isVisible()) await closeNotes.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      const button = page.getByRole('button', { name: 'Crea nuova campagna', exact: true })
      const bounds = await button.boundingBox()
      expect(bounds?.x).toBeGreaterThanOrEqual(0)
      expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(width)
      if (width === 390 || width === 1280) await capture(page, `landing-${width}-${theme}.png`)
    }
  }
})

test('mobile drawer traps focus, closes with Escape and becomes ordinary navigation on desktop', async ({ page }) => {
  await installApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openMissions(page)
  const trigger = page.getByRole('button', { name: 'Apri menu', exact: true })
  await expect(trigger).toBeVisible()
  const drawer = page.locator('#main-navigation-drawer')
  await expect(drawer).toHaveAttribute('inert', '')
  await trigger.click()
  const close = page.getByRole('button', { name: 'Chiudi menu', exact: true })
  await expect(close).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('main.main')).toHaveAttribute('inert', '')
  await page.keyboard.press('Shift+Tab')
  await expect(drawer.getByRole('button', { name: 'Logout', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(drawer).toHaveAttribute('inert', '')
  await expect(page.locator('main.main')).not.toHaveAttribute('inert')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.sidebar-drawer')))).toBe(false)
  await trigger.click()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(drawer).not.toHaveAttribute('inert')
  await expect(drawer.getByRole('navigation')).toBeVisible()
  await expect(drawer).not.toHaveAttribute('aria-modal')
  await expect(page.locator('main.main')).not.toHaveAttribute('inert')
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('mission creation keeps the editor and its draft on API failure, closes only on success', async ({ page }) => {
  const state = await installApi(page)
  state.failCreate = true
  state.delayMutation = 300
  await openMissions(page)
  await page.getByRole('button', { name: 'Crea missione', exact: true }).click()
  const title = page.getByPlaceholder('Titolo missione')
  await title.fill('Una bozza da conservare')
  await page.getByRole('button', { name: 'Crea missione', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Salvataggio...' })).toBeDisabled()
  await expect(page.getByRole('alert').filter({ hasText: 'La bozza è stata conservata' })).toBeVisible()
  await expect(title).toHaveValue('Una bozza da conservare')
  await capture(page, 'mission-create-error.png')
  expect(state.creates).toBe(1)
  state.failCreate = false
  await page.getByRole('button', { name: 'Crea missione', exact: true }).click()
  await expect(title).toHaveCount(0)
  expect(state.missions.find((mission) => mission.title === 'Una bozza da conservare')).toBeTruthy()
  expect(state.creates).toBe(2)
})

test('mission edits remain open after failure and are applied on retry', async ({ page }) => {
  const state = await installApi(page)
  state.failUpdate = true
  await openMissions(page)
  await page.getByRole('button', { name: `Apri dettaglio missione ${initialMission.title}`, exact: true }).click()
  await page.getByRole('button', { name: /Modifica missione/ }).click()
  const title = page.getByPlaceholder('Titolo missione')
  await title.fill('Titolo aggiornato')
  await page.getByRole('button', { name: 'Salva modifica' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Le modifiche sono state conservate' })).toBeVisible()
  await expect(title).toHaveValue('Titolo aggiornato')
  state.failUpdate = false
  await page.getByRole('button', { name: 'Salva modifica' }).click()
  await expect(title).toHaveCount(0)
  expect(state.missions[0].title).toBe('Titolo aggiornato')
})

test('failed chat send preserves text; successful send with failed refresh must not offer resend', async ({ page }) => {
  const state = await installApi(page)
  state.failSend = true
  await openMissions(page)
  await page.getByRole('button', { name: `Apri chat missione ${initialMission.title}`, exact: true }).click()
  const draft = page.getByRole('textbox', { name: 'Messaggio alla missione' })
  await draft.fill('Il mio messaggio')
  await page.getByRole('button', { name: 'Invia', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Il testo è stato conservato' })).toBeVisible()
  await expect(draft).toHaveValue('Il mio messaggio')
  state.failSend = false
  state.failChatRefresh = true
  await page.getByRole('button', { name: 'Invia', exact: true }).click()
  await expect(draft).toHaveValue('')
  await expect(page.getByRole('alert').filter({ hasText: 'Messaggio inviato.' })).toBeVisible()
  expect(state.sends).toBe(2)
  expect(state.messages).toHaveLength(1)
  expect(state.messages[0].body).toBe('Il mio messaggio')
})

test('searchable select supports arrows, Enter, Escape and leaving by Tab', async ({ page }) => {
  await page.goto('/tests/ui/controls.html')
  const input = page.getByRole('combobox', { name: 'Reame operativo' })
  await input.fill('Reame')
  await expect(input).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue('Reame del Sud')
  await expect(page.getByLabel('Reame selezionato')).toHaveText('two')
  await input.fill('Reame')
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue('Reame delle Isole')
  await input.fill('Reame')
  await page.keyboard.press('Escape')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Azione successiva' })).toBeFocused()
  await expect(input).toHaveAttribute('aria-expanded', 'false')
})
