import { test as setup, expect } from '@playwright/test';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

const PLAYER_EMAIL = process.env.E2E_PLAYER_EMAIL!;
const PLAYER_PASSWORD = process.env.E2E_PLAYER_PASSWORD!;
const authFile = 'playwright/.auth/player.json';

/**
 * test-player@example.com is seeded with profiles.must_change_password = true, specifically
 * so the forced-password-change flow stays testable (see e2e/player/change-password.spec.ts,
 * which owns that flow end-to-end, including restoring this state afterward). Every OTHER
 * player-role spec needs a normal, already-past-that-gate session, so this setup file logs
 * in, and if redirected to /change-password (the expected baseline), flips the flag off
 * directly via the admin client rather than driving the change-password UI here -- that
 * form is a different spec's job to test, not a side effect of auth setup.
 */
setup('authenticate as player', async ({ page }) => {
  if (!PLAYER_EMAIL || !PLAYER_PASSWORD) {
    throw new Error('E2E_PLAYER_EMAIL/E2E_PLAYER_PASSWORD are not set -- populate .env.e2e.local from .env.e2e.example.');
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(PLAYER_EMAIL);
  await page.getByLabel('Password').fill(PLAYER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(/\/change-password|\/dashboard/);

  if (page.url().includes('/change-password')) {
    const supabase = getE2ESupabaseAdminClient();
    const { data: player, error } = await supabase
      .from('players')
      .select('auth_user_id')
      .eq('email', PLAYER_EMAIL)
      .single();

    if (error || !player?.auth_user_id) {
      throw new Error(`Could not resolve auth_user_id for ${PLAYER_EMAIL} to clear must_change_password: ${error?.message}`);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', player.auth_user_id);

    if (profileError) {
      throw new Error(`Failed to clear must_change_password for ${PLAYER_EMAIL}: ${profileError.message}`);
    }

    await page.goto('/dashboard');
  }

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: authFile });
});
