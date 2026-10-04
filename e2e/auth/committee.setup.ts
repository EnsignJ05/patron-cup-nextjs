import { test as setup, expect } from '@playwright/test';

const COMMITTEE_EMAIL = process.env.E2E_COMMITTEE_EMAIL!;
const COMMITTEE_PASSWORD = process.env.E2E_COMMITTEE_PASSWORD!;
const authFile = 'playwright/.auth/committee.json';

setup('authenticate as committee', async ({ page }) => {
  if (!COMMITTEE_EMAIL || !COMMITTEE_PASSWORD) {
    throw new Error('E2E_COMMITTEE_EMAIL/E2E_COMMITTEE_PASSWORD are not set -- populate .env.e2e.local from .env.e2e.example.');
  }

  await page.goto('/login?next=%2Fadmin%2Fdashboard');
  await page.getByLabel('Email').fill(COMMITTEE_EMAIL);
  await page.getByLabel('Password').fill(COMMITTEE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.context().storageState({ path: authFile });
});
