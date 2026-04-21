import { test, expect } from '@playwright/test'

// T9 — REQ-DASH-01: Enterprise → HQ → Project → Personnel drill in at most 4 clicks.
//
// RED state: app/page.tsx has no navigation, drill links, or HQ/project/personnel
// pages yet. These tests FAIL until the executor implements the dashboard hierarchy (T9).
//
// Click contract for the executor:
//   Click 1: Enterprise row / link on the home dashboard
//   Click 2: HQ row / link on the Enterprise detail view
//   Click 3: Project row / link on the HQ detail view
//   Click 4: Personnel row / link on the Project detail view
//
// All four clicks are optional if navigating to a later level already lands there
// in fewer clicks, but at MOST 4 clicks total from the home page.

test.describe('enterprise-to-personnel drill navigation', () => {
  test('user can drill from enterprise to HQ in 1 click', async ({ page }) => {
    await page.goto('/')

    // Click 1 — navigate to any HQ
    const hqLink = page.getByRole('link', { name: /hq|headquarters/i }).first()
    await hqLink.click()

    // Verify we are on an HQ page (url or heading)
    await expect(page).toHaveURL(/hq/i)
  })

  test('user can drill from enterprise to project in 2 clicks', async ({ page }) => {
    await page.goto('/')

    // Click 1 — HQ
    await page.getByRole('link', { name: /hq|headquarters/i }).first().click()

    // Click 2 — Project
    const projectLink = page.getByRole('link', { name: /project|proj/i }).first()
    await projectLink.click()

    await expect(page).toHaveURL(/project/i)
  })

  test('user can drill enterprise → HQ → project → personnel in at most 4 clicks', async ({ page }) => {
    await page.goto('/')

    // Click 1 — Enterprise dashboard shows HQ list; click first HQ
    await page.getByRole('link', { name: /hq|headquarters/i }).first().click()
    await expect(page).toHaveURL(/hq/i)

    // Click 2 — HQ dashboard shows project list; click first project
    await page.getByRole('link', { name: /project|proj/i }).first().click()
    await expect(page).toHaveURL(/project/i)

    // Click 3 — Project dashboard shows personnel list; click first personnel member
    await page.getByRole('link', { name: /personnel|person|member/i }).first().click()
    await expect(page).toHaveURL(/personnel/i)

    // Click 4 is not required — personnel detail is reached in 3 clicks from home.
    // Verify we see personnel-level content: name, hours, or rate
    const personnelDetail = page.getByTestId('personnel-detail')
    await expect(personnelDetail).toBeVisible()
  })

  test('personnel detail page shows name and standard hourly rate', async ({ page }) => {
    // Direct navigation to personnel detail to assert content
    // Seed:small — first personnel is pers-001 (Alice Kim)
    await page.goto('/dashboard/personnel/pers-001')

    // Must show the personnel's name
    await expect(page.getByTestId('personnel-name')).toBeVisible()
    // Must show a numeric rate field
    await expect(page.getByTestId('personnel-standard-rate')).toBeVisible()
  })
})
