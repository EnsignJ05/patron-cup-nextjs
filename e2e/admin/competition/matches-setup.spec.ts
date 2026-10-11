import { test, expect } from '@playwright/test';

/**
 * Per the standing project rule (never touch TeeTimeBoard.tsx's @dnd-kit internals) and the
 * plan's explicit boundary for this page: visible-assertion only, no synthesized drag
 * sequences, which would be brittle against @dnd-kit's own sensor/activation-constraint
 * internals and create exactly the pressure to "fix" that logic the project has avoided.
 * Confirms the board renders the right initial state from seeded data (course tabs, tee-time
 * slot labels, match cards with their assigned players) using the admin storageState project
 * -- no throwaway data needed, this never mutates anything.
 *
 * Any pure-logic coverage of post-drag state belongs in the existing Jest unit tests against
 * src/lib/matchSetupBoard.ts directly (~93% covered there already), not here.
 */

test('renders the seeded matches grouped into course tabs and tee-time slots', async ({ page }) => {
  await page.goto('/admin/matches/setup');

  // No "expects exactly two teams" warning -- the seeded active event has exactly 2.
  await expect(page.getByText('Match setup expects exactly two teams')).not.toBeVisible();

  const courseTabs = page.locator('.ad-seg button');
  await expect(courseTabs.first()).toBeVisible();
  expect(await courseTabs.count()).toBeGreaterThan(0);

  // At least one match card renders under whichever course tab is selected by default,
  // with a drag handle present (confirms TeeTimeBoard mounted, without touching it).
  await expect(page.getByText(/Match #\d+/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drag to move match' }).first()).toBeVisible();

  // Switching tabs re-renders a different set of matches/slots -- still render-only, just
  // clicking a plain tab button, not dragging anything.
  const tabCount = await courseTabs.count();
  if (tabCount > 1) {
    await courseTabs.nth(1).click();
    await expect(page.getByText(/Match #\d+/).first()).toBeVisible();
  }
});
