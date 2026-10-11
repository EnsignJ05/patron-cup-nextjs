import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers the admin-only half of the public /matches page: the "Export Handicaps" button
 * (isAdminRole(role)-gated, even though the page itself is public) only renders for an
 * admin/committee viewer, and its CSV export has the same UTF-8 BOM every other CSV export
 * in this app has.
 *
 * Found while writing this spec: this export's Blob was built from the raw csv string with
 * no leading BOM at all -- the other two exports (admin/handicaps, admin/matches/setup) both
 * prepend a BOM. Fixed directly in src/app/matches/page.tsx (one-line change, same pattern
 * as the other two call sites) rather than just documenting the gap, consistent with this
 * session's "fix as I go" approach to adjacent findings. That fix needs to be deployed
 * before this spec's BOM assertion will pass against the deployed site.
 */

test('admin sees the Export Handicaps button, and its CSV has a UTF-8 BOM', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  await page.goto('/matches');

  const exportButton = page.getByRole('button', { name: 'Export Handicaps' });
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

  const path = await download.path();
  if (!path) throw new Error('Download did not save to a local path');
  const buffer = await readFile(path);

  expect([...buffer.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text.split('\r\n');
  expect(lines[0].split(',')).toEqual([
    'event_name',
    'event_year',
    'course_name',
    'match_date',
    'match_time',
    'group_number',
    'match_number',
    'match_type',
    'team_name',
    'player_name',
    'official_event_handicap',
    'course_handicap',
    'strokes_given',
  ]);
  // At least one real data row beyond the header, for the seeded active event.
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[1].split(',')[1]).toBe(String(activeEvent.year));
});

test('a signed-out visitor never sees the Export Handicaps button', async ({ browser }) => {
  // storageState: undefined explicitly overrides this project's default (admin.json) --
  // see e2e/player/player-profile.spec.ts for why a bare browser.newContext() isn't
  // actually anonymous here otherwise.
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto('/matches');
  await expect(page.getByRole('button', { name: 'Export Handicaps' })).not.toBeVisible();
  await context.close();
});
