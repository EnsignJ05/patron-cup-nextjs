import { test, expect } from '../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Covers priority item #12: profile image upload, the only Storage-bucket write path in the
 * app (POST /api/player/profile-image -> Supabase Storage 'avatars' bucket, then
 * players.profile_image_url). Uses a disposable throwaway player account logged in through
 * the real UI, never the shared test-player@example.com account, since this mutates
 * account-level profile state.
 *
 * Files are constructed in-memory (setInputFiles accepts a buffer directly, no fixture file
 * on disk needed) -- the route only checks file.type/file.size, it never actually decodes
 * image pixel data server-side, so a real PNG isn't needed to exercise its validation paths.
 *
 * Lives in e2e/public/, not e2e/player/, for the same reason as change-password.spec.ts:
 * the player-* projects' storageState is already an authenticated test-player@example.com
 * session, which would redirect away from /login before this test's own throwaway-account
 * login could run. The public-* projects start anonymous, which this needs.
 */

test('rejects an oversized file and a non-image file client-side, then accepts a valid small image', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-avatar@example.com`;
  const password = 'E2E-throwaway-avatar-password-1!';

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);
  const authUserId = created.user.id;

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: authUserId,
    email,
    first_name: runSlug,
    last_name: 'Avatar Candidate',
    role: 'player',
    is_active: true,
  });
  if (playerError) {
    await supabase.auth.admin.deleteUser(authUserId);
    throw new Error(`Failed to create throwaway player row: ${playerError.message}`);
  }

  registerCleanup(async () => {
    const { data: objects } = await supabase.storage.from('avatars').list(authUserId);
    if (objects && objects.length > 0) {
      await supabase.storage.from('avatars').remove(objects.map((o) => `${authUserId}/${o.name}`));
    }
    await supabase.from('players').delete().eq('auth_user_id', authUserId);
    await supabase.auth.admin.deleteUser(authUserId);
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  const fileInput = page.locator('input[type="file"]');

  // Oversized: rejected client-side before any upload attempt.
  await fileInput.setInputFiles({
    name: 'too-big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(600 * 1024, 1),
  });
  await expect(page.getByText('Image size must be less than 500KB')).toBeVisible();

  // Wrong type: also rejected client-side.
  await fileInput.setInputFiles({
    name: 'not-an-image.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('definitely not an image'),
  });
  await expect(page.getByText('Please select an image file')).toBeVisible();

  const { data: playerBefore } = await supabase.from('players').select('profile_image_url').eq('auth_user_id', authUserId).single();
  expect(playerBefore?.profile_image_url).toBeNull();

  // Valid: small, correctly-typed -- accepted and actually persisted.
  await fileInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-but-small-png-bytes'),
  });
  await expect(page.getByText('Profile picture updated!')).toBeVisible();

  const { data: playerAfter } = await supabase.from('players').select('profile_image_url').eq('auth_user_id', authUserId).single();
  expect(playerAfter?.profile_image_url).toContain('/avatars/');
  expect(playerAfter?.profile_image_url).toContain(authUserId);

  const { data: objectsAfter } = await supabase.storage.from('avatars').list(authUserId);
  expect(objectsAfter?.length).toBeGreaterThan(0);

  await expect(page.locator('img[alt*="Avatar Candidate"]')).toBeVisible();
});
