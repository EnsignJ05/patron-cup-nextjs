import { readFile } from 'node:fs/promises';
import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #11: CSV export content/encoding. Playwright can assert a download's
 * filename and parse its actual bytes, which directly guards the BOM/encoding regression
 * class that has already bitten this project twice (per project memory) -- both exports here
 * prepend a literal U+FEFF before the CSV text so Excel detects UTF-8 correctly; checking
 * only the rendered page would never catch that byte going missing or getting mangled.
 */

test('handicaps CSV export has a UTF-8 BOM and the throwaway roster row\'s real values', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ event_id: activeEvent.id, name: `${runSlug} CSV Team` })
    .select('id, name')
    .single();
  if (teamError || !team) throw new Error(`Failed to create throwaway team: ${teamError?.message}`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      first_name: runSlug,
      last_name: 'Csv Candidate',
      email: `${runSlug.toLowerCase()}-csv@example.com`,
      role: 'player',
      is_active: true,
      ghin_number: '9876543',
      ghin_club: `${runSlug} Golf Club`,
    })
    .select('id')
    .single();
  if (playerError || !player) throw new Error(`Failed to create throwaway player: ${playerError?.message}`);

  const { error: rosterError } = await supabase
    .from('team_rosters')
    .insert({ team_id: team.id, player_id: player.id, handicap_at_event: 11.2 });
  if (rosterError) throw new Error(`Failed to create throwaway roster entry: ${rosterError.message}`);

  registerCleanup(async () => {
    await supabase.from('team_rosters').delete().eq('team_id', team.id);
    await supabase.from('players').delete().eq('id', player.id);
    await supabase.from('teams').delete().eq('id', team.id);
  });

  await page.goto('/admin/handicaps');
  await page.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: new RegExp(`^${activeEvent.name} \\(${activeEvent.year}\\)`) }).click();

  const exportButton = page.getByRole('button', { name: 'Export CSV' });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

  const expectedBase = `${activeEvent.name}-${activeEvent.year}-handicaps`.trim().replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  expect(download.suggestedFilename()).toBe(`${expectedBase}.csv`);

  const path = await download.path();
  if (!path) throw new Error('Download did not save to a local path');
  const buffer = await readFile(path);

  // The BOM is 3 literal bytes (EF BB BF) once UTF-8-encoded, not 1 -- checking the decoded
  // string's first character alone wouldn't catch an encoding mismatch the way checking the
  // raw bytes does.
  expect([...buffer.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text.split('\r\n');
  // Only checking the first 7 columns -- the rest are "<course name> Course Handicap"
  // columns, one per course on the active event, which this test doesn't control or care
  // about the exact set/order of.
  expect(lines[0].split(',').slice(0, 7)).toEqual([
    'event_name',
    'event_year',
    'Player',
    'Team',
    'Official Event Handicap',
    'GHIN Number',
    'GHIN Club',
  ]);

  const ourLine = lines.find((line) => line.includes(`${runSlug} Csv Candidate`));
  if (!ourLine) throw new Error(`No CSV row found for ${runSlug} Csv Candidate. Full CSV:\n${text}`);
  const cells = ourLine.split(',');
  expect(cells[2]).toBe(`${runSlug} Csv Candidate`);
  expect(cells[3]).toBe(team.name);
  expect(cells[4]).toBe('11.2');
  expect(cells[5]).toBe('9876543');
  expect(cells[6]).toBe(`${runSlug} Golf Club`);
});

test('matches CSV export has a UTF-8 BOM and the throwaway match\'s real values', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

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
      match_date: '2099-01-01',
      match_time: null,
      match_type: 'Head to Head',
      course_id: null,
      notes: `${runSlug} export check`,
    })
    .select('id')
    .single();
  if (matchError || !match) throw new Error(`Failed to create throwaway match: ${matchError?.message}`);

  registerCleanup(async () => {
    await supabase.from('matches').delete().eq('id', match.id);
  });

  await page.goto('/admin/matches/setup');
  await page.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: new RegExp(`^${activeEvent.name} \\(${activeEvent.year}\\)`) }).click();

  const exportButton = page.getByRole('button', { name: 'Export CSV' });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);

  const path = await download.path();
  if (!path) throw new Error('Download did not save to a local path');
  const buffer = await readFile(path);
  expect([...buffer.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text.split('\r\n');
  expect(lines[0].split(',')).toEqual([
    'event_name',
    'event_year',
    'match_date',
    'match_time',
    'course_name',
    'match_number',
    'group_number',
    'match_type',
    'winner_team_name',
    'is_halved',
    'notes',
    'team_1_name',
    'team_1_players',
    'team_2_name',
    'team_2_players',
  ]);

  const ourLine = lines.find((line) => line.includes(`${runSlug} export check`));
  if (!ourLine) throw new Error(`No CSV row found for match notes "${runSlug} export check". Full CSV:\n${text}`);
  const cells = ourLine.split(',');
  expect(cells[1]).toBe(String(activeEvent.year));
  expect(cells[2]).toBe('2099-01-01');
  expect(cells[5]).toBe(String(nextMatchNumber));
  expect(cells[7]).toBe('Head to Head');
});
