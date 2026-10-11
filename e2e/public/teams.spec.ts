import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/** Phase 5: public/read-only. /teams has no filters/search, just renders both seeded teams
 * and their rosters -- a straightforward render-matches-seeded-data check. */

test('shows both seeded teams with their correct roster counts', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: teams } = await supabase.from('teams').select('id, name').eq('event_id', activeEvent.id).order('name');
  if (!teams || teams.length < 2) throw new Error('Expected at least 2 seeded teams');

  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();

  for (const team of teams) {
    const { data: roster, error } = await supabase.from('team_rosters').select('id').eq('team_id', team.id);
    if (error) throw new Error(`Failed to resolve roster count for ${team.name}: ${error.message}`);

    const card = page.locator('[class*="teamCard"]', { hasText: team.name });
    await expect(card).toBeVisible();
    await expect(card.locator('[class*="teamCount"]')).toHaveText(String(roster?.length ?? 0));
  }
});
