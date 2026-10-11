import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Phase 4: admin/rerounds CRUD. handleDelete() uses a native window.confirm(), same as
 * admin/participants -- needs an accept handler before clicking delete, or Playwright
 * silently cancels it. The Date field is an MUI X DatePicker (typed input, not a plain
 * <input type="date">), so it's filled as text rather than via .fill() on a date input.
 */

test('creates, edits, and deletes a re-round', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: course } = await supabase.from('courses').select('id, name').eq('event_id', activeEvent.id).limit(1).single();
  if (!course) throw new Error('Could not resolve a course for the active event');

  const playerRows = [
    { first_name: runSlug, last_name: 'Reround One', email: `${runSlug.toLowerCase()}-reround1@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Reround Two', email: `${runSlug.toLowerCase()}-reround2@example.com`, role: 'player', is_active: true },
  ];
  const { data: createdPlayers, error: playersError } = await supabase.from('players').insert(playerRows).select('id, last_name');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway players: ${playersError?.message}`);
  const playerOne = createdPlayers.find((p) => p.last_name === 'Reround One')!;
  const playerTwo = createdPlayers.find((p) => p.last_name === 'Reround Two')!;

  registerCleanup(async () => {
    await supabase.from('rerounds').delete().eq('event_id', activeEvent.id).in('player1_id', [playerOne.id]);
    await supabase.from('players').delete().in('id', [playerOne.id, playerTwo.id]);
  });

  await page.goto('/admin/rerounds');
  await page.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();

  await page.getByRole('button', { name: 'Add Re-round' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Course' }).getByRole('combobox').click();
  await page.getByRole('option', { name: course.name, exact: true }).click();

  // MUI X's DatePicker renders a sectioned (not plain-text) field -- there's no single
  // fillable input, just a role="group" wrapping per-segment (month/day/year) spinbuttons.
  // Click into it and type the digits sequentially; the component auto-advances segments.
  await dialog.getByRole('group', { name: 'Date' }).click();
  await page.keyboard.type('04072099');
  await dialog.getByLabel('Tee Time').fill('08:00');

  await dialog.locator('.MuiFormControl-root', { hasText: 'Player 1' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Reround One`, exact: true }).click();
  await dialog.locator('.MuiFormControl-root', { hasText: 'Player 2' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Reround Two`, exact: true }).click();

  await dialog.getByRole('button', { name: 'Save re-round' }).click();
  // Not asserting the players text itself here: on narrow (mobile) viewports the row's
  // player-names span can render with a clipped zero-width visible box (overflow:hidden +
  // white-space:nowrap), the same layout quirk seen on AdminName elsewhere -- genuinely
  // present in the DOM, just not "visible" by Playwright's definition. The dialog closing is
  // proof enough the save completed; the DB read right after is the real assertion.
  await expect(dialog).not.toBeVisible();

  const { data: created } = await supabase
    .from('rerounds')
    .select('id, course_id, reround_date, reround_time, player1_id, player2_id, player3_id, player4_id')
    .eq('event_id', activeEvent.id)
    .eq('player1_id', playerOne.id)
    .single();
  expect(created?.course_id).toBe(course.id);
  expect(created?.reround_date).toBe('2099-04-07');
  expect(created?.player2_id).toBe(playerTwo.id);
  expect(created?.player3_id).toBeNull();
  expect(created?.player4_id).toBeNull();

  const reroundRow = page.locator('.ad-row.hover', { hasText: `${runSlug} Reround One, ${runSlug} Reround Two` });
  await reroundRow.getByRole('button', { name: 'Edit re-round' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel('Tee Time').fill('09:30');
  await editDialog.getByRole('button', { name: 'Save re-round' }).click();
  await expect(editDialog).not.toBeVisible();

  const { data: afterEdit } = await supabase.from('rerounds').select('reround_time').eq('id', created!.id).single();
  expect(afterEdit?.reround_time).toBe('09:30:00');

  page.once('dialog', (d) => d.accept());
  const updatedRow = page.locator('.ad-row.hover', { hasText: `${runSlug} Reround One, ${runSlug} Reround Two` });
  await updatedRow.getByRole('button', { name: 'Delete re-round' }).click();
  await expect(page.getByText(`${runSlug} Reround One, ${runSlug} Reround Two`)).not.toBeVisible();

  const { data: afterDelete } = await supabase.from('rerounds').select('id').eq('id', created!.id).maybeSingle();
  expect(afterDelete).toBeNull();
});
