import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers 3 of the plan's priority items: the two Phase H constraint gaps fixed on this page
 * (end_date >= start_date, the one-active-event guard) and cascade-safe delete-button
 * coverage for events -- the highest blast-radius entity in the app (see e2e/README.md).
 */

test('rejects an end date before the start date with a friendly message, not a raw DB error', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  await page.goto('/admin/events');
  await page.getByRole('button', { name: 'Add Event' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Event Name').fill(`${runSlug} Backwards Dates`);
  await dialog.getByLabel('Year').fill('2099');
  await dialog.getByLabel('City').fill('Testville');
  await dialog.getByLabel('State').fill('TS');
  await dialog.getByLabel('Start Date').fill('2099-06-10');
  await dialog.getByLabel('End Date').fill('2099-06-01'); // before the start date
  await dialog.getByRole('button', { name: 'Save event' }).click();

  await expect(page.getByText('End date must be on or after the start date.')).toBeVisible();
  // Dialog stays open -- the save was rejected client-side, nothing was written.
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  registerCleanup(async () => {
    const supabase = getE2ESupabaseAdminClient();
    await supabase.from('events').delete().ilike('name', `${runSlug}%`);
  });
});

test('rejects activating a second event while one is already active, naming the active one', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent, error } = await supabase.from('events').select('id, name').eq('is_active', true).single();
  if (error || !activeEvent) {
    throw new Error(`Could not resolve the seeded active event: ${error?.message}`);
  }

  await page.goto('/admin/events');
  await page.getByRole('button', { name: 'Add Event' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Event Name').fill(`${runSlug} Second Active Attempt`);
  await dialog.getByLabel('Year').fill('2099');
  await dialog.getByLabel('City').fill('Testville');
  await dialog.getByLabel('State').fill('TS');
  await dialog.getByLabel('Start Date').fill('2099-06-01');
  await dialog.getByLabel('End Date').fill('2099-06-10');
  await dialog.getByLabel('Active event (current/upcoming)').click();
  await dialog.getByRole('button', { name: 'Save event' }).click();

  await expect(page.getByText(`"${activeEvent.name}" is already the active event`)).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  registerCleanup(async () => {
    await supabase.from('events').delete().ilike('name', `${runSlug}%`);
  });

  // The seeded event must still be the only active one -- this test's own attempt must not
  // have snuck through.
  const { data: stillActive } = await supabase.from('events').select('id').eq('is_active', true);
  expect(stillActive).toHaveLength(1);
  expect(stillActive?.[0]?.id).toBe(activeEvent.id);
});

test('deleting an event cascades to its teams and rosters', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const eventName = `${runSlug} Cascade Delete Event`;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      name: eventName,
      year: 2099,
      location_city: 'Testville',
      location_state: 'TS',
      start_date: '2099-01-01',
      end_date: '2099-01-05',
      is_active: false,
    })
    .select('id')
    .single();
  if (eventError || !event) throw new Error(`Failed to create throwaway event: ${eventError?.message}`);

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ event_id: event.id, name: `${runSlug} Cascade Team` })
    .select('id')
    .single();
  if (teamError || !team) throw new Error(`Failed to create throwaway team: ${teamError?.message}`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Cascade Player', email: `${runSlug.toLowerCase()}-cascade@example.com`, role: 'player', is_active: true })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  const { error: rosterError } = await supabase.from('team_rosters').insert({ team_id: team.id, player_id: player.id });
  if (rosterError) throw new Error(`Failed to create throwaway roster entry: ${rosterError.message}`);

  registerCleanup(async () => {
    // Only the player row should still exist post-delete (event/team/roster cascade away);
    // this cleans it up regardless of whether the cascade assertion below ran.
    await supabase.from('players').delete().eq('id', player.id);
    await supabase.from('events').delete().eq('id', event.id); // no-op if already deleted by the test
  });

  await page.goto('/admin/events');
  await expect(page.getByText(eventName)).toBeVisible();
  await page.getByRole('button', { name: `Delete ${eventName}` }).click();

  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText(/This will also delete all associated teams, matches, and other data/)).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  // Wait for the confirm dialog to fully close first -- its own "Are you sure..." text also
  // contains eventName, so checking the table row disappeared while the dialog is still
  // closing is a strict-mode violation (two elements match the same substring).
  await expect(confirmDialog).not.toBeVisible();
  await expect(page.getByText(eventName)).not.toBeVisible();

  const { data: eventAfter } = await supabase.from('events').select('id').eq('id', event.id).maybeSingle();
  const { data: teamAfter } = await supabase.from('teams').select('id').eq('id', team.id).maybeSingle();
  const { data: rosterAfter } = await supabase.from('team_rosters').select('id').eq('team_id', team.id).maybeSingle();
  const { data: playerAfter } = await supabase.from('players').select('id').eq('id', player.id).maybeSingle();

  expect(eventAfter).toBeNull();
  expect(teamAfter).toBeNull();
  expect(rosterAfter).toBeNull();
  expect(playerAfter).not.toBeNull(); // the player themself is NOT cascade-deleted, only the join row
});
