import { expect, test } from '@playwright/test'

test('registration and campaign creation flow stays available', async ({ page }) => {
  const suffix = Date.now()
  const username = `fe_smoke_${suffix}`
  const password = 'Password123!'
  const profileName = `Smoke ${suffix}`
  const campaignName = `Campagna FE ${suffix}`

  await page.goto('http://localhost:5174/')

  await page.getByRole('button', { name: /Registrazione/ }).click()
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.locator('input[type="password"]').fill(password)
  await page.getByLabel('Profile Name').fill(profileName)
  await page.getByRole('button', { name: /Crea account/ }).click()

  await expect(page.getByText('Profilo utente')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: profileName })).toBeVisible()

  await page.getByRole('button', { name: 'Campagne' }).click()
  await expect(page.getByText('Lista Campagne')).toBeVisible()

  await page.getByRole('main').getByRole('button', { name: 'Crea campagna' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Crea Campagna' })).toBeVisible()

  await page.getByLabel('Nome').fill(campaignName)
  await page.getByRole('button', { name: /^Crea$/ }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Scheda Campagna' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: campaignName })).toBeVisible()

  await page.getByRole('button', { name: 'Gestione Personaggi' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Gestione Personaggi' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: 'Crea Personaggio' })).toBeVisible()
})
