import { test as base, type BrowserContext } from '@playwright/test';

type Fixtures = {
  adminContext: BrowserContext;
  committeeContext: BrowserContext;
  playerContext: BrowserContext;
};

/**
 * For e2e/journeys/** specs that need more than one role in a single test (e.g. admin
 * invites a player, then that player logs in). Every other spec gets its role from its
 * Playwright *project*'s storageState (see playwright.config.ts) and doesn't need this --
 * opt in explicitly here only when a test genuinely needs two roles at once.
 */
export const test = base.extend<Fixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    await use(context);
    await context.close();
  },

  committeeContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/committee.json' });
    await use(context);
    await context.close();
  },

  playerContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/player.json' });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
