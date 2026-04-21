import { test, expect } from '@playwright/test'

// T12 — Smoke tests: verify critical routes respond with HTTP 200.
//
// These tests check only that pages load without error — they do not
// assert UI content. Playwright's page.goto() resolves to the HTTP
// response object, so we can assert the status code directly.
//
// Run against any deployed URL by setting BASE_URL:
//   BASE_URL=https://staging.example.com npx playwright test smoke.spec.ts

test.use({ baseURL: process.env.BASE_URL || 'http://localhost:3000' })

test.describe('smoke — critical routes return 200', () => {
  test('home page (/) responds with 200', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('enterprise dashboard (/dashboard/enterprise) responds with 200', async ({ page }) => {
    const response = await page.goto('/dashboard/enterprise')
    expect(response?.status()).toBe(200)
  })

  // app/(master)/organizations/page.tsx — Next.js route group strips the parens segment.
  // The actual URL is /organizations, not /master/organizations.
  test('master organizations (/organizations) responds with 200', async ({ page }) => {
    const response = await page.goto('/organizations')
    expect(response?.status()).toBe(200)
  })
})
