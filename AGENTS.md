# AGENTS

## Project Overview
- Next.js app using the App Router (`src/app`).
- Styling uses global CSS + CSS modules.
- Supports both light and dark modes.
- Mobile experience is critical; treat desktop as progressive enhancement, not the other way around.

## Coding Standards
- Prefer TypeScript types that are explicit and narrow.
- Keep components small and focused; extract helpers or hooks when logic grows.
- **DRY**: Avoid duplicating logic or UI; extract shared code into reusable utilities/components.
- Keep code human-readable: clear naming, small functions, and straightforward control flow.
- Use comments sparingly but meaningfully to explain non-obvious intent, trade-offs, or constraints.

## Testing
- Follow **Test Driven Development (TDD)** principles:
  - Write or update tests before implementing major new behavior.
  - Keep tests focused on behavior, not implementation details.
- Prefer lightweight unit tests for shared logic and critical components.
- Add regression tests when fixing bugs.

## UI/UX Expectations
- All new UI must work correctly in **both light and dark modes**; verify in both themes.
- **Mobile functionality is critical**:
  - Design and test for small screens first.
  - Avoid layouts or interactions that break on narrow widths.
- Maintain consistent spacing, typography, and interaction patterns with existing UI.
- Reuse existing layout patterns, components, and utility classes where possible.

## File/Folder Conventions
- App routes live in `src/app/**/page.tsx`.
- Components live close to their usage; prefer colocated CSS modules.
- Shared utilities and types should live in clearly named shared locations (e.g. `src/lib`, `src/components/common`), not copied into multiple routes.

## Route access posture

Enforced by `src/middleware.ts`'s matcher + `src/lib/authConfig.ts`'s `getAuthRedirectDecision`.
When adding a route that touches `players` data, decide explicitly which side of this line it
falls on — don't assume public.

- **Public (no login required):** `/`, `/faq`, `/roster`, `/matches`,
  `/itinerary`, `/teams`, `/tee-times`. These may only ever request the anon-safe player
  columns in `src/lib/playerColumns.ts` (`PUBLIC_PLAYER_SELECT`/`PUBLIC_PLAYER_EMBED`) —
  never `select('*')` or `player:players(*)` on `public.players`. Guarded by
  `src/__tests__/publicQuerySafety.test.ts`. (Note: `/scoreboard` is not yet a real route —
  `src/app/scoreboard/` is an empty directory reserved for the live-scoring feature; add it
  here once that ships.)
- **Members only (any authenticated role):** `/players/**`, `/dashboard/**`, `/change-password`.
- **Committee/admin only:** `/admin/**`.

`/players` and `/roster` intentionally overlap in purpose (both list players) — left as
duplication rather than consolidated, so each change stays small and reviewable.

## Environments and the branch workflow

Three environments, each with its own Supabase project — never point one environment's app
code at another's database:

| | Branch | Site | Supabase project |
|---|---|---|---|
| Local dev | (any) | `.env.local` | whichever project `.env.local` points at — default to the test project unless you specifically need prod data |
| Test | `test` | `test.patron-cup.com` | `test_patron_cup` |
| Production | `main` | `patroncup.com` | `Patron_Cup` (prod) |

**Branch flow:** feature branch → `test` (validate against real-shaped fake data) → `main`
(production), merged via a pull request — not a direct merge. Vercel deploys every branch
automatically; `test`'s and `main`'s env vars are scoped separately in the Vercel dashboard
(Preview+branch for `test`, Production for `main`), so the same codebase safely targets two
different databases depending on which branch triggered the build.

**Migration promotion rule — the schema's single most important discipline, given its own
history:** every schema change is a timestamped file in `supabase/migrations/`, committed to
git. Apply it to the **test** project first
(`psql` or `supabase db push --linked` against the test project ref), verify it against the
test site, and only then apply the identical file to **production**. Never hand-edit schema
directly in the production dashboard again — that exact practice is why the original schema
had to be reverse-engineered from a live `pg_dump` instead of being readable from migration
history (`TEST_ENVIRONMENT_PLAN.md` section 1.3).

**Test credentials** (three accounts — admin, committee, player — covering each `PlayerRole`)
live in the team password manager, not in this repo or any committed file. See
`TEST_ENVIRONMENT_PLAN.md` Part I Task 6.3 for how they were created, if new ones are needed.

## Notes for Agents
- Before large refactors, prefer incremental changes and preserve existing behavior.
- If unsure about behavior, favor minimal change and consistency with nearby code.
- When introducing new patterns (testing, UI, data flow), align with existing conventions or clearly improve on them.
