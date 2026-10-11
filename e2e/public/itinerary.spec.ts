import { test, expect } from '@playwright/test';

/** Phase 5: public/read-only, lowest risk. /itinerary is static content (hardcoded day-by-day
 * schedule, no DB queries) behind MUI Tabs -- covers that switching tabs actually swaps the
 * visible day, which is the one piece of real client-side behavior on this page. */

test('switching day tabs shows that day\'s schedule', async ({ page }) => {
  await page.goto('/itinerary');
  await expect(page.getByRole('heading', { name: 'Itinerary' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Wednesday 4/22/26' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thursday 4/23/26' })).not.toBeVisible();

  await page.getByRole('tab', { name: 'Thu 4/23' }).click();
  await expect(page.getByRole('heading', { name: 'Thursday 4/23/26' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wednesday 4/22/26' })).not.toBeVisible();

  await page.getByRole('tab', { name: 'Sat 4/25' }).click();
  await expect(page.getByRole('heading', { name: 'Saturday 4/25/26' })).toBeVisible();
});
