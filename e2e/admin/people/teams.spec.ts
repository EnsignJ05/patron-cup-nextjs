import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Phase 4, priority item #9: team roster + captain management. Multi-table writes across
 * team_rosters and team_captains, including removeFromRoster() also clearing a captain
 * designation -- a player taken off the roster can't stay captain, and that's enforced in
 * app code, not a DB constraint, so it's worth a direct assertion.
 *
 * Builds its own throwaway event/team rather than touching the seeded teams, same
 * cascade-safety convention as every other spec that creates/deletes teams.
 */

test('creates and edits a team', async ({ page, runSlug, registerCleanup }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const teamName = `${runSlug} Crud Team`;
  registerCleanup(async () => {
    await supabase.from('teams').delete().ilike('name', `${runSlug}%`);
  });

  await page.goto('/admin/teams');
  await page.getByRole('button', { name: 'Add Team' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();
  await dialog.getByLabel('Team Name').fill(teamName);
  await dialog.getByLabel('Team Color').fill('Teal');
  await dialog.getByRole('button', { name: 'Save team' }).click();
  await expect(page.getByText('Team added successfully')).toBeVisible();

  const { data: created } = await supabase.from('teams').select('id, color').eq('name', teamName).single();
  expect(created?.color).toBe('Teal');

  const teamRow = page.locator('.ad-row', { hasText: teamName });
  await teamRow.getByRole('button', { name: `Edit ${teamName}` }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.getByLabel('Team Color').fill('Crimson');
  await editDialog.getByRole('button', { name: 'Save team' }).click();
  await expect(page.getByText('Team updated successfully')).toBeVisible();

  const { data: edited } = await supabase.from('teams').select('color').eq('id', created!.id).single();
  expect(edited?.color).toBe('Crimson');
});

test('adding a player to the roster, making them captain, then removing them clears the captaincy too', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const teamName = `${runSlug} Roster Team`;
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ event_id: activeEvent.id, name: teamName })
    .select('id')
    .single();
  if (teamError || !team) throw new Error(`Failed to create throwaway team: ${teamError?.message}`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Roster Candidate', email: `${runSlug.toLowerCase()}-roster@example.com`, role: 'player', is_active: true })
    .select('id, current_handicap')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  registerCleanup(async () => {
    await supabase.from('team_rosters').delete().eq('team_id', team.id);
    await supabase.from('team_captains').delete().eq('team_id', team.id);
    await supabase.from('teams').delete().eq('id', team.id);
    await supabase.from('players').delete().eq('id', player.id);
  });

  await page.goto('/admin/teams');
  const teamRow = page.locator('.ad-row', { hasText: teamName });
  await expect(teamRow).toBeVisible();
  await teamRow.getByRole('button', { name: `Manage roster for ${teamName}` }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The MUI Select's combobox has no accessible name wired to its "Select Player" label
  // (same gap seen on admin/lodging's Player picker) -- it's the only combobox in this
  // dialog, so an unscoped role lookup is unambiguous.
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Roster Candidate (HCP: N/A)` }).click();
  await dialog.getByLabel('Handicap at Event').fill('12.3');
  await dialog.getByRole('button', { name: 'Add' }).click();

  // Not waiting on the player's name text here -- the Select itself displays the chosen
  // option's own label (which also contains that name) the instant it's picked, well before
  // "Add" is even clicked, so it proves nothing about the mutation completing. "Current
  // roster (1)" only changes once the post-add refetch actually lands.
  await expect(dialog.getByText('Current roster (1)')).toBeVisible();

  const { data: rosterAfterAdd } = await supabase
    .from('team_rosters')
    .select('id, handicap_at_event')
    .eq('team_id', team.id)
    .eq('player_id', player.id)
    .single();
  expect(rosterAfterAdd?.handicap_at_event).toBe(12.3);

  const rosterRow = dialog.locator('.ad-row:not(.head)', { hasText: `${runSlug} Roster Candidate` });
  await rosterRow.getByRole('button', { name: 'Make captain' }).click();
  await expect(rosterRow.getByRole('button', { name: '★ Captain' })).toBeVisible();

  const { data: captainAfterToggle } = await supabase
    .from('team_captains')
    .select('id, is_primary')
    .eq('team_id', team.id)
    .eq('player_id', player.id)
    .maybeSingle();
  expect(captainAfterToggle).not.toBeNull();
  expect(captainAfterToggle?.is_primary).toBe(false);

  await rosterRow.getByRole('button', { name: 'Remove from roster' }).click();
  await expect(dialog.getByText('No players on roster.')).toBeVisible();

  const { data: rosterAfterRemove } = await supabase
    .from('team_rosters')
    .select('id')
    .eq('team_id', team.id)
    .eq('player_id', player.id)
    .maybeSingle();
  const { data: captainAfterRemove } = await supabase
    .from('team_captains')
    .select('id')
    .eq('team_id', team.id)
    .eq('player_id', player.id)
    .maybeSingle();
  expect(rosterAfterRemove).toBeNull();
  expect(captainAfterRemove).toBeNull(); // app-level cleanup, not a DB cascade -- worth asserting directly
});

test('deleting a team cascades its roster and captain assignments, but not the players themselves', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const teamName = `${runSlug} Cascade Delete Team`;
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ event_id: activeEvent.id, name: teamName })
    .select('id')
    .single();
  if (teamError || !team) throw new Error(`Failed to create throwaway team: ${teamError?.message}`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name: runSlug, last_name: 'Team Delete Player', email: `${runSlug.toLowerCase()}-teamdelete@example.com`, role: 'player', is_active: true })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  const { error: rosterError } = await supabase.from('team_rosters').insert({ team_id: team.id, player_id: player.id });
  if (rosterError) throw new Error(`Failed to create throwaway roster entry: ${rosterError.message}`);
  const { error: captainError } = await supabase.from('team_captains').insert({ team_id: team.id, player_id: player.id, is_primary: true });
  if (captainError) throw new Error(`Failed to create throwaway captain entry: ${captainError.message}`);

  registerCleanup(async () => {
    await supabase.from('players').delete().eq('id', player.id);
    await supabase.from('teams').delete().eq('id', team.id); // no-op if already deleted by the test
  });

  await page.goto('/admin/teams');
  const teamRow = page.locator('.ad-row', { hasText: teamName });
  await expect(teamRow).toBeVisible();
  await teamRow.getByRole('button', { name: `Delete ${teamName}` }).click();

  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText('This will also remove all roster assignments.')).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(confirmDialog).not.toBeVisible();
  await expect(page.getByText(teamName)).not.toBeVisible();

  const { data: teamAfter } = await supabase.from('teams').select('id').eq('id', team.id).maybeSingle();
  const { data: rosterAfter } = await supabase.from('team_rosters').select('id').eq('team_id', team.id).maybeSingle();
  const { data: captainAfter } = await supabase.from('team_captains').select('id').eq('team_id', team.id).maybeSingle();
  const { data: playerAfter } = await supabase.from('players').select('id').eq('id', player.id).maybeSingle();

  expect(teamAfter).toBeNull();
  expect(rosterAfter).toBeNull();
  expect(captainAfter).toBeNull();
  expect(playerAfter).not.toBeNull();
});
