import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #6: bulk match creation. Creates N rows in one insert, validates
 * total-players divisibility against the match type's per-match player count client-side,
 * and computes match_number as (existing max for the event) + 1, 2, 3... Post-H5 a numbering
 * collision would hit the hard matches_event_id_match_number_key unique constraint instead of
 * silently duplicating, so the sequencing-across-two-batches assertion below is the one that
 * actually exercises that numbering logic, not just the happy path of a single batch.
 *
 * Each test builds its own throwaway event + course rather than using the seeded active event,
 * since match_number sequencing depends on what else already exists for that event_id --
 * sharing the seeded event would make the assertions depend on however many matches the seed
 * (or other parallel tests) already put there.
 */

test('rejects a player count not divisible by the match type\'s required players', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const eventName = `${runSlug} Matches Divisibility Event`;

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

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({ event_id: event.id, name: `${runSlug} Course` })
    .select('id')
    .single();
  if (courseError || !course) throw new Error(`Failed to create throwaway course: ${courseError?.message}`);

  registerCleanup(async () => {
    await supabase.from('events').delete().eq('id', event.id); // cascades away the course too
  });

  await page.goto('/admin/matches');
  await page.getByRole('button', { name: 'Add Matches' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${eventName} (2099)`, exact: true }).click();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Course' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Course`, exact: true }).click();

  await dialog.getByLabel('Match Date').fill('2099-01-02');

  await dialog.locator('.MuiFormControl-root', { hasText: 'Match Type' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'Head to Head', exact: true }).click(); // 2 players per match

  await dialog.getByLabel('Number of Players').fill('5'); // not divisible by 2
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Total players must be divisible by 2.')).toBeVisible();
  await expect(dialog).toBeVisible(); // rejected client-side, dialog stays open, nothing written

  const { data: matchesAfter } = await supabase.from('matches').select('id').eq('event_id', event.id);
  expect(matchesAfter).toHaveLength(0);
});

test('creates the right number of matches and keeps match_number sequential across two batches', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const eventName = `${runSlug} Matches Sequencing Event`;

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

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({ event_id: event.id, name: `${runSlug} Course` })
    .select('id')
    .single();
  if (courseError || !course) throw new Error(`Failed to create throwaway course: ${courseError?.message}`);

  registerCleanup(async () => {
    await supabase.from('events').delete().eq('id', event.id); // cascades away the course + matches too
  });

  await page.goto('/admin/matches');

  // Batch 1: Two Man Better Ball (4 players/match) x 8 players -> 2 matches, numbered 1-2.
  await page.getByRole('button', { name: 'Add Matches' }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${eventName} (2099)`, exact: true }).click();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Course' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Course`, exact: true }).click();

  await dialog.getByLabel('Match Date').fill('2099-01-02');
  // Default match type is already "Two Man Better Ball" (4 players/match) -- no need to touch it.
  await dialog.getByLabel('Number of Players').fill('8');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('2 matches added successfully')).toBeVisible();
  await expect(dialog).not.toBeVisible();

  const { data: afterFirstBatch } = await supabase
    .from('matches')
    .select('match_number, match_type, course_id, group_number, match_time, winner_team_id, is_halved')
    .eq('event_id', event.id)
    .order('match_number');
  expect(afterFirstBatch).toHaveLength(2);
  expect(afterFirstBatch?.map((m) => m.match_number)).toEqual([1, 2]);
  for (const match of afterFirstBatch ?? []) {
    expect(match.match_type).toBe('Two Man Better Ball');
    expect(match.course_id).toBe(course.id);
    expect(match.group_number).toBeNull();
    expect(match.match_time).toBeNull();
    expect(match.winner_team_id).toBeNull();
    expect(match.is_halved).toBe(false);
  }

  // Batch 2: Head to Head (2 players/match) x 4 players -> 2 more matches, continuing at 3-4,
  // not restarting at 1 -- this is what actually exercises the existingMaxMatchNumber logic
  // (and is the scenario that would hit matches_event_id_match_number_key if it got this wrong).
  await page.getByRole('button', { name: 'Add Matches' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${eventName} (2099)`, exact: true }).click();

  await dialog.locator('.MuiFormControl-root', { hasText: 'Course' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${runSlug} Course`, exact: true }).click();

  await dialog.getByLabel('Match Date').fill('2099-01-03');

  await dialog.locator('.MuiFormControl-root', { hasText: 'Match Type' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'Head to Head', exact: true }).click();

  await dialog.getByLabel('Number of Players').fill('4');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('2 matches added successfully')).toBeVisible();
  await expect(dialog).not.toBeVisible();

  const { data: afterSecondBatch } = await supabase
    .from('matches')
    .select('match_number, match_type')
    .eq('event_id', event.id)
    .order('match_number');
  expect(afterSecondBatch).toHaveLength(4);
  expect(afterSecondBatch?.map((m) => m.match_number)).toEqual([1, 2, 3, 4]);
  expect(afterSecondBatch?.[2]?.match_type).toBe('Head to Head');
  expect(afterSecondBatch?.[3]?.match_type).toBe('Head to Head');
});
