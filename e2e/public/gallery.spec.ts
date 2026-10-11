import { test, expect } from '@playwright/test';

/** Phase 5: public/read-only, lowest risk. /gallery is a static "coming soon" placeholder
 * with no DB queries -- a single smoke assertion is proportionate to how little there is to
 * regress. */

test('renders the coming-soon placeholder', async ({ page }) => {
  await page.goto('/gallery');
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
  await expect(page.getByText('Coming soon')).toBeVisible();
});
