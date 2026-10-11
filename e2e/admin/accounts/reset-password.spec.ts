import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient, createE2ESupabaseAnonClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #8's reset-password half: /api/admin/reset-password mutates real
 * credentials (admin.updateUserById's password field) and sets must_change_password -- the
 * "UI says success, DB disagrees" risk here is specifically that the new password doesn't
 * actually work, so both tests prove it via a real signInWithPassword call, not just by
 * reading auth.users state.
 *
 * Covers both password-entry modes since they're different code paths through the page
 * (generate vs type-your-own), both landing on the same API call.
 */

test('resets a player\'s password via the Player picker using a generated password', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-reset-gen@example.com`;
  const originalPassword = 'E2E-throwaway-reset-password-original-1!';

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: originalPassword,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: created.user.id,
    email,
    first_name: runSlug,
    last_name: 'Reset Generated',
    role: 'player',
    is_active: true,
  });
  if (playerError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(`Failed to create throwaway player row: ${playerError.message}`);
  }

  registerCleanup(async () => {
    await supabase.from('players').delete().eq('auth_user_id', created.user.id);
    await supabase.auth.admin.deleteUser(created.user.id);
  });

  await page.goto('/admin/reset-password');
  await page.getByLabel('Player').fill(runSlug);
  await page.getByRole('option', { name: `${runSlug} Reset Generated` }).click();

  // "Generate" mode is the default -- a password is already pre-filled client-side, so read
  // its displayed text rather than assuming a value. Its own class is a hashed CSS module
  // name, but its container (.ad-card, a plain global class) is stable, and the password is
  // that card's first child div.
  const generatedPassword = (await page.locator('.ad-card').locator('div').first().textContent())?.trim();
  if (!generatedPassword) throw new Error('Could not read the generated password off the page');

  await page.getByRole('button', { name: 'Reset Password' }).click();
  await expect(page.getByRole('alert').filter({ hasText: `Password reset for ${email}` })).toBeVisible();

  const { data: profile } = await supabase.from('profiles').select('must_change_password').eq('id', created.user.id).single();
  expect(profile?.must_change_password).toBe(true);

  const anon = createE2ESupabaseAnonClient();
  const { error: newPasswordError } = await anon.auth.signInWithPassword({ email, password: generatedPassword });
  expect(newPasswordError).toBeNull();
  await anon.auth.signOut();

  const anonOld = createE2ESupabaseAnonClient();
  const { error: oldPasswordError } = await anonOld.auth.signInWithPassword({ email, password: originalPassword });
  expect(oldPasswordError).not.toBeNull(); // the old password must no longer work
});

test('resets a player\'s password using a manually typed password', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-reset-type@example.com`;
  const originalPassword = 'E2E-throwaway-reset-password-original-2!';
  const newPassword = 'E2E-throwaway-reset-password-custom-2!';

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: originalPassword,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: created.user.id,
    email,
    first_name: runSlug,
    last_name: 'Reset Typed',
    role: 'player',
    is_active: true,
  });
  if (playerError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(`Failed to create throwaway player row: ${playerError.message}`);
  }

  registerCleanup(async () => {
    await supabase.from('players').delete().eq('auth_user_id', created.user.id);
    await supabase.auth.admin.deleteUser(created.user.id);
  });

  await page.goto('/admin/reset-password');
  await page.getByLabel('Player').fill(runSlug);
  await page.getByRole('option', { name: `${runSlug} Reset Typed` }).click();
  await page.getByRole('button', { name: 'Type my own' }).click();
  await page.getByLabel('Password').fill(newPassword);
  await page.getByRole('button', { name: 'Reset Password' }).click();

  await expect(page.getByRole('alert').filter({ hasText: `Password reset for ${email}` })).toBeVisible();

  const anon = createE2ESupabaseAnonClient();
  const { error: newPasswordError } = await anon.auth.signInWithPassword({ email, password: newPassword });
  expect(newPasswordError).toBeNull();
});
