import { test, expect } from '@playwright/test';
import { test as dataTest, expect as dataExpect } from '../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

/**
 * Phase 1: auth + gating. Lives in e2e/public/ -- runs under the public-* projects, which
 * have no storageState, so every test here starts logged out, which is exactly what's
 * needed to exercise the login form and anon-gating from a clean slate.
 */

const PLAYER_EMAIL = process.env.E2E_PLAYER_EMAIL!;
const PLAYER_PASSWORD = process.env.E2E_PLAYER_PASSWORD!;

test('successful login redirects to the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(PLAYER_EMAIL);
  await page.getByLabel('Password').fill(PLAYER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // See e2e/auth/admin.setup.ts: the real login flow takes ~6-7s (two sequential Supabase
  // round trips before the redirect fires), well past Playwright's default 5s assertion.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test('failed login shows an error and does not redirect', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(PLAYER_EMAIL);
  await page.getByLabel('Password').fill('definitely-the-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert').filter({ hasText: /invalid/i })).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login/);
});

dataTest('logging out returns to an anonymous session', async ({ page, runSlug, registerCleanup }) => {
  // Deliberately NOT using test-player@example.com here: Supabase's auth.signOut() default
  // scope is 'global', meaning it invalidates that account's session everywhere -- including
  // the persisted playwright/.auth/player.json every other player-role spec relies on. Using
  // a disposable throwaway account instead fully decouples this test from that shared state.
  const email = `${runSlug.toLowerCase()}-logout@example.com`;
  const password = 'E2E-throwaway-logout-password-1!';
  const supabase = getE2ESupabaseAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
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
    last_name: 'Logout Test',
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

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await dataExpect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // On mobile viewports the Logout button lives inside the hamburger drawer (MobileMenu),
  // which MUI only mounts once opened -- on desktop it's directly in the sidebar, and the
  // hamburger button itself is hidden (display: none) so this is a no-op there.
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await page.getByRole('button', { name: 'Logout' }).click();

  // Logged-out nav shows a Login link instead of the authenticated Dashboard/Admin links,
  // and a direct re-visit to a members-only route bounces back to /login.
  await dataExpect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await page.goto('/dashboard');
  await dataExpect(page).toHaveURL(/\/login/);
});

test('anonymous visitor is redirected to login from a members-only route', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('anonymous visitor is redirected to login from an admin-only route', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fdashboard/);
});
