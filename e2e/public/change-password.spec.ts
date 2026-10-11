import { test, expect } from '../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Lives in e2e/public/ (not e2e/player/) deliberately: this test manages its own throwaway
 * account and does a fresh UI login, so it must NOT inherit the player project's default
 * storageState (which would arrive already authenticated as test-player and short-circuit
 * LoginClient's own redirect before the form could even be filled in).
 *
 * Uses a disposable account rather than test-player@example.com for the same reason
 * e2e/public/login.spec.ts's logout test does: mutating must_change_password on a shared
 * account races with any other concurrently-running spec that uses that same account's
 * session (e2e/player/route-gating.spec.ts hit exactly this before this was fixed). A fresh
 * throwaway account with must_change_password=true is also a more realistic simulation of
 * the real-world case this flow exists for -- a newly invited player's first login (the
 * invite route sets the same flag the same way).
 */
test('a newly invited player is forced to set a new password before reaching the dashboard', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const email = `${runSlug.toLowerCase()}-forced-change@example.com`;
  const originalPassword = 'E2E-throwaway-original-password-1!';
  const newPassword = 'E2E-throwaway-new-password-1!';
  const supabase = getE2ESupabaseAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: originalPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);
  }
  const authUserId = created.user.id;

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: authUserId,
    email,
    first_name: runSlug,
    last_name: 'Forced Change Test',
    role: 'player',
    is_active: true,
  });
  if (playerError) {
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error(`Failed to create throwaway player row: ${playerError.message}`);
  }

  registerCleanup(async () => {
    await supabase.from('players').delete().eq('auth_user_id', authUserId);
    await supabase.auth.admin.deleteUser(authUserId);
  });

  // handle_new_user() always creates a new profile with must_change_password = false (see
  // AGENTS.md / TEST_ENVIRONMENT_PLAN.md Task 6.3's note on this exact wrinkle), so it has
  // to be set explicitly -- same as the real invite route and the seed script both do.
  const { error: flagError } = await supabase.from('profiles').update({ must_change_password: true }).eq('id', authUserId);
  if (flagError) throw new Error(`Failed to set must_change_password: ${flagError.message}`);

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(originalPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // See e2e/auth/admin.setup.ts: the real login flow takes ~6-7s.
  await expect(page).toHaveURL(/\/change-password/, { timeout: 15_000 });

  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});
