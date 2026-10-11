import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #8's change-username half: /api/admin/change-username updates the
 * auth.users email first, then players.email, with a rollback added (this session) on the
 * second step's failure -- mirroring /api/admin/invite's existing rollback pattern. Without
 * that rollback, a failure between the two writes would desync which email the account
 * actually logs in with (auth.users) from which email the app displays (players.email).
 *
 * The rollback test forces that exact failure deterministically: it seeds an orphaned
 * players row (no auth_user_id) already holding the target newEmail. The route's own
 * pre-check for "that email is already linked to another account" only fires when the
 * conflicting row has a *linked* auth_user_id, so an orphaned row sails past it, then the
 * players.update() hits the real players_email_key unique constraint -- after the auth email
 * update already committed. That is precisely the desync window the rollback exists to close.
 *
 * Uses disposable throwaway auth users throughout (never test-admin@/test-committee@/
 * test-player@example.com), consistent with the project's no-touching-reserved-accounts rule.
 */

test('successfully changes a user\'s login email, keeping auth and players in sync', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const currentEmail = `${runSlug.toLowerCase()}-before@example.com`;
  const newEmail = `${runSlug.toLowerCase()}-after@example.com`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: currentEmail,
    password: 'E2E-throwaway-username-password-1!',
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);
  const authUserId = created.user.id;

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: authUserId,
    email: currentEmail,
    first_name: runSlug,
    last_name: 'Username Happy Path',
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

  await page.goto('/admin/change-username');
  await page.getByLabel('Current email').fill(currentEmail);
  await page.getByLabel('New email').fill(newEmail);
  await page.getByRole('button', { name: 'Update Email' }).click();

  await expect(page.getByRole('alert').filter({ hasText: `Updated login email from ${currentEmail} to ${newEmail}` })).toBeVisible();

  const { data: authUserAfter } = await supabase.auth.admin.getUserById(authUserId);
  expect(authUserAfter.user?.email).toBe(newEmail);

  const { data: playerAfter } = await supabase.from('players').select('email').eq('auth_user_id', authUserId).single();
  expect(playerAfter?.email).toBe(newEmail);
});

test('rolls back the auth email change when the players update fails, so auth and players stay in sync', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const currentEmail = `${runSlug.toLowerCase()}-rollback-before@example.com`;
  const conflictingNewEmail = `${runSlug.toLowerCase()}-rollback-taken@example.com`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: currentEmail,
    password: 'E2E-throwaway-username-password-2!',
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);
  const authUserId = created.user.id;

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: authUserId,
    email: currentEmail,
    first_name: runSlug,
    last_name: 'Username Rollback Target',
    role: 'player',
    is_active: true,
  });
  if (playerError) {
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error(`Failed to create throwaway player row: ${playerError.message}`);
  }

  // The orphaned decoy: a players row already holding conflictingNewEmail but with no linked
  // auth_user_id, so the route's own "already linked to another account" guard doesn't catch
  // it -- it only checks existingPlayer?.auth_user_id, which is null here.
  const { error: decoyError } = await supabase.from('players').insert({
    auth_user_id: null,
    email: conflictingNewEmail,
    first_name: runSlug,
    last_name: 'Username Rollback Decoy',
    role: 'player',
    is_active: true,
  });
  if (decoyError) throw new Error(`Failed to create throwaway decoy player row: ${decoyError.message}`);

  registerCleanup(async () => {
    await supabase.from('players').delete().eq('auth_user_id', authUserId);
    await supabase.from('players').delete().eq('email', conflictingNewEmail);
    await supabase.auth.admin.deleteUser(authUserId);
  });

  await page.goto('/admin/change-username');
  await page.getByLabel('Current email').fill(currentEmail);
  await page.getByLabel('New email').fill(conflictingNewEmail);
  await page.getByRole('button', { name: 'Update Email' }).click();

  // Not asserting the exact error text -- it's the raw Postgres unique-violation message,
  // a known, separately-flagged rough edge. What matters here is that it surfaces as an
  // error, not a false success, and that neither side was left pointing at conflictingNewEmail.
  await expect(page.getByRole('alert')).toBeVisible();

  const { data: authUserAfter } = await supabase.auth.admin.getUserById(authUserId);
  expect(authUserAfter.user?.email).toBe(currentEmail); // rolled back, not stuck on the new email

  const { data: playerAfter } = await supabase.from('players').select('email').eq('auth_user_id', authUserId).single();
  expect(playerAfter?.email).toBe(currentEmail); // never changed -- the update that would have is what failed
});
