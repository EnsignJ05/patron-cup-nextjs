import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * admin/award-nominations is read-only (the actual nominate action lives on the player-facing
 * /dashboard/award-nominations page) -- this covers its tally/sort/latest-reason logic:
 * multiple nominations for the same nominee tally into one card (sorted most-votes-first),
 * and "latest reason" picks the newest row per nominee, not just the first one inserted.
 */

test('tallies nominations per nominee, sorted by vote count, with the latest reason shown', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const playerRows = [
    { first_name: runSlug, last_name: 'Nominator One', email: `${runSlug.toLowerCase()}-nominator1@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Nominator Two', email: `${runSlug.toLowerCase()}-nominator2@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Nominee Top', email: `${runSlug.toLowerCase()}-nomineetop@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Nominee Single', email: `${runSlug.toLowerCase()}-nomineesingle@example.com`, role: 'player', is_active: true },
  ];
  const { data: createdPlayers, error: playersError } = await supabase.from('players').insert(playerRows).select('id, last_name');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway players: ${playersError?.message}`);
  const byLastName = (name: string) => createdPlayers.find((p) => p.last_name === name)!;
  const nominatorOne = byLastName('Nominator One');
  const nominatorTwo = byLastName('Nominator Two');
  const nomineeTop = byLastName('Nominee Top');
  const nomineeSingle = byLastName('Nominee Single');

  registerCleanup(async () => {
    await supabase.from('ceremony_award_nominations').delete().eq('event_id', activeEvent.id).in('nominated_player_id', [nomineeTop.id, nomineeSingle.id]);
    await supabase.from('players').delete().in('id', createdPlayers.map((p) => p.id));
  });

  // Explicit created_at values guarantee ordering regardless of insert timing -- the admin
  // client bypasses RLS, so these columns are directly settable.
  const { error: nominationsError } = await supabase.from('ceremony_award_nominations').insert([
    {
      event_id: activeEvent.id,
      nominator_player_id: nominatorOne.id,
      nominated_player_id: nomineeTop.id,
      award_key: 'davey_jones_locker',
      reason: `${runSlug} reason A (older)`,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      event_id: activeEvent.id,
      nominator_player_id: nominatorOne.id,
      nominated_player_id: nomineeSingle.id,
      award_key: 'davey_jones_locker',
      reason: `${runSlug} reason B (only one)`,
      created_at: '2026-01-01T00:00:00.500Z',
    },
    {
      event_id: activeEvent.id,
      nominator_player_id: nominatorTwo.id,
      nominated_player_id: nomineeTop.id,
      award_key: 'davey_jones_locker',
      reason: `${runSlug} reason A (newer)`,
      created_at: '2026-01-01T00:00:01Z',
    },
  ]);
  if (nominationsError) throw new Error(`Failed to create throwaway nominations: ${nominationsError.message}`);

  await page.goto('/admin/award-nominations');
  // "Davey Jones' Locker" is AWARD_OPTIONS[0], selected by default -- no chip click needed.

  const topCard = page.locator('.ad-card', { hasText: `${runSlug} Nominee Top` });
  await expect(topCard).toBeVisible();
  await expect(topCard.getByText('2', { exact: true })).toBeVisible();
  await expect(topCard.getByText('Nominations')).toBeVisible();
  await expect(topCard.getByText(`${runSlug} reason A (newer)`)).toBeVisible(); // latest, not the older one

  const singleCard = page.locator('.ad-card', { hasText: `${runSlug} Nominee Single` });
  await expect(singleCard).toBeVisible();
  await expect(singleCard.getByText('1', { exact: true })).toBeVisible();
  await expect(singleCard.getByText('Nomination', { exact: true })).toBeVisible();
  await expect(singleCard.getByText(`${runSlug} reason B (only one)`)).toBeVisible();

  // Sorted most-votes-first: the 2-nomination card renders before the 1-nomination card.
  const cards = page.locator('.ad-card').filter({ hasText: `${runSlug} Nominee` });
  await expect(cards.nth(0)).toContainText(`${runSlug} Nominee Top`);
  await expect(cards.nth(1)).toContainText(`${runSlug} Nominee Single`);
});
