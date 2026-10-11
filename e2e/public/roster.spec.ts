import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Phase 5: public/read-only pages, lowest risk and last per the plan -- the selector/
 * fixture patterns are fully settled by now. Read-only against the seeded dataset itself
 * (no throwaway data, nothing to clean up), with values resolved dynamically via the admin
 * client rather than hardcoded, so this doesn't silently stop meaning anything if the seed
 * data changes later.
 */

test('shows both seeded teams with correct member counts, and search/segment filters work', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: teams } = await supabase.from('teams').select('id, name').eq('event_id', activeEvent.id).order('name');
  if (!teams || teams.length < 2) throw new Error('Expected at least 2 seeded teams');
  const [teamA, teamB] = teams;

  const { data: teamAPlayers } = await supabase
    .from('team_rosters')
    .select('player:players(first_name, last_name)')
    .eq('team_id', teamA.id);
  const firstPlayer = (teamAPlayers?.[0]?.player as unknown as { first_name: string; last_name: string } | null);
  if (!firstPlayer) throw new Error(`Expected at least one roster entry on ${teamA.name}`);

  await page.goto('/roster');
  await expect(page.getByRole('heading', { name: 'Roster' })).toBeVisible();

  const teamACard = page.locator('[class*="teamSummaryCard"]', { hasText: teamA.name });
  const teamBCard = page.locator('[class*="teamSummaryCard"]', { hasText: teamB.name });
  await expect(teamACard).toBeVisible();
  await expect(teamBCard).toBeVisible();

  // Segment filter: clicking a team shows only that team's roster.
  await page.getByRole('button', { name: new RegExp(`^${teamA.name}`) }).click();
  await expect(page.getByText(`${firstPlayer.first_name} ${firstPlayer.last_name}`)).toBeVisible();
  if (teams.length === 2) {
    const { data: teamBPlayers } = await supabase
      .from('team_rosters')
      .select('player:players(first_name, last_name)')
      .eq('team_id', teamB.id);
    const teamBFirstPlayer = teamBPlayers?.[0]?.player as unknown as { first_name: string; last_name: string } | null;
    if (teamBFirstPlayer) {
      await expect(page.getByText(`${teamBFirstPlayer.first_name} ${teamBFirstPlayer.last_name}`)).not.toBeVisible();
    }
  }

  // Back to "All", then search narrows to just the matching player.
  await page.getByRole('button', { name: /^All/ }).click();
  await page.getByPlaceholder('Search players...').fill(firstPlayer.last_name);
  await expect(page.getByText(`${firstPlayer.first_name} ${firstPlayer.last_name}`)).toBeVisible();
  await expect(page.getByText('No players found')).not.toBeVisible();

  // Not clicking through to the player's own profile here -- /players/[playerId] is gated
  // behind auth (see S3 in project memory; an anon click bounces to /login?next=...), even
  // though the roster list itself is public. That redirect gets its own coverage in
  // e2e/player/player-profile.spec.ts instead.
});
