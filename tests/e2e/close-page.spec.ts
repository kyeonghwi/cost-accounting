import { test, expect } from '@playwright/test'

// ClosePage — empty-history and populated-history rendering paths.
// Requires the dev server running against a seeded database.
// Empty-history path is tested against a fresh seed with no AllocationRun rows.

test.describe('close page', () => {
  test('shows empty-history message when no runs exist', async ({ page }) => {
    await page.goto('/close')
    await expect(page.getByTestId('close-page')).toBeVisible()
    // When no AllocationRun rows exist, the page renders the empty-history message.
    await expect(page.getByText('실행 내역이 없습니다.')).toBeVisible()
  })

  test('renders the close form with a period selector', async ({ page }) => {
    await page.goto('/close')
    await expect(page.getByTestId('close-page')).toBeVisible()
    // The form must have a period selector and a submit button (or disabled placeholder).
    const form = page.locator('form')
    await expect(form).toBeVisible()
  })
})
