import { test, expect } from '@playwright/test'

// T8 — REQ-DEMO-01 / Persona Switcher (SPEC-COST-001 §3.10)
// Demo banner must be visible on the home page and at least one other route.
//
// RED state: app/page.tsx has no [data-testid="demo-banner"] element yet.
// These tests will FAIL until the executor adds the demo banner component (T8).
//
// Selector contract for the executor:
//   <div data-testid="demo-banner" ...>Demo Mode — read-only, no authentication</div>
//   Must appear on every page that renders the shared layout.

test.describe('demo banner visibility', () => {
  test('demo banner is visible on the home page ("/")', async ({ page }) => {
    await page.goto('/')

    const banner = page.getByTestId('demo-banner')
    await expect(banner).toBeVisible()
    // The banner must communicate demo / read-only mode to the user
    await expect(banner).toContainText(/demo/i)
  })

  test('demo banner is visible on the enterprise dashboard ("/dashboard/enterprise")', async ({ page }) => {
    await page.goto('/dashboard/enterprise')

    const banner = page.getByTestId('demo-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(/demo/i)
  })

  test('demo banner is visible on a HQ dashboard route', async ({ page }) => {
    // Route pattern mirrors the Next.js app-router path for HQ detail.
    // The exact HQ ID comes from seed:small — hq-001 is the first HQ.
    await page.goto('/dashboard/hq/org-hq-001')

    const banner = page.getByTestId('demo-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(/demo/i)
  })
})
