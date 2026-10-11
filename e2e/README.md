# E2E tests

A Playwright suite that drives the real app in a real browser against the **test**
environment. Covers what Jest's jsdom-based unit tests can't: full page navigation, Supabase
Auth sessions, and multi-step UI flows. On-demand only — there's no CI in this repo, and this
suite is never wired into one. See `AGENTS.md`'s "Browser-level (E2E) tests" section for the
one-paragraph summary and the maintenance rule (update a spec when you change the UI it
covers).

## Setup (one-time)

```bash
npx playwright install        # downloads browser binaries
cp .env.e2e.example .env.e2e.local
```

Fill in `.env.e2e.local` from your password manager:
- `E2E_ADMIN_EMAIL`/`_PASSWORD`, `E2E_COMMITTEE_*`, `E2E_PLAYER_*` — the three reserved test
  accounts (see `AGENTS.md`'s Environments section for where credentials live).
- `E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY`/`E2E_SUPABASE_SERVICE_ROLE_KEY` — the
  `test_patron_cup` project's own values (same ones used by `.env.local` when it's correctly
  pointed at test, **not** production).

This file is gitignored and read only by `playwright.config.ts` — never by Next.js itself,
and never falls back to `.env.local`, which may point at a different project entirely.

## Running

```bash
npm run test:e2e           # deployed mode (default): drives https://test.patron-cup.com
npm run test:e2e:local     # local mode: builds + starts the app locally against the same
                            # test Supabase project, instead of the deployed site
npm run test:e2e:ui        # Playwright's interactive UI mode, useful while writing a spec
npm run test:e2e:headed    # headed run of deployed mode, useful for watching a flaky test
npm run test:e2e:report    # opens the HTML report from the last run
```

**When to use local mode:** faster iteration while writing new specs, or when you want to
test code that hasn't been pushed/deployed yet. **When to use deployed mode (the default):**
everything else — it's what's actually live, and it sidesteps ever needing to get the local
env override exactly right. Local mode runs a production build (`next build && next start`,
not `next dev`) for closer fidelity to what's deployed; expect the first run to be slow (a
full build happens before the server starts) — that's normal, not a hang.

**`reuseExistingServer` is on for local mode** (effectively always, since there's no CI
here). If you already have `npm run dev` or `npm run start` running on port 3000 from
something else, Playwright will happily reuse it — including if it's pointed at the wrong
project. Stop any existing dev/start process before running `test:e2e:local`, or verify what
the already-running instance is pointed at first.

## Directory layout

```
e2e/
  fixtures/        auth.fixtures.ts (multi-role contexts for journeys), test-data.fixtures.ts
  support/         namespace.ts, supabaseAdminE2E.ts, theme.ts
  auth/            admin.setup.ts, committee.setup.ts, player.setup.ts
  public/          one spec per public route
  player/          one spec per authenticated-player route
  admin/
    competition/   events, courses, matches, matches-setup, scores, handicaps, rerounds, ...
    people/        players, teams, participants
    trip/          travel, lodging
    accounts/      invite, reset-password, change-username
  journeys/        cross-role, multi-step flows
```

`admin/` is grouped to match `ADMIN_NAV_GROUPS` in `src/lib/adminNavGroups.ts`
(Competition/People/Trip/Accounts) and `AGENTS.md`'s admin section — the spec tree should
always be self-explanatory against both.

## Auth: setup projects + storageState, not per-test login

`e2e/auth/*.setup.ts` each log in once through the real `/login` form and save
`playwright/.auth/<role>.json` (gitignored). Every other project consumes the matching saved
state via its `use.storageState` in `playwright.config.ts` — specs never re-log-in through
the UI. If you need more than one role in a single test (e.g. an admin invites someone, then
that new account logs in), import the `test`/`expect` from `e2e/fixtures/auth.fixtures.ts`
instead of `@playwright/test` directly, and use its `adminContext`/`committeeContext`/
`playerContext` fixtures.

**`test-player@example.com` is special**: it's seeded with `must_change_password = true`,
specifically to keep the forced-password-change flow testable. `player.setup.ts` detects the
redirect to `/change-password` and clears the flag directly via the admin client so every
*other* player spec gets a normal session — it does not drive the change-password form
itself. `e2e/player/change-password.spec.ts` owns that flow end-to-end: it must set
`must_change_password` back to `true` itself before testing, and after changing the password
through the real UI, must reset both the password (via the admin client, not the UI) and the
flag back to their starting values in its own cleanup — otherwise the next run's
`player.setup.ts` login breaks.

## Namespacing and cleanup — read this before writing an invasive spec

**No spec may ever reset or wipe the whole test database.** Friends use
`test.patron-cup.com` manually too. `supabase/seed/seed-test.sql` is never referenced
anywhere in this directory or in any npm script — restoring a pristine state is a separate,
manual action the project owner takes themselves.

Instead, every spec that creates data follows this convention:

1. Import `test`/`expect` from `e2e/fixtures/test-data.fixtures.ts` (not `@playwright/test`
   directly) to get the `runSlug` and `registerCleanup` fixtures.
2. Prefix any human-visible name/label field with `runSlug` (e.g. a course name, an event
   name) — so a human glancing at the live site can immediately tell E2E-created data apart
   from anything real.
3. Call `registerCleanup(...)` **immediately after creating the row**, before any assertion
   that could throw. Cleanup runs after the test regardless of pass/fail, in reverse
   registration order — but only for callbacks that got registered, so ordering this after an
   assertion silently skips cleanup on failure.

```ts
import { test, expect } from '../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../support/supabaseAdminE2E';

test('admin can create and delete a course', async ({ page, runSlug, registerCleanup }) => {
  const courseName = `${runSlug} Test Course`;
  await page.goto('/admin/courses');
  // ...fill the form with courseName, submit...

  registerCleanup(async () => {
    const supabase = getE2ESupabaseAdminClient();
    await supabase.from('courses').delete().eq('name', courseName);
  });

  await expect(page.getByText(courseName)).toBeVisible();
});
```

Cleanup deletes via `e2e/support/supabaseAdminE2E.ts` directly (not through the UI), so it
still runs even if the delete button itself is broken.

### Cascades — the hard rule for anything touching delete buttons

Deleting one **event** cascades through courses, teams, matches, participants, lodging,
rerounds, round scores, travel info, and award nominations. Deleting one **player** cascades
through their roster/captain/match/travel/lodging/participant/nomination rows. These delete
buttons only became functional in Phase H (previously silent no-ops) and have real blast
radius.

- A delete-button spec may **only** delete an entity it created itself. For cascade-heavy
  entities (event, team, player, course, lodging), build a throwaway subtree first, then
  delete that.
- **Never delete or rename**: the seeded active event, the 2 seeded teams, or the 3 reserved
  accounts (`test-admin@`, `test-committee@`, `test-player@example.com`). See
  `assertNotForbiddenEmail`/`E2E_FORBIDDEN_EMAILS` in `e2e/support/namespace.ts`.

## Coverage policy: mobile + dark mode

**Mobile** is covered broadly via Playwright projects (`*-mobile`, using `devices['iPhone
13']`), not per-test duplication — the whole suite runs under both desktop and mobile by
default, matching `AGENTS.md`'s "mobile is critical" stance. That's a 2x, not a 4x.

**Dark mode is targeted, not a project multiplier.** Use `setTheme(page, 'dark')` from
`e2e/support/theme.ts` (call it *before* `page.goto`) in a handful of representative specs
only — one public page, one player page, one admin CRUD page, and the matches-setup page —
not across the whole suite. This is a deliberate choice to avoid a second multiplier on top
of the desktop/mobile one; don't "complete" coverage by adding it everywhere.

## `/admin/matches/setup` (dnd-kit board): visible-assertion only

Per the project's standing rule to never touch `TeeTimeBoard.tsx`'s `@dnd-kit` logic, its
spec tests only that the board renders the right initial grouping from seeded data — **no
synthesized mouse-drag sequences**. `@dnd-kit`'s own sensor/activation-constraint internals
make a realistic drag brittle to simulate, and "fixing" that brittleness is exactly the kind
of pressure on the dnd-kit logic this project has avoided throughout. If a keyboard- or
button-driven move affordance is ever added, test through that instead. Coverage of
post-drag *state* (does a swap compute the right `group_number`?) belongs in a Jest unit test
against `src/lib/matchSetupBoard.ts`'s pure functions — already ~93% covered there, which is
the right layer for it. This is a stated boundary, not a gap to "complete" later.
