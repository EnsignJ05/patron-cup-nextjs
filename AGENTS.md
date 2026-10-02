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

## Design system (Hi-Fi redesign)
The Hi-Fi redesign (`TEST_ENVIRONMENT_PLAN.md` Part III) migrates pages to `--pc-*` tokens
defined in `src/app/globals.css`, keyed on `[data-theme='light'|'dark']`. Reference
implementations: `page.module.css`, `faq/page.module.css`, `matches/page.module.css`.

- **Tokens:** `--pc-bg/card/card-2` (surfaces), `--pc-ink/ink-2/ink-3` (text, high→low
  emphasis), `--pc-rule/rule-2` (borders), `--pc-fill/fill-2` (subtle backgrounds),
  `--pc-team-a/team-b` (team colors), `--pc-live-bg/live-fg/live-dot` (live/in-progress
  state), `--pc-radius/radius-sm/radius-lg`, `--pc-shadow`.
- **Fonts:** `--pc-font-serif` (Newsreader) for display headings; `--pc-font-sans` (IBM Plex
  Sans) for body text and UI chrome; `--pc-font-mono` (JetBrains Mono) for numbers, stats,
  dates, and uppercase eyebrow/kicker labels.
- **Legacy CSS variables** (the un-prefixed vars elsewhere in `globals.css`) are being fully
  sunset, not kept as a permanent second system — delete each one once its last referencing
  page (including `/admin`) migrates. Don't add new usages.
- **MUI has no removal mandate.** Use MUI components wherever they're the pragmatic choice
  (forms, data-dense admin UI); use custom `--pc-*`-styled markup elsewhere. Consistency comes
  from the tokens, not from which library renders a piece of UI — reference them via a CSS
  module or an MUI component's `sx` prop (e.g. `sx={{ color: 'var(--pc-ink)' }}`), never a
  hardcoded value because the component happens to be MUI.
- **No hardcoded hex values** in any page's CSS or `sx` styling — public or admin. If a color
  isn't a token yet, add one; don't inline a hex value to work around it.

### Admin design system (`/admin/**`)
Admin has its own shared building blocks, global rather than per-page CSS modules since
they're reused across all 17 real admin routes (see `TEST_ENVIRONMENT_PLAN.md` section 17a/17b
for the full admin redesign plan).

- **Two extra tokens, admin-only:** `--pc-chip-bg` (badge background) and `--pc-shadow-strong`
  (dialog/sheet shadow, heavier than `--pc-shadow`).
- **Global CSS utility classes**, defined in `globals.css`'s "Admin design system" section:
  `.ad-card`, `.ad-row` (+ `.head`/`.hover`/`.sel`), `.ad-th`, `.ad-num`, `.ad-badge`, `.ad-ib`
  (icon button), `.ad-seg` (segmented control), `.ad-sk` (loading skeleton), `.ad-gcard`
  (dashboard nav tile), `.ad-pcard`/`.ad-slot` (drag-and-drop card + drop target), `.ad-dlg`/
  `.ad-dlg-h`/`.ad-dlg-f` (desktop dialog) and `.ad-sheet`/`.ad-grab` (its mobile bottom-sheet
  equivalent), `.ad-scrim`/`.ad-scrim.sheet`, `.ad-in`(+`.mono`/`.lg`/`.focus`), `.ad-lab`,
  `.ad-btn`(+`.p`/`.ok`/`.lg`, mobile), `.ad-chip` (mobile), `.ad-m-sticky` (mobile sticky
  action bar), `.ad-head`/`.ad-head-title`/`.ad-head-actions`/`.ad-crumb`,
  `.pc-d-actionbtn`(+`[data-primary='true']`, desktop action buttons like "Add Course"/"Save").
- **Shared components**, `src/components/admin/`: `AdminIcons.tsx` (`AIcon`/`AGrip`),
  `AdminHead.tsx` (breadcrumb + title + actions), `AdminField.tsx`, `AdminName.tsx`
  (avatar + team chip + name, for tables), `AdminScrim.tsx`. One responsive component per
  concern, not separate desktop/mobile component trees — same approach as every redesigned
  public page, via `@media (min-width: 1024px)` where a page needs it.
- **Admin nav taxonomy** lives once in `src/lib/adminNavGroups.ts` (`ADMIN_NAV_GROUPS`),
  consumed by both the sidebar (`src/app/layout.tsx`'s `DesktopSidebar`, which swaps to this
  nav when `isAdminPath(pathname)`) and the admin dashboard hub — don't duplicate the grouping
  in a third place.
- **Before building a new admin page**, check `TEST_ENVIRONMENT_PLAN.md` section 17a for
  whether a worked example already establishes its pattern (Courses → CRUD table; Handicaps →
  sortable/searchable table; Match Setup → drag-and-drop, re-skin only, never touch the
  `@dnd-kit` logic; the generic account-action form → Invite/Username, but Reset Password uses
  a richer variant) versus pages with no worked example at all (Teams, specifically) where a
  real design decision is still needed.

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
