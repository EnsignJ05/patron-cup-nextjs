import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Phase 5. /players looked like a public route by name, but it's actually gated behind auth
 * (same S3 PII-hardening pattern as /players/[playerId]) -- an anonymous visit bounces to
 * /login?next=.... Lives in e2e/player/, not e2e/public/, so it runs under the player-*
 * projects' already-authenticated storageState. It's a global directory (all is_active
 * players, not scoped to one event) with a client-side name search -- covers the search
 * narrowing to a known seeded player and to nothing for a nonsense term.
 */

test('search narrows the directory to a matching player, and to nothing for a nonsense term', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: somePlayer } = await supabase
    .from('players')
    .select('first_name, last_name')
    .eq('is_active', true)
    .order('last_name')
    .limit(1)
    .single();
  if (!somePlayer) throw new Error('Expected at least one active seeded player');

  await page.goto('/players');
  await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();

  const searchInput = page.getByPlaceholder('Search players...');
  await searchInput.fill(somePlayer.last_name);
  await expect(page.getByText(`${somePlayer.first_name} ${somePlayer.last_name}`)).toBeVisible();

  await searchInput.fill('zzzznonexistentplayerzzzz');
  await expect(page.getByText('No players found')).toBeVisible();
});
