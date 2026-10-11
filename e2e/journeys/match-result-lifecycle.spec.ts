import { mergeTests, type Browser, type Page } from '@playwright/test';
import { test as dataTest, expect } from '../fixtures/test-data.fixtures';
import { test as roleTest } from '../fixtures/auth.fixtures';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

const test = mergeTests(dataTest, roleTest);

/**
 * Covers priority item #7: the match-result lifecycle RPCs (propose_match_result ->
 * finalize_match_result_from_pending / reject_match_result_pending /
 * withdraw_match_result_pending / set_official_match_result) -- multi-row, multi-table,
 * lock-taking, and the one place the cup score itself comes from.
 *
 * Per explicit user direction, this drives the REAL dashboard and admin/scores UI against
 * the live active event (the one real players/friends are currently browsing on
 * test.patron-cup.com) rather than an isolated throwaway event, because the dashboard only
 * ever renders match-result actions for whatever event has is_active=true -- a throwaway
 * event would never show the UI this item exists to cover. The throwaway match this creates
 * is only ever linked (via match_players) to two disposable throwaway players, so it never
 * appears on any *other* real user's dashboard; the acknowledged risk is that it's briefly
 * visible on /admin/scores and counted in the active event's match list while the test runs.
 * serial mode keeps at most one such throwaway match live against the real event at a time,
 * and registerCleanup removes it (and cascades away its match_players/match_results_pending
 * rows) before the next test or any later run.
 *
 * Never touches the 3 reserved shared accounts except read-only use of the shared committee
 * session (committeeContext) to open /admin/scores -- no signOut(), no account-state mutation.
 */
test.describe.configure({ mode: 'serial' });

async function loginAsThrowawayPlayer(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  return page;
}

async function createThrowawayTwoPlayerMatch(
  supabase: ReturnType<typeof getE2ESupabaseAdminClient>,
  runSlug: string,
  suffix: string,
) {
  const { data: activeEvent, error: eventError } = await supabase.from('events').select('id').eq('is_active', true).single();
  if (eventError || !activeEvent) throw new Error(`Could not resolve the seeded active event: ${eventError?.message}`);

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('event_id', activeEvent.id)
    .order('name');
  if (teamsError || !teams || teams.length < 2) throw new Error(`Could not resolve the event's 2 teams: ${teamsError?.message}`);
  const [teamA, teamB] = teams;

  const { data: maxRow } = await supabase
    .from('matches')
    .select('match_number')
    .eq('event_id', activeEvent.id)
    .order('match_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextMatchNumber = (maxRow?.match_number ?? 0) + 1;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      event_id: activeEvent.id,
      match_number: nextMatchNumber,
      match_date: '2020-01-01', // safely in the past, so isPastScheduledStart() is always true
      match_time: null,
      match_type: 'Head to Head',
      course_id: null,
    })
    .select('id')
    .single();
  if (matchError || !match) throw new Error(`Failed to create throwaway match: ${matchError?.message}`);

  const playerOneEmail = `${runSlug.toLowerCase()}-${suffix}-p1@example.com`;
  const playerTwoEmail = `${runSlug.toLowerCase()}-${suffix}-p2@example.com`;
  const password = 'E2E-throwaway-match-result-password-1!';

  const { data: createdOne, error: createOneError } = await supabase.auth.admin.createUser({
    email: playerOneEmail,
    password,
    email_confirm: true,
  });
  if (createOneError || !createdOne.user) throw new Error(`Failed to create throwaway auth user 1: ${createOneError?.message}`);

  const { data: createdTwo, error: createTwoError } = await supabase.auth.admin.createUser({
    email: playerTwoEmail,
    password,
    email_confirm: true,
  });
  if (createTwoError || !createdTwo.user) throw new Error(`Failed to create throwaway auth user 2: ${createTwoError?.message}`);

  const { data: createdPlayers, error: playersError } = await supabase
    .from('players')
    .insert([
      { auth_user_id: createdOne.user.id, email: playerOneEmail, first_name: runSlug, last_name: `${suffix} Player One`, role: 'player', is_active: true },
      { auth_user_id: createdTwo.user.id, email: playerTwoEmail, first_name: runSlug, last_name: `${suffix} Player Two`, role: 'player', is_active: true },
    ])
    .select('id, auth_user_id');
  if (playersError || !createdPlayers) throw new Error(`Failed to create throwaway player rows: ${playersError?.message}`);
  const playerOne = createdPlayers.find((p) => p.auth_user_id === createdOne.user.id)!;
  const playerTwo = createdPlayers.find((p) => p.auth_user_id === createdTwo.user.id)!;

  const { error: matchPlayersError } = await supabase.from('match_players').insert([
    { match_id: match.id, player_id: playerOne.id, team_id: teamA.id },
    { match_id: match.id, player_id: playerTwo.id, team_id: teamB.id },
  ]);
  if (matchPlayersError) throw new Error(`Failed to create throwaway match_players rows: ${matchPlayersError.message}`);

  return {
    matchId: match.id,
    matchNumber: nextMatchNumber,
    teamA,
    teamB,
    playerOne: { id: playerOne.id, email: playerOneEmail, authUserId: createdOne.user.id },
    playerTwo: { id: playerTwo.id, email: playerTwoEmail, authUserId: createdTwo.user.id },
    password,
    async cleanup() {
      await supabase.from('matches').delete().eq('id', match.id); // cascades match_players + match_results_pending
      await supabase.from('players').delete().in('id', [playerOne.id, playerTwo.id]);
      await supabase.auth.admin.deleteUser(createdOne.user.id);
      await supabase.auth.admin.deleteUser(createdTwo.user.id);
    },
  };
}

test('player proposes, opponent rejects, proposer re-proposes, and the opponent confirming records the result', async ({
  browser,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const setup = await createThrowawayTwoPlayerMatch(supabase, runSlug, 'reject-confirm');
  registerCleanup(setup.cleanup);

  const pageOne = await loginAsThrowawayPlayer(browser, setup.playerOne.email, setup.password);
  const pageTwo = await loginAsThrowawayPlayer(browser, setup.playerTwo.email, setup.password);
  const matchBlockOne = pageOne.locator(`#match-${setup.matchId}`);
  const matchBlockTwo = pageTwo.locator(`#match-${setup.matchId}`);

  // --- Round 1: player one proposes team A, player two rejects ---
  await matchBlockOne.getByRole('button', { name: setup.teamA.name, exact: true }).click();
  await pageOne.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(matchBlockOne.getByText('Waiting for an opponent to confirm')).toBeVisible();

  const { data: firstPendingRows } = await supabase
    .from('match_results_pending')
    .select('id, status, winner_team_id, is_halved, proposed_by_player_id')
    .eq('match_id', setup.matchId);
  expect(firstPendingRows).toHaveLength(1);
  expect(firstPendingRows?.[0]?.status).toBe('pending');
  expect(firstPendingRows?.[0]?.winner_team_id).toBe(setup.teamA.id);
  expect(firstPendingRows?.[0]?.proposed_by_player_id).toBe(setup.playerOne.id);

  await pageTwo.reload();
  await expect(matchBlockTwo.getByText('Confirm result?')).toBeVisible();
  await matchBlockTwo.getByRole('button', { name: 'Reject' }).click();
  await pageTwo.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
  // The dialog's click only fires the browser event -- it doesn't wait for handleReject()'s
  // RPC round trip + router.refresh() to finish. Wait for the panel to actually re-render
  // into its post-rejection state (back to the normal propose UI) before reading the DB,
  // otherwise the admin-client query below can race ahead of the mutation.
  await expect(matchBlockTwo.getByText('Report result')).toBeVisible();

  const { data: afterReject } = await supabase
    .from('match_results_pending')
    .select('status')
    .eq('id', firstPendingRows![0].id)
    .single();
  expect(afterReject?.status).toBe('rejected');

  const { data: matchAfterReject } = await supabase.from('matches').select('winner_team_id, is_halved').eq('id', setup.matchId).single();
  expect(matchAfterReject?.winner_team_id).toBeNull();
  expect(matchAfterReject?.is_halved).toBe(false);

  // --- Round 2: player one re-proposes halved, player two confirms ---
  await pageOne.reload();
  await expect(matchBlockOne.getByRole('button', { name: 'Halved' })).toBeVisible();
  await matchBlockOne.getByRole('button', { name: 'Halved' }).click();
  await pageOne.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(matchBlockOne.getByText('Waiting for an opponent to confirm')).toBeVisible();

  const { data: pendingAfterSecondPropose } = await supabase
    .from('match_results_pending')
    .select('id, status, winner_team_id, is_halved')
    .eq('match_id', setup.matchId)
    .order('created_at');
  expect(pendingAfterSecondPropose).toHaveLength(2);
  expect(pendingAfterSecondPropose?.[0]?.status).toBe('rejected'); // the round-1 row, untouched
  const secondPending = pendingAfterSecondPropose?.[1];
  expect(secondPending?.status).toBe('pending');
  expect(secondPending?.is_halved).toBe(true);
  expect(secondPending?.winner_team_id).toBeNull();

  await pageTwo.reload();
  await expect(matchBlockTwo.getByText('Confirm result?')).toBeVisible();
  await matchBlockTwo.getByRole('button', { name: 'Confirm' }).click();
  await pageTwo.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  // Same race as the reject step above -- wait for the post-confirm re-render before reading
  // the DB.
  await expect(matchBlockTwo.getByText('Result is recorded on the scoreboard.')).toBeVisible();

  const { data: matchAfterConfirm } = await supabase
    .from('matches')
    .select('winner_team_id, is_halved, result_set_by_official')
    .eq('id', setup.matchId)
    .single();
  expect(matchAfterConfirm?.winner_team_id).toBeNull();
  expect(matchAfterConfirm?.is_halved).toBe(true);
  expect(matchAfterConfirm?.result_set_by_official).toBe(false);

  const { data: secondPendingAfterConfirm } = await supabase
    .from('match_results_pending')
    .select('status, confirmed_by_player_id, promoted_at')
    .eq('id', secondPending!.id)
    .single();
  expect(secondPendingAfterConfirm?.status).toBe('confirmed');
  expect(secondPendingAfterConfirm?.confirmed_by_player_id).toBe(setup.playerTwo.id);
  expect(secondPendingAfterConfirm?.promoted_at).not.toBeNull();

  await pageOne.reload();
  await expect(matchBlockOne.getByText('Result is recorded on the scoreboard.')).toBeVisible();
  await expect(matchBlockTwo.getByText('Result is recorded on the scoreboard.')).toBeVisible();
});

test('withdrawing a proposal lets the proposer start over, and an official result locks out player actions', async ({
  browser,
  runSlug,
  registerCleanup,
  committeeContext,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const setup = await createThrowawayTwoPlayerMatch(supabase, runSlug, 'withdraw-official');
  registerCleanup(setup.cleanup);

  const pageOne = await loginAsThrowawayPlayer(browser, setup.playerOne.email, setup.password);
  const matchBlockOne = pageOne.locator(`#match-${setup.matchId}`);

  await matchBlockOne.getByRole('button', { name: setup.teamA.name, exact: true }).click();
  await pageOne.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(matchBlockOne.getByText('Waiting for an opponent to confirm')).toBeVisible();

  const { data: pendingBeforeWithdraw } = await supabase
    .from('match_results_pending')
    .select('id, status')
    .eq('match_id', setup.matchId)
    .single();
  expect(pendingBeforeWithdraw?.status).toBe('pending');

  await matchBlockOne.getByRole('button', { name: 'Withdraw proposal' }).click();
  // No confirmation dialog on withdraw -- the click fires handleWithdraw() directly, which
  // doesn't block the click event on its RPC round trip. Wait for the panel to actually
  // revert to the normal propose UI (proof the mutation + router.refresh() completed) before
  // reading the DB, same race as the reject/confirm steps in the other test.
  await expect(matchBlockOne.getByRole('button', { name: setup.teamA.name, exact: true })).toBeVisible();

  const { data: pendingAfterWithdraw } = await supabase
    .from('match_results_pending')
    .select('status')
    .eq('id', pendingBeforeWithdraw!.id)
    .single();
  expect(pendingAfterWithdraw?.status).toBe('cancelled');

  // The proposer is back to a clean slate -- the normal 3-button propose UI, not stuck
  // waiting on a cancelled proposal.
  await pageOne.reload();
  await expect(matchBlockOne.getByRole('button', { name: setup.teamA.name, exact: true })).toBeVisible();

  // Committee sets the official result via the real /admin/scores UI -- read-only use of the
  // shared committee session (no signOut, no account-state mutation).
  const committeePage = await committeeContext.newPage();
  await committeePage.goto('/admin/scores');
  // This match's far-past date (2020-01-01) makes its course group ("Course TBD", since it
  // has no course_id) sort first and be selected by default -- scope the card by its exact
  // match number (unique per event) rather than team names, since other matches could share
  // the same team pairing.
  // "Course TBD" matches both the tab chip and the group subtitle paragraph -- just wait for
  // the match card itself.
  // Negative-lookahead-for-another-digit, not \b: "Match #1" would otherwise also match a
  // card reading "Match #10" or "Match #19", and \b doesn't fire here anyway -- adjacent text
  // nodes in this card (e.g. "Match #999" then "Head to Head") concatenate via textContent
  // with no separator, so the character right after the number is a letter, which is still a
  // \w character with no \w/non-\w transition for \b to match on. This page also fires 3
  // queries (matches/teams/match_players) before its first real render, past the default 5s
  // timeout under load.
  const matchCard = committeePage.locator('.ad-card', { hasText: new RegExp(`Match #${setup.matchNumber}(?!\\d)`) });
  await expect(matchCard).toBeVisible({ timeout: 15_000 });
  await matchCard.getByRole('button', { name: setup.teamA.name, exact: true }).click();
  await committeePage.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(committeePage.getByText('Match result updated.')).toBeVisible();
  await committeePage.close();

  const { data: matchAfterOfficial } = await supabase
    .from('matches')
    .select('winner_team_id, is_halved, result_set_by_official')
    .eq('id', setup.matchId)
    .single();
  expect(matchAfterOfficial?.winner_team_id).toBe(setup.teamA.id);
  expect(matchAfterOfficial?.is_halved).toBe(false);
  expect(matchAfterOfficial?.result_set_by_official).toBe(true);

  // Player view now shows the official-lock message instead of any propose/confirm controls.
  await pageOne.reload();
  await expect(matchBlockOne.getByText('This match result was entered by the committee.')).toBeVisible();
});
