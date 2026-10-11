import { test, expect } from '@playwright/test';

/** Phase 5: public/read-only, lowest risk. /faq is entirely static (hardcoded trip/course/
 * Q&A data, no DB queries) -- a light smoke check is proportionate; there's no live data
 * path to guard against regressing. */

test('renders the trip hero, Q&A, and all 4 courses', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.getByRole('heading', { name: 'Patron Cup 2027' })).toBeVisible();
  await expect(page.getByText('Streamsong Resort').first()).toBeVisible();
  await expect(page.getByText('When is it?')).toBeVisible();

  // Scoped to the course grid specifically -- "Bone Valley" etc. also appear as substrings
  // inside the Q&A answer text above, which would otherwise make these ambiguous.
  const courseGrid = page.locator('[class*="courseGrid"]');
  await expect(courseGrid.getByText('Bone Valley', { exact: true })).toBeVisible();
  await expect(courseGrid.getByText('The Chain', { exact: true })).toBeVisible();
  await expect(courseGrid.getByText('Streamsong Blue', { exact: true })).toBeVisible();
  await expect(courseGrid.getByText('Streamsong Red', { exact: true })).toBeVisible();
});
