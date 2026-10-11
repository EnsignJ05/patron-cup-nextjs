import { test, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Phase 5. /players/[playerId] is gated behind auth (see S3 in project memory) despite
 * looking like a plain public route. Lives in e2e/player/ so the render test runs under the
 * player-* projects' authenticated storageState; the anon-redirect test explicitly opens its
 * own unauthenticated context (not the public-* projects, since this file needs to know a
 * real seeded player id up front, which belongs with the rest of this spec, not split into
 * e2e/public/).
 */

test('an authenticated player can view another player\'s public profile', async ({ page }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: somePlayer } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('last_name')
    .limit(1)
    .single();
  if (!somePlayer) throw new Error('Expected at least one active seeded player');

  await page.goto(`/players/${somePlayer.id}`);
  await expect(page.getByText(`${somePlayer.first_name} ${somePlayer.last_name}`).first()).toBeVisible();
});

test('an anonymous visitor is redirected to login instead of seeing the profile', async ({ browser }) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: somePlayer } = await supabase.from('players').select('id').eq('is_active', true).limit(1).single();
  if (!somePlayer) throw new Error('Expected at least one active seeded player');

  // storageState: undefined explicitly overrides this project's own default (player.json) --
  // a bare browser.newContext() call still inherits the *project's* configured storageState
  // (confirmed by direct investigation: it is NOT anonymous by default here), so leaving this
  // out silently reruns the test as test-player@example.com instead of truly logged-out.
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto(`/players/${somePlayer.id}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fplayers%2F${somePlayer.id}`));
  await context.close();
});
