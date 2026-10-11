import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Phase 5: public/read-only, last page in the plan. /matches is the biggest public page --
 * cup score totals, a round (course) tab nav, and per-match chevron cards -- all against the
 * seeded dataset, with values resolved dynamically via the admin client.
 *
 * The CSV export button here ("Export Handicaps") is admin-gated (isAdminRole(role)) even
 * though the page itself is public -- that half gets its own coverage in
 * e2e/admin/competition/matches-handicap-export.spec.ts, including the BOM fix below.
 */

test('shows the cup score, round tabs, and per-match results matching seeded data', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const { data: teams } = await supabase.from('teams').select('id, name').eq('event_id', activeEvent.id).order('name');
  if (!teams || teams.length < 2) throw new Error('Expected at least 2 seeded teams');
  const [teamA, teamB] = teams;

  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_number, winner_team_id, is_halved')
    .eq('event_id', activeEvent.id);
  if (!matches || matches.length === 0) throw new Error('Expected at least one seeded match');

  // Mirror getTeamTotals' scoring: 1 point per win, 0.5 each for a halve.
  let scoreA = 0;
  let scoreB = 0;
  for (const match of matches) {
    if (match.is_halved) {
      scoreA += 0.5;
      scoreB += 0.5;
    } else if (match.winner_team_id === teamA.id) {
      scoreA += 1;
    } else if (match.winner_team_id === teamB.id) {
      scoreB += 1;
    }
  }
  const fmt = (v: number) => {
    if (Number.isInteger(v)) return `${v}`;
    const whole = Math.floor(v);
    return v - whole === 0.5 ? (whole > 0 ? `${whole}½` : '½') : v.toFixed(1);
  };

  await page.goto('/matches');

  // Cup score card shows both team names and the computed totals.
  const cupCard = page.locator('[class*="cupCard"]');
  await expect(cupCard).toBeVisible();
  await expect(cupCard.getByText(teamA.name)).toBeVisible();
  await expect(cupCard.getByText(teamB.name)).toBeVisible();
  await expect(cupCard.getByText(fmt(scoreA), { exact: true })).toBeVisible();
  await expect(cupCard.getByText(fmt(scoreB), { exact: true })).toBeVisible();

  // The public export button never renders for an anonymous visitor.
  await expect(page.getByRole('button', { name: 'Export Handicaps' })).not.toBeVisible();

  // Round (course) tabs exist (plain <button>s labeled "R1 · <date>"), and at least one
  // match card renders with real match info.
  const roundChips = page.getByRole('button', { name: /^R\d+/ });
  await expect(roundChips.first()).toBeVisible();
  await expect(page.getByText(/MATCH \d+/).first()).toBeVisible();

  // A specific finished match (if one is seeded) shows FINAL/HALVED, not UPCOMING.
  const finishedMatch = matches.find((m) => m.winner_team_id || m.is_halved);
  if (finishedMatch) {
    const card = page.locator('[class*="matchCard"]', { hasText: `MATCH ${finishedMatch.match_number}` });
    // The finished match might be on a different round tab than the one currently selected --
    // only assert on its status if it's actually visible on this page load.
    if (await card.isVisible().catch(() => false)) {
      const statusText = finishedMatch.is_halved ? 'HALVED' : 'FINAL';
      await expect(card.getByText(statusText, { exact: true })).toBeVisible();
    }
  }
});
