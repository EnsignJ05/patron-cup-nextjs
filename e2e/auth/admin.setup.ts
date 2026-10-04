import { test as setup, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const authFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD are not set -- populate .env.e2e.local from .env.e2e.example.');
  }

  // next=/admin/dashboard so the post-login redirect (which otherwise always lands on
  // /dashboard, per LoginClient.tsx's effect) lands on the admin area directly.
  await page.goto('/login?next=%2Fadmin%2Fdashboard');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.context().storageState({ path: authFile });
});
