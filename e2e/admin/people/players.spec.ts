import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #4's other half: the player-delete cascade. events.spec.ts already
 * covers the event-delete cascade (teams/rosters); this covers the cascade rooted at a
 * player instead, which fans out across every table that references players.id --
 * team_rosters, team_captains, match_players, travel_info, lodging_assignments,
 * event_participants, and ceremony_award_nominations (both its nominator and nominated FKs).
 * All seven are confirmed ON DELETE CASCADE in the baseline schema.
 *
 * Builds its own throwaway event/team/course/match/lodging subtree rather than touching the
 * seeded dataset, same cascade-safety rule as events.spec.ts's delete test. A second throwaway
 * "helper" player fills the nomination's nominator_player_id slot so the nomination row exists
 * without being deleted itself when the main throwaway player goes -- it's cleaned up
 * separately in registerCleanup.
 */

test('deleting a player cascades to every table that references it, and nothing else', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      name: `${runSlug} Player Cascade Event`,
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

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({ event_id: event.id, name: `${runSlug} Course` })
    .select('id')
    .single();
  if (courseError || !course) throw new Error(`Failed to create throwaway course: ${courseError?.message}`);

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      event_id: event.id,
      match_number: 1,
      course_id: course.id,
      match_date: '2099-01-02',
      match_type: 'Head to Head',
    })
    .select('id')
    .single();
  if (matchError || !match) throw new Error(`Failed to create throwaway match: ${matchError?.message}`);

  const { data: lodging, error: lodgingError } = await supabase
    .from('lodging')
    .insert({ event_id: event.id, building_name: `${runSlug} Lodge`, room_number: '101', bedrooms: 1, num_of_people: 2 })
    .select('id')
    .single();
  if (lodgingError || !lodging) throw new Error(`Failed to create throwaway lodging: ${lodgingError?.message}`);

  const playerRows = [
    { first_name: runSlug, last_name: 'Cascade Target', email: `${runSlug.toLowerCase()}-target@example.com`, role: 'player', is_active: true },
    { first_name: runSlug, last_name: 'Cascade Helper', email: `${runSlug.toLowerCase()}-helper@example.com`, role: 'player', is_active: true },
  ];
  const { data: createdPlayers, error: playersError } = await supabase.from('players').insert(playerRows).select('id, last_name');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway players: ${playersError?.message}`);
  const targetPlayer = createdPlayers.find((p) => p.last_name === 'Cascade Target')!;
  const helperPlayer = createdPlayers.find((p) => p.last_name === 'Cascade Helper')!;

  const { error: rosterError } = await supabase.from('team_rosters').insert({ team_id: team.id, player_id: targetPlayer.id });
  if (rosterError) throw new Error(`Failed to create throwaway roster entry: ${rosterError.message}`);

  const { error: captainError } = await supabase.from('team_captains').insert({ team_id: team.id, player_id: targetPlayer.id, is_primary: true });
  if (captainError) throw new Error(`Failed to create throwaway captain entry: ${captainError.message}`);

  const { error: matchPlayerError } = await supabase
    .from('match_players')
    .insert({ match_id: match.id, player_id: targetPlayer.id, team_id: team.id });
  if (matchPlayerError) throw new Error(`Failed to create throwaway match_players entry: ${matchPlayerError.message}`);

  const { error: travelError } = await supabase.from('travel_info').insert({ player_id: targetPlayer.id, event_id: event.id });
  if (travelError) throw new Error(`Failed to create throwaway travel_info entry: ${travelError.message}`);

  const { error: lodgingAssignmentError } = await supabase
    .from('lodging_assignments')
    .insert({ lodging_id: lodging.id, player_id: targetPlayer.id });
  if (lodgingAssignmentError) throw new Error(`Failed to create throwaway lodging_assignments entry: ${lodgingAssignmentError.message}`);

  const { error: participantError } = await supabase.from('event_participants').insert({ event_id: event.id, player_id: targetPlayer.id });
  if (participantError) throw new Error(`Failed to create throwaway event_participants entry: ${participantError.message}`);

  const { error: nominationError } = await supabase.from('ceremony_award_nominations').insert({
    event_id: event.id,
    nominator_player_id: helperPlayer.id,
    nominated_player_id: targetPlayer.id,
    award_key: 'davey_jones_locker',
    reason: `${runSlug} cascade test nomination`,
  });
  if (nominationError) throw new Error(`Failed to create throwaway nomination entry: ${nominationError.message}`);

  registerCleanup(async () => {
    // Only the event (cascades team/course/match/lodging and everything rooted at them) and
    // the helper player should still need cleanup -- the target player and its own rows are
    // expected to already be gone via the UI delete this test performs.
    await supabase.from('events').delete().eq('id', event.id);
    await supabase.from('players').delete().in('id', [targetPlayer.id, helperPlayer.id]);
  });

  await page.goto('/admin/players');
  await page.getByPlaceholder('Search players').fill(runSlug);
  // Not asserting the rendered name text directly: AdminName's name div is
  // white-space:nowrap + overflow:hidden, which on the mobile grid's tight column track can
  // collapse its visible box to zero width -- a layout-clipping quirk, not a missing row. The
  // delete button (a plain icon button, unaffected by that clipping) is the reliable presence
  // check, and its accessible name already carries the full player name.
  const deleteButton = page.getByRole('button', { name: `Delete ${runSlug} Cascade Target` });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText(`Are you sure you want to delete ${runSlug} Cascade Target?`)).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(confirmDialog).not.toBeVisible();
  await expect(page.getByText(`${runSlug} Cascade Target`)).not.toBeVisible();

  const { data: playerAfter } = await supabase.from('players').select('id').eq('id', targetPlayer.id).maybeSingle();
  expect(playerAfter).toBeNull();

  const [rosterAfter, captainAfter, matchPlayerAfter, travelAfter, lodgingAssignmentAfter, participantAfter, nominationAfter] = await Promise.all([
    supabase.from('team_rosters').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('team_captains').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('match_players').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('travel_info').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('lodging_assignments').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('event_participants').select('id').eq('player_id', targetPlayer.id).maybeSingle(),
    supabase.from('ceremony_award_nominations').select('id').eq('nominated_player_id', targetPlayer.id).maybeSingle(),
  ]);

  expect(rosterAfter.data).toBeNull();
  expect(captainAfter.data).toBeNull();
  expect(matchPlayerAfter.data).toBeNull();
  expect(travelAfter.data).toBeNull();
  expect(lodgingAssignmentAfter.data).toBeNull();
  expect(participantAfter.data).toBeNull();
  expect(nominationAfter.data).toBeNull();

  // The event/team/course/match/lodging subtree itself must survive -- only the player's own
  // rows should cascade away, not the entities the player was merely attached to.
  const { data: eventAfter } = await supabase.from('events').select('id').eq('id', event.id).maybeSingle();
  const { data: teamAfter } = await supabase.from('teams').select('id').eq('id', team.id).maybeSingle();
  const { data: helperAfter } = await supabase.from('players').select('id').eq('id', helperPlayer.id).maybeSingle();
  expect(eventAfter).not.toBeNull();
  expect(teamAfter).not.toBeNull();
  expect(helperAfter).not.toBeNull();
});
