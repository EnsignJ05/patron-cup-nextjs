import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Phase 4: admin/travel CRUD. Standard create/edit/delete cycle -- no special validation
 * gaps here, just the same class of "UI says success, DB disagrees" risk as every other
 * admin form, now with a wider field set (arrival + departure + transportation).
 */

test('creates, edits, and deletes a player\'s travel info', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Travel Candidate', email: `${runSlug.toLowerCase()}-travel@example.com`, role: 'player', is_active: true })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  registerCleanup(async () => {
    await supabase.from('travel_info').delete().eq('player_id', player.id);
    await supabase.from('players').delete().eq('id', player.id);
  });

  await page.goto('/admin/travel');
  await page.getByRole('button', { name: 'Add Travel Info' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('.MuiFormControl-root', { hasText: 'Player' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Travel Candidate`, exact: true }).click();
  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();

  await dialog.getByLabel('Arrival Date').fill('2099-04-07');
  await dialog.getByLabel('Flight Number').first().fill('AA123');
  await dialog.getByLabel('Departure Date').fill('2099-04-11');
  await dialog.getByLabel('Flight Number').last().fill('AA456');
  await dialog.getByLabel('Needs transportation').click();
  await dialog.getByRole('button', { name: 'Save travel info' }).click();

  await expect(page.getByText('Travel info added successfully')).toBeVisible();

  const { data: afterAdd } = await supabase
    .from('travel_info')
    .select('id, arrival_date, arrival_flight_number, departure_date, departure_flight_number, needs_transportation')
    .eq('player_id', player.id)
    .single();
  if (!afterAdd) throw new Error('Expected a travel_info row after adding it');
  expect(afterAdd.arrival_date).toBe('2099-04-07');
  expect(afterAdd.arrival_flight_number).toBe('AA123');
  expect(afterAdd.departure_date).toBe('2099-04-11');
  expect(afterAdd.departure_flight_number).toBe('AA456');
  expect(afterAdd.needs_transportation).toBe(true);

  const travelRow = page.locator('.ad-row', { hasText: `${runSlug} Travel Candidate` });
  await travelRow.getByRole('button', { name: 'Edit travel info' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel('Needs transportation').click(); // flip back off
  await editDialog.getByRole('button', { name: 'Save travel info' }).click();
  await expect(page.getByText('Travel info updated successfully')).toBeVisible();

  const { data: afterEdit } = await supabase.from('travel_info').select('needs_transportation').eq('id', afterAdd.id).single();
  expect(afterEdit?.needs_transportation).toBe(false);

  const updatedRow = page.locator('.ad-row', { hasText: `${runSlug} Travel Candidate` });
  await updatedRow.getByRole('button', { name: 'Delete travel info' }).click();
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText('Are you sure you want to delete this travel info?')).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(confirmDialog).not.toBeVisible();
  await expect(page.getByText(`${runSlug} Travel Candidate`)).not.toBeVisible();

  const { data: afterRemove } = await supabase.from('travel_info').select('id').eq('id', afterAdd.id).maybeSingle();
  expect(afterRemove).toBeNull();
});
