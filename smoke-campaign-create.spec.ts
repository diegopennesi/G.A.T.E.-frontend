import { expect, test } from '@playwright/test'

test('create campaign shows up in active campaign chips', async ({ page }) => {
  const suffix = Date.now()
  const username = `fe_smoke_${suffix}`
  const password = 'Password123!'
  const campaignName = `Campagna FE ${suffix}`

  await page.goto('http://localhost:5174/')

  await page.getByRole('button', { name: 'Vai a registrazione' }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByLabel('Profile Name').fill(`Smoke ${suffix}`)
  await page.getByRole('button', { name: 'Crea account' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Profilo' })).toBeVisible()

  await page.getByRole('button', { name: 'Campagna' }).click()
  await page.getByRole('button', { name: 'Crea Campagna' }).click()

  await page.getByLabel('Nome').fill(campaignName)
  await page.getByRole('button', { name: 'Crea', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Scheda Campagna' })).toBeVisible()
  await expect(page.getByText(campaignName)).toBeVisible()

  await page.getByRole('button', { name: 'Gestione Personaggi' }).click()
  await expect(page.getByRole('button', { name: `${campaignName} · SUPER_MASTER · Attiva` })).toBeVisible()
})
