import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers the lodging half of the plan's priority list: the check_out_date >= check_in_date
 * validation fix, and the room-assignment save now going through set_lodging_assignments()
 * (an atomic RPC) instead of an unguarded client-side delete-then-insert.
 *
 * Not attempted: directly forcing a mid-transaction insert failure to prove atomicity --
 * the client already blocks the one failure mode reachable through the UI (assigning the
 * same player to two slots), so there's no black-box way to trigger a genuine insert error
 * without an artificial DB-level fault injection, which would be fragile for little value.
 * Instead this proves the RPC does a correct full replace across an edit cycle, which is the
 * behavior that actually matters day to day.
 *
 * Doesn't exercise the confirmation-number field: page.module.css's mobile breakpoint hides
 * that column (and the primary-guest toggle) entirely via display: none, a separate,
 * pre-existing mobile UX gap unrelated to what this spec covers. Keeping this test
 * viewport-agnostic by only touching the player-select and clear-slot columns, which are
 * visible on both.
 */

test('rejects a check-out date before check-in with a friendly message', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();

  await page.goto('/admin/lodging');
  await page.getByRole('button', { name: 'Add Room' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Building Name').fill(`${runSlug} Lodge`);
  await dialog.getByLabel('Room Number').fill('101');
  await dialog.getByLabel('Bedrooms').fill('1');
  await dialog.getByLabel('Number of People').fill('2');
  await dialog.getByLabel('Check-in Date').fill('2099-06-10');
  await dialog.getByLabel('Check-out Date').fill('2099-06-01'); // before check-in

  // The Save button disables itself reactively the moment validationErrors is non-empty --
  // there's no separate click-then-reject step to test here, the UI never lets this through.
  await expect(dialog.getByText('Check-out date must be on or after check-in date')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save room' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  registerCleanup(async () => {
    if (activeEvent) {
      await supabase.from('lodging').delete().eq('event_id', activeEvent.id).ilike('building_name', `${runSlug}%`);
    }
  });
});

test('saving room assignments replaces the prior set exactly (atomic via the RPC)', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent, error: eventError } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (eventError || !activeEvent) throw new Error(`Could not resolve the seeded active event: ${eventError?.message}`);

  const { data: lodging, error: lodgingError } = await supabase
    .from('lodging')
    .insert({
      event_id: activeEvent.id,
      building_name: `${runSlug} Lodge`,
      room_number: '101',
      bedrooms: 1,
      num_of_people: 2,
    })
    .select('id')
    .single();
  if (lodgingError || !lodging) throw new Error(`Failed to create throwaway lodging: ${lodgingError?.message}`);

  const playerRows = [
    { first_name: runSlug, last_name: 'Guest One', email: `${runSlug.toLowerCase()}-guest1@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Guest Two', email: `${runSlug.toLowerCase()}-guest2@example.com`, role: 'player', is_active: true },
  ];
  const { data: createdPlayers, error: playersError } = await supabase.from('players').insert(playerRows).select('id, last_name');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway players: ${playersError?.message}`);
  const guestOne = createdPlayers.find((p) => p.last_name === 'Guest One')!;
  const guestTwo = createdPlayers.find((p) => p.last_name === 'Guest Two')!;

  registerCleanup(async () => {
    await supabase.from('lodging_assignments').delete().eq('lodging_id', lodging.id);
    await supabase.from('lodging').delete().eq('id', lodging.id);
    await supabase.from('players').delete().in('id', [guestOne.id, guestTwo.id]);
  });

  await page.goto('/admin/lodging');
  const roomRow = page.locator('.ad-row', { hasText: `${runSlug} Lodge` });
  await expect(roomRow).toBeVisible();
  await roomRow.getByRole('button', { name: 'Manage guests' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const slotRows = dialog.locator('.ad-row:not(.head)');
  await slotRows.nth(0).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Guest One` }).click();

  await slotRows.nth(1).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Guest Two` }).click();

  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Room assignments saved')).toBeVisible();

  const { data: afterFirstSave } = await supabase
    .from('lodging_assignments')
    .select('player_id, confirmation_num')
    .eq('lodging_id', lodging.id);
  expect(afterFirstSave).toHaveLength(2);
  expect(afterFirstSave?.map((a) => a.player_id).sort()).toEqual([guestOne.id, guestTwo.id].sort());

  // Edit cycle: replace Guest Two with an empty slot, keep Guest One. The RPC should leave
  // exactly one assignment afterward, not two (a non-atomic delete-then-insert could in
  // principle leave stale rows if an intermediate step silently failed). The dialog never
  // closes on a successful save (openAssignmentsDialog() just re-fetches in place), so it's
  // already open with fresh data -- no need to reopen it. The refetch has no explicit
  // ORDER BY, so slot order isn't guaranteed to match what was just typed -- find Guest
  // Two's row by its own displayed name instead of assuming it's still at index 1.
  const guestTwoRow = dialog.locator('.ad-row:not(.head)', { hasText: `${runSlug} Guest Two` });
  await guestTwoRow.getByRole('button', { name: 'Clear slot' }).click();

  // The success Alert from the first save doesn't auto-dismiss, so asserting its text is
  // visible again wouldn't prove a second save actually happened -- confirm the Save button
  // actually re-armed (hasUnsavedAssignmentChanges) before relying on the click doing anything.
  const saveButton = dialog.getByRole('button', { name: 'Save changes' });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(saveButton).toBeDisabled(); // re-disables once the save completes and re-syncs

  await expect(dialog.getByText(`${runSlug} Guest Two`)).not.toBeVisible();

  const { data: afterSecondSave } = await supabase
    .from('lodging_assignments')
    .select('player_id, confirmation_num')
    .eq('lodging_id', lodging.id);
  expect(afterSecondSave).toHaveLength(1);
  expect(afterSecondSave?.[0]?.player_id).toBe(guestOne.id);
});
