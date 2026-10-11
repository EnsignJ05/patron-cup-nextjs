import { test, expect } from '@playwright/test';

/**
 * Phase 0 smoke test. Its only job is to prove the pipeline works end-to-end -- the
 * dual-mode config, baseURL resolution, and (for authenticated projects) the auth setup
 * projects/storageState plumbing -- before any real coverage gets written. No auth, no data
 * mutation.
 */
test('home page loads and shows the site chrome', async ({ page }) => {
  await page.goto('/');
  // The home page's main content differs by pre-trip/on-trip state (a live match banner vs.
  // a countdown), so assert on the sidebar logo link instead -- present in both states,
  // confirmed via a real run against the deployed site in its current on-trip state.
  await expect(page.getByRole('link', { name: /Patron Cup/i }).first()).toBeVisible();
});
