import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #10: handicap + GHIN inline edits. Each field saves on blur (Enter
 * triggers a programmatic blur) rather than via a Save button -- many small per-row writes
 * across team_rosters (handicap_at_event) and players (ghin_number/ghin_club). None of the
 * three inline TextFields has a `label` prop (no accessible name), so they're located by
 * role within the specific row rather than by label text.
 */

test('editing a roster row\'s handicap and GHIN fields saves each one independently on blur', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ event_id: activeEvent.id, name: `${runSlug} Handicap Team` })
    .select('id')
    .single();
  if (teamError || !team) throw new Error(`Failed to create throwaway team: ${teamError?.message}`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Handicap Candidate', email: `${runSlug.toLowerCase()}-handicap@example.com`, role: 'player', is_active: true })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  const { data: roster, error: rosterError } = await supabase
    .from('team_rosters')
    .insert({ team_id: team.id, player_id: player.id })
    .select('id')
    .single();
  if (rosterError || !roster) throw new Error(`Failed to create throwaway roster entry: ${rosterError?.message}`);

  registerCleanup(async () => {
    await supabase.from('team_rosters').delete().eq('id', roster.id);
    await supabase.from('players').delete().eq('id', player.id);
    await supabase.from('teams').delete().eq('id', team.id);
  });

  await page.goto('/admin/handicaps');
  const searchInput = page.getByPlaceholder('Search players');
  await searchInput.fill(runSlug);

  // Filtering by team name, not the player's full name: first_name/last_name are separate
  // sibling <span>s with no literal space between them in JSX, so textContent concatenates
  // to "E2E-xxxxHandicap Candidate" with no space -- a plain-string hasText filter with a
  // space in it would never match. The team-name badge is one uninterrupted string, so it's
  // unambiguous.
  const row = page.locator('.ad-row.hover', { hasText: `${runSlug} Handicap Team` });
  await expect(row).toBeVisible();

  await row.getByRole('spinbutton').fill('15.4');
  await row.getByRole('spinbutton').press('Enter');
  await expect(page.getByText('Handicap updated.')).toBeVisible();

  const { data: afterHandicap } = await supabase.from('team_rosters').select('handicap_at_event').eq('id', roster.id).single();
  expect(afterHandicap?.handicap_at_event).toBe(15.4);

  const rowAfterHandicap = page.locator('.ad-row.hover', { hasText: `${runSlug} Handicap Team` });
  const ghinNumberField = rowAfterHandicap.getByRole('textbox').nth(0);
  await ghinNumberField.fill('1234567');
  await ghinNumberField.press('Enter');
  await expect(page.getByText('GHIN details updated.')).toBeVisible();

  const { data: afterGhinNumber } = await supabase.from('players').select('ghin_number, ghin_club').eq('id', player.id).single();
  expect(afterGhinNumber?.ghin_number).toBe('1234567');

  const rowAfterGhinNumber = page.locator('.ad-row.hover', { hasText: `${runSlug} Handicap Team` });
  const ghinClubField = rowAfterGhinNumber.getByRole('textbox').nth(1);
  await ghinClubField.fill('Pacific Dunes GC');
  await ghinClubField.press('Enter');

  // Not re-checking the "GHIN details updated." toast here -- it's the exact same text as
  // the ghinNumber save above, which doesn't auto-dismiss, so it would already be sitting on
  // screen regardless of whether this second save has actually completed. Poll the DB value
  // itself instead, which is unambiguous either way.
  await expect
    .poll(async () => {
      const { data } = await supabase.from('players').select('ghin_club').eq('id', player.id).single();
      return data?.ghin_club;
    }, { timeout: 5_000 })
    .toBe('Pacific Dunes GC');

  const { data: afterGhinClub } = await supabase.from('players').select('ghin_number, ghin_club').eq('id', player.id).single();
  expect(afterGhinClub?.ghin_number).toBe('1234567'); // the earlier field's save must survive this one
  expect(afterGhinClub?.ghin_club).toBe('Pacific Dunes GC');
});
