import { expect, test } from '@playwright/test'
import { installApi, campaign } from './apiFixture'
import { installSheet } from './sheetFixture'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
const settings = (page: import('@playwright/test').Page) => page.locator('.campaign-settings')
async function openSettings(page: import('@playwright/test').Page) {
  await page.goto('/homepage/gate/app/campagna-gestione?campaignId=ui-campaign')
  await expect(page.getByPlaceholder('Nome della campagna')).toHaveValue(campaign.name)
}

test('campaign settings preserve changes on failure, block menu navigation, and stay open after save', async ({ page }) => {
  const state = await installApi(page)
  state.campaign.allowedModules = ['MISSIONI', 'CHAT']
  await openSettings(page)
  await page.locator('summary').filter({ hasText: 'Moduli e regole delle missioni' }).click()
  await page.locator('label[aria-label="Missioni attivo"]').click()
  await page.locator('label[aria-label="Missioni disattivo"]').click()
  await page.getByPlaceholder('Nome della campagna').fill('Il tavolo del sabato')
  await page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('button', { name: 'Profilo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Modifiche non salvate' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Resta qui' }).click()
  await expect(page.getByPlaceholder('Nome della campagna')).toHaveValue('Il tavolo del sabato')
  state.failCampaignSave = true; state.delayMutation = 300
  await settings(page).getByRole('button', { name: 'Salva impostazioni' }).click()
  await expect(settings(page).getByRole('button', { name: 'Salvataggio…' })).toBeDisabled()
  await expect(settings(page).getByRole('alert')).toContainText('puoi riprovare')
  state.failCampaignSave = false
  await settings(page).getByRole('button', { name: 'Salva impostazioni' }).click()
  await expect(settings(page).getByRole('status').first()).toHaveText('Impostazioni salvate.')
  expect(state.campaignSaves).toBe(2)
  expect(state.campaign.allowedModules).toEqual(expect.arrayContaining(['MISSIONI', 'CHAT']))
  await expect(page).toHaveURL(/campagna-gestione/)
})

test('invites validate future expiry and recover errors without clearing configuration', async ({ page }) => {
  const state = await installApi(page)
  await openSettings(page)
  await page.locator('summary').filter({ hasText: 'Crea un invito con limiti' }).click()
  await page.getByLabel('Numero massimo di utilizzi').fill('2')
  await page.getByLabel('Scadenza (facoltativa)').fill('2020-01-01T10:00')
  await page.getByRole('button', { name: 'Crea invito', exact: true }).click()
  await expect(settings(page).getByRole('alert')).toContainText('data futura')
  expect(state.inviteCreates).toBe(0)
  await page.getByLabel('Scadenza (facoltativa)').fill('2099-01-01T10:00')
  state.failInvite = true
  await page.getByRole('button', { name: 'Crea invito', exact: true }).click()
  await expect(settings(page).getByRole('alert')).toContainText('puoi riprovare')
  await expect(page.getByLabel('Numero massimo di utilizzi')).toHaveValue('2')
  state.failInvite = false
  await page.getByRole('button', { name: 'Crea invito', exact: true }).click()
  await expect(page.getByLabel('Nuovo codice invito')).toHaveValue('invito-di-collaudo')
})

test('access decisions wait for acknowledgement and do not repeat successful write after failed reread', async ({ page }) => {
  const state = await installApi(page)
  state.pending = [{ userId: 'pending-user', username: 'nuovo', profileName: 'Nuovo giocatore', campaignId: campaign.id, characterId: null, role: 'GIOCATORE', memberStatus: 'PENDING', characterStatus: null, requestedAt: campaign.createdAt }]
  await page.goto('/homepage/gate/app/campagna-accessi?campaignId=ui-campaign')
  await expect(page.getByRole('button', { name: 'Approva accesso' })).toBeVisible()
  state.failDecision = true
  await page.getByRole('button', { name: 'Approva accesso' }).click()
  await expect(page.locator('.approvals-page').getByRole('alert')).toContainText('puoi riprovare')
  state.failDecision = false; state.failPendingRead = true
  await page.getByRole('button', { name: 'Approva accesso' }).click()
  await expect(page.locator('.approvals-page').getByRole('status')).toContainText('richiesta approvata')
  await expect(page.getByRole('button', { name: 'Approva accesso' })).toHaveCount(0)
  expect(state.decisions).toBe(2)
})

test('moderation dialog keeps reason after failure and closes only after success', async ({ page }) => {
  const state = await installApi(page)
  state.members.push({ ...state.members[0], userId: 'other-user', role: 'GIOCATORE' })
  await page.goto('/homepage/gate/app/campagna?campaignId=ui-campaign')
  await page.getByRole('button', { name: 'Compagno di tavolo', exact: true }).click()
  await page.getByRole('button', { name: 'Sospendi accesso' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sospendi accesso alla campagna' })
  await dialog.getByLabel('Motivo della moderazione').fill('Una pausa concordata')
  state.failMemberAction = true; state.delayMutation = 300
  await dialog.getByRole('button', { name: 'Conferma', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Elaborazione…' })).toBeDisabled()
  await expect(dialog.getByRole('alert')).toContainText('puoi riprovare')
  await expect(dialog.getByLabel('Motivo della moderazione')).toHaveValue('Una pausa concordata')
  state.failMemberAction = false
  await dialog.getByRole('button', { name: 'Conferma', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Rimuovi sospensione' })).toBeVisible()
})

test('profile and password forms preserve failed edits and validate confirmation', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/homepage/gate/app/profilo-modifica')
  await page.getByLabel('Nome visibile').fill('Nuovo nome al tavolo')
  state.failProfileSave = true
  await page.getByRole('button', { name: 'Salva profilo' }).click()
  await expect(page.locator('.profile-editor').getByRole('alert')).toContainText('puoi riprovare')
  await expect(page.getByLabel('Nome visibile')).toHaveValue('Nuovo nome al tavolo')
  await page.locator('summary').filter({ hasText: 'Cambio password' }).click()
  await page.getByLabel('Password attuale', { exact: true }).fill('Vecchia123')
  await page.getByLabel('Nuova password', { exact: true }).fill('Nuova1234')
  await page.getByLabel('Conferma nuova password', { exact: true }).fill('Diversa1234')
  await page.getByRole('button', { name: 'Aggiorna password' }).click()
  await expect(page.locator('.profile-password-block').getByRole('alert')).toContainText('non coincidono')
  expect(state.passwordChanges).toBe(0)
  await page.getByLabel('Conferma nuova password', { exact: true }).fill('Nuova1234')
  state.failPassword = true
  await page.getByRole('button', { name: 'Aggiorna password' }).click()
  await expect(page.locator('.profile-password-block').getByRole('alert')).toContainText('puoi riprovare')
  await expect(page.getByLabel('Nuova password', { exact: true })).toHaveValue('Nuova1234')
  state.failPassword = false
  await page.getByRole('button', { name: 'Aggiorna password' }).click()
  await expect(page.getByLabel('Nuova password', { exact: true })).toHaveValue('')
  state.failProfileSave = false
  await page.getByRole('button', { name: 'Salva profilo' }).click()
  await expect(page.locator('.profile-editor')).toHaveCount(0)
})

test('room form validates duration and preserves failed creation; activity filter works', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/homepage/gate/app/stanze?campaignId=ui-campaign')
  await page.getByRole('button', { name: 'Crea stanza', exact: true }).click()
  await page.getByLabel('Nome della stanza').fill('Il tavolo del gruppo')
  await page.locator('summary').filter({ hasText: 'Durata e ritmo' }).click()
  await page.getByLabel('Durata della stanza (ore)').fill('73')
  await page.locator('.rooms-browser').getByRole('button', { name: 'Crea stanza', exact: true }).click()
  expect(state.roomCreates).toBe(0)
  await page.getByLabel('Durata della stanza (ore)').fill('24')
  state.failRoomCreate = true
  await page.locator('.rooms-browser').getByRole('button', { name: 'Crea stanza', exact: true }).click()
  await expect(page.locator('.rooms-browser').getByRole('alert')).toContainText('puoi riprovare')
  await expect(page.getByLabel('Nome della stanza')).toHaveValue('Il tavolo del gruppo')
  state.failRoomCreate = false
  await page.locator('.rooms-browser').getByRole('button', { name: 'Crea stanza', exact: true }).click()
  await expect(page.locator('.rooms-browser')).toContainText('Stanza creata.')
  expect(state.roomCreates).toBe(2)
  await page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('button', { name: 'Attività', exact: true }).click()
  await page.getByLabel('Filtra attività').selectOption('error')
  await expect(page.locator('.activity-log')).toContainText('Connessione interrotta')
})

test('sheet edits are protected by menu, breadcrumb and campaign switch', async ({ page }) => {
  await installSheet(page)
  await page.goto('/homepage/gate/app/personaggio?campaignId=ui-campaign')
  await page.getByRole('spinbutton', { name: 'Livello', exact: true }).fill('4')
  const nav = page.getByRole('navigation', { name: 'Navigazione principale' })
  for (const trigger of [nav.getByRole('button', { name: 'Missioni', exact: true }), page.getByRole('navigation', { name: 'Percorso' }).getByRole('button', { name: 'Personaggi', exact: true }), page.getByRole('button', { name: 'Cambia campagna', exact: true })]) {
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Modifiche non salvate' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Resta qui' }).click()
    await expect(page.getByRole('spinbutton', { name: 'Livello', exact: true })).toHaveValue('4')
  }
  await nav.getByRole('button', { name: 'Missioni', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Scarta e continua' }).click()
  await expect(page.getByPlaceholder('Titolo, descrizione o campagna')).toBeVisible()
})

test('remaining pages fit mobile and desktop in both themes', async ({ page }) => {
  await installApi(page)
  await page.goto('/homepage/gate/app/ingresso')
  const directory = path.resolve('ui-test-results/screenshots')
  await mkdir(directory, { recursive: true })
  for (const route of ['campagna-gestione', 'campagna-accessi', 'stanze', 'profilo-modifica', 'log']) {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => localStorage.setItem('gate_theme', theme), theme)
      await page.goto(`/homepage/gate/app/${route}?campaignId=ui-campaign`)
      await expect(page.locator('.remaining-flow')).toBeVisible()
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:900})
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        if (width === 390 || width === 1440) await page.screenshot({path:path.join(directory, `${route}-${width}-${theme}.png`),fullPage:true})
      }
    }
  }
})
