import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Phase 4: admin/participants CRUD, including the single-add/edit/status-toggle/remove cycle
 * and the bulk-add path. handleDelete() uses a native window.confirm(), not a MUI dialog --
 * Playwright auto-dismisses unhandled native dialogs, which would silently abort the delete,
 * so every delete here registers an accept handler first.
 */

test('adds a participant, toggles confirmed status, edits notes, then removes them', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Participant Candidate', email: `${runSlug.toLowerCase()}-participant@example.com`, role: 'player', is_active: true })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  registerCleanup(async () => {
    await supabase.from('event_participants').delete().eq('player_id', player.id);
    await supabase.from('players').delete().eq('id', player.id);
  });

  await page.goto('/admin/participants');
  await page.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();

  const addButton = page.getByRole('button', { name: 'Add Participant' });
  await expect(addButton).toBeEnabled();
  await addButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The Player Select has no accessible name wired to its "Player" label (same gap as
  // admin/lodging's and admin/teams' Select pickers), and the Status Select in the same
  // dialog is also an unnamed combobox, so scope by the FormControl container instead.
  await dialog.locator('.MuiFormControl-root', { hasText: 'Player' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Participant Candidate (Hdcp: N/A)` }).click();
  await dialog.getByLabel('Notes').fill('Needs a cart');
  await dialog.getByRole('button', { name: 'Save participant' }).click();

  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(`${runSlug} Participant Candidate`)).toBeVisible();

  const { data: afterAdd } = await supabase
    .from('event_participants')
    .select('id, status, notes')
    .eq('event_id', activeEvent.id)
    .eq('player_id', player.id)
    .single();
  if (!afterAdd) throw new Error('Expected an event_participants row after adding the participant');
  expect(afterAdd.status).toBe('registered');
  expect(afterAdd.notes).toBe('Needs a cart');

  const participantRow = page.locator('.ad-row', { hasText: `${runSlug} Participant Candidate` });
  await participantRow.getByRole('button', { name: 'Pending' }).click();
  await expect(participantRow.getByRole('button', { name: 'Confirmed' })).toBeVisible();

  const { data: afterConfirm } = await supabase.from('event_participants').select('status').eq('id', afterAdd.id).single();
  expect(afterConfirm?.status).toBe('confirmed');

  await participantRow.getByRole('button', { name: 'Edit participant' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel('Notes').fill('Needs a cart and extra balls');
  await editDialog.getByRole('button', { name: 'Save participant' }).click();
  await expect(editDialog).not.toBeVisible();

  const { data: afterEdit } = await supabase.from('event_participants').select('notes').eq('id', afterAdd.id).single();
  expect(afterEdit?.notes).toBe('Needs a cart and extra balls');

  page.once('dialog', (d) => d.accept());
  await participantRow.getByRole('button', { name: 'Remove participant' }).click();
  await expect(page.getByText(`${runSlug} Participant Candidate`)).not.toBeVisible();

  const { data: afterRemove } = await supabase.from('event_participants').select('id').eq('id', afterAdd.id).maybeSingle();
  expect(afterRemove).toBeNull();
});

test('bulk-adds multiple players as participants in one action', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const playerRows = [
    { first_name: runSlug, last_name: 'Bulk One', email: `${runSlug.toLowerCase()}-bulk1@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Bulk Two', email: `${runSlug.toLowerCase()}-bulk2@example.com`, role: 'player', is_active: true },
  ];
  const { data: createdPlayers, error: playersError } = await supabase.from('players').insert(playerRows).select('id');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway players: ${playersError?.message}`);
  const playerIds = createdPlayers.map((p) => p.id);

  registerCleanup(async () => {
    await supabase.from('event_participants').delete().in('player_id', playerIds);
    await supabase.from('players').delete().in('id', playerIds);
  });

  await page.goto('/admin/participants');
  await page.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();

  const bulkButton = page.getByRole('button', { name: 'Bulk Add' });
  await expect(bulkButton).toBeEnabled();
  await bulkButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(`${runSlug} Bulk One (Hdcp: N/A)`).check();
  await dialog.getByLabel(`${runSlug} Bulk Two (Hdcp: N/A)`).check();
  await dialog.getByRole('button', { name: 'Add 2 Players' }).click();

  await expect(dialog).not.toBeVisible();

  const { data: afterBulk } = await supabase
    .from('event_participants')
    .select('player_id, status')
    .eq('event_id', activeEvent.id)
    .in('player_id', playerIds);
  expect(afterBulk).toHaveLength(2);
  for (const row of afterBulk ?? []) {
    expect(row.status).toBe('registered');
  }
});
