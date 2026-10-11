import { randomUUID } from 'crypto';

/**
 * Prefix every piece of E2E-created display data with this -- a player's last name, a
 * course name, an event name, whatever field a human would actually see. Lets anyone glance
 * at test.patron-cup.com and instantly tell "a Playwright run made this" apart from real
 * friend-created data.
 */
export const E2E_PREFIX = 'E2E';

/**
 * One unique run-scoped token. Call once per test (via the `runSlug` fixture), not once per
 * file -- Playwright workers run tests in parallel processes, so a file-scoped constant
 * would collide across concurrent runs of the same spec.
 */
export function generateRunSlug(): string {
  return `${E2E_PREFIX}-${randomUUID().slice(0, 8)}`;
}

/**
 * Guard used by any cleanup helper before deleting a row: refuses to act on anything whose
 * name/label doesn't carry the E2E_PREFIX, even if the id is in our own tracked list. A
 * second, independent check against accidentally deleting real data.
 */
export function isE2EOwned(label: string | null | undefined): boolean {
  return Boolean(label?.includes(E2E_PREFIX));
}

/**
 * Hard deny-list. No test may ever delete, rename, or otherwise destructively modify these,
 * regardless of what isE2EOwned() says -- an id mix-up must never be able to take out the
 * seeded fixture set or the three reserved accounts every other spec depends on.
 */
export const E2E_FORBIDDEN_EMAILS = [
  'test-admin@example.com',
  'test-committee@example.com',
  'test-player@example.com',
] as const;

export function assertNotForbiddenEmail(email: string): void {
  if (E2E_FORBIDDEN_EMAILS.includes(email as (typeof E2E_FORBIDDEN_EMAILS)[number])) {
    throw new Error(
      `Refusing to modify/delete reserved test account ${email} -- this account is a hard dependency for every other spec's auth setup.`,
    );
  }
}
