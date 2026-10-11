import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient, createE2ESupabaseAnonClient } from '../../support/supabaseAdminE2E';

/**
 * Covers priority item #8's invite half: /api/admin/invite creates an auth user and a
 * players row together (with a rollback -- delete the just-created auth user -- if the
 * players write fails), and has two branches worth covering since they touch different data:
 * a brand-new email (insert a new players row) vs. an email that already has an orphaned
 * players row with no auth_user_id (update + link that row instead of creating a duplicate,
 * e.g. someone added to the roster by hand before their account exists).
 *
 * Not forcing the insert-failure rollback path directly (unlike change-username's spec) --
 * forcing the *new-player-insert* branch to fail without an existing-email conflict (which
 * the route already blocks earlier and non-destructively) would need a synthetic DB-level
 * fault with no real black-box trigger through the UI, unlike change-username's unique-email
 * collision which was reachable without any fault injection.
 */

test('invites a brand-new email, creating both the auth user and the players row in sync', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-newinvite@example.com`;
  const tempPassword = 'E2E-throwaway-invite-password-1!';

  registerCleanup(async () => {
    const { data: player } = await supabase.from('players').select('auth_user_id').eq('email', email).maybeSingle();
    await supabase.from('players').delete().eq('email', email);
    if (player?.auth_user_id) await supabase.auth.admin.deleteUser(player.auth_user_id);
  });

  await page.goto('/admin/invite');
  await page.getByLabel('First Name').fill(runSlug);
  await page.getByLabel('Last Name').fill('New Invite');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Temporary password').fill(tempPassword);
  await page.getByRole('button', { name: 'Send Invite' }).click();

  await expect(page.getByRole('alert').filter({ hasText: `Invite created for ${runSlug} New Invite` })).toBeVisible();

  const { data: player } = await supabase.from('players').select('auth_user_id, role, is_active').eq('email', email).single();
  if (!player) throw new Error('Expected a players row for the newly invited email');
  expect(player.auth_user_id).not.toBeNull();
  expect(player.role).toBe('player');
  expect(player.is_active).toBe(true);

  const { data: authUser } = await supabase.auth.admin.getUserById(player.auth_user_id!);
  expect(authUser.user?.email).toBe(email);

  const { data: profile } = await supabase.from('profiles').select('must_change_password').eq('id', player.auth_user_id!).single();
  expect(profile?.must_change_password).toBe(true);

  // Stronger than reading auth.users -- prove the temp password actually works end to end,
  // the same path a real first login takes.
  const anon = createE2ESupabaseAnonClient();
  const { error: signInError } = await anon.auth.signInWithPassword({ email, password: tempPassword });
  expect(signInError).toBeNull();
  await anon.auth.signOut(); // this is a disposable throwaway account's own session, not a shared one
});

test('rejects inviting an email that is already linked to an existing account', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-alreadylinked@example.com`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: 'E2E-throwaway-invite-password-2!',
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error(`Failed to create throwaway auth user: ${createError?.message}`);

  const { error: playerError } = await supabase.from('players').insert({
    auth_user_id: created.user.id,
    email,
    first_name: runSlug,
    last_name: 'Already Linked',
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

  await page.goto('/admin/invite');
  await page.getByLabel('First Name').fill(runSlug);
  await page.getByLabel('Last Name').fill('Duplicate Attempt');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Temporary password').fill('E2E-throwaway-invite-password-3!');
  await page.getByRole('button', { name: 'Send Invite' }).click();

  await expect(page.getByRole('alert').filter({ hasText: 'This email is already linked to an account.' })).toBeVisible();

  // No second auth user was created for this email -- the guard fired before any write.
  let page1 = 1;
  let matchingUserCount = 0;
  while (true) {
    const { data: userList } = await supabase.auth.admin.listUsers({ page: page1, perPage: 200 });
    matchingUserCount += (userList?.users ?? []).filter((u) => u.email?.toLowerCase() === email).length;
    if ((userList?.users ?? []).length < 200) break;
    page1 += 1;
  }
  expect(matchingUserCount).toBe(1);
});

test('inviting an email with an existing orphaned player row links that row instead of creating a duplicate', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const email = `${runSlug.toLowerCase()}-orphan@example.com`;
  const tempPassword = 'E2E-throwaway-invite-password-4!';

  // An orphaned row: added to the roster by hand before this person's account exists, same
  // shape as the decoy row in change-username's rollback spec.
  const { data: orphanPlayer, error: orphanError } = await supabase
    .from('players')
    .insert({
      auth_user_id: null,
      email,
      first_name: runSlug,
      last_name: 'Orphan Row',
      role: 'player',
      is_active: false,
    })
    .select('id')
    .single();
  if (orphanError || !orphanPlayer) throw new Error(`Failed to create throwaway orphan player row: ${orphanError?.message}`);

  registerCleanup(async () => {
    const { data: player } = await supabase.from('players').select('auth_user_id').eq('id', orphanPlayer.id).maybeSingle();
    await supabase.from('players').delete().eq('id', orphanPlayer.id);
    if (player?.auth_user_id) await supabase.auth.admin.deleteUser(player.auth_user_id);
  });

  await page.goto('/admin/invite');
  await page.getByLabel('First Name').fill(runSlug);
  await page.getByLabel('Last Name').fill('Orphan Row');
  await page.getByLabel('Email').fill(email);
  const roleSelect = page.getByLabel('Role');
  await roleSelect.selectOption('committee');
  await page.getByLabel('Temporary password').fill(tempPassword);
  await page.getByRole('button', { name: 'Send Invite' }).click();

  await expect(page.getByRole('alert').filter({ hasText: `Invite created for ${runSlug} Orphan Row` })).toBeVisible();

  // Still exactly one players row for this email -- the orphan was updated, not duplicated.
  const { data: playersForEmail } = await supabase.from('players').select('id, auth_user_id, role, is_active').eq('email', email);
  expect(playersForEmail).toHaveLength(1);
  expect(playersForEmail?.[0]?.id).toBe(orphanPlayer.id);
  expect(playersForEmail?.[0]?.auth_user_id).not.toBeNull();
  expect(playersForEmail?.[0]?.role).toBe('committee');
  expect(playersForEmail?.[0]?.is_active).toBe(true);
});
