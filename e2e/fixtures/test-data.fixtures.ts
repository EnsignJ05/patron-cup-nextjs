import { test as base } from '@playwright/test';
import { generateRunSlug } from '../support/namespace';

type CleanupTask = () => Promise<void>;

type Fixtures = {
  runSlug: string;
  registerCleanup: (fn: CleanupTask) => void;
};

/**
 * Every invasive spec should use this `test` (not the bare `@playwright/test` one) and
 * follow the same two-step convention: prefix any human-visible name/label with `runSlug`,
 * then call `registerCleanup(...)` immediately after creating a row -- before any assertion
 * that could throw -- so a failed assertion never leaks data. See e2e/README.md for a
 * worked example.
 */
export const test = base.extend<Fixtures>({
  runSlug: async ({}, use) => {
    await use(generateRunSlug());
  },

  registerCleanup: async ({}, use) => {
    const tasks: CleanupTask[] = [];
    await use((fn) => tasks.push(fn));
    // Runs after the test, success or failure, in reverse-registration order (so a cleanup
    // that depends on a later-created row's cleanup running first doesn't fail).
    for (const task of tasks.reverse()) {
      await task().catch((err) => console.error('E2E cleanup failed:', err));
    }
  },
});

export { expect } from '@playwright/test';
