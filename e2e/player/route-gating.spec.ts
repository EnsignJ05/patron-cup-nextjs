import { test, expect } from '@playwright/test';

/**
 * Runs with the player project's storageState -- an authenticated, non-admin session.
 * Distinct from e2e/public/login.spec.ts's anon-gating checks: here the question is whether
 * authenticated-but-wrong-role is handled (-> /unauthorized), not unauthenticated (-> /login).
 */
test('authenticated player is redirected to /unauthorized on an admin-only route', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/unauthorized/);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
