# Test Environment Implementation Plan

Goal: a fully isolated test site at `https://test.patron-cup.com` backed by its own
Supabase project, deployed from a long-lived `test` git branch on Vercel, so that
schema changes and feature work can be validated against realistic-but-fake data
before touching production.

**Audience:** this document is written to be executed by an engineer or a coding
agent with no prior context on this repo. Do the phases in order. Each task states
who performs it (Agent = can be done from the repo/CLI, Human = requires dashboard
or DNS access), the exact steps, and the acceptance criteria that prove it worked.

**This file has four parts.** Part I (sections 1–10) builds the test environment. Part II
(sections 11–14) remediates a live PII exposure found on 2026-09-27 and defines the tests
that prove it fixed. Part III (sections 15–19) completes the Hi-Fi redesign. Part IV
(sections 20–24) audits and hardens the database schema; it is **executed inside Part I**,
not after it — see section 20.1 for the exact task ordering, and section 23 for the edits it
makes to Part I's tasks. Part II is
**higher priority** than Part I and is written to be executable against production without
waiting for the test environment — but it depends on Part I's task 2.2, and its integration
tests need the test project from Part I. Read section 11.1 for the exact relationship.

Part III is the **lowest** priority of the three (product polish, not a vulnerability), but
it must come *after* Part II: both rewrite the same `players` queries, so doing Part III
first means rewriting the same page JSX twice. See section 15.1. Its one exception is task
R0 (dead-code removal), which is independent of everything and can ship immediately.

---

# Part I — Test environment

## 1. Current-state facts (verified 2026-09-27)

Read this section before doing anything; several tasks exist only because of these
specifics.

### 1.1 Stack
- Next.js `15.5.9` (App Router, `src/app`), React 19, TypeScript, MUI, Jest.
- Node `22` pinned in `.nvmrc`; `package.json` engines allow `>=18.14.0 <23 || >=24.0.0`.
- Hosted on Vercel (repo has `@vercel/analytics`; no `vercel.json`, not linked locally — no `.vercel/` dir).
- Backend is Supabase (Postgres + Auth + Storage). Single project today, used by both local dev and production.
- Git remote: `https://github.com/EnsignJ05/patron-cup-nextjs.git`. Main branch: `main`.
- There are **no GitHub Actions workflows** (`.github/` contains only `CODEOWNERS` and
  `instructions/snyk_rules.instructions.md`). Deployment is driven entirely by Vercel's
  native git integration, so no CI files need to be written for this work.

### 1.2 The entire environment surface is three variables
Every Supabase connection in the app is built from env vars — there are no hardcoded
project URLs anywhere in `src/`. Exhaustive list of `process.env` reads in app code:

| File | Vars read |
|---|---|
| `src/lib/supabaseBrowser.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabaseServer.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabaseAdmin.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `src/middleware.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

**Consequence: pointing the app at a different backend requires zero code changes.**
It is purely a matter of which values Vercel injects for the test deployment. Do not
add environment-detection branching, a `NEXT_PUBLIC_ENV` switch, or per-environment
client factories — they are not needed and would be a regression in simplicity.

`.env.local` (gitignored, local dev only) also contains `NEXT_PUBLIC_ADMIN_USERNAME`
and `NEXT_PUBLIC_ADMIN_PASSWORD`. These are **dead variables** — nothing in `src/`
reads them (they predate the Supabase-auth migration). Do not copy them into the test
environment. See task 7.3 for optional cleanup.

### 1.3 Migrations are incomplete AND partially untracked — two separate problems

**Problem A — no baseline schema.** `supabase/migrations/` contains only incremental
changes. Across all six files there are just two `CREATE TABLE` statements
(`public.match_results_pending`, `public.ceremony_award_nominations`); everything else
is `ALTER TABLE` against tables that already exist. The core tables were created by
hand in the Supabase dashboard and were never captured as SQL.

Tables referenced by app queries (from `.from('...')` calls in `src/`):
`players`, `profiles`, `events`, `event_participants`, `teams`, `team_rosters`,
`courses`, `matches`, `match_players`, `match_results_pending`, `match_bandon`,
`records_bandon`, `rerounds`, `lodging`, `lodging_assignments`, `travel_info`,
`ceremony_award_nominations`. Also `tee_times` (altered in migrations).
TypeScript row shapes for most of these live in `src/types/database.ts` — useful for
sanity-checking a dump, but **not** a substitute for real DDL (no constraints,
defaults, indexes, RLS, or triggers).

=> **A fresh Supabase project cannot be built by replaying `supabase/migrations/`.**
Phase 3 dumps the live production schema instead. This is the single most important
thing to get right.

**Problem B — `.gitignore` swallows new migrations.** Line 45 of `.gitignore` is
`/supabase`, which ignores the whole directory. Two migrations were committed before
that rule was added and remain tracked; the four newer ones are ignored and exist
**only on the primary developer's machine**:

| Migration | Git status |
|---|---|
| `20260127_invite_only.sql` | tracked |
| `20260201_players_auth_link.sql` | tracked |
| `20260404_match_results_pending.sql` | **untracked/ignored** |
| `20260404_players_ghin_columns.sql` | **untracked/ignored** |
| `20260408_ceremony_award_nominations.sql` | **untracked/ignored** |
| `20260527230000_event_participants_trip_planning.sql` | **untracked/ignored** |

=> The "apply to test, then promote to prod" workflow this plan establishes is
impossible while migrations are untracked. Phase 2 fixes this first.

### 1.4 Other Supabase surfaces that must exist in the test project
- **Storage bucket `avatars`** — `src/app/api/player/profile-image/route.ts` uploads to
  `avatars` at path `{auth_user_id}/{timestamp}.{ext}` and calls `getPublicUrl()`, so the
  bucket must be **public** with insert/update policies allowing an authenticated user to
  write under their own `auth.uid()` prefix.
- **Auth users** — `auth.users` is project-scoped, so test logins are entirely separate
  accounts. `public.profiles.must_change_password` gates the forced-password-change flow
  (`src/lib/authConfig.ts`, `src/middleware.ts`).
- **RLS** — `profiles` has RLS enabled with `profiles_select_own` / `profiles_update_own`
  policies and column-level grants (only `must_change_password` is updatable by
  `authenticated`). Other tables' RLS state is unknown from the repo alone and comes
  along with the schema dump in Phase 3.
- **No third-party integrations.** The only external URL in `src/` is a Google Calendar
  deep link in `src/components/shared/AddToCalendar.tsx`. Invites are created via
  `adminClient.auth.admin.createUser({ email_confirm: true })` in
  `src/app/api/admin/invite/route.ts` — no transactional email provider, no Stripe, no
  webhooks. There are no sandbox credentials to obtain for anything else.

### 1.5 Tooling gap
The Supabase CLI is **not installed** on the primary dev machine (`which supabase` →
not found). Phase 2 installs it.

---

## 2. Phase 1 — Prerequisites

### Task 1.1 (Human) Confirm access
Verify you can sign in to all of these before starting; the plan stalls without them.
- Supabase dashboard, with permission to create a new project in the org that owns the production project.
- Vercel dashboard, with access to the project serving `patroncup.com` (production is on a friend's `patroncup.com`; the test subdomain goes on `patron-cup.com`, which the user owns through Vercel — see task 5.1).
- DNS control for `patron-cup.com` (the user's own domain, managed through Vercel) — **not** `patroncup.com`, which belongs to someone else and is why the test site lives on a different domain entirely rather than a subdomain of production.
- GitHub `EnsignJ05/patron-cup-nextjs` push access.

### Task 1.2 (Human) Decide the Supabase plan/cost
A second Supabase project costs another slot. On the Free tier, projects **pause after
7 days of inactivity**, which is disruptive for a test site used sporadically (and this
project is seasonal — a golf trip site). Decide up front:
- Free tier: $0, accept that the test project may need un-pausing before use.
- Paid/Pro: test project stays warm.

Record the decision in this file's changelog (section 9) so it isn't relitigated.

**Acceptance:** access confirmed for all four systems; tier decision recorded.

---

## 3. Phase 2 — Make migrations trustworthy (do this before touching Supabase)

### Task 2.1 (Agent) Install the Supabase CLI
Do **not** add it to `package.json` dependencies (it is a dev machine tool, and the
Supabase team recommends against npm-global installs).

```bash
brew install supabase/tap/supabase
supabase --version   # expect 2.x
```

**If `brew install` fails with "Your Command Line Tools are too outdated"** (hit on this
machine 2026-09-28) — don't chase the Xcode CLT update or `sudo`; download the binary
directly instead, which has no CLT dependency:
```bash
curl -sL "https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz" -o /tmp/supabase.tar.gz
tar -xzf /tmp/supabase.tar.gz -C /tmp
mkdir -p "$HOME/.local/bin" && mv /tmp/supabase "$HOME/.local/bin/supabase"
chmod +x "$HOME/.local/bin/supabase"
# add $HOME/.local/bin to PATH in ~/.zshrc if not already there
supabase --version
```
Use `supabase_darwin_amd64.tar.gz` on Intel Macs.

### Task 2.2 (Agent) Stop gitignoring migrations
Edit `.gitignore` line 45. Replace the blanket `/supabase` with a rule that keeps local
CLI state out of git while tracking SQL:

```gitignore
# supabase local CLI state (keep migrations tracked)
/supabase/.branches
/supabase/.temp
/supabase/config.toml
```

Keep `/supabase/config.toml` ignored only if it ends up containing project refs you
don't want committed; otherwise tracking it is fine and preferable. Use judgment once
`supabase init` has produced it (task 4.2).

Verify, then commit the four rescued migrations:

```bash
git check-ignore -v supabase/migrations/20260527230000_event_participants_trip_planning.sql || echo "no longer ignored - good"
git status --short supabase/
git add .gitignore supabase/migrations/
git commit
```

Commit message should explain *why* (these migrations existed only on one machine).

**Acceptance:** `git ls-files supabase/migrations/ | wc -l` returns `6`.

### Task 2.3 (Human/Agent) Verify prod actually matches the migration files
The four rescued migrations may or may not have been applied to production. Before
using them as a source of truth, confirm against prod. Easiest path is the Supabase
dashboard SQL editor on the **production** project — spot-check the things those
migrations add, e.g.:

```sql
-- from 20260404_players_ghin_columns.sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'players' and column_name like '%ghin%';

-- from 20260527230000_event_participants_trip_planning.sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'event_participants';

-- tables created by migrations
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('match_results_pending','ceremony_award_nominations');
```

Note any drift (migration says X, prod doesn't have it, or vice versa) in section 9.
Drift does not block progress — Phase 3 dumps prod as-is — but it must be *known*.

**Acceptance:** drift list written down (may be "none found").

---

## 4. Phase 3 — Create the test Supabase project and clone the schema

### Task 3.1 (Human) Create the project
Supabase dashboard → New project, in the **same org** as production.
- Name: `patron-cup-test` (do not reuse the prod name with a suffix that's easy to misread).
- Region: same as production, to keep latency behavior comparable.
- Generate a strong DB password and store it in the team password manager immediately —
  it is shown once and is needed for `db push`/`psql`.

Record the project ref (the `abcdefgh...` string in the project URL) for both prod and
test in section 9. Several later commands need them, and mixing them up is the main
foot-gun in this whole plan.

### Task 3.2 (Agent) Dump the production schema
This replaces the missing baseline migration. Run against **production**, schema only,
no data. Write the dump to the repo so it becomes the tracked baseline.

```bash
supabase login
# link to PROD, then dump schema only
supabase link --project-ref <PROD_PROJECT_REF>
supabase db dump --linked -f supabase/migrations/00000000000000_baseline_schema.sql
```

Then review the dump before trusting it:
- It should contain `CREATE TABLE` for every table listed in section 1.4, plus
  constraints, indexes, sequences, functions/triggers, and `ALTER TABLE ... ENABLE ROW
  LEVEL SECURITY` + `CREATE POLICY` statements.
- `supabase db dump` covers the `public` schema by default. **Storage bucket definitions
  and auth users are NOT included** — those are handled in tasks 3.4 and 5.2.
- Strip or neutralize anything environment-specific if present (e.g. hardcoded project
  refs inside function bodies, `ALTER ... OWNER TO` lines referencing prod roles). Prefer
  minimal edits and note each one.

If `supabase db dump` is blocked (e.g. no direct DB connection allowed), fall back to
`pg_dump --schema-only --no-owner --no-privileges` using the connection string from
Supabase dashboard → Project Settings → Database. Pooler connection strings sometimes
reject `pg_dump`; use the direct connection (port 5432), not the pooler (6543).

**Before applying this dump anywhere, run Part IV task H0.** The dump is the input to the
schema audit, and H0 resolves two things that can break task 3.3 outright: whether
`public.tee_times` still exists (migration `20260201` creates policies on it — Part IV 20.6.3)
and whether the `is_admin()` / `is_committee_or_admin()` functions survived the dump, since
~30 policies call them and neither is in version control (Part IV 20.5.5).

Because the baseline is timestamped `00000000000000`, it sorts before the six existing
migrations. Those will then partly re-apply against a project that already has their
changes — that is fine and intended, because they are written defensively
(`add column if not exists`, `create table if not exists`, `drop policy if exists`).
**Verify that claim** while reviewing: any migration statement that is not idempotent
must be made so, or the baseline must be applied alone (see 3.3).

### Task 3.3 (Agent) Apply the schema to the test project
```bash
supabase link --project-ref <TEST_PROJECT_REF>
supabase db push --linked --dry-run   # inspect first
supabase db push --linked
```

Then apply the **Phase H hardening migrations** (Part IV section 22) to the test project, so
that everything downstream — seeding, smoke tests, the redesign work — is verified against the
hardened schema rather than the known-defective one.

If non-idempotent statements were found in 3.2, instead run only the baseline against
test via the dashboard SQL editor, and use `supabase migration repair` to mark the six
older migrations as already applied so future pushes behave.

**Acceptance:** in the test project's SQL editor,
```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```
returns the same list as the identical query run against production.

### Task 3.4 (done 2026-09-28) Recreate the `avatars` storage bucket

**Done via direct SQL instead of the dashboard**, once direct Postgres access was available
(same `~/.pgpass` connection used for task 3.2): `storage.buckets` is a normal table and
`storage.objects` RLS policies are normal `pg_policies` rows, so both can be read from
production and replayed on test exactly, with no manual dashboard clicking or risk of
fat-fingering a policy condition.

Queried production directly:
```sql
select id, name, public, avif_autodetection, file_size_limit, allowed_mime_types from storage.buckets;
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```
Found: bucket `avatars`, public, `file_size_limit = 512000` (matches the app's own 500KB
check in `src/app/api/player/profile-image/route.ts`), no MIME restriction at the bucket
level. Four policies scoped to `bucket_id = 'avatars'`: public `SELECT`, and
`authenticated`-only `INSERT`/`UPDATE`/`DELETE` each requiring
`auth.uid()::text = (storage.foldername(name))[1]` — i.e. a user may only touch objects
under their own `auth_user_id` folder prefix, matching the upload path the route already
constructs (`${user.id}/${fileName}`).

Replayed verbatim against test, then verified identical via the same two queries against
both projects. Captured as a migration for the same reason task 2.2 exists — this bucket
was originally created by hand on production and had never been versioned:
`supabase/migrations/20260928000000_avatars_storage_bucket.sql`.

**Acceptance (met):** bucket config and all 4 policies byte-identical between prod and test
per direct comparison. Functional upload test (an actual authenticated request) still
pending task 6.3's seeded test accounts. (Note `next.config.ts` already allows remote images
from `**.supabase.co`, so the test project's URLs need no config change.)

### Task 3.5 (Human) Confirm the test project's API keys
Project Settings → API. Supabase now surfaces new-format keys (`sb_publishable_…` /
`sb_secret_…`) alongside legacy JWT keys (`anon` / `service_role`). This repo's env var
names assume the legacy pair and `@supabase/ssr@0.8` works with them. **Copy the legacy
`anon` and `service_role` keys** so the test env mirrors prod exactly; do not mix key
formats between environments while establishing this baseline.

`service_role` bypasses RLS. Treat the test one as a real secret anyway — it will hold
realistic-looking data and lives behind a public URL.

---

## 5. Phase 4 — Vercel deployment for the test branch

### Task 4.1 (Agent) Create the long-lived `test` branch
```bash
git checkout main
git pull
git checkout -b test
git push -u origin test
```
Convention going forward: feature branch → `test` (validate on test.patron-cup.com) →
`main` (production). Document this in `AGENTS.md` as part of task 7.2.

### Task 4.2 (Human) Choose the Vercel wiring — one project, branch-scoped env
Use the **existing** Vercel project (not a second project). Vercel already builds every
pushed branch as a Preview deployment; the work is to give the `test` branch its own
environment values and a stable domain.

Vercel dashboard → the patroncup project → Settings → Environment Variables. For each
variable below, add it scoped to **Preview** and, using the "Branch" input, restrict it
to the `test` branch (Vercel supports per-branch overrides of Preview values):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | test project URL (`https://<TEST_REF>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | test project legacy `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | test project legacy `service_role` key |

Do **not** add `NEXT_PUBLIC_ADMIN_USERNAME` / `NEXT_PUBLIC_ADMIN_PASSWORD` (dead — see 1.2).

> **Critical check:** confirm that no *unscoped* Preview-environment variable pointing at
> **production** Supabase already exists. If one does, it may win or conflict for `test`
> builds, which would silently point the test site at production data — the worst possible
> outcome of this project. After the first deploy, verify via task 6.1 before letting
> anyone write data.

An alternative is Vercel's Custom Environments feature (a named `test` environment
instead of a branch-scoped Preview). Prefer branch-scoped Preview unless the account
already uses Custom Environments; fewer moving parts.

### Task 4.3 (Human) Deployment protection

**Reordered 2026-09-30, do this LAST, not here.** Originally written as a Phase 4 task, but
an incident moved it: while verifying task 5.1's DNS setup, a direct check of the deployed JS
bundle (`grep` for the `*.supabase.co` ref baked into `NEXT_PUBLIC_SUPABASE_URL` at build
time) showed `test.patron-cup.com` was serving a build wired to the **production** Supabase
project, not test — almost certainly because the branch-scoped env vars from task 4.2 were
added after the live deployment's last build, and Vercel only applies env var changes to new
builds. The user's response was to turn Vercel Authentication (SSO) **on**, immediately
cutting off everyone but themselves until the backend wiring is confirmed fixed — leaving it
public the whole time this was broken would have let anyone poke at it. That is the correct
instinct in general, not just for this incident: **keep deployment protection ON by default
through the rest of Part I, and only disable it as the final action, once task 6.1's
isolation check has passed.**

So: do not treat "decide public vs protected" as a one-time Phase-4 choice. Leave Vercel
Authentication **on** now. Revisit this task only after task 6.1 (prove isolation) passes
against a fresh deployment — at that point, Settings → Deployment Protection → either disable
protection for this environment, or add `test.patron-cup.com` as a protection bypass, per the
public-reachability decision already recorded in section 9.

One side effect worth planning for: with protection on, automated checks (including the
`curl`/JS-bundle check that caught this incident) get blocked by the SSO wall along with
everyone else. Either verify manually (log into the site in a browser, check the Network tab
for which Supabase host is called) or set up Vercel's **Protection Bypass for Automation** (a
secret token sent as the `x-vercel-protection-bypass` header) so automated verification can
continue without actually opening the site to the public.

**Acceptance:** pushing a commit to `test` produces a successful Vercel deployment, AND (new)
task 6.1 passes against that deployment before protection is ever turned off.

---

## 6. Phase 5 — Domain and auth URLs

### Task 5.1 (Human) Point `test.patron-cup.com` at the test branch
1. Vercel → project → Settings → Domains → Add `test.patron-cup.com`.
2. When prompted, assign it to the **`test` git branch** (not Production). This is what
   makes the subdomain track that branch's latest deployment instead of a one-off URL.
3. Add the DNS record Vercel shows — normally `CNAME test → cname.vercel-dns.com` — at
   whatever host manages `patron-cup.com` DNS (the user's own domain, through Vercel — this
   is a separate domain from production's `patroncup.com`, not a subdomain of it, since a
   friend owns that one). Do not guess the target; copy the exact value Vercel displays.
4. Wait for Vercel to report the domain as Valid (DNS propagation, minutes to hours).

**Acceptance:** `https://test.patron-cup.com` serves the app over valid TLS, and
`dig test.patron-cup.com` resolves.

### Task 5.2 (Human) Configure Supabase Auth for the test site
Test project → **Authentication** (its own top-level item in the dashboard's left sidebar,
the same level as Settings — not nested under it) → URL Configuration:
- **Site URL:** `https://test.patron-cup.com`
- **Redirect allow list:** add `https://test.patron-cup.com/**` and, for local dev against
  the test backend, `http://localhost:3000/**`.

**Verified 2026-09-30: this app currently has no code path that uses Site URL or the redirect
allow-list at all** — grepped for `resetPasswordForEmail`, `signInWithOAuth`, `signInWithOtp`,
`verifyOtp`, and any `redirectTo` usage across `src/`; none exist. Password resets go through
`src/app/api/admin/reset-password/route.ts`, which sets a temp password directly via the
admin API — no email link, no browser redirect. Invites similarly bypass email via
`email_confirm: true`. So configuring this correctly has no visible effect today on either
project (which is also why production getting away with its default, likely-unconfigured
value has never caused a problem) — it only matters if a future feature adds an email-link
or OAuth flow. Doing it correctly now costs nothing and avoids that flow silently pointing at
`localhost:3000` later.

Also review Authentication → Providers/Settings to match production (email provider
enabled, signups likely disabled since the app is invite-only via
`auth.admin.createUser`). Email confirmations are bypassed by `email_confirm: true` in
the invite route, so no SMTP setup is required for the invite flow to work — but note
that the built-in Supabase email service is heavily rate-limited, so avoid relying on
password-reset emails in test.

---

## 7. Phase 6 — Seed test data and users

Goal: enough realistic data to exercise the app, with **no real personal data copied
from production**. Do not clone prod rows wholesale — `players` holds real names,
emails, and GHIN numbers.

### Task 6.1 (Agent) Prove isolation before writing anything
Open `https://test.patron-cup.com`, and in the browser devtools network tab confirm
Supabase requests go to `uffvcocmlqoxakawnbaq.supabase.co` (test), not
`gqsfaxasmodlykeqvhuu.supabase.co` (prod). Do not proceed to seeding until this is confirmed —
this is the guard against the 4.2 failure mode.

**This exact failure mode occurred 2026-09-30**, caught by grepping the deployed JS bundle for
a `*.supabase.co` ref instead of using the browser: `curl` the page, extract `/_next/static/`
script paths, download them, and search for the pattern — faster than opening devtools, and
scriptable:
```bash
curl -s https://test.patron-cup.com -o /tmp/test_home.html
grep -oE '/_next/static/[^"]+\.js' /tmp/test_home.html | sort -u
# download each path found above, then:
grep -ohE "[a-z]{20}\.supabase\.co" /tmp/chunk_*.js | sort -u
```
This only works directly while Deployment Protection is off. With it on (which is now the
default stance per the reordered task 4.3), use `npx vercel curl <url>` in place of plain
`curl` — it auto-generates a deployment protection bypass token for the linked project and
gets through with no manual setup, including for downloading the JS chunk files themselves.
No separate bypass-header configuration was needed in practice.

**Actual root cause, found 2026-09-30 via `vercel env ls preview test`** (lists exactly what a
Preview build of a given branch would receive — more reliable than reading the dashboard
table by eye): it was not a stale-build timing issue as first suspected. Task 4.2 had only
been done one-third of the way — `NEXT_PUBLIC_SUPABASE_URL` was correctly scoped to
`Preview (test)`, but `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` had
never been added for that scope at all, only for `Production`. Exactly why the broken build
served a *valid-looking* production URL rather than crashing outright on the missing keys was
never fully explained — not worth chasing once the actual gap was found and fixed.

**Fix procedure that worked:** add the missing variable(s) with the correct scope → confirm
via `vercel env ls preview <branch>` that all required variables now appear (don't trust the
dashboard UI alone) → `vercel redeploy <existing-deployment-url> --target preview` to force a
fresh build without needing a new git push (the domain and branch aliases move to the new
deployment automatically) → re-run the JS-bundle-ref check via `vercel curl` → confirm the
correct ref appears. All of this is doable without disabling Deployment Protection at any
point.

### Task 6.2 (done 2026-10-01) Write a seed script
Create `supabase/seed/seed-test.sql` (or a `scripts/seed-test.ts` using
`createSupabaseAdminClient` against test env vars — pick whichever the executing engineer
can run more reliably; SQL run from the dashboard editor has fewer moving parts).

**Done as a SQL script, applied directly via the `~/.pgpass` psql connection from Part I.**
Not written after H5 as originally specified — Part IV's hardening migrations haven't shipped
yet (still the deliberate second pass per section 9's decision), so there are no composite
unique constraints to satisfy yet. If H5 ships later, re-check this script against the new
constraints before relying on it again.

One genuine Postgres syntax trap hit repeatedly while writing this, worth remembering: a
`WITH` clause containing a data-modifying statement (`INSERT ... RETURNING`) must lead the
**entire** statement — `INSERT INTO tmp (...) WITH ins AS (INSERT ... RETURNING id) SELECT ...`
is invalid; it must be `WITH ins AS (INSERT ... RETURNING id) INSERT INTO tmp (...) SELECT ...
FROM ins`. Also, a bare `INSERT ... RETURNING` cannot appear inline as a `FROM (...)`
subquery at all — only as a CTE. Both mistakes were made and fixed while building this script.

Final shape: idempotent via `TRUNCATE ... RESTART IDENTITY CASCADE` on `events`, `courses`,
`players` (truncating these three cascades through virtually every other seeded table via FK,
since they're all downstream of one of the three). One active event (19th Annual Patron Cup,
the real 2027 Streamsong trip per `src/app/page.tsx`'s `NEXT_TRIP`), the four real Streamsong
courses with hole data, 2 teams of 12, 24 players (21 clearly-fictional golf-pun names, plus 3
reserved accounts — `test-admin@example.com`, `test-committee@example.com`,
`test-player@example.com` — for Task 6.3), one player deliberately `status = 'inactive'` to
exercise the admin-picker bug from Part IV section 20.5.1, lodging + travel info for a subset,
9 matches across 2 of the 4 rounds (the other 2 rounds intentionally left empty, to also
exercise the "no matches yet" UI state), and `match_results_pending` rows covering all 5
`MatchResultsPendingStatus` values (confirmed this explicitly — an earlier pass only produced
4 distinct statuses, because a row inserted as `'cancelled'` was immediately overwritten to
`'superseded'` by the very next statement, silently losing that example; added a 9th,
untouched match specifically to carry a durable `'cancelled'` row).

The script also re-links the 3 reserved accounts' `auth_user_id` by email if those auth users
already exist, so re-running this seed after Task 6.3 has created them doesn't require
redoing that step.

Seed, in dependency order, referencing `src/types/database.ts` for column shapes:
1. `courses` (+ hole data) — at least the current trip's courses.
2. `events` — **one row with `is_active = true`**. This matters: the home page switches
   between pre-trip and on-trip states based on an active event
   (see `src/app/page.tsx`), so both states need to be testable. Seeding an active event
   plus the ability to flip the flag covers it.
3. `teams`, `team_rosters`.
4. `players` — obviously fake names, emails at a domain you control or
   `@example.com`, fake GHIN values. ~16–24 rows to resemble a real trip.
5. `event_participants`, `lodging`, `lodging_assignments`, `travel_info`, `tee_times`.
6. `matches`, `match_players`, and a few `match_results_pending` rows covering each
   status in `MatchResultsPendingStatus` so the admin approval flow is testable.
7. Optionally `rerounds`, `ceremony_award_nominations`.

`src/data/matches.json`, `src/data/teams.json`, and `src/data/rerounds.json` in the repo
are useful shape references for plausible fixture data.

Seeds must satisfy the constraints added in Part IV task H5 (composite uniques, CHECKs,
`NOT NULL` audit columns) — write the seed script **after** H5, or it will fail on insert.

Commit the seed script — it must be re-runnable after a schema reset. Make it idempotent
(explicit ids + `on conflict do nothing`, or a `truncate` preamble scoped to test).

### Task 6.3 (done 2026-10-01) Create test auth users
Auth users cannot be seeded with plain SQL safely. Either:
- Use the test project's dashboard → Authentication → Users → Add user (email +
  password, auto-confirm), then set `players.auth_user_id` to the new user's uuid; or
- Hit the app's own invite endpoint on the test site while signed in as a seeded admin —
  but that requires an admin to already exist, so bootstrap the first one via the
  dashboard.

**Done via a third option** — the Admin Auth API directly (`POST .../auth/v1/admin/users`
with the service-role key, `email_confirm: true`), the same mechanism
`src/app/api/admin/invite/route.ts` uses, just scripted instead of clicked. Created
`test-admin@example.com` (admin), `test-committee@example.com` (committee),
`test-player@example.com` (player) — the three emails Task 6.2's seed script already
reserved and auto-links by email. Re-ran the seed script afterward, which relinked all three
`players.auth_user_id` values and let `handle_new_user()`'s trigger create their `profiles`
rows automatically.

One wrinkle: `handle_new_user()` always creates a new profile with `must_change_password =
false`, so getting one account into the forced-change state required an explicit `UPDATE`
afterward (`test-player@example.com`) — added to the seed script itself so it survives a
future reseed, not just a one-off manual fix.

Credentials given directly to the user for their password manager, not recorded in this file
or anywhere in the repo, per this task's own instruction.

**Acceptance (met):** verified via Supabase's password-grant endpoint
(`POST .../auth/v1/token?grant_type=password`) that all three accounts authenticate
successfully, returned user ids matching exactly what was recorded at creation time. The
`/admin` → admin/committee allow, player → `/unauthorized` behavior was not re-tested live;
it's already covered by the Tier A middleware tests added during Part II (Task S3), which
directly exercise `getAuthRedirectDecision` against each role.

---

## 8. Phase 7 — Verification, docs, and the ongoing workflow

### Task 7.1 (split 2026-10-01: programmatic half done; visual half needs a human)
This checklist mixes two different kinds of checks. What follows is which is which, plus
one correction: **`/scoreboard` is not a real route** — `src/app/scoreboard/` is an empty
directory (confirmed via `find`), reserved for the not-yet-started live-scoring feature
(see `LIVE_SCORING_PLAN.md`). Its `404` is correct behavior, not a bug; it was a stale item
in this checklist, not something to fix here.

**Verified programmatically (via `vercel curl`, which bypasses Deployment Protection, plus
direct DB/Auth API checks):**
- [x] `/`, `/faq`, `/roster`, `/matches`, `/itinerary`, `/teams`, `/tee-times` all return `200`
- [x] `/dashboard` and `/players/<id>` correctly `307` to `/login` when unauthenticated
- [x] All three test accounts (Task 6.3) authenticate successfully via the password-grant
      endpoint
- [x] Network/bundle check confirms the test site's build references the test Supabase ref
      (`uffvcocmlqoxakawnbaq`) and production's references its own (`gqsfaxasmodlykeqvhuu`)
      — re-confirmed fresh today, not just carried over from the earlier incident
- [x] Production `patroncup.com` independently re-confirmed unaffected, still serving its
      own ref

**Backend/RLS behavior verified 2026-10-01, with real authenticated sessions against the
seeded data** (no browser tool was available in that session — no `claude-in-chrome` or
built-in browser was actually loaded despite appearing in the skill catalog, and `WebFetch`
can't carry Deployment Protection's bypass or real login cookies — so this substituted a
rigorous API-level check for the parts of "admin flows write successfully" and "avatar upload
succeeds" that don't strictly require pixels):
- [x] Committee/admin can write another player's row (`current_handicap` update, `204`);
      verified the new value actually persisted, not just a non-error status
- [x] A player **cannot** write another player's row — the request returns `200` with an
      empty result (RLS silently filters it, not an error), confirmed by checking the target
      row's value was unchanged
- [x] A player **can** write their own row (`bio` update, succeeded with full column access,
      correct for `authenticated`)
- [x] Full match-result flow end-to-end via the real RPCs, not a mock: `propose_match_result`
      (as `test-admin`, a match participant) → `finalize_match_result_from_pending` (as
      `test-committee`, a different participant, confirming) → verified the match's
      `winner_team_id`/`is_halved` were actually set and the proposal row shows
      `status='confirmed'`, `promoted_at` populated
- [x] Avatar upload through the real Storage API as `test-player`: upload to own folder
      succeeds (`200`), the result is publicly readable by `anon` (`200`, no auth header),
      and uploading into a *different* user's folder is correctly rejected
      (`"new row violates row-level security policy"`) — this is the first time task 3.4's
      bucket policies were tested with an actual upload rather than a policy-definition diff
- [x] Test data restored to its pristine seeded state afterward (re-ran the idempotent seed
      script), since the checks above legitimately wrote to match 5, Alex Fairway's
      handicap, and test-player's bio

**Still needs an actual human in a real browser** — purely visual/interactive, not
approximable via API:
- [ ] Home page's pre-trip vs on-trip visual state, and all pages' **dark mode** rendering
- [ ] **Mobile viewport** layout (per `AGENTS.md`, this is the priority surface, not an
      afterthought)
- [ ] The admin UI itself — the backend logic behind "create/edit a player, set up a match,
      enter a score, approve a pending result" is now proven correct (above), but the forms
      and buttons that drive it have not been clicked
- [ ] Avatar upload through the actual file-picker UI (the storage policy is now proven
      correct; the `<input type="file">` UX itself hasn't been exercised)
- [ ] Forced password-change **screen**, via `test-player@example.com` (seeded with
      `must_change_password = true`) — the middleware redirect to it is tested, the screen
      itself is not

Since Deployment Protection is still on, only the account owner can currently do this walk —
worth doing before deciding to make the site public.

### Task 7.2 (done 2026-10-01) Document the workflow in `AGENTS.md`
Add a short section covering:
- The branch flow: feature → `test` → `main`.
- Environments table: local (`.env.local`), test (`test` branch → test.patron-cup.com → `patron-cup-test`), production (`main` → patroncup.com → prod project).
- **Migration promotion rule:** every schema change is written as a timestamped file in
  `supabase/migrations/`, committed, applied to test via
  `supabase link --project-ref <TEST_REF> && supabase db push --linked`, verified on the
  test site, and only then applied to prod with the prod ref. Never hand-edit schema in
  the prod dashboard again — that is what caused the missing-baseline problem in 1.3.
- Where test credentials live (password manager, by name — not the values).

Keep it concise and consistent with the existing `AGENTS.md` tone.

### Task 7.3 (done 2026-10-01) Remove dead admin env vars
`NEXT_PUBLIC_ADMIN_USERNAME` / `NEXT_PUBLIC_ADMIN_PASSWORD` are unread by `src/` and
would have shipped a password to the browser under the `NEXT_PUBLIC_` prefix. Confirm
with a fresh `grep -rn "ADMIN_USERNAME\|ADMIN_PASSWORD" src/ .storybook/ *.ts *.mjs`
returning nothing, then delete them from `.env.local` and from any Vercel environment
where they are set. Treat the current values as compromised and rotate anything that
reuses them.

Do this as its own commit, separate from the test-environment work.

**Done.** Fresh grep confirmed zero references, as before. Removed both lines from
`.env.local` and ran `vercel env rm NEXT_PUBLIC_ADMIN_USERNAME production` /
`... NEXT_PUBLIC_ADMIN_PASSWORD production` (only ever existed in the Production scope — 493
days old, never added for Preview/test). Vercel's own removal confirmation independently
echoed this task's exact warning: *"Removing this variable from Vercel does not revoke the
credential. Rotate or disable it at its provider."* The actual values (`admin` /
`ThereIsNoSpoon99`) were surfaced to the user directly in chat, not written anywhere in the
repo, so they could judge whether that password is reused elsewhere and needs rotating there.
One mitigating factor worth recording: since no code ever referenced these vars, Next.js
would never have actually inlined them into a built client bundle — the `NEXT_PUBLIC_`
exposure risk was real in configuration but never realized in a shipped artifact.

### Task 7.4 (done 2026-10-01) Add `.env.example`
There is no template for the three required variables. Add a committed
`.env.example` listing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` with placeholder values and a comment noting that pointing
at the test project is the recommended default for local development.

---

## 9. Decisions and reference values (fill in as you go)

| Item | Value |
|---|---|
| Supabase tier decision (task 1.2) | Free tier (accepted 7-day idle pause risk) |
| Test project name | `test_patron_cup` |
| Prod project ref | `gqsfaxasmodlykeqvhuu` |
| Test project ref | `uffvcocmlqoxakawnbaq` |
| Repo visibility | Public — schema migrations tracked anyway; no secrets in DDL, real security is RLS not obscurity |
| Part IV hardening timing | Second pass — clone prod schema as-is to test first, harden against test afterward |
| Prod/migration drift found (task 2.3) | None — superseded by task 3.2's full `pg_dump`, which is stronger evidence than the originally-planned spot-check queries. All 4 previously-untracked migrations' effects (ghin columns, `match_results_pending`, `ceremony_award_nominations`, `event_participants` trip-planning columns) are present in the live schema |
| Baseline dump edits made (task 3.2) | 3: (1) removed `CREATE SCHEMA public` — always pre-exists; (2) commented out 8 trailing `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` statements — platform-locked role, fails as `postgres` user, already correct by default; (3) manually appended the `auth.users` → `handle_new_user()` trigger, which a `--schema=public` dump can't capture |
| Test site public or SSO-protected (task 4.3) | SSO-protected as of 2026-09-30; **isolation now proven (task 6.1 passed 2026-10-01)** — ready to flip to public whenever desired, just not done yet |
| Live `players` policies found on prod (11.5 q1) | `players_select_all` confirmed live, `{anon,authenticated}`, `USING (true)` — core vulnerability unchanged, fix still pending |
| `disable_signup` state on prod (11.5 q2) | _TBD_ — Task S1, not yet done |
| Real `players` column list (11.5 q3) | Matches section 11.7's planned safe-list exactly, no drift — confirmed 2026-10-01 via direct query |
| Tables found with RLS disabled (11.4 / old S5) | **None — RLS enabled on all 26 tables**, confirmed 2026-10-01. Task S5 rescoped accordingly |
| Existing anon column grants on `players` (11.5 q4) | `anon` holds SELECT/INSERT/UPDATE/REFERENCES on every column, no exceptions — confirms section 11.2's "Supabase default grants" theory as fact, not inference |
| S4 migration applied to test / prod (dates) | **Both done 2026-10-01.** Test: verified via seeded fake rows. Prod: PR #24 merged and deployed; independently verified S2/S3 were actually live (307 redirect on `/players/<id>`, exact `PUBLIC_PLAYER_COLUMNS` array present in the deployed bundle, no `select('*')` remaining) before applying the migration. All three acceptance checks pass on production; `/roster`, `/teams`, `/matches` confirmed still returning HTTP 200 |
| S5 migration applied to test / prod (dates) | **Both done 2026-10-01.** Verified with real rows on both (temporary rows inserted and cleaned up on test; existing historical rows checked-not-modified on production) — see Task S5 for the full verification writeup. Also satisfies Part IV task H2 items 1-2 |
| S5 public-vs-member classification approved by | _TBD_ — open committee question on `travel_info`/`lodging_assignments` only; everything else in that task needs no decision |
| S6 (`player_private`) applied to test / prod (dates) | **Both done 2026-10-01**, via PR #25. One unrelated production build failure along the way (`next/font/google` CDN flake, not a code issue — fixed by redeploying the identical commit, not by changing anything); verified the redeploy was genuinely running the new code before touching the database. All of Part II (S1-S7) is now live on both environments |
| Committee notified (S7) | Done — confirmed by user 2026-10-01 |

## 10. Known risks

1. **Test site writing to production data** — mitigated by task 4.2's unscoped-variable
   check and task 6.1's pre-seed verification. Highest-severity risk in this plan, and
   **it actually occurred on 2026-09-30**: the live `test.patron-cup.com` deployment was
   found serving a build wired to the production Supabase ref, not test. Caught before any
   seeding or test-account activity touched it, by checking the deployed JS bundle directly
   rather than trusting the dashboard config alone. Immediate response: Deployment Protection
   turned back on to cut off access while the wiring got fixed — see the updated task 4.3 and
   6.1 for the corrected procedure (protection stays on until isolation is proven, not a
   one-time Phase 4 choice).

   **Resolved the same day.** Root cause (found via `vercel env ls preview test`, not by
   re-reading the dashboard): task 4.2 had only been completed one-third of the way —
   `NEXT_PUBLIC_SUPABASE_URL` was correctly scoped to `Preview (test)`, but
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` had never been added for
   that scope at all. Fixed by adding both, confirming via the CLI (not the dashboard table)
   that all three now appear for `preview test`, then `vercel redeploy` to force a fresh build
   without a git push. Re-verified via `vercel curl` (works through Deployment Protection
   automatically — no manual bypass setup needed) against the fresh build's JS bundle: correct
   test ref (`uffvcocmlqoxakawnbaq`) now appears, production's does not.
2. **Schema drift between projects over time** — mitigated by the task 7.2 promotion rule.
   Re-dump and diff periodically if drift is suspected.
3. **Incomplete baseline dump** — RLS policies, triggers, or storage policies that don't
   survive the dump cause test-only failures that look like app bugs. Task 3.3's
   table-list comparison catches missing tables; policy differences need the task 3.4
   style comparison queries.
4. **Free-tier project pausing** — a paused test project makes the site appear broken.
5. **Real personal data leaking into test** — avoided by authoring fixtures rather than
   copying prod rows (task 6.2).
6. **Cloning a defective schema.** The production schema has known integrity, performance and
   RLS defects, plus two live bugs (Part IV section 20). Cloning it verbatim and hardening
   later means performing every migration twice — once on test, once on a prod database that
   by then holds another season of data. Part IV is sequenced inside this phase for that
   reason.
6. **Live PII exposure in production** — see section 11. This is an *existing* defect, not
   a risk introduced by this plan, and it outranks the test-environment work in priority.

---

# Part II — Security remediation: anonymous PII exposure

## 11. Findings (verified against code 2026-09-27)

### 11.1 How this relates to the test environment work

A third-party review (an LLM probing the live site) reported that `players` PII is readable
by unauthenticated callers. **That report was independently verified against this repo and
is accurate.** One additional exposure it missed was also found (`/teams`, see F4).

Relationship to Part I:
- **Do not block the fix on the test environment.** The exposure is live. Section 12 is
  written so it can be executed directly against production safely, in an order that
  never leaves the site broken.
- **Task 2.2 (stop gitignoring `supabase/`) is a hard prerequisite.** `.gitignore:45` is
  `/supabase`, so a new migration file added today would be untracked and invisible to
  everyone else. Do that task first — it is two minutes of work.
- Once the test project exists, section 13's Tier B tests become runnable, and they are
  the real proof the fix holds. Until then, Tier A (section 13.1) still catches regressions.

### 11.2 Root cause

Two independent controls are both missing, and each alone would have prevented this:

1. **Database:** `supabase/migrations/20260201_players_auth_link.sql:31-33` creates
   ```sql
   CREATE POLICY "players_select_all" ON public.players
     FOR SELECT USING (true);
   ```
   No `TO` clause, so the policy applies to `PUBLIC` — every role including `anon`.
   `USING (true)` admits every row. RLS is **row**-level only; it does not restrict
   columns. Combined with Supabase's default `GRANT ALL ... TO anon` on `public` tables,
   `anon` can read every column of every row.
2. **Application:** four anon-reachable code paths request `*` rather than the columns
   they render.

The login page is irrelevant to both. `src/middleware.ts:78` matches only
`['/admin/:path*', '/dashboard/:path*', '/change-password']`, and even for gated routes the
gate is on the *route*, not the table. The anon key is public by design (it is in the client
bundle); rotating it accomplishes nothing. **Do not rotate the anon key as a remediation
step** — it would invalidate sessions for no security benefit.

### 11.3 Exposure surfaces

All four run under the `anon` Postgres role for an unauthenticated visitor and return every
`players` column. Severity ordering is by what an attacker gets per request.

| ID | Location | Query | Notes |
|---|---|---|---|
| **F1** | `src/app/roster/page.tsx:27-31` | `from('players').select('*').eq('status','active')` | `'use client'`, anon key. Full table, one request. |
| **F2** | `src/app/players/page.tsx:29-33` | `from('players').select('*').eq('status','active')` | Same as F1; this page largely duplicates `/roster`. |
| **F3** | `src/app/players/[playerId]/page.tsx:35-39` | `from('players').select('*').eq('id',…)` | Server Component, but `createSupabaseServerClient()` uses the **anon key** (`src/lib/supabaseServer.ts`), so an unauthenticated request resolves to `anon`. |
| **F4** | `src/app/teams/page.tsx:55-59` | `from('team_rosters').select('*, player:players(*)')` | **Missed by the original report.** A nested embed leaks full player rows through a different table. Public page, no auth. |

Columns thereby exposed, per `src/types/database.ts:6-32`: `email`, `phone`,
`address_line1`, `address_line2`, `zip_code`, `ghin_number`, `shirt_size`,
`dietary_restrictions`, `emergency_contact_name`, `emergency_contact_phone`, `role`,
`auth_user_id`, plus the intended-public name/city/handicap fields.

**F3 is additionally a rendered-HTML leak, not only an API leak.** The page passes
`player.phone` and `player.ghin_number` into `DashboardProfileForm`
(`src/app/players/[playerId]/page.tsx:307-318`) with only `readOnly={!canEdit}` — read-only
still renders the values. The same page renders lodging building/room and roommate names
(`:195-227`). So phone, GHIN number, and room assignment are visible to anyone who opens the
URL, without any API knowledge. Any fix that only changes RLS and not this page is incomplete.

### 11.4 Secondary finding: tables with no RLS *migration file* — corrected, mostly good news

Originally written from a repo-only grep: `ENABLE ROW LEVEL SECURITY` wasn't found in
`supabase/migrations/` for `travel_info`, `lodging`, `lodging_assignments`,
`event_participants`, `team_rosters`, `match_players`, `rerounds`, `reround_signups`,
`team_captains`, `course_holes`, `round_scores`, `hole_scores`, `match_bandon`,
`records_bandon` — which raised the possibility they were fully open to `anon` (RLS disabled
+ default grants).

**Resolved 2026-10-01 against the live database (Task S0), via both a direct `pg_class` query
and the full policy list captured in Part I's `pg_dump`.** The absence from migration files
only meant these tables were created by hand in the dashboard, same as the core schema
(Part I section 1.3) — **RLS is enabled on all 26 tables with no exception**, and almost all
of them already have correctly-scoped policies:

| Tables | Actual live posture |
|---|---|
| `travel_info`, `lodging`, `lodging_assignments`, `event_participants`, `rerounds`, `reround_signups`, `team_captains`, `course_holes`, `round_scores`, `hole_scores` | SELECT policy is `TO authenticated` only. **Not anon-exposed.** Flight numbers, dates, and `confirmation_num` are member-directory-visible (any of the 54 can read any other's), same posture as `players`' email/phone post-fix — not the "wide open to the internet" scenario originally feared |
| `team_rosters`, `match_players` | SELECT policy is `TO authenticated, anon`. **Intentionally public** — matches this section's own original recommendation (names and pairings are meant to be public) |
| `match_bandon`, `records_bandon` | SELECT **and UPDATE** both granted `TO anon`, `USING (true)`, no `WITH CHECK`. **Confirmed real exposure** — already identified independently in the Part IV schema audit (section 20.5.3) as unauthenticated write access to the 2025 archive, with zero app code ever writing to either table |

So Task S5's actual remaining scope is much smaller than originally written: just the two
Bandon tables (plus `branson_roster`, found during Part IV, which exposes `email` to anon and
isn't in this list at all since it was missed by the original repo grep too). Everything else
in the original worry-list requires no action.

### 11.5 What could NOT be verified from the repo — verify these in the dashboard

State the answer to each in section 9's table before closing this work out.

1. **Live RLS policies.** Migrations are hand-applied via the SQL Editor (see the header
   comment at `supabase/migrations/20260201_players_auth_link.sql:2`) and four of six were
   untracked (section 1.3). Policies may have been edited in the dashboard and never
   captured. **The repo is not authoritative here.** Run:
   ```sql
   select policyname, roles, cmd, qual
   from pg_policies where schemaname = 'public' and tablename = 'players';

   select relname, relrowsecurity, relforcerowsecurity
   from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
   order by relrowsecurity, relname;
   ```
2. **`disable_signup`.** The original report claims `disable_signup: false`. This is a
   project-level Auth setting, not expressible in SQL or app code, so it is **unverifiable
   from the repo in either direction**. What *is* verifiable: there is no `supabase.auth.signUp()`
   call anywhere in `src` (`grep -rn "signUp(" src` → no matches), no signup form in
   `src/app/login/LoginClient.tsx`, and accounts are created only by
   `src/app/api/admin/invite/route.ts:29-131` via `auth.admin.createUser` behind an
   `isAdminRole` check. So invite-only is real *at the application layer* while the raw
   `POST /auth/v1/signup` endpoint may still be open. Task S1 settles it.
3. **Actual column list of `players`.** `src/types/database.ts` may drift from the real
   schema — evidence: five admin pages filter `.eq('is_active', true)` on `players`
   (e.g. `src/app/admin/teams/page.tsx:62`, `src/app/admin/travel/page.tsx:57`), but the
   `Player` type has no `is_active` field, only `status`. One of the two is wrong. Before
   writing the grant in Task S4, get the truth:
   ```sql
   select column_name, data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'players' order by ordinal_position;
   ```
   Any column found there but absent from section 11.7's list must be treated as private
   by default.
4. **Column grants already in place.**
   ```sql
   select grantee, privilege_type, column_name
   from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'players' and grantee in ('anon','authenticated');
   ```

### 11.6 Chosen design: column-level grants on `players`

**Decision: revoke `anon`'s table-wide SELECT and re-grant SELECT on a safe column subset.
Do not introduce a `public_players` view.**

Why column grants:
- **Nested embeds keep working.** `/teams` (F4) and `/matches`
  (`src/app/matches/page.tsx:296`) reach `players` *through* `team_rosters` /
  `match_players`. A view fixes nothing for those paths — they would each need rewriting to
  embed the view instead, and PostgREST embedding through a view requires an explicit FK
  relationship that does not exist. Column grants apply to every path into the table at
  once, including ones not yet written.
- **Fail-closed.** Once `anon` lacks table-wide SELECT, `SELECT *` raises
  `42501 permission denied for table players` rather than silently succeeding. A future
  `select('*')` on a public page breaks loudly in test instead of leaking quietly in prod.
- **The team already uses this technique** — `supabase/migrations/20260127_invite_only.sql:25-26`
  does exactly this on `profiles` (`revoke update on public.profiles from authenticated;
  grant update (must_change_password) on public.profiles to authenticated;`). It was simply
  never applied to `players`.
- A public-schema view exposed through PostgREST also trips Supabase's
  `security_definer_view` linter and needs `security_invoker` reasoning that is easy to get
  subtly wrong.

**Verify the fail-closed premise empirically before relying on it** (first test in 13.2).
The design assumes PostgREST passes `*` through to Postgres, which then denies the whole
statement. If instead PostgREST narrows `*` to permitted columns, the grant still contains
the leak but stops being self-announcing, and the Task S2 code changes become the primary
control rather than a backup. Either way the grant is correct; only the test assertion changes.

### 11.7 The authorization model after remediation

Three tiers. Write this down because it is the thing to hold the implementation against:

| Role | `players` access |
|---|---|
| `anon` | SELECT on the safe column list only, all rows |
| `authenticated` | SELECT on all columns, all rows (a member directory) |
| `service_role` | unrestricted (bypasses RLS; used only in `src/app/api/**` routes) |

**Safe column list — the canonical definition.** Derived from what public pages actually
render (F1–F4 plus `src/app/matches/page.tsx:296`):

```
id, first_name, last_name, current_handicap, ghin_club, city, state, profile_image_url, status
```

Notes on inclusions and exclusions, so nobody re-litigates them:
- `status` is included **because it is filtered on**, not rendered. `.eq('status','active')`
  in F1/F2 requires SELECT privilege on `status`; a WHERE-clause reference needs the grant
  just like a projected column does. Omitting it breaks the roster.
- `last_name` is required for `.order('last_name')` (F1, F2) and `.order('player(last_name)')`
  (F4), for the same reason.
- `role` is **excluded.** It tells an outsider which accounts are worth attacking. Nothing
  public renders it.
- `auth_user_id` is **excluded.** It is an internal auth join key.
- `ghin_club` (a club *name*) is included; `ghin_number` (a personal identifier) is excluded.
- `bio`, `country`, `created_at`, `updated_at` are excluded — not private, but nothing public
  renders them, and the default is deny.

**Accept explicitly:** any logged-in member can still read every member's email and phone.
That is a deliberate posture for a 54-person invite-only trip — it is a directory, and those
54 people are exactly the data subjects. It reduces the audience from *the internet* to *the
invited group*. It also means **Task S1 (disable signup) is load-bearing, not optional**: if
anyone can self-register, they promote themselves into the `authenticated` tier and the fix
is void. Do S1 first. Task S6 offers a stricter model if the committee wants one.

---

## 12. Phase S — Remediation tasks

> **Ordering is a correctness requirement, not a preference.** Task S2 (code: request
> explicit columns) must ship **before** Task S4 (SQL: revoke the grant). Explicit-column
> queries work fine under today's permissive grants, so S2 is a safe no-op deploy; doing S4
> first would 403 every public page until the code caught up. Never reverse them.

Suggested sequencing: S0 → S1 → S2 → S3 → S4 (same day, in that order) → S5 → S7, with S6
as a follow-up. S1 alone is a 2-minute dashboard change and should not wait for the rest.

### Task S0 (done 2026-10-01) Prerequisites
1. **Task 2.2 complete** (done during Part I) — migrations are tracked, no longer swallowed
   by `.gitignore`.
2. All four section 11.5 queries run directly against production via the `~/.pgpass`
   connection already set up in Part I (no dashboard needed). Results:

   - **Query 1 (live `players` policies):** confirms `players_select_all` is exactly as
     documented — `{anon,authenticated}`, `USING (true)`, no column restriction. The core
     vulnerability is live, unchanged, still open.
   - **Query 1b (RLS enabled state, all 26 tables):** **`relrowsecurity = true` on every
     single table** — RLS is not disabled anywhere. This corrects section 11.4's worst-case
     framing (see the update there): the "secondary finding" tables are not wide open, they
     already have policies scoped to `authenticated` only. Section 11.4 and Task S5 are
     revised accordingly.
   - **Query 3 (actual `players` columns):** matches section 11.7's planned safe-list
     exactly — `id, first_name, last_name, current_handicap, ghin_club, city, state,
     profile_image_url, status` all exist with the expected names/types. **No drift, no
     changes needed to the Task S4 migration's column list.**
   - **Query 4 (existing column grants):** `anon` currently holds `SELECT, INSERT, UPDATE,
     REFERENCES` on **every column** of `players`, no exceptions — exactly the "Supabase
     default grants on a new table" pattern section 11.2 describes, confirmed rather than
     inferred. The blanket INSERT/UPDATE grant is not currently exploitable (no RLS policy
     grants `anon` either operation), but Task S4 step 3's defense-in-depth revoke is
     correctly scoped to close it anyway.
   - **Query 2 (`disable_signup`):** still unverifiable by SQL by nature — this is Task S1.

**Acceptance (met):** `git check-ignore supabase/migrations/` reports nothing; section 9 has
real values for all four unknowns (recorded there now).

### Task S1 (Human) Disable self-service signup — do this first
Production Supabase dashboard → Authentication → Sign In / Providers → Email → turn **off**
"Allow new users to sign up" (the API field is `disable_signup`; the dashboard label varies
by version). Repeat on the test project once it exists (Part I task 5.2 already mentions this).

Verify from a terminal — this must fail after the change:
```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"probe-'"$(date +%s)"'@example.com","password":"Probe-Passw0rd!"}'
```
Expect an error such as `{"code":422,"msg":"Signups not allowed for this instance"}`.
If it returns a user object, signup is still open — **delete that user** in the dashboard
(Authentication → Users) and fix the setting before continuing.

No code change is needed: the app never calls `signUp()`, and invites go through
`auth.admin.createUser` with the service-role key, which is unaffected by this setting.

**Acceptance:** the curl above is rejected on both projects; no probe user remains.

### Task S2 (done 2026-10-01) Request only the columns that are rendered
Ship this before S4.

**Implemented as written, plus one TS workaround worth knowing about.** `PUBLIC_PLAYER_SELECT`
(`PUBLIC_PLAYER_COLUMNS.join(', ')`) has the type `string`, not a string literal — `.join()`
always widens. `postgrest-js` statically parses `.select()`'s argument *as a literal type* to
infer the result shape, so passing a widened `string` makes it fall back to a
`GenericStringError` sentinel type instead of inferring anything, which then fails to satisfy
`PublicPlayer[]`. Fix applied at each call site: declare the result type explicitly on the
generic instead of relying on string-literal inference —
`.select<string, PublicPlayer>(PUBLIC_PLAYER_SELECT)`. No change needed to the shared column
list itself. `matches/page.tsx:296`'s player embed was already explicit
(`id, first_name, last_name, profile_image_url`) and needed no edit.

**Verified:** `npx tsc --noEmit` clean (2 pre-existing failures in untouched files elsewhere);
`npm test` 149/149; the acceptance grep below returns nothing.

**S2a — define the column list once.** Per `AGENTS.md`'s DRY rule, do not paste the list
into four files. Create `src/lib/playerColumns.ts`:

```ts
import type { Player } from '@/types/database';

/**
 * Columns `anon` is granted SELECT on for public.players (see
 * supabase/migrations/20260927120000_players_pii_column_grants.sql).
 * Must stay in sync with that grant: a column here but not in the grant 403s for
 * anonymous visitors; a column in the grant but not here is needlessly exposed.
 */
export const PUBLIC_PLAYER_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'current_handicap',
  'ghin_club',
  'city',
  'state',
  'profile_image_url',
  'status',
] as const;

export type PublicPlayerColumn = (typeof PUBLIC_PLAYER_COLUMNS)[number];

export type PublicPlayer = Pick<Player, PublicPlayerColumn>;

/** PostgREST `select=` string, e.g. for `.select(PUBLIC_PLAYER_SELECT)`. */
export const PUBLIC_PLAYER_SELECT = PUBLIC_PLAYER_COLUMNS.join(', ');

/** Same list shaped for a nested embed, e.g. `player:players(${PUBLIC_PLAYER_EMBED})`. */
export const PUBLIC_PLAYER_EMBED = PUBLIC_PLAYER_COLUMNS.join(',');
```

`PublicPlayer` deliberately has no `email`/`phone` field, so a component that tries to read
one fails typecheck rather than rendering `undefined`.

**S2b — apply it at the four sites.**

| File | Change |
|---|---|
| `src/app/roster/page.tsx:29` | `.select('*')` → `.select(PUBLIC_PLAYER_SELECT)`; change state type `Player[]` → `PublicPlayer[]` (`:19`) |
| `src/app/players/page.tsx:31` | same; state type at `:21` |
| `src/app/teams/page.tsx:57` | `'*, player:players(*)'` → `` `*, player:players(${PUBLIC_PLAYER_EMBED})` ``; narrow `TeamWithPlayers` (`:10-12`) to `PublicPlayer` |
| `src/app/players/[playerId]/page.tsx:37` | `.select('*')` → an explicit list. This page is being gated in S3, so it may keep private columns — but list them explicitly anyway, and see S3 for which are safe to render. |

Then run `npx tsc --noEmit`. Typecheck errors are the point: each one is a place that was
reading a column the public list does not carry. Fix by removing the rendering, not by
widening the list.

**Do not touch** `src/app/admin/**` or `src/app/api/**`. Admin pages run as `authenticated`
(gated by `src/middleware.ts:78`) and legitimately need full rows; API routes use the
service-role client. Narrowing them is out of scope and risks breaking admin flows.

**Acceptance:** `grep -rn "players(\*)\|from('players')[^)]*select('\*')" src/app/roster src/app/players src/app/teams src/app/matches` returns nothing; `npx tsc --noEmit` clean; `npm test` green.

### Task S3 (done 2026-10-01) Put `/players/**` behind auth
F3 renders phone, GHIN number, and room assignment to anonymous visitors in HTML. Fixing the
query alone is not enough; the route should not be anonymous at all.

**`getAuthRedirectDecision` needed no code change** — confirmed by tracing it and by the new
tests in 13.1d: a `/players/...` pathname doesn't match `isAdminPath` or `isDashboardPath`, so
it already falls through to `null` (allow) for any authenticated role, and to a `login`
decision when unauthenticated. The only actual change was the one-line matcher edit below.
Also wrote the full Tier A suite (13.1a–e) at the same time, since S2 had shipped without its
guard tests — see that section for what was added and the revert-to-prove-it-works check.

Edit `src/middleware.ts:78`:
```ts
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/players/:path*', '/change-password'],
};
```
`:path*` matches zero-or-more segments, so this covers both `/players` and `/players/<id>`.

Resulting route posture — record it in `AGENTS.md` as part of Part I task 7.2:
- **Public:** `/`, `/faq`, `/roster`, `/matches`, `/scoreboard`, `/itinerary`, `/teams`,
  `/tee-times` — all limited to the safe column list by the S4 grant.
- **Members only:** `/players/**`, `/dashboard/**`, `/admin/**`, `/change-password`.

Two consequences to handle:
1. `/roster` remains the public directory and renders only name, handicap, city/state —
   already true (`src/app/roster/page.tsx:75-77`), and it does not link to `/players/<id>`.
2. `/players` (F2) is now member-only and nearly duplicates `/roster`. Leave the duplication
   alone for now — consolidating is a separate change and this task should stay reviewable.
   Note it as follow-up.

Confirm `src/lib/authConfig.ts`'s `getAuthRedirectDecision` returns a sane decision for a
`/players/...` pathname with `role: 'player'` (it should allow, not redirect to
`/unauthorized`); add a case if it does not. Cover it with the test in 13.1d.

**Acceptance:** anonymous `curl -sI https://<host>/players/<known-id>` returns 307 to
`/login?next=/players/<known-id>`; a logged-in player-role account still loads the page.

### Task S4 — done. Applied and verified on test 2026-10-01, then production the same day

**The migration shipped to `test` exactly as written below and passed every acceptance check.**
Seeded two fake player rows (full PII populated) directly in the test project to prove it
against real rows, not an empty table:

```bash
# select=* and select=email
{"code":"42501","details":null,"hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.players TO anon;","message":"permission denied for table players"}
# HTTP status: 401 (not 403 -- resolves the open question in section 11.6/14)

# select=first_name,last_name,current_handicap
[{"first_name":"Test","last_name":"Golfer","current_handicap":8.4},
 {"first_name":"Fake","last_name":"Player","current_handicap":12.1}]
# HTTP status: 200, no PII fields present
```

**Production is correctly NOT done yet — a real blocker, not just ordering caution.** Checked
`git log origin/main..test` before touching anything: **S2 and S3 have never been pushed to
`origin`, let alone merged into `main`.** Production's deployed code still sends `select('*')`
on every request. Applying this migration to production *right now* would make every one of
those requests fail with `42501` — breaking `/roster`, `/players`, `/teams` live, for real
visitors, immediately. This is section 12's ordering rule actually mattering, not a
theoretical "don't reverse the steps" warning.

**Path to production, per user direction:** merged via PR #24 (`test` → `main`), pushed, and
deployed. **Before applying anything to production's database, independently verified S2/S3
were actually live** rather than trusting the merge/deploy alone:
- `curl -sI https://patroncup.com/players/<real-id>` → `307` to `/login?next=...` (S3 live)
- Downloaded the deployed `/roster` page's JS chunk and found the literal
  `["id","first_name","last_name","current_handicap","ghin_club","city","state","profile_image_url","status"]`
  array baked in, and zero occurrences of `select('*')` anywhere in it (S2 live)

Only then applied the migration to production. Same three acceptance checks, same result as
test:
```
select=*              -> HTTP 401, {"code":"42501",...,"message":"permission denied for table players"}
select=email           -> HTTP 401
select=first_name,last_name,current_handicap -> HTTP 200, real names (already-public roster
                                                  data), no PII fields
```
`/roster`, `/teams`, `/matches` all independently confirmed still returning HTTP 200
afterward. **The exposure is closed on both environments.** Remaining Part II work is S5 (the
much-reduced Bandon/branson_roster fix, shareable with Part IV task H2), S6 (optional,
moving never-public columns out of `players`), and S7 (telling the committee).

### Task S4 — the migration itself
Write `supabase/migrations/20260927120000_players_pii_column_grants.sql`. Adjust the column
list only if section 11.5 query 3 found different names.

```sql
-- Restrict anonymous access to public.players to non-PII columns.
--
-- Context: "players_select_all" (20260201_players_auth_link.sql) was created with no TO
-- clause and USING (true), so it applied to PUBLIC including anon. RLS is row-level only,
-- so combined with Supabase's default table-wide grants, anon could read every column --
-- email, phone, ghin_number, emergency contacts -- via one PostgREST request.
--
-- Column-level GRANT is the control here, not RLS. Same technique already used on
-- public.profiles in 20260127_invite_only.sql.
--
-- Requires the app to request explicit columns first: anon SELECT * now raises 42501.

-- 1. Row policies, split by role.
drop policy if exists "players_select_all" on public.players;

drop policy if exists "players_select_anon" on public.players;
create policy "players_select_anon" on public.players
  for select to anon using (true);

drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated" on public.players
  for select to authenticated using (true);

-- 2. Column privileges: the actual fix.
revoke select on public.players from anon;
grant select (
  id,
  first_name,
  last_name,
  current_handicap,
  ghin_club,
  city,
  state,
  profile_image_url,
  status
) on public.players to anon;

-- 3. anon has no business writing here; RLS already blocks it, this is defence in depth.
revoke insert, update, delete on public.players from anon;

-- 4. Members keep full read access (see section 11.7). Explicit so a future
--    "revoke all from authenticated" cannot silently break the app.
grant select on public.players to authenticated;
```

Two points the executor must not get wrong:
- **Row policies stay `using (true)` for both roles.** The vulnerability is columns, not rows.
  Adding `status = 'active'` for anon would additionally drop inactive players out of
  `/teams` (F4 does not filter on status), changing behaviour beyond the security fix. Keep
  the diff scoped.
- **Never `revoke ... from service_role` or from `postgres`.** The API routes in
  `src/app/api/**` depend on the service-role client (`src/lib/supabaseAdmin.ts`), and
  breaking it breaks invites and password resets.

Apply to **test first** if the test project exists, run section 13.2, then production:
```bash
supabase link --project-ref <TEST_PROJECT_REF> && supabase db push --linked
# run npm run test:rls, confirm green, then:
supabase link --project-ref <PROD_PROJECT_REF> && supabase db push --linked
```
If the test project does not exist yet, paste the SQL into the production SQL Editor — but
only after S2 and S3 are deployed and verified live.

**Acceptance:**
```bash
# must fail with 42501
curl -s "https://<REF>.supabase.co/rest/v1/players?select=*" -H "apikey: <ANON_KEY>"
# must fail
curl -s "https://<REF>.supabase.co/rest/v1/players?select=email" -H "apikey: <ANON_KEY>"
# must succeed, and contain no email/phone keys
curl -s "https://<REF>.supabase.co/rest/v1/players?select=first_name,last_name,current_handicap" -H "apikey: <ANON_KEY>"
```
Plus: `/roster`, `/teams`, `/matches` still render player names in a logged-out browser.

### Task S5 (done 2026-10-01) Close the un-policied tables — scope reduced, then completed

**Re-scoped after Task S0's live verification.** Most of this task turned out to already be
done — see the corrected section 11.4. What's actually left:

**No action needed, pending one judgment call:** `travel_info`, `lodging`,
`lodging_assignments`, `event_participants`, `rerounds`, `reround_signups`, `team_captains`,
`course_holes`, `round_scores`, `hole_scores` already have RLS enabled with SELECT scoped to
`authenticated` only — functionally the same "member directory" posture section 11.7
*explicitly accepts* for `players`' email/phone (any of the 54 invited members can read any
other's data; the public internet cannot). If that acceptance stands for `players`, it
already covers these tables too, and no migration is needed here at all.

The one open question worth taking to the committee: do flight numbers/dates
(`travel_info`) and a lodging `confirmation_num` warrant *tighter* than the `players` email
directory precedent — i.e. own-row + committee-only, rather than any-member-can-read? The
original own-row pattern is preserved below in case the answer is yes:
```sql
-- Only if the committee wants travel_info/lodging_assignments tighter than the
-- players-directory precedent. Not required by anything else in this plan.
drop policy if exists "travel_info_select_all" on public.travel_info;
drop policy if exists "travel_info_select_own_or_committee" on public.travel_info;
create policy "travel_info_select_own_or_committee" on public.travel_info
  for select to authenticated using (
    player_id = public.current_player_id()
    or public.is_committee_or_admin()
  );
```

**Done 2026-10-01 — this also satisfies Part IV task H2; do not redo it there.** Written as
`supabase/migrations/20261001100000_close_bandon_branson_anon_exposure.sql`, applied to test
then production. Kept to the minimal fix (dropped only the two UPDATE policies plus
`branson_roster`'s SELECT policy), not a full table drop — that's gated on the still-undecided
21.1/21.3 (retire the 2025 Bandon archive?).

```sql
drop policy if exists "Match Bandon Update" on public.match_bandon;
drop policy if exists "Records Update Policy" on public.records_bandon;
drop policy if exists "Enable read access for all users" on public.branson_roster;
```

**Verification required a real fix of its own.** The first attempt tested against row `id=1`
on the empty test project — `match_bandon`/`records_bandon`/`branson_roster` were never part
of the Task 6.2 seed script, so that row didn't exist, and the resulting "0 rows affected"
looked identical whether the policy worked or the row was simply missing. Inserted temporary
rows to test against for real, confirmed the blocked UPDATE/SELECT with `Prefer:
return=representation` (ambiguous `204`/empty-array responses otherwise), checked the
underlying value directly via `psql` as a third confirmation, then deleted the temporary
rows. On production — which has 48 real rows per table, real historical data — tested against
existing rows instead of inserting fake ones, confirming `match_bandon.winner` and
`records_bandon.wins` were unchanged after the blocked write attempt, and used
`Prefer: count=exact` on `branson_roster` (confirmed `0` of `48` rows visible to anon) rather
than fetching its content, to avoid pulling a real person's email through even a test
instrument. All four checks passed on both environments; `match_bandon`'s anon `SELECT`
confirmed still working both times, since `/tee-times` depends on it.

`team_rosters` and `match_players` are already correctly `TO authenticated, anon` — no change,
this was this section's own original recommendation and the live state already matches it.

`team_rosters` and `match_players` are already correctly `TO authenticated, anon` — no change,
this was this section's own original recommendation and the live state already matches it.

**Acceptance:** anon `UPDATE` on `match_bandon`/`records_bandon` and anon `SELECT` on
`branson_roster` all fail; nothing else in this task requires a code or schema change unless
the committee asks for the tighter `travel_info` posture above.

### Task S6 (done 2026-10-01 on test and production)
`address_line1`, `address_line2`, `zip_code`, `shirt_size`, `dietary_restrictions`,
`emergency_contact_name`, `emergency_contact_phone` are (per the original report) **empty
today**. They are also the fields that should never be readable by the whole membership.
Moving them while empty is nearly free; doing it after Streamsong logistics are entered is a
migration with real data risk.

**Re-confirmed empty on both test and production before touching anything** (direct query,
not trusting the original report). **The plan's guess about which files reference these
columns was wrong** — a fresh grep found exactly one consumer in the whole codebase,
`src/app/admin/players/page.tsx`; `admin/travel/page.tsx` and `admin/lodging/page.tsx`
reference neither. This made the change far smaller than the plan anticipated.

**What S6 actually buys, beyond S4:** S4 already revoked `anon`'s access to these columns
entirely (table-wide write revoke, column-restricted read grant). The real gap S6 closes is
**authenticated-to-authenticated** exposure — `players_select_authenticated` is
`USING (true)`, so today any of the 54 members can read any other member's home address or
emergency contact via the directory-style `players` table. `player_private` uses a tighter
policy (own row, or committee/admin) instead of the directory model.

**Done as two migrations, same ordering lesson as S2→S4** — schema-additive first (safe
anytime), breaking column-drop second (only after code stops referencing the old columns):
- `supabase/migrations/20261001110000_create_player_private.sql` — creates
  `public.player_private` (`player_id` PK → `players.id` `ON DELETE CASCADE`, the 7 columns,
  `updated_at` trigger via the existing `update_updated_at()` function), RLS policies scoped
  to own-row-or-committee for select/insert/update, and an explicit
  `revoke all on public.player_private from anon` — new tables inherit a blanket
  anon/authenticated table-level grant from this project's default privileges (confirmed via
  `information_schema.table_privileges`, same pattern found on every pre-existing table
  before being hardened), so this needed stating explicitly rather than relying on RLS alone,
  consistent with how `players`/`profiles` were hardened. Includes a defensive (currently
  no-op) backfill `INSERT ... SELECT` from `players`.
- `supabase/migrations/20261001120000_drop_players_private_columns.sql` — drops the 7
  columns from `players`. Applied to test only after the application code below was verified
  working against the new table.

**Code changes** (the one real consumer): `src/types/database.ts` — removed the 7 fields from
`Player`, added a `PlayerPrivate` interface. `src/app/admin/players/page.tsx` — fetch now
embeds `player_private(*)`; `handleEdit` flattens the (possibly array-or-object, handled
defensively like the existing `players/[playerId]/page.tsx` embed-normalizing pattern) nested
row into the edit form's state; `handleSave` splits into two writes — `UPDATE players` for
the remaining fields, `UPSERT player_private` for the relocated ones.

**Verified on test with real authenticated sessions** (same rigor as S4/S5 — this table was
empty, so ambiguous-204 was a risk here too; inserted and later cleaned up temporary rows):
anon blocked at the table-grant level entirely (`401`/`42501`, stronger than an RLS-only
block); a different player reading another player's private row returns empty (RLS); the
owning player can insert/read their own row; committee/admin can read any row; `upsert`
against an existing row correctly merges rather than erroring, and the `updated_at` trigger
fires. Re-ran Task 6.2's seed script after the column drop to confirm no conflict (it never
referenced these columns). `npx tsc --noEmit` clean (2 pre-existing unrelated failures);
`npm test` 40/40 suites, 177/177 tests.

**Production: done 2026-10-01**, via PR #25 (`test` → `main`). One incident along the way,
unrelated to this change: the first production build after merging **failed** —
`next/font/google`'s loader crashed in `src/app/layout.tsx` fetching Google Fonts metadata at
build time (`TypeError: Cannot read properties of null`). Diagnosed before assuming anything
was wrong with this PR: `layout.tsx` hadn't been touched since a commit from before this
entire session, and `npm run build` succeeded cleanly locally on the same source. Conclusion:
a transient CDN/build-infra flake, not a code regression — confirmed correct when a plain
**redeploy of the identical commit** (`vercel redeploy`, which rebuilds the exact same source
snapshot rather than re-fetching from git) succeeded. Worth remembering: a failed Vercel build
immediately after a merge is not automatically this PR's fault — check whether the failing
file was even touched before debugging the wrong thing.

Verified the redeployed build was genuinely running the new code before touching the database
at all — same discipline as S4: confirmed via `vercel inspect` that the successful deployment
is aliased to `patroncup.com`, and relied on the logical guarantee that `vercel redeploy`
never changes source (the original failed build's log already showed the exact commit hash,
matching `origin/main`'s PR #25 merge commit). Then applied migration A, re-verified anon is
blocked on production using a temporary row on a **real player id** (cleaned up immediately
after — no production PII was ever at risk, since all 7 columns were already confirmed
empty), then migration B. Confirmed the columns are gone and `/roster`, `/teams`, `/matches`
all still return `200`.

**All of Part II (S1-S7) is now fully live on both test and production.**

### Task S7 (done) Disclosure
The emails and phone numbers of 54 people were readable by unauthenticated callers for some
period; treat them as already disclosed. Proportionate response for a private golf-trip site:
- Tell the committee what was exposed and that it is fixed. No need to alarm all 54.
- Warn that a plausible phishing hook exists — e.g. a fake "your Streamsong deposit is due"
  email — since an attacker holding the list knows the trip context.
- Do not enter addresses or emergency contacts until S5 and (ideally) S6 are done.
- Record the fix date in section 9.

---

## 13. Phase T — Tests

Two tiers, because they answer different questions. **Tier A** asks "does the app request
only safe columns?" and needs no database, so it runs in `npm test` today and forever.
**Tier B** asks "would the database refuse if it did?" and needs a real Supabase project —
this is the concrete reason the Part I test environment is worth building, since these tests
must never run against production.

Per `AGENTS.md`, write these **before** the S2/S4 changes where practical; a test that fails
first and passes after is the only kind that proves anything.

### 13.1 Tier A — Jest, no database (done 2026-10-01)

Existing conventions to follow: tests live in `__tests__/` beside their subject, jsdom
environment, `@/` maps to `src/` (`jest.config.ts:10-12`). Note `collectCoverage` is on with
an 80% global threshold (`jest.config.ts:30-37`) and `collectCoverageFrom` includes
`src/lib/**` — so `src/lib/playerColumns.ts` will count toward coverage; test 13.1a covers it
fully, so this is fine.

**All of 13.1a–e implemented as written**, with one deliberate deviation: 13.1c's code sample
uses `fs.globSync`, which is new enough (Node 22+) that this project's actual Node pin was
worth double-checking first — `package.json` engines excludes Node 23 specifically
(`>=18.14.0 <23 || >=24.0.0`) and Vercel deployments run 22.x. Rather than trust `globSync`'s
behavior on exactly that version, used a small dependency-free recursive directory walk
instead (the plan's own fallback suggestion), same effect. **Proved the guard tests actually
guard**, per this section's own acceptance criterion: temporarily reverted
`roster/page.tsx`'s S2 change back to `select('*')`, confirmed both the targeted test
(13.1b) and the repo-wide static guard (13.1c) failed with clear messages, then restored the
file and confirmed `git diff` showed zero drift from the committed version.

**13.1a — the column list contains no PII.** `src/lib/__tests__/playerColumns.test.ts`.
This is the guard that fails if someone "fixes" a missing field by widening the public list.

```ts
import { PUBLIC_PLAYER_COLUMNS, PUBLIC_PLAYER_SELECT } from '@/lib/playerColumns';

const FORBIDDEN = [
  'email', 'phone', 'address_line1', 'address_line2', 'zip_code',
  'ghin_number', 'shirt_size', 'dietary_restrictions',
  'emergency_contact_name', 'emergency_contact_phone',
  'role', 'auth_user_id',
] as const;

describe('PUBLIC_PLAYER_COLUMNS', () => {
  it.each(FORBIDDEN)('never exposes %s to anonymous visitors', (column) => {
    expect(PUBLIC_PLAYER_COLUMNS).not.toContain(column);
  });

  it('keeps the columns public pages filter and sort on', () => {
    // .eq('status', ...) and .order('last_name') need SELECT privilege on those columns.
    expect(PUBLIC_PLAYER_COLUMNS).toContain('status');
    expect(PUBLIC_PLAYER_COLUMNS).toContain('last_name');
  });

  it('builds a PostgREST select string without a wildcard', () => {
    expect(PUBLIC_PLAYER_SELECT).not.toContain('*');
    expect(PUBLIC_PLAYER_SELECT.split(', ')).toEqual([...PUBLIC_PLAYER_COLUMNS]);
  });
});
```

**13.1b — public pages query safe columns.** e.g.
`src/app/roster/__tests__/page.test.tsx`. Mock `@/lib/supabaseBrowser` and assert on the
argument `select` received. Mirror the mock style in
`src/lib/repositories/__tests__/players.test.ts:4-14`, but capture the call:

```ts
import { render, screen } from '@testing-library/react';
import RosterPage from '@/app/roster/page';
import { PUBLIC_PLAYER_SELECT } from '@/lib/playerColumns';

const select = jest.fn();

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        select(...args);
        return {
          eq: () => ({
            order: () => Promise.resolve({
              // no email/phone: mirrors what the DB will actually return post-S4
              data: [{
                id: 'p1', first_name: 'Fake', last_name: 'Golfer',
                current_handicap: 8, ghin_club: 'Test GC',
                city: 'Austin', state: 'TX',
                profile_image_url: null, status: 'active',
              }],
              error: null,
            }),
          }),
        };
      },
    }),
  }),
}));

describe('RosterPage', () => {
  it('requests only the public player columns', async () => {
    render(<RosterPage />);
    expect(await screen.findByText('Fake Golfer')).toBeInTheDocument();
    expect(select).toHaveBeenCalledWith(PUBLIC_PLAYER_SELECT);
    expect(select).not.toHaveBeenCalledWith('*');
  });
});
```
Repeat for `src/app/teams/page.tsx`, asserting the embed string contains
`player:players(` and not `player:players(*)`.

**13.1c — repo-wide static guard.** The test that would have caught this class of bug in the
first place. `src/__tests__/publicQuerySafety.test.ts`:

```ts
import { readFileSync } from 'fs';
import { globSync } from 'fs'; // Node 22 has fs.globSync; else use a small recursive walk

// Routes reachable without authentication. Keep in sync with src/middleware.ts's matcher:
// anything NOT matched there is public and must never request all player columns.
const PUBLIC_ROUTE_DIRS = [
  'src/app/roster', 'src/app/teams', 'src/app/matches',
  'src/app/scoreboard', 'src/app/itinerary', 'src/app/tee-times',
];

const BANNED = [
  /players\s*\(\s*\*\s*\)/,                       // nested embed: player:players(*)
  /from\(\s*'players'\s*\)[\s\S]{0,120}?select\(\s*'\*'/, // from('players').select('*')
];

describe('anon-reachable pages never request all player columns', () => {
  const files = PUBLIC_ROUTE_DIRS.flatMap((dir) =>
    globSync(`${dir}/**/*.{ts,tsx}`).filter((f) => !f.includes('__tests__')),
  );

  it('found files to check', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s', (file) => {
    const source = readFileSync(file, 'utf8');
    BANNED.forEach((pattern) => expect(source).not.toMatch(pattern));
  });
});
```
Keep `PUBLIC_ROUTE_DIRS` accurate as routes are added — a stale list is the one failure mode
here. If that upkeep proves unreliable, invert it: walk all of `src/app`, exclude `admin`,
`dashboard`, `api`, `players`, and `change-password`.

**13.1d — middleware gates `/players`.** Extend `src/__tests__/middleware.test.ts`:
- `config.matcher` contains `'/players/:path*'`.
- `getAuthRedirectDecision({ pathname: '/players/abc', isAuthenticated: false, role: null,
  mustChangePassword: false })` yields a `login` decision with `nextPath` preserved.
- the same with `role: 'player'` yields no redirect (a member may view profiles).

**13.1e — `PublicPlayer` has no PII (type-level).** A compile-time assertion in
`src/lib/__tests__/playerColumns.test.ts`; it fails `npx tsc --noEmit`, not Jest:
```ts
// @ts-expect-error - PublicPlayer must not carry email
const _noEmail: keyof PublicPlayer = 'email';
```

**Acceptance for Tier A:** `npm test` passes; reverting any single S2 edit makes at least one
test fail. Verify that last part by actually reverting one — a guard test nobody has seen fail
is not yet a guard test.

### 13.2 Tier B — RLS integration tests against the test project

These assert the database's behaviour, which is the real control. **Never point them at
production**: they attempt writes, and a passing assertion means "the write was refused" —
a bug in the test could mean a write that succeeded.

**Wiring.** Add a second Jest config rather than touching `jest.config.ts` (these need
`testEnvironment: 'node'`, real network, no coverage thresholds).

`jest.rls.config.ts`:
```ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/rls/**/*.rls.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFiles: ['<rootDir>/jest.rls.setup.ts'],
  collectCoverage: false,
  testTimeout: 30_000,
  preset: 'ts-jest', // ts-node is already a devDependency; add ts-jest if absent
};

export default config;
```

`jest.rls.setup.ts` — load `.env.test.local` and refuse to run against prod:
```ts
import { config } from 'dotenv';
config({ path: '.env.test.local' });

const url = process.env.TEST_SUPABASE_URL;
if (!url) throw new Error('TEST_SUPABASE_URL missing; see .env.example');

// Guard: PROD_SUPABASE_REF is recorded in TEST_ENVIRONMENT_PLAN.md section 9.
const prodRef = process.env.PROD_SUPABASE_REF;
if (prodRef && url.includes(prodRef)) {
  throw new Error('RLS tests are pointed at PRODUCTION. Refusing to run.');
}
```

`package.json` scripts:
```json
"test:rls": "jest --config jest.rls.config.ts"
```
Deliberately **not** part of `npm test`, so CI and local runs stay offline and fast.

Env vars for `.env.test.local` (gitignored; add the names to the `.env.example` from task
7.4, values in the password manager): `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`,
`PROD_SUPABASE_REF`, `TEST_MEMBER_EMAIL`, `TEST_MEMBER_PASSWORD` (a seeded `player`-role
account from task 6.3), and optionally `TEST_COMMITTEE_EMAIL` / `TEST_COMMITTEE_PASSWORD`.

**The suite.** `src/__tests__/rls/players.rls.test.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_PLAYER_COLUMNS, PUBLIC_PLAYER_SELECT } from '@/lib/playerColumns';

const url = process.env.TEST_SUPABASE_URL!;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY!;

const anonClient = () => createClient(url, anonKey);
const PERMISSION_DENIED = '42501';

describe('players: anonymous access', () => {
  let anon: SupabaseClient;
  beforeEach(() => { anon = anonClient(); });

  // Establishes the fail-closed premise from section 11.6. If this assertion is wrong,
  // read the note there before changing it -- it may mean PostgREST narrows `*`.
  it('refuses select(*)', async () => {
    const { data, error } = await anon.from('players').select('*');
    expect(error?.code).toBe(PERMISSION_DENIED);
    expect(data).toBeNull();
  });

  it.each(['email', 'phone', 'ghin_number', 'emergency_contact_phone', 'role', 'auth_user_id'])(
    'refuses select(%s)',
    async (column) => {
      const { error } = await anon.from('players').select(column);
      expect(error?.code).toBe(PERMISSION_DENIED);
    },
  );

  it('allows the public column list and returns no PII', async () => {
    const { data, error } = await anon.from('players').select(PUBLIC_PLAYER_SELECT);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    data!.forEach((row) => {
      expect(Object.keys(row).sort()).toEqual([...PUBLIC_PLAYER_COLUMNS].sort());
    });
  });

  // Regression test for F4: the leak that came in through a nested embed.
  it('refuses a nested embed of all player columns', async () => {
    const { error } = await anon.from('team_rosters').select('*, player:players(*)');
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('allows a nested embed of public player columns', async () => {
    const { error } = await anon
      .from('team_rosters')
      .select(`*, player:players(${PUBLIC_PLAYER_COLUMNS.join(',')})`);
    expect(error).toBeNull();
  });

  it.each([
    ['insert', (c: SupabaseClient) => c.from('players').insert({ first_name: 'rls', last_name: 'probe', email: 'rls-probe@example.com' })],
    ['update', (c: SupabaseClient) => c.from('players').update({ city: 'rls-probe' }).neq('id', '00000000-0000-0000-0000-000000000000')],
    ['delete', (c: SupabaseClient) => c.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')],
  ])('refuses anonymous %s', async (_label, run) => {
    const { error } = await run(anonClient());
    expect(error).not.toBeNull();
  });
});

describe('players: member access (documented posture, section 11.7)', () => {
  it('lets a signed-in member read the directory including contact details', async () => {
    const member = anonClient();
    const { error: signInError } = await member.auth.signInWithPassword({
      email: process.env.TEST_MEMBER_EMAIL!,
      password: process.env.TEST_MEMBER_PASSWORD!,
    });
    expect(signInError).toBeNull();

    const { data, error } = await member.from('players').select('id, email');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    await member.auth.signOut();
  });
});
```

`src/__tests__/rls/tables.rls.test.ts` — covers Task S5:
```ts
// Member-only tables: anon must get a permission error or an empty set, never rows.
it.each(['travel_info', 'lodging', 'lodging_assignments'])('hides %s from anon', async (table) => {
  const { data, error } = await anonClient().from(table).select('*');
  if (error) expect(error.code).toBe('42501');
  else expect(data).toEqual([]);
});

// Intentionally public tables: keep them working, so a future lockdown that overreaches fails here.
it.each(['events', 'teams', 'courses', 'matches', 'team_rosters'])('keeps %s public', async (table) => {
  const { error } = await anonClient().from(table).select('*').limit(1);
  expect(error).toBeNull();
});
```

`src/__tests__/rls/auth.rls.test.ts` — covers Task S1:
```ts
it('rejects self-service signup', async () => {
  const { data, error } = await anonClient().auth.signUp({
    email: `rls-probe-${Date.now()}@example.com`,
    password: 'Probe-Passw0rd!',
  });
  expect(error).not.toBeNull();
  expect(data.user).toBeNull();
});
```
If this test ever creates a user, it has found a real misconfiguration — delete the user in
the dashboard and re-check Task S1.

**Acceptance for Tier B:** `npm run test:rls` green against the test project; the suite
*fails* when run against a project where the S4 migration has not been applied (verify by
running it before applying S4 — that is the before/after proof).

### 13.3 What is deliberately not tested
Be explicit so nobody assumes coverage that does not exist:
- **No end-to-end browser tests.** There is no Playwright/Cypress setup and adding one is a
  larger decision. The logged-out smoke checks in Task S4's acceptance are manual.
- **Storage bucket policies** for `avatars` are not covered by Tier B; Part I task 3.4's
  manual check stands.
- **Production is never tested automatically.** After each prod deploy, run the three `curl`
  commands in Task S4's acceptance by hand. Consider adding them to a runbook in `AGENTS.md`.

---

## 14. Additions to section 9 — record these too

**Filled into section 9 directly as of 2026-10-01** (Task S0) rather than duplicated here —
see that table for: live `players` policies, real column list (`is_active` does exist, also
covered in Part IV section 20.5.1), RLS-disabled table count (none), S4/S5/S7 status.

One item from the original list is still genuinely open, not yet testable:

| Item | Value |
|---|---|
| Does PostgREST 403 on anon `select=*`? (11.6) | **Resolved 2026-10-01: HTTP 401**, not 403, with Postgres error code `42501` in the body. Verified on test against seeded fake rows |

---

# Part III — Completing the Hi-Fi redesign

## 15. Findings (verified against code 2026-09-27)

### 15.1 How this relates to Parts I and II

This part finishes the Hi-Fi redesign begun from the Claude Design handoff. Unlike Part II
it is **not urgent** — it is product polish, not a live vulnerability. But it **collides**
with both other parts, and the collisions are the reason it is documented here rather than
worked ad hoc:

- **Part II rewrites the exact queries these pages run.** Every page still to be
  redesigned selects `*` from `players` (section 15.8). A redesign rewrites a page's JSX
  around the fields it receives; doing that before Part II's explicit-column change means
  rewriting the same JSX twice.
- **`LIVE_SCORING_PLAN.md` rewrites the scoreboard's data model.** Cosmetically redesigning
  the scoreboard components immediately before that plan lands would be discarded work.

**Recommended global ordering: Part II → Part III → live scoring.** The one exception is
Task R0 (dead-code removal), which is independent of everything and can ship immediately.

### 15.2 What is already done

Milestones 0–4 of the original plan are complete and committed (`fcaa749` "Hi-Fi redesign:
home, FAQ, matches, nav overhaul, globe update", then `5ba511a`):

| Milestone | Surface | Evidence |
|---|---|---|
| 0 | Design system foundation | 22 `--pc-*` tokens in `globals.css`; three fonts wired in `layout.tsx` |
| 1 | Home page | `src/app/page.tsx` + `page.module.css` (451 lines), MUI-free |
| 2 | FAQ page | `src/app/faq/page.tsx` + `page.module.css` (234 lines), MUI-free |
| 3 | Mobile bottom tab bar | `MobileTabBar()` at `src/app/layout.tsx:218`; `.tabBar`/`.tab*` in `layout.module.css` |
| 4 | Matches page | `src/app/matches/page.tsx` + `page.module.css` (445 lines) |

Only `GlobeAnimation.tsx` among shared components uses the new tokens. Everything else
listed in 15.7 does not.

### 15.3 The visible seam (why this work matters)

`MobileTabBar` (`src/app/layout.tsx:224–232`) links to five destinations:

| Tab | Href | Redesigned? |
|---|---|---|
| Home | `/` | yes |
| FAQ | `/faq` | yes |
| Matches | `/matches` | yes |
| Roster | `/roster` | **no** |
| Dashboard / Login | `/dashboard` or `/login` | **no** |

Two of the five primary navigation targets drop the user from the new design straight into
the old one. This is the strongest argument for the ordering in 16.3: fix the tab-bar
destinations first.

### 15.4 Two CSS variable systems coexist in `globals.css` (378 lines)

**New system — 22 `--pc-*` tokens**, keyed on `[data-theme='light'|'dark']`:
`--pc-bg`, `--pc-card`, `--pc-card-2`, `--pc-fill`, `--pc-fill-2`, `--pc-ink`, `--pc-ink-2`,
`--pc-ink-3`, `--pc-rule`, `--pc-rule-2`, `--pc-shadow`, `--pc-radius`, `--pc-radius-sm`,
`--pc-radius-lg`, `--pc-font-sans`, `--pc-font-serif`, `--pc-font-mono`, `--pc-team-a`,
`--pc-team-b`, `--pc-live-bg`, `--pc-live-fg`, `--pc-live-dot`.

**Legacy system — ~48 variables** still in active use by every un-redesigned page:
`--bg`, `--background`, `--foreground`, `--text`, `--text-muted`, `--text-soft`, `--surface`,
`--surface-muted`, `--surface-tint`, `--surface-tint-strong`, `--border`, `--border-subtle`,
`--divider`, `--brand-ink`, `--shadow-sm|md|lg`, `--input-bg`, `--input-border`,
`--input-border-focus`, `--input-border-hover`, `--input-placeholder`, `--chip-blue`,
`--chip-blue-soft`, `--chip-blue-border`, `--chip-red`, `--chip-red-soft`,
`--chip-red-border`, `--chip-neutral`, `--pending-chip-bg|border|text`, `--progress-track`,
`--player-name-text`, `--player-name-delete`, `--tab-unselected-text`, `--gallery-bg`, and
eleven `--accent-*` colors.

The legacy set is **not** a subset of the new one — there is no `--pc-` equivalent for
inputs, chips, accents, or progress tracks. Part of this work is deciding the mapping
(task R1), not just find-and-replace.

### 15.5 "Redesigned" does not mean "MUI-free"

This is the single most important convention to understand before touching a page, and it
is easy to get wrong:

- `src/app/page.tsx` (home) and `src/app/faq/page.tsx` import **no MUI at all**.
- `src/app/matches/page.tsx` — also redesigned — **still imports MUI** for form controls
  only: `Alert`, `Button`, `FormControl`, `InputLabel`, `Select`, `MenuItem`
  (`src/app/matches/page.tsx:4–9`). Its layout, cards, and typography are CSS modules.
- `src/app/layout.tsx` itself still imports MUI.

So the *de facto* established pattern is: **layout, typography, cards and chrome move to
CSS modules + `--pc-*` tokens; interactive form controls stay MUI.** Task 16.1 asks you to
ratify or reject that pattern before migrating more pages, because reversing it later means
touching every page again.

MUI is not going away regardless: 17 files under `src/app/admin/` depend on it, including
`@mui/x-data-grid`.

### 15.6 Full inventory of what still needs updating

Public surfaces (`LOC` = `page.tsx` lines / CSS module lines; `dark` = count of
`data-theme`/`prefers-color-scheme` references in its own CSS module):

| Route | Files | LOC | MUI | dark | Notes |
|---|---|---|---|---|---|
| `/roster` | `src/app/roster/page.tsx` + `page.module.css` | 117 / 32 | yes — MUI `Table`, `TextField`, `Chip`, `Paper` | 0 | Tab-bar target. Thin CSS module; the MUI table is the whole page |
| `/dashboard` | `src/app/dashboard/page.tsx` + `page.module.css` | 512 / 281 | yes | 0 | Tab-bar target. Largest remaining page; pulls in 4 shared components |
| `/dashboard/award-nominations` | `page.tsx` + `AwardNominationsForm.tsx` + `page.module.css` | 140 / 71 | yes | — | Form-heavy; good test of the 16.1 decision |
| `/players` | `src/app/players/page.tsx` + `page.module.css` | 143 / 75 | yes | 2 | Has *some* dark handling plus 4 hardcoded colors |
| `/players/[playerId]` | `page.tsx` + `page.module.css` | 457 / 164 | yes | 0 | Shares `MatchCard`, `LodgingInfoCard`, `PlayerStats`, `PlayerRerounds`, `DashboardProfileForm` with `/dashboard` |
| `/teams` | `src/app/teams/page.tsx` + `page.module.css` | 162 / 111 | yes | 0 | Also a Part II PII site (nested embed) |
| `/tee-times` | `src/app/tee-times/page.tsx` + `page.module.css` | 243 / 219 | yes | 0 | |
| `/itinerary` | `src/app/itinerary/page.tsx` + `page.module.css` | 170 / 113 | yes | — | |
| `/gallery` | `src/app/gallery/page.tsx` + `page.module.css` | 29 / 60 | yes | — | Smallest; uses `GalleryImage` |
| `/login` | `src/app/login/page.tsx` + `LoginClient.tsx` + `LoginClient.module.css` | 9 / 44 | yes | — | Tab-bar target when signed out |
| `/change-password` | `page.tsx` + `page.module.css` | 136 / 44 | yes | — | Forced-change flow; reachable via middleware redirect |
| `/unauthorized` | `page.tsx` + `page.module.css` | 21 / 22 | yes | — | Trivial |
| `/tee-times/2025/[playerSlug]` | `page.jsx` + `PlayerPageClient.jsx` + `page.module.css` | — | yes | — | **The only `.jsx` files in the codebase.** Archived 2025 route — see task R7 |

Admin (`src/app/admin/**`, 19 routes, 17 MUI files including `@mui/x-data-grid`) is
**recommended out of scope** — see 16.2.

### 15.7 No shared component has been migrated

Every component in `src/components/` except `GlobeAnimation.tsx` has zero `--pc-*` usage.
The live ones (with their consumers) must be migrated alongside the pages that use them:

| Component | Used by |
|---|---|
| `matches/MatchCard.tsx` (5 hardcoded colors) | `/dashboard`, `/players/[playerId]` |
| `player/DashboardProfileForm.tsx` | `/dashboard`, `/players/[playerId]` |
| `player/LodgingInfoCard.tsx` | `/dashboard`, `/players/[playerId]` |
| `player/PlayerMatchResultActions.tsx` | `/dashboard` |
| `player/PlayerStats.tsx` | `/players/[playerId]` |
| `player/PlayerRerounds.tsx` | `/players/[playerId]`, 2025 `.jsx` route |
| `player/PlayerMatches.tsx` | 2025 `.jsx` route only |
| `scoreboard/CourseScoreCard.tsx`, `scoreboard/MatchRow.tsx` | `player/PlayerMatches.tsx` only |
| `shared/AddToCalendar.tsx` | `scoreboard/MatchRow.tsx` |
| `shared/Card.tsx` | 2 admin pages, `PlayerRerounds`, 2025 `.jsx` route |
| `shared/FormPage.tsx` | 3 admin pages only |
| `gallery/GalleryImage.tsx` | `/gallery` |

**Consequence for sequencing:** `MatchCard`, `DashboardProfileForm` and `LodgingInfoCard`
are each shared by `/dashboard` and `/players/[playerId]`. Migrating either page alone
leaves a component styled for the other. Those two pages plus those three components form
one indivisible unit of work (tasks R4+R5 should land together or behind a flag-free
single PR).

Note `scoreboard/*` and `PlayerMatches` are reachable **only** through the archived 2025
`.jsx` route — resolve R7 before spending effort on them.

### 15.8 Collision with Part II — every remaining page leaks `players.*`

Exhaustive list of `select('*')` on player-bearing queries outside `/admin`:

| File:line | Query |
|---|---|
| `src/app/roster/page.tsx:29` | `players.select('*')` |
| `src/app/players/page.tsx:31` | `players.select('*')` |
| `src/app/players/[playerId]/page.tsx:37` | `players.select('*')` |
| `src/app/teams/page.tsx:42`, `:57` | `teams.select('*')`, `team_rosters.select('*, player:players(*)')` — the nested-embed leak from Part II F4 |
| `src/app/dashboard/page.tsx:159` | `select('*')` |
| `src/components/player/PlayerMatches.tsx:34`, `:56` | `select('*')` |
| `src/app/matches/page.tsx:268`, `:287`, `:293` | `select('*')` — already-redesigned page, still `*` |

Part II replaces these with explicit column lists. **Rule for this part: when you redesign
a page, land its explicit-column change in the same commit as its redesign**, respecting
Part II's ordering requirement (explicit-column code ships *before* the anon grant is
revoked). If Part II has already shipped for a given page, leave its column list alone.

### 15.9 Dark mode is the biggest latent-bug risk

`AGENTS.md` requires all UI to work in both themes, yet `roster`, `teams`, `dashboard` and
`tee-times` CSS modules contain **zero** theme references. They currently render acceptably
in dark mode only because the legacy variables they consume are themselves theme-keyed in
`globals.css` — the pages inherit dark mode by accident, not by design.

Files with hardcoded colors that therefore **cannot** respond to theme:

| File | Hardcoded color count |
|---|---|
| `src/components/matches/MatchCard.module.css` | 5 |
| `src/app/players/page.module.css` | 4 |
| `src/app/matches/page.module.css` | 3 (already-redesigned page) |
| `src/app/page.module.css` | 1 (already-redesigned page) |
| `src/app/admin/matches/setup/TeeTimeBoard.module.css` | 6 (admin) |
| `src/app/admin/players/page.module.css`, `admin/events/page.module.css` | 4 each (admin) |

Migrating to `--pc-*` fixes these for free. Treat each hardcoded color as a dark-mode bug
to be resolved, not a value to port across.

### 15.10 Dead code the redesign left behind

All verified unused by import-grep across `src/**/*.tsx` and `*.jsx`, excluding tests and
stories:

**Orphaned components (5)** — none imported anywhere in app code:

| Component | Also delete | Why it died |
|---|---|---|
| `src/components/CountdownTimer.tsx` | `CountdownTimer.module.css` | Home redesign inlined its own countdown |
| `src/components/matches/OverallScoreBanner.tsx` | `OverallScoreBanner.module.css` | Matches redesign inlined the banner |
| `src/components/layout/PageContainer.tsx` | `PageContainer.module.css`, `layout/__tests__/PageContainer.test.tsx` | Superseded by per-page layout |
| `src/components/shared/ComingSoon.tsx` | `ComingSoon.module.css`, `ComingSoon.stories.tsx`, `shared/__tests__/ComingSoon.test.tsx` | No longer routed to |
| `src/components/tee-times/CourseBox.tsx` | `CourseBox.module.css` | Superseded |

**Orphaned style system (10 files)** — `grep` for `@/styles`, `styles/theme`, and
`styles/pages` returns **nothing**. The entire directory is dead:
`src/styles/theme.ts` plus `src/styles/pages/{home,gallery,scoreboard,teams,tee-times,itinerary,lodging,player,tee-times/player}/styles.ts`.
These are MUI `sx` style objects referencing legacy vars (`var(--text)`, `var(--bg)`) — an
abandoned third styling approach. Deleting them removes a misleading pattern that a future
agent might copy.

**Empty directories (3):** `src/app/scoreboard/`, `src/app/schedule/[playerSlug]/`,
`src/app/player/[playerSlug]/` — no files at all. Note `src/app/scoreboard/` being empty
while `src/components/scoreboard/*` exists is actively confusing, and `LIVE_SCORING_PLAN.md`
plans a scoreboard route — coordinate before deleting that one.

### 15.11 Admin audit (added 2026-10-01, per section 16.6 — `/admin` now in scope)

Same depth as 15.6/15.7 did for public pages. **One finding here changes the 16.1 MUI
decision** — see the callout after the inventory table.

**19 nominal routes, but only 17 are real pages.** `src/app/admin/page.tsx` (4 lines) and
`src/app/admin/tee-times/page.tsx` (5 lines) are both pure `redirect()` stubs with no UI —
`/admin` → `/admin/dashboard`, `/admin/tee-times` → `/admin/matches/setup`. Nothing to design
or migrate for either. `src/app/admin/layout.tsx` (19 lines) is the auth gate
(`isAdminRole` check, redirect to `/login` or `/unauthorized`) — also no UI, not a page.

**Route inventory** (LOC / MUI import count / CSS module? / dark-mode refs / hardcoded
colors — the last two checked in the `.module.css` where one exists, or directly in the
`.tsx`'s `sx` props where it doesn't, since several admin pages have no CSS module at all and
style entirely inline):

| Route | LOC | MUI imports | CSS module? | Dark-mode refs | Hardcoded colors |
|---|---|---|---|---|---|
| `/admin/dashboard` | 171 | 16 | yes | 0 | 0 |
| `/admin/players` | 412 | 24 | yes | 2 | 4 |
| `/admin/events` | 339 | 23 | yes | 2 | 4 |
| `/admin/teams` | 448 | 26 | none | — | 0 (3 unique `var(--x)` refs) |
| `/admin/courses` | 341 | 24 | none | — | 0 (2 unique `var(--x)` refs) |
| `/admin/matches` | 452 | 26 | none | — | 0 (2 unique `var(--x)` refs) |
| `/admin/matches/setup` | 526 + 331 (`TeeTimeBoard.tsx`) | 17 + 1 | yes (page only) | 1 | 6 |
| `/admin/scores` | 493 | 19 | none | — | 0 (8 unique `var(--x)` refs) |
| `/admin/handicaps` | 533 | 18 | none | — | 0 (4 unique `var(--x)` refs) |
| `/admin/participants` | 426 | 28 | none | — | 1 (3 unique `var(--x)` refs) |
| `/admin/rerounds` | 400 | 27 | none | — | 1 (3 unique `var(--x)` refs) |
| `/admin/lodging` | 656 | 27 | none | — | 0 (2 unique `var(--x)` refs) |
| `/admin/travel` | 478 | 27 | none | — | 3 (2 unique `var(--x)` refs) |
| `/admin/award-nominations` | 117 | 9 | none | — | not checked, small page |
| `/admin/invite` | 138 | 1 (uses shared `FormPage`) | yes | 0 | 0 |
| `/admin/change-username` | 88 | 1 (uses shared `FormPage`) | yes | 0 | 0 |
| `/admin/reset-password` | 99 | 1 (uses shared `FormPage`) | yes | 0 | 0 |

**10 of the 17 real pages have no CSS module at all** — they style entirely via MUI's `sx`
prop, inline in the JSX. This is a *third* styling pattern alongside the two already found in
public pages (CSS modules + `--pc-*` tokens on redesigned pages; CSS modules + legacy vars on
old public pages) — inline `sx` referencing legacy vars as raw strings (e.g.
`sx={{ color: 'var(--text)' }}`), with no stylesheet at all. These pages likely render
correctly in dark mode today by the same accident as the legacy public pages (the vars they
reference are theme-keyed), not by design.

**Zero `--pc-*` token usage anywhere in `/admin`** (confirmed by grep) — expected, since this
is exactly the gap section 16.6 exists to close.

**Shared component usage:** `src/components/shared/FormPage.tsx` is used by exactly the three
small account-management pages (`invite`, `change-username`, `reset-password`) — these are
already simple and consistent with each other, likely the cheapest admin pages to migrate.
`src/components/shared/Card.tsx` is used by `scores` and `matches/setup` (shared with public
pages too — Part III's existing component-coupling caution applies here as well). No admin
page uses `ComingSoon`, `AddToCalendar`, or `PageContainer` — consistent with Part III 15.10
already marking those three dead.

**`admin/handicaps/page.tsx` already hand-rolls table sorting** (`useState`-driven sort state,
no `TableSortLabel`/DataGrid) — useful precedent: this codebase already proves hand-built
sortable tables are a well-trodden path here, not a new risk being introduced.

#### The MUI finding that changes 16.1: `@mui/x-data-grid` is not used in `/admin` at all

Section 16.1's tiered-removal recommendation specifically carved out `@mui/x-data-grid` as
"genuinely complex, not worth rebuilding" — written assuming it was in active use somewhere
in admin. **A fresh grep across the entire codebase finds exactly one consumer:
`src/app/tee-times/page.tsx`** — the public tee-times page, which is part of the **Bandon
archive already decided for retirement** (section 16, "Bandon archive retirement"). Once that
route is deleted (Task R0), `@mui/x-data-grid` has **zero remaining consumers anywhere in the
app** and can simply be removed as a dependency — no rebuild needed, because nothing left
uses it.

`@mui/x-date-pickers` fares similarly, though not as starkly: **exactly one consumer**,
`src/app/admin/rerounds/page.tsx` — a single `<DatePicker>` instance wrapped in
`LocalizationProvider`/`AdapterDateFns`. Not zero, but a single component instance in one
file is a small, bounded replacement (a native `<input type="date">` or a small custom
component), not the kind of "rebuild a sortable/filterable/paginated grid from scratch" risk
that originally motivated keeping it.

**Aggregate MUI component usage across all 17 real admin pages** (import counts, components
used by more than one file): `Typography`/`Paper`/`Box` (14 files each), `Button`/`Alert` (12),
plain `Table`/`TableRow`/`TableHead`/`TableCell`/`TableBody`/`TableContainer` (11 — note:
*plain* MUI tables, not `DataGrid`), `Select`/`MenuItem`/`InputLabel`/`FormControl` (11),
`TextField` (10), `Dialog` + its four sub-components (10), `IconButton` (9), `Chip` (8), plus
single-digit usage of `Tabs`, `Switch`, `Divider`, `Card`, `Checkbox`, and (once each)
`TableSortLabel`, `InputAdornment`, `FormHelperText`. **Every one of these has a reasonable
hand-built equivalent** — this is squarely the "simple/common" category 16.1 already said to
remove, not the exception case.

**Revised recommendation for 16.1, given this audit: reconsider full MUI removal.** The
specific justification for the tiered carve-out — a complex, high-engineering-cost widget in
real use — turns out not to hold once the Bandon archive is gone. What remains needing a
decision is narrow: one `DatePicker` instance. If a small hand-built date input is acceptable
there, **MUI can be removed from the project entirely**, which is more consistent than the
tiered approach and avoids standing up a `ThemeProvider` + re-theming work for marginal
benefit. The original tiered decision isn't wrong, just no longer necessary — this is worth
a quick confirm-or-revise from the user before any admin page's CSS gets migrated, since it
changes the target end-state for all 17 pages, not just one.

**Separate from the MUI decision entirely: `admin/matches/setup/TeeTimeBoard.tsx`'s
drag-and-drop is real, working complexity** (`@dnd-kit`'s `DndContext`/`useSortable`/
`DragOverlay`) that should be **re-skinned, not rebuilt** — restyle its visual output to the
design system, leave the drag-and-drop logic untouched regardless of what's decided about MUI
elsewhere, since `@dnd-kit` is an unrelated library or this is not a MUI dependency to begin
with.

---

## 16. Decisions — finalized by the user 2026-10-01, superseding the recommendations below

**These materially change Part III's scope from how the rest of this section was written.**
`/admin` being in scope roughly doubles the page count this part covers (19 more routes),
and interacts with 16.1 and 16.4 in ways worth being explicit about. Read 16.6 below before
starting any R-series task — it's new, added to capture what these answers actually require
that the original plan didn't account for.

### 16.1 MUI: target or waypoint? — **Finally decided 2026-10-01: MUI stays, used pragmatically**
Went through two intermediate positions before landing here — tiered removal (first pass,
assuming `@mui/x-data-grid`/`@mui/x-date-pickers` were in heavy complex use), then reopened
once the admin audit (15.11) found that assumption false (one consumer each, both tied to
code already being deleted). **Final answer from the user, superseding both:** "keep MUI in
the project. It is just another tool available to us if needed. Use it where their pre-made
components make sense."

**What this actually means, so it doesn't get re-litigated per-page:**
- **No mandate to remove MUI from anywhere it currently works.** A page already using
  `TextField`/`Select`/`Dialog`/etc. does not need those ripped out during its redesign pass
  just for the sake of it.
- **No mandate to add a `ThemeProvider` either.** That was specifically to re-theme
  `DataGrid`/date-pickers under the tiered plan; since there's no tiered carve-out anymore,
  there's no forcing function requiring one. Fine to add one later if/when enough MUI
  components in active use would benefit from centralized theming — not a prerequisite for
  starting any R-series task.
- **Visual consistency comes from the tokens, not from which library renders the pixels.**
  Whether a given piece of UI ends up as a custom component styled with `--pc-*` CSS modules,
  or an MUI component with `--pc-*` values passed through its `sx` prop (the same technique
  already used for legacy vars, e.g. `sx={{ color: 'var(--text)' }}` in several admin pages
  today) — either is correct. Choose per-component based on what's pragmatic, same spirit as
  the existing home/FAQ (no MUI) vs. matches (MUI for inputs) split that prompted this
  decision in the first place.
- **15.11's factual findings still stand and still matter for cleanup, independent of this
  decision:** `@mui/x-data-grid` has exactly one consumer in the entire codebase
  (`src/app/tee-times/page.tsx`, part of the Bandon archive being deleted per Task R0) — once
  that ships, remove the now-dead `@mui/x-data-grid` dependency from `package.json` entirely;
  this is just dead-dependency hygiene (consistent with 16.4/16.5's "clean and pragmatic
  code" standing instruction), not a MUI-policy question. `@mui/x-date-pickers` has one
  consumer (`admin/rerounds`'s `DatePicker`) — keep it there if that's still the pragmatic
  choice when that page gets redesigned, or replace it with something simpler if that turns
  out nicer; either is fine under this decision, it's a normal per-component call now, not a
  policy one.

### 16.2 Is `/admin` in scope? — **Yes, everything is in scope**
User: "Everything is now in scope for redesign, but if we need a design for something let's
note that in the plan to get one." **This is the decision with the largest planning
consequence** — see 16.6.

### 16.3 Page order — **Judgment delegated; ship as one batch, not incrementally**
User trusts the implementation order already recommended (driven by the 15.3 seam and 15.7
component coupling — unchanged, still the right dependency order to *build* in) but intends
to **push everything to test, verify the whole site, then push everything to production in
one release** — not the page-by-page incremental PRs the rest of this plan otherwise used for
Parts I/II. Consequence: the R-series task boundaries below remain useful for *implementation
sequencing* (what to build first, since later pages reuse earlier pages' components), but do
not each need to be independently production-shippable — final verification (something like
Part I's task 7.1, redone for the whole redesigned site) happens once, at the end, not once
per page.

### 16.4 Legacy CSS variables — **Full sunset, not permanent coexistence**
User: "unused variables are no longer maintained... with admin in scope, these probably
should go away if unused." Since 16.2 now puts every page (including admin) on the path to
`--pc-*` tokens, the original constraint behind "keep both systems indefinitely" (admin would
otherwise permanently depend on the legacy set) no longer applies. **Decision: the ~48 legacy
variables are a temporary bridge, not a second permanent system** — delete each one once the
last page referencing it migrates (Task R11's logic, upgraded from "sunset what's safe" to
"sunset everything, eventually").

### 16.5 Delete dead code now or later? — **Now, and go further: delete on sight generally**
User: "if unused, get rid of it... worst case is we rebuild something, which I can live
with." Confirmed unchanged by a fresh grep 2026-10-01: `CountdownTimer`, `OverallScoreBanner`,
`PageContainer`, `ComingSoon`, `CourseBox`, and all of `src/styles/` are still genuinely
unreferenced — proceed with Task R0 as originally written. The higher risk tolerance here
also applies to the newly-decided Bandon archive retirement below — it's a strictly bigger
version of the same instruction, not a separate judgment call.

### Bandon archive retirement — **Decided: retire it.** (Same question as Part IV 21.1)
User: "Bandon Archive can go away, it was a static build for a POC. We are moving onto bigger
and better things." This resolves Part III's task R7 and Part IV's 21.1/21.3 identically —
don't re-litigate either. Unlocks deleting, confirmed still accurate by a fresh grep
2026-10-01: the `/tee-times` and `/tee-times/2025/[playerSlug]` routes, `src/lib/repositories/bandon.ts`,
`getAllPlayersAndMatches.ts`, `getPlayerRecord.ts`, `getMatchesWithPlayers.ts`, and — confirmed
solely reachable through that archive, cascading — `PlayerMatches.tsx`,
`scoreboard/CourseScoreCard.tsx`, `scoreboard/MatchRow.tsx`. Fold all of this into Task R0's
scope (it's the same "delete confirmed-dead code" action, just larger than originally
scoped). The matching database side (Part IV Task H8: drop `match_bandon`, `player`,
`records_bandon`, `team_bandon`) is a separate task in a separate system — coordinate but
don't block one on the other; nothing else depends on those tables once the routes are gone.

### 16.6 New: `/admin` has no Hi-Fi design to implement against
The original Claude Design handoff (referenced throughout section 15) targeted public pages
only — there is no existing Hi-Fi spec for any of `/admin`'s 19 routes. Section 15's whole
inventory (15.6: route-by-route LOC/MUI/dark-mode table; 15.7: shared component usage) only
covers public pages, by design, because admin was out of scope when it was written. **Per the
user's 16.2 answer ("if we need a design for something let's note that in the plan to get
one"): before any admin route can get an R-series task written for it, two things need to
happen that don't exist yet:**
1. **A fresh audit of `/admin`**, at the same depth as section 15 did for public pages —
   route-by-route inventory, exact MUI/`@mui/x-data-grid`/`@mui/x-date-pickers` usage,
   shared-component coupling, dark-mode/mobile gaps. Not done as part of recording these
   decisions; this is the next concrete piece of work.
2. **New design direction for admin**, not a port of an existing spec — likely the `design`
   skill (canvas-based mockup), scoped to admin's actual needs (data tables, forms, bulk
   actions) rather than the public pages' marketing-site aesthetic.

Until both exist, the admin portion of Part III isn't actionable beyond "it's in scope" —
treat this section as the task that produces the audit + design request, not as something
already planned.

---

## 17. Phase R — Redesign completion tasks

Every task: mobile-first, verified in **both** light and dark mode (per `AGENTS.md`), with
`npm test` green before opening a PR. `AGENTS.md` also mandates TDD for new behavior —
these tasks are mostly visual refactors of existing behavior, so the practical bar is
"existing tests still pass, and add a test when you change behavior rather than appearance."

### Task R0 (Agent) Remove the dead code — scope expanded 2026-10-01 with the Bandon decision
Delete everything in 15.10: the 5 orphaned components with their CSS modules, stories and
tests; all 10 files under `src/styles/`; and the empty directories `src/app/schedule/[playerSlug]/`
and `src/app/player/[playerSlug]/`. **Leave `src/app/scoreboard/` alone** — reserved for
[[project-live-scoring]], a different feature than the Bandon archive below.

**Also delete, now that the Bandon archive retirement is decided (section 16, "Bandon archive
retirement"):** the `/tee-times` and `/tee-times/2025/[playerSlug]` routes (the only `.jsx`
files in the codebase live here — this removes them entirely), `src/lib/repositories/bandon.ts`,
`src/lib/getAllPlayersAndMatches.ts`, `src/lib/getPlayerRecord.ts`,
`src/lib/getMatchesWithPlayers.ts`, and — confirmed solely reachable through this archive by a
fresh grep — `src/components/player/PlayerMatches.tsx`,
`src/components/scoreboard/CourseScoreCard.tsx`, `src/components/scoreboard/MatchRow.tsx`.
This is a larger version of the same action (confirmed-dead code, now also confirmed-obsolete
feature), not a separate judgment call — the user's standing instruction is "if unused, get
rid of it, worst case we rebuild."

The matching database tables (Part IV Task H8: `match_bandon`, `player`, `records_bandon`,
`team_bandon`) are a separate task in a separate system (requires DB access, not just a code
commit) — do in either order, nothing else depends on those tables once these routes are gone.

Before deleting each item, re-run the check rather than trusting this document:
```bash
grep -rn "CountdownTimer\|OverallScoreBanner\|PageContainer\|ComingSoon\|CourseBox" src --include="*.tsx" --include="*.jsx" | grep -v "__tests__\|\.stories\."
grep -rn "@/styles\|styles/theme\|styles/pages" src --include="*.tsx" --include="*.ts"
grep -rln "PlayerMatches\|CourseScoreCard\|MatchRow" src --include="*.tsx" --include="*.jsx" | grep -v "__tests__\|\.stories\.\|tee-times/2025\|components/player/PlayerMatches\|components/scoreboard/"
```
All must return nothing but the components' own self-imports (and PlayerMatches's internal
use of the two scoreboard components, until all three are deleted together).

**Acceptance:** `npm test` green, `npm run build` succeeds, `npx tsc --noEmit` clean. Deleted
file count is now larger than the original ~20 estimate given the added archive scope — no
new estimate given, since the exact file list above is authoritative. Consider two commits
(original dead-code set, then the Bandon archive) rather than one, since they have different
"why" explanations even though both land in the same task.

### Task R1 (done 2026-10-01, commit `091d654`) Write down the conventions before copying them — updated 2026-10-01
Extract the pattern already established in `page.module.css`, `faq/page.module.css` and
`matches/page.module.css` into a short "Design system" section in `AGENTS.md` (10–20 lines,
matching that file's existing terse tone). It must state, per the finalized decisions in
section 16 (all superseding what was originally drafted here):
- The `--pc-*` token list and what each is for. **Not** "legacy vars are admin-only" — 16.4's
  final answer is a full sunset once every page (including admin) migrates; say that instead.
- The font trio and which element types use which.
- **MUI policy per 16.1's final decision:** no removal mandate and no boundary to enforce —
  MUI is available wherever its components are the pragmatic choice, custom `--pc-*`-styled
  components elsewhere. Consistency comes from using the tokens (via CSS module or via an
  MUI component's `sx` prop) regardless of which renders a given piece of UI.
- That hardcoded hex values are not acceptable in **any** page's CSS/`sx` styling, including
  admin now that it's in scope (15.9's rule, no longer scoped to "public-page" only).

This exists so that many subsequent page migrations (now including all 17 real admin pages,
not just the original 9) do not each re-derive the conventions and drift. **Acceptance:** a
reviewer who has never seen the handoff can migrate a page using only `AGENTS.md` plus one
existing redesigned page as reference.

### Task R2 (done 2026-10-01, commit `2c4cd6e`) `/roster` — first tab-bar seam
`src/app/roster/page.tsx` (117 lines) is mostly a MUI `Table` with a `TextField` search and
`Chip`s. Rebuild as a mobile-first card/list layout using `--pc-card`, `--pc-rule`,
`--pc-ink*` — a desktop-oriented data table is exactly the pattern `AGENTS.md` warns
against. Keep the search input as MUI `TextField` per 16.1.

Land the Part II explicit-column change for `roster/page.tsx:29` in the same commit
(15.8) — roster needs only display fields (`id, first_name, last_name, profile_image_url,
status`, plus whatever the UI shows), never `email`/`phone`/`ghin`.

**Acceptance:** `/roster` visually consistent with `/matches` when navigating via the tab
bar; correct in both themes at 375px wide; no `email` or `phone` in the network response.

### Task R3 (done 2026-10-01, commit `1161d3a`) Shared components for the dashboard unit
Migrate `matches/MatchCard.tsx` (resolving its 5 hardcoded colors), `player/LodgingInfoCard.tsx`,
and `player/DashboardProfileForm.tsx` to `--pc-*`. `MatchCard` has an existing test
(`src/components/matches/__tests__/MatchCard.test.tsx`) and a story — keep both passing;
update the story if class names change.

Do this **before** R4 so the two pages that consume these components are migrated against
already-final components.

### Task R4 (done 2026-10-01, commits `4eeac62`+`21da1b9`) `/dashboard` + `/players/[playerId]` — one unit
The largest remaining piece (512 + 457 lines of TSX, 281 + 164 of CSS). They share the three
components from R3 plus `PlayerStats` and `PlayerRerounds` (migrate those here). Per 15.7
these two pages cannot be split without leaving a component styled for the other.

Also the second tab-bar seam (15.3), and a Part II site (`dashboard/page.tsx:159`).

Consider splitting the PR by component rather than by page if review size becomes a problem,
but land them in one sequence without an intervening release.

### Task R5 (done 2026-10-01, commit `d84883a`) `/players`
143 lines. Note its CSS module already has 2 theme references **and** 4 hardcoded colors —
reconcile both into tokens. Part II site (`players/page.tsx:31`) and its detail page was
handled in R4 (`players/[playerId]/page.tsx:37`).

### Task R6 (done 2026-10-01, commit `908a3fa`) `/teams`
162 lines. **Highest-value Part II overlap:** `teams/page.tsx:57` is the nested-embed leak
(`team_rosters.select('*, player:players(*)')`) that Part II labels F4 and that the original
third-party review missed. Replace the embed's `players(*)` with an explicit column list in
this same commit.

### Task R7 (Human decision, then Agent) `/tee-times` and the archived 2025 route
Two questions, in order:
1. **Is `src/app/tee-times/2025/[playerSlug]/` still needed?** It holds the only `.jsx`
   files in an otherwise TypeScript codebase (`page.jsx`, `PlayerPageClient.jsx`) and is the
   **sole** consumer of `player/PlayerMatches.tsx`, which is in turn the sole consumer of
   `scoreboard/CourseScoreCard.tsx` and `scoreboard/MatchRow.tsx`. If the 2025 archive can
   be dropped, four more files become dead code and this task shrinks dramatically.
2. If it stays: convert to `.tsx` before restyling — do not migrate styling into untyped files.

Then migrate `/tee-times` itself (243 / 219 lines).

**Acceptance:** decision recorded in section 19; no `.jsx` files remain under `src/app/`.

### Task R8 (done 2026-10-01, commit `aa34ee9`) `/itinerary`
170 lines. Self-contained, no shared components.

### Task R9 (done 2026-10-01, commit `fcdf515`; manual must_change_password login still unverified) Auth trio — `/login`, `/change-password`, `/unauthorized`
Small (9+44, 136, 21 lines) and should share one visual treatment. `/login` is a tab-bar
target for signed-out visitors, and `/change-password` is reachable via the middleware
forced-change redirect (`src/middleware.ts`), so verify both by actually logging in with a
`must_change_password = true` account — this is exactly what the Part I test environment
(task 6.3) was seeded to make possible.

### Task R10 (done 2026-10-01, commit `b3cd8f1`) `/dashboard/award-nominations` and `/gallery`
Form-heavy page plus the smallest page (29 lines, uses `GalleryImage`). Migrate
`gallery/GalleryImage.tsx` with the latter. `/gallery` also consumes the legacy
`--gallery-bg` variable — replace with a `--pc-*` equivalent or retire the variable.

### Task R11 (done 2026-10-02, commit `5283bce`) Legacy variable sunset — full sunset, not scoped
A sitewide grep (not just admin/public page CSS modules) found 3 consumers the page-by-page
R-series tasks hadn't touched: `layout.module.css` (mobile AppBar + an admin-sidebar logout
button that had used `--accent-red` since RA1 without anyone noticing), `Card.module.css`, and
`AddToCalendar.module.css`. The largest piece was `globals.css`'s own global MUI-component
reset (`.MuiPaper-root`, `.MuiOutlinedInput-*`, `.MuiChip-deleteIcon`, etc.) — genuinely
load-bearing for every MUI component sitewide, not dead code, so each rule was mapped to its
`--pc-*` equivalent (same mapping convention as commit `1161d3a`) rather than deleted. With
every consumer migrated, deleted both legacy `:root` blocks outright (~40 variables, most
already fully dead), folding their `color-scheme` declarations into the `--pc-*` theme blocks.
**Acceptance met:** a full sitewide grep for every legacy variable name returns zero `var()`
references anywhere in `src/`; `globals.css` now contains only `--pc-*` tokens plus the MUI
reset (now itself `--pc-*`-based). Full suite verified clean (jest/tsc/build/lint/Storybook).

### Task R12 (done 2026-10-02) Final verification
Walk every public route in both themes at 375px and at desktop width:
`/`, `/faq`, `/matches`, `/roster`, `/players`, `/players/[id]`, `/teams`, `/tee-times`,
`/itinerary`, `/gallery`, `/login`, `/change-password`, `/unauthorized`, `/dashboard`,
`/dashboard/award-nominations`.

- [x] Every tab-bar destination lands on a redesigned page (closes 15.3).
- [x] No public page renders a hardcoded color that breaks in dark mode (closes 15.9) — zero
      legacy-variable/hardcoded-hex references confirmed sitewide as of R11.
- [x] `npm test` green (150/150); `npx tsc --noEmit` clean (2 pre-existing unrelated errors
      only); `npm run build` succeeds.
- [x] Storybook still builds (`npm run build-storybook`) — stories reference class names.
- [x] Every page touched has an explicit column list, no `select('*')` on `players` (closes
      15.8) for public pages; admin pages retain `select('*')` on `players` by deliberate
      earlier decision (admin-authenticated route, same reasoning as
      `players/[playerId]/page.tsx`).

The live-browser walk (both themes, mobile+desktop, all public AND admin routes) was done by
the user directly against `test.patron-cup.com` rather than by assistant automation (no browser
tool available in-session) — see [[patron-cup-hifi-redesign]] for the bugs that walk surfaced
and their fixes. **Part III (the Hi-Fi redesign, public pages + all of Phase R-Admin) is now
complete**: RA1-RA7, R0-R12 all done, zero legacy CSS variables remain anywhere in `src/`.

---

## 17a. Admin redesign — findings from the Hi-Fi v3 design artifact (2026-10-01)

Both of 16.6's prerequisites are now satisfied: the admin audit (15.11) and a Claude-Design
canvas artifact ("Hi-Fi v3") that includes real admin design direction, not a port of the
public-page spec. The artifact is a bundler-wrapped React canvas — reading it directly only
surfaces loader boilerplate; the actual component source has to be decoded from its manifest
(gzip+base64 per-asset blobs). Already done once this session; see
[[patron-cup-hifi-redesign]] for the decoded file UUIDs if it needs re-reading.

**The 17 real admin routes**, grouped exactly as the mockup's own `AD_GROUPS` nav taxonomy
groups them (this taxonomy is itself new content the admin dashboard page should render, not
just a planning convenience):

| Group | Routes |
|---|---|
| Competition | `events`, `courses`, `matches`, `matches/setup`, `scores`, `handicaps`, `rerounds`, `award-nominations` |
| People | `players`, `teams`, `participants` |
| Trip | `travel`, `lodging` |
| Accounts | `invite`, `reset-password`, `change-username` |

(`dashboard` itself is the 17th route — the hub page that renders these 16 as tiles, matching
the mockup's own "Four areas, sixteen tools" copy exactly.)

**Current-state cross-check against 15.11, confirmed by direct inspection 2026-10-01:**
`courses`, `handicaps`, `lodging`, `matches`, `participants`, `rerounds`, `scores`, `teams`,
`travel`, `award-nominations` have **zero** CSS modules (pure inline `sx`) — 10 routes,
matching 15.11 exactly. The other 7 (`change-username`, `dashboard`, `events`, `invite`,
`matches/setup`, `players`, `reset-password`) already have one. Page sizes range from 88 lines
(`change-username`) to 656 (`lodging`, the largest admin page by far) — `matches/setup` (526
lines) carries real `@dnd-kit` logic per 15.11, untouched by any of this.

**The mockup supplies a complete, reusable admin design system, not just visual references for
a handful of pages** — decoded in full, not just skimmed:
- **New CSS utility classes** (desktop): `.ad-card`, `.ad-row` (+ `.head`/`.hover`/`.sel`
  variants), `.ad-th`, `.ad-num`, `.ad-badge`, `.ad-ib` (icon button), `.ad-dlg`/`.ad-dlg-h`/
  `.ad-dlg-f` (modal dialog), `.ad-seg` (segmented control), `.ad-sk` (loading skeleton),
  `.ad-gcard` (dashboard tile), `.ad-pcard` (draggable player card), `.ad-slot` (drag target),
  `.ad-crumb`, `.ad-sub`, `.ad-in` (text input), `.ad-lab` (field label), `.ad-scrim`.
- **Mobile equivalents**: `.ad-sheet`/`.ad-grab` (bottom sheet replacing the dialog), `.ad-btn`,
  `.ad-chip`, `.ad-m-sticky` (sticky action bar).
- **Reusable components** (desktop): `AIcon` (~25 named icon paths incl. one per nav item),
  `AGrip` (drag handle), `AdminHead` (breadcrumb + title + actions), `AField` (labeled input
  wrapper), `AName` (avatar + team chip + name), `AScrim`, `PCDesktop`/`PCDesktopSidebar`
  (sidebar+topbar shell), `PCDeskBtn`, `PCDeskH`.
- **Mobile equivalents**: `MWrap` (top bar + tab bar shell), `MHead`, `Sheet` (bottom-sheet
  equivalent of a dialog), `MName`.
- **Two new design tokens needed**, referenced by the above but not yet in `globals.css`:
  `--pc-chip-bg` (badge background) and `--pc-shadow-strong` (dialog/sheet shadow, heavier than
  `--pc-shadow`). Add both before building anything that uses `.ad-badge` or `.ad-dlg`/`.ad-sheet`.
- **Worked full-page examples**, each establishing the canonical pattern for a category of
  admin page rather than being usable verbatim:
  - `HiAdminDashboard`/`MAdminDashboard` — the nav-tile hub (uses `AD_GROUPS` directly).
  - `HiAdminCourses`/`MAdminCourses`(+`MAdminCourseStates`) — simple CRUD table + edit dialog,
    plus explicit loading-skeleton and empty states.
  - `HiAdminHandicaps`/`MAdminHandicaps` — sortable, searchable, team-filterable table with a
    computed column (index change vs. previous). Confirms 15.11's finding that hand-rolled
    sorting (no DataGrid) is the established, working precedent here.
  - `HiAdminMatchSetup`/`MAdminMatchSetup` — the drag-and-drop groups board. **Re-skin only**:
    `AGrip`/`.ad-pcard`/`.ad-slot` are visual, the actual `@dnd-kit` wiring in the current
    `TeeTimeBoard.tsx` is untouched.
  - `HiAdminAccountForm`/`MAdminInvite` — single-purpose action form (icon + heading + fields +
    one primary button). Generic enough for `invite` and `username` as-is; `MAdminReset` is a
    **richer variant** of the same pattern (player search, generate-or-type password, strength
    meter) — use that one specifically for `reset-password`, not the generic form.
  - `HiAdminRelational`/`MAdminTravel` — table + detail dialog/sheet, with a `Travel`/`Lodging`
    segmented toggle **combining both into one UI** in the mockup. The real app has these as
    two separate routes today. **Open design question, not resolved here:** keep them as two
    routes sharing the same visual pattern (lower risk, no routing change), or actually merge
    them behind the toggle as drawn. Decide this at the start of the task that touches either,
    don't default silently to the riskier merge.
  - `MAdminAwards` — nomination review/tally list (sorted by vote count, quoted reasons). This
    is the **admin-side** nominee review, distinct from the player-facing nomination form at
    `/dashboard/award-nominations` already redesigned in R10 — don't confuse the two when
    reading "award-nominations" in a route list.
- **Not covered by a worked example — closest analog only, exact layout is an implementation
  decision**: `events` and `rerounds` → follow the Courses CRUD pattern; `matches` (the main
  list, not `/setup`) and `participants` → follow the Travel/Lodging table+detail pattern;
  `scores` → closest to Handicaps' sortable table, since "review and confirm" implies
  per-row actions more than per-row editing; `teams` → roster/captain assignment has no
  worked example at all (neither the drag-board nor a plain table clearly fits) — expect to
  make a real design call here, not just reskin.
- **The admin desktop shell is a synthesis, not a ready-made component**: `PCDesktop`'s own
  `DESK_TABS` array is the *public*-site nav (Home/FAQ/Matches/Roster/Dashboard) — the mockup
  never actually swaps in `AD_GROUPS` as the sidebar's nav model for admin routes, it just
  renders each admin page with `active="dash"` as a placeholder. Building a real admin
  sidebar nav means combining `PCDesktopSidebar`'s visual mechanics with `AD_GROUPS`' grouped
  content yourself — a reasonable, small synthesis, but call it out as a decision made during
  implementation, not something copied verbatim from the artifact.

---

## 17b. Phase R-Admin — Admin redesign completion tasks

Same bar as Phase R: mobile-first, both themes, `npm test` green before any PR. Batched
small-to-large and simple-pattern-to-complex, same reasoning as the public-page R2→R10
sequence (establish shared components and the simplest worked pattern first; save the
highest-risk page — the one with real drag-and-drop business logic — for last).

### Task RA1 (done 2026-10-01, commit `6431b3b`) Admin design-system foundation
Add `--pc-chip-bg` and `--pc-shadow-strong` to `globals.css`. Port the `ad-*` utility CSS and
the `AIcon`/`AGrip`/`AdminHead`/`AField`/`AName`/`AScrim` components (desktop) plus
`MWrap`/`MHead`/`Sheet`/`MName` (mobile) from the decoded mockup into real shared files (e.g.
`src/components/admin/`). Build the real admin desktop shell (sidebar nav from `AD_GROUPS`,
per 17a's note that this isn't ready-made). Extend `AGENTS.md`'s "Design system" section
(written in R1) with an admin subsection covering these new classes/tokens/components, same
spirit as R1 — a page migrated after this point should need only this doc plus one finished
admin page as reference, not a re-read of the mockup.

### Task RA2 (done 2026-10-01, commit `6b36a63`) `admin/dashboard`
The hub page. Render `AD_GROUPS` as real tiles linking to the other 16 routes (replace any
placeholder counts/labels with real ones — e.g. route counts per group, not the mockup's
placeholder "sixteen tools" copy if that becomes stale).

### Task RA3 (done 2026-10-01, commit `1e38294`) Account-action forms — `invite`, `reset-password`, `change-username`
Three small, already-CSS-moduled pages (88-138 lines). `invite` and `change-username` fit the
generic `HiAdminAccountForm` pattern directly. `reset-password` uses the richer `MAdminReset`
variant (player search, generate-or-type password with a strength meter) — don't flatten it to
the generic form, it's a deliberately different page in the mockup.

### Task RA4 (done 2026-10-01, commits `67eaa5c`+`d3eadfb`+`218c657`+`6559a5f`) Simple CRUD tables — `courses`, `events`, `rerounds`, `players`
`courses` is the mockup's literal worked example (table + add/edit dialog + explicit
loading/empty states) — build it first as the reference, then apply the same shape to
`events` and `rerounds` (no worked example, same pattern per 17a). `players` already has a CSS
module; reconcile its existing styling into tokens rather than a ground-up rebuild.

### Task RA5 (done 2026-10-01, commits `92a859a`+`f2c305e`+`6500c55`+`1871094`+`24e6d27`) Relational and review pages — `travel`+`lodging`, `participants`, `teams`, `award-nominations` (admin side)
Resolve the Travel/Lodging separate-vs-combined question (17a) before writing either page.
`participants` follows the same table+detail pattern. `teams` has no worked example — expect a
real design decision (roster/captain assignment), not a reskin. `award-nominations` here is
the **admin tally/review view** (`MAdminAwards` pattern: sorted by vote count, quoted reasons)
— not the player-facing form R10 already redesigned.

### Task RA6 (done 2026-10-01, commits `37dfc98`+`156caa9`+`d985cb5`+`2e30016`) Complex and high-risk pages — `handicaps`, `scores`, `matches`, `matches/setup`
`handicaps`: sortable-table pattern, real `<button>`+`AIcon` sort headers, dynamic
`grid-template-columns` computed in JS since course-column count varies, new search box added.
`scores`: course-tabs became `.ad-chip` segmented buttons, per-match `ad-card` with status
badges and a 3-button winner-selection row; `setOfficialMatchResult` logic unchanged. `matches`
(main list): CRUD table pattern, bulk-creation divisibility check unchanged. `matches/setup`
done last and most carefully: `page.tsx` is a pure visual pass (AdminHead, `.ad-seg` course
tabs, `.pc-d-actionbtn` actions, restyled `renderCard` content) with zero changes to
`fetchEventData`/`getAvailablePlayers`/`addMatchPlayer`/`removeMatchPlayer`/
`handleBoardPersist`/`handleExportMatchesCsv`; `TeeTimeBoard.tsx` got exactly 3 cosmetic line
changes (`AGrip` icon swap, one outline color) with the `@dnd-kit` logic completely untouched
(verified via `git diff`). This completes all of Phase R-Admin's page-by-page work.

### Task RA7 (code-verifiable half done 2026-10-01) Admin final verification, then close out R11/R12
Walk all 17 real admin routes in both themes, mobile and desktop. Confirm the two
account-action-form variants both still work end-to-end (invite sends an email, reset actually
changes a password, username actually renames). Only after this: run R11 (legacy variable
sunset — now actually safe to check "zero references anywhere, admin included") and re-run
R12's walk extended to cover every admin route, not just public ones.

**Done so far (code-level, no browser/credentials available in this session):** grepped all of
`src/app/admin/` + `src/components/admin/` for legacy CSS vars (zero hits) and hardcoded hex
(one hit, a form placeholder string, not styling) — confirms the token migration is complete
across all 17 routes. Confirmed all 17 routes' `.module.css` files use `--pc-*` tokens wherever
they set color/background. Confirmed `invite`/`reset-password`/`change-username` still POST to
their original `/api/admin/*` routes, unchanged. Full suite passed: jest 150/150, `tsc --noEmit`
(2 pre-existing unrelated errors only), production build, lint, and `build-storybook` all clean.
Also noticed `src/app/admin/trip-planning/` is an empty, untracked, pre-existing directory (no
files, predates this session) — not a real route, nothing to migrate, left alone.

**Still not done — needs a real browser + admin credentials, neither available in this
session:** the actual visual walk (both themes, mobile+desktop) of all 17 routes, and
end-to-end exercise of the three account-action flows (does invite's email actually send, does
reset actually change a password, does username actually rename). Also still unverified: RA1's
root-layout admin sidebar swap has never been seen rendered for a logged-in admin. Recommend
the user do this pass themselves before R11/R12.

---

## 18. Risks specific to Part III

1. **Doing this before Part II wastes the work.** The single largest risk; see 15.1 and 15.8.
2. **Splitting the `/dashboard` + `/players/[playerId]` unit** leaves shared components
   half-migrated and visibly inconsistent (15.7).
3. **Copying the wrong precedent.** Home/FAQ are MUI-free while Matches is not; a
   lower-level model will copy whichever it opens first. Mitigated by deciding 16.1 and
   writing it into `AGENTS.md` in R1 *before* R2.
4. **Silent dark-mode regressions.** Pages inherit dark mode through theme-keyed legacy
   variables today; a partial migration that swaps a variable for a literal breaks it with
   no test coverage. No automated theme tests exist — R12's manual walk is the only gate.
5. **Redesigning scoreboard components that live scoring will rewrite** (15.1, and R7's
   dependency chain).
6. **Storybook drift.** Six `.stories.tsx` files reference component internals; they are
   not part of `npm test` and will rot silently unless `build-storybook` is run (R12).

---

## 19. Part III decisions to record

All decided by the user 2026-10-01 — see section 16 for full reasoning on each.

| Item | Value |
|---|---|
| 16.1 MUI boundary | Tiered: removed everywhere with a reasonable hand-built equivalent; `@mui/x-data-grid` + `@mui/x-date-pickers` kept, re-themed to `--pc-*` tokens via a new `ThemeProvider` (none exists yet) |
| 16.2 `/admin` in scope? | Yes — everything in scope. Needs its own audit + new design direction first (section 16.6); not yet actionable beyond that |
| 16.3 Page order accepted (or revised) | Accepted as the *build* order; shipped as one batch to test then production, not per-page increments |
| 16.4 Legacy variable strategy | Full sunset — delete each legacy variable once its last referencing page migrates, not a permanent second system |
| R0 dead-code deletion shipped (commit) | **Done 2026-10-01** — two commits on `test`: `f851713` (orphaned components + legacy `src/styles/`), `cda2e19` (Bandon archive, incl. two orphaned test files the original inventory missed: `lib/repositories/__tests__/bandon.test.ts`, `lib/__tests__/bandonLegacy.test.ts`, plus 3 leftover `.module.css` files). `npm test` (36/36), `npm run build`, and `npx tsc --noEmit` (2 pre-existing unrelated errors only) all verified before committing. Not yet pushed to remote (user pushes) |
| Bandon archive retirement (= Part IV 21.1/21.3) | **Decided: retire.** `/tee-times`, `/tee-times/2025/[playerSlug]`, `repositories/bandon.ts`, `getAllPlayersAndMatches.ts`, `getPlayerRecord.ts`, `getMatchesWithPlayers.ts`, `PlayerMatches.tsx`, `scoreboard/CourseScoreCard.tsx`, `scoreboard/MatchRow.tsx` all confirmed deletable, folded into Task R0 |
| `src/app/scoreboard/` — deleted, or reserved for live scoring? | Still reserved for [[project-live-scoring]] — the Bandon decision doesn't touch this, it's a different empty directory for a different future feature |
| Admin audit (16.6, half of it) | **Done 2026-10-01 — see section 15.11.** Found 17 real pages (not 19 — 2 are redirect stubs), 10 of which have no CSS module at all (pure inline `sx`), zero `--pc-*` usage anywhere, and critically: `@mui/x-data-grid` has one consumer total (the Bandon archive being deleted) and `@mui/x-date-pickers` has one (`admin/rerounds`). This reopens 16.1 — see that entry |
| Admin design request (16.6, other half) | _TBD_ — not started; new design direction for admin (likely the `design` skill) still needed before any admin R-series task can be written, independent of the MUI question |
| 16.1 final decision | **MUI stays, used pragmatically** — no removal mandate, no `ThemeProvider` requirement; consistency comes from `--pc-*` tokens regardless of which library renders a given component. `@mui/x-data-grid` still gets removed from `package.json` once Task R0 deletes its one consumer — dead-dependency cleanup, not a MUI-policy matter |

---

# Part IV — Schema audit and hardening

## 20. Findings (audited 2026-09-28)

### 20.1 Why this is part of Part I, and where it slots in

Standing up a second Supabase project is the only cheap opportunity this project will get to
change the schema: the test project starts empty, so a hardened schema can be proven there
against seeded data before production is touched. Doing it later means a migration against
54 people's live trip data.

**This is task-ordered inside Part I, not a separate effort.** The insertion point:

| Part I task | Part IV work |
|---|---|
| 3.2 dump prod schema → baseline | unchanged; the dump is the input to this audit |
| **new: H0–H3** | author the hardening migrations *against* that baseline |
| 3.3 apply baseline to test | apply baseline **then** hardening migrations to test |
| 6.2 seed test data | seeds must satisfy the new constraints — write them after H2 |
| 7.1 smoke test | verifies the app against the hardened schema |
| **new: H9** | only then promote the hardening migrations to production |

Section 23 lists the exact edits to make to Part I's task text.

### 20.2 Method, and what this audit cannot see

The schema in this section was **pasted by hand from the Supabase dashboard**, not dumped.
It lists columns, types, nullability, primary keys, two enums, and RLS policies. It does
**not** include:

- foreign-key definitions or their `ON DELETE` behavior
- indexes (so "missing index" below means "not visible", not "proven absent")
- column defaults
- triggers (so `updated_at` maintenance is unknown)
- **which tables have RLS `ENABLED`** — a table can have zero policies and be wide open if
  RLS is off, which is exactly the Part II section 11.4 concern

Therefore every item below is tagged **[FIX]** (verified against code, safe to act on) or
**[VERIFY]** (must be confirmed against the live database first — task H0). Do not let a
lower-level model act on a `[VERIFY]` item without running H0.

### 20.3 Table usage classification against the codebase

Verified by grepping `from('<table>')` across `src/**/*.{ts,tsx,jsx}`, excluding tests.

| Table | App reads | App writes | Verdict |
|---|---|---|---|
| `players` | yes | yes | **core** |
| `events` | yes | yes | **core** |
| `teams` | yes | yes | **core** |
| `team_rosters` | yes | yes | **core** |
| `courses` | yes | yes | **core** |
| `matches` | yes | yes | **core** |
| `match_players` | yes | yes | **core** |
| `match_results_pending` | yes | via RPC | **core** |
| `profiles` | yes | yes | **core** |
| `travel_info` | yes | yes | **core** |
| `lodging`, `lodging_assignments` | yes | yes | **core** |
| `event_participants` | yes | yes | **core** |
| `rerounds` | yes | yes | **core** |
| `ceremony_award_nominations` | yes | yes | **core** |
| `match_bandon` | yes (read-only) | **no** | **legacy, but LIVE — see 20.4** |
| `player` | yes (read-only) | **no** | **legacy, but LIVE — see 20.4** |
| `records_bandon` | yes (read-only) | **no** | **legacy, but LIVE — see 20.4** |
| `team_bandon` | **no** | no | **unused — drop candidate** |
| `branson_roster` | **no** | no | **unused — drop candidate, and leaks PII (20.5.4)** |
| `branson_captains` | **no** | no | **unused — drop candidate** |
| `team_captains` | **no** | no | unused; typed as `TeamCaptain` at `src/types/database.ts:62`. Legitimate model, unbuilt feature |
| `course_holes` | **no** | no | unused — **but required by `LIVE_SCORING_PLAN.md`, see 20.9** |
| `round_scores` | **no** | no | unused — see 20.9 |
| `hole_scores` | **no** | no | unused — see 20.9 |
| `reround_signups` | **no** | no | unused; `rerounds.player1_id…player4_id` is used instead (20.7.4) |
| `tee_times` | **no** | no | **not in the pasted schema at all — see 20.6.3** |

### 20.4 The Bandon POC tables are not dead — they back a live public route

This is the finding that most changes the plan. The obvious read is "`match_bandon`, `player`,
`records_bandon`, `team_bandon` are POC leftovers, drop them." Three of the four are load-bearing:

```
/tee-times  (src/app/tee-times/page.tsx:9,113)
  └── getAllPlayersAndMatches      (src/lib/getAllPlayersAndMatches.ts)
        └── fetchBandonMatchesAndPlayers   (src/lib/repositories/bandon.ts)
              ├── from('match_bandon').select('*')
              └── from('player').select('id, f_name, l_name, handicap')

/tee-times/2025/[playerSlug]  (PlayerPageClient.jsx:8,38)
  └── getPlayerRecord  →  fetchBandonPlayerRecordByName
        ├── from('player')          (lookup by f_name/l_name)
        └── from('records_bandon')  (wins/losses/ties by "playerId")
```

The `/tee-times` route renders Pacific Dunes / Sheep Ranch / Bandon Dunes columns and links
into `/tee-times/2025/…`. **The whole `/tee-times` surface is the 2025 Bandon archive**,
served from the POC tables, and it is reachable from the live site today.

So the drop decision is a *product* decision, not a cleanup: **is the 2025 archive still
wanted?** That is the same question as Part III task R7, which independently found that this
route holds the only `.jsx` files in the repo and is the sole consumer of four components.
Decide it once (section 21.1); it unlocks both parts.

Safe to drop regardless: `team_bandon`, `branson_roster`, `branson_captains` — zero code
references, not even in tests.

Also dead, and only reachable through these tables: `src/lib/getMatchesWithPlayers.ts` and
`fetchBandonMatchesWithPlayers()` have **no consumers at all** (verified by grep) — delete
them with Part III task R0 regardless of the archive decision.

### 20.5 Live defects found during the audit

These are not schema-style opinions. Each is a defect in the running system.

#### 20.5.1 [FIX] `players.is_active` vs `players.status` — split brain; stale players stay pickable

**Corrected 2026-09-28** after the user supplied the actual column definitions: `is_active
boolean DEFAULT true` (not bare-nullable as first assumed). This reverses the original
direction of the bug below — a new player is *not* invisible; a *removed* one stays visible.

The table has **both** `is_active` (defaults `true`, never written by app code) and `status`
(defaults `'active'`, actively maintained). The codebase filters "active players" by
*different columns in different places*:

| Filters on `status = 'active'` | Filters on `is_active = true` |
|---|---|
| `src/app/roster/page.tsx:30` | `src/app/admin/teams/page.tsx:62` |
| `src/app/players/page.tsx:32` | `src/app/admin/matches/setup/page.tsx:105` |
| `src/app/admin/participants/page.tsx:72` | |
| `src/app/admin/rerounds/page.tsx:73` | |

**Nothing ever writes `players.is_active`** (verified: the only `is_active` writes in `src/`
are on `events.is_active` in `src/app/admin/events/page.tsx:39,310-311` — a different table
entirely). So every player row is `is_active = true` from insert onward, forever, regardless
of what happens to it later:
- `src/app/api/admin/invite/route.ts:106,122` sets `status: 'active'` on creation; `is_active`
  is left to its DB default of `true` — consistent at creation time.
- `src/app/admin/players/page.tsx` lets committee edit `status` (e.g. to `'inactive'` when a
  player drops from the trip) but never touches `is_active`.

**Consequence: a player removed from the trip (`status` set to anything but `'active'`)
correctly disappears from the public roster and `/players`, but stays selectable in the admin
Team-builder and Match-setup pickers**, which filter on the column nobody maintains. Stale
data surfacing in an admin dropdown, not a new-member visibility bug. Lower severity than
originally stated, but still a real defect — a committee member can accidentally build a team
around someone who already dropped out.

The `Player` TypeScript interface (`src/types/database.ts:6–33`) declares `status` and has
**no** `is_active` field at all — the two admin call sites query a column the app's own type
system doesn't model, which is itself a signal `is_active` is vestigial.

Fix: pick one column (recommend `status`, since it is what the type system, the invite flow
and three of five call sites use), migrate the two admin queries, then drop `is_active`. No
data reconciliation is needed before dropping — every row is `true` today by construction, so
there is nothing to backfill (H0 query 8 becomes optional for this column specifically, though
still worth running to be certain no row was ever hand-edited to `false`).

#### 20.5.2 [FIX, confirmed] Nine admin delete buttons have no DELETE policy — they silently no-op

**Confirmed 2026-09-28** via a real `pg_dump` of production (task 3.2): all 26 tables have
`ENABLE ROW LEVEL SECURITY`, and there are exactly 6 `FOR DELETE` policies in the entire
schema (`team_rosters`, `match_players`, `lodging_assignments`, `team_captains`,
`reround_signups`, plus `match_results_pending`'s explicit `USING (false)` block). This
resolves the "which of two possibilities" framing below in favor of the first one, with
certainty: RLS is on and no policy exists, so every one of the nine deletes below matches
zero rows and returns success. **These buttons have always done nothing.**

Twelve tables receive `.delete()` from admin pages. Only three of those twelve have a DELETE
policy (`team_rosters`, `match_players`, `lodging_assignments`). The other nine:

| Table | Delete call site | DELETE policy in paste? |
|---|---|---|
| `events` | `src/app/admin/events/page.tsx:92` | none |
| `teams` | `src/app/admin/teams/page.tsx:98` | none |
| `players` | `src/app/admin/players/page.tsx:77` | none |
| `matches` | `src/app/admin/matches/page.tsx:103` | none |
| `courses` | `src/app/admin/courses/page.tsx:91` | none |
| `lodging` | `src/app/admin/lodging/page.tsx:108` | none |
| `travel_info` | `src/app/admin/travel/page.tsx:97` | none |
| `rerounds` | `src/app/admin/rerounds/page.tsx:172` | none |
| `event_participants` | `src/app/admin/participants/page.tsx:173` | none |

These all run through the **browser** client (anon key + the user's JWT), so RLS applies, and
RLS is confirmed enabled with no matching policy. Fix: add
`CREATE POLICY … FOR DELETE TO authenticated USING (public.is_committee_or_admin())` for each
of the nine tables, matching the pattern already used by the six tables that have one. Task
H0's "which of two branches" framing is no longer needed — go straight to task H2.

#### 20.5.3 [FIX] `anon` can UPDATE two legacy tables

```
records_bandon : "Records Update Policy"     UPDATE  anon  USING true
match_bandon   : "Match Bandon Update"       UPDATE  anon  USING true
```

No application code writes to either table (verified — the bandon repository is read-only).
These policies are pure attack surface: anyone with the public anon key can rewrite the 2025
archive's match results and win/loss records. Unauthenticated write access with no
`WITH CHECK` clause at all.

Drop both policies immediately — this is a one-line change with zero application impact, and
it does not depend on the archive decision. It belongs in Part II's remediation window, not
at the end of Part IV.

#### 20.5.4 [FIX] `branson_roster` exposes email addresses to `anon`

`branson_roster` has an `email` column and the policy
`"Enable read access for all users" SELECT {anon, authenticated} USING true`. It is queried
by no code whatsoever. This is a **second anonymous PII exposure**, independent of the
`players` exposure that Part II addresses, and Part II does not mention it — its audit scoped
to `players`. Dropping the table (20.3) removes it outright.

#### 20.5.5 [VERIFY] RLS helper functions are not in version control

Roughly thirty policies call `is_committee_or_admin()` or `is_admin()`. Neither function is
defined anywhere in `supabase/migrations/` (grep confirms); they were created in the
dashboard. `current_player_id()` *is* in
`supabase/migrations/20260404_match_results_pending.sql:38` and is correctly written
(`STABLE`, `SECURITY DEFINER`, `SET search_path = public`).

Consequence for **Part I**: if `supabase db dump` does not capture these two functions, the
test project gets a schema where thirty policies reference missing functions and every
committee write fails. Task H0 captures their definitions explicitly. When re-creating them,
match `current_player_id()`'s pattern and prefer `SET search_path = ''` with fully-qualified
table names (the stricter Supabase recommendation).

### 20.6 Schema/code type mismatches

#### 20.6.1 [FIX] `ghin_number` is `int8` in the database, `string | null` in TypeScript
`src/types/database.ts:20` declares `ghin_number: string | null`. The column is `int8`.
`src/app/admin/handicaps/page.tsx:208` calls `.localeCompare()` directly on the value:
```ts
(pa?.ghin_number ?? '').localeCompare(pb?.ghin_number ?? '', …)
```
If PostgREST returns `int8` as a JSON number, this throws `TypeError: … is not a function`
when sorting by GHIN. Line 301 of the same file defensively wraps in `String(...)`, which
suggests the ambiguity was already hit once. Recommend converting the column to `text`: GHIN
numbers are opaque identifiers, never arithmetic operands, and `int8` invites precision and
serialization problems for no benefit.

#### 20.6.2 [FIX] `players.country` is nullable in the database, non-nullable in TypeScript
`src/types/database.ts:16` declares `country: string`. **Lower severity than first stated**: a
dashboard export confirms the column already has `DEFAULT 'USA'` — so any row inserted through
the app gets a value automatically, and this only bites if a row is ever explicitly set to
`NULL`. Still worth tightening for correctness: add `NOT NULL` (the default already makes every
practical insert satisfy it), or correct the type to `string | null` if `NULL` is ever
intentional.

#### 20.6.3 [VERIFY] `tee_times` — referenced by three things, present in none
- `round_scores.tee_time_id uuid` is a column in the pasted schema.
- `supabase/migrations/20260201_players_auth_link.sql:232–259` enables RLS and creates four
  policies on `public.tee_times`.
- `src/types/database.ts:178` declares `tee_time_id: string | null`.
- The table is **absent from the pasted schema**, and no code queries it.

Either the table exists and the paste omitted it, or it was dropped after that migration ran
(in which case migration `20260201` would now fail on a fresh project — which directly
breaks Part I task 3.3). Resolve in H0; this one can block the test project build.

**Update 2026-09-28:** a second, independent source (a hand-copied `CREATE TABLE` export the
user pulled from the dashboard) also omits `tee_times`, and — more tellingly — its
`round_scores` definition lists FK constraints for `player_id`, `event_id`, and `course_id`
but **none for `tee_time_id`**, even though every other nullable FK column in that same
export does get a named constraint. That is consistent with `tee_times` not existing as a
real table. Treat as strong evidence, not final confirmation — this export doesn't list every
object type, so H0 query 2 should still be run to be certain before touching migration
`20260201` on the test project.

#### 20.6.4 [FIX] The `match_pending_status` enum is missing a value the CHECK constraint and app already use

**Corrected 2026-09-28.** Originally written as "the column is unconstrained `text`, convert
it to the existing enum" — both premises were wrong. A dashboard export the user provided
shows the column already carries
`CHECK (status = ANY (ARRAY['pending','confirmed','rejected','superseded','cancelled']))` —
5 values, not unconstrained — and `MatchResultsPendingStatus` in
`src/types/database.ts:112–118` already lists all 5, including `'cancelled'` (missed on first
read of a truncated excerpt). The enum type `match_pending_status`, by contrast, has only 4
values and is missing `'cancelled'`.

So the drift is the opposite of what was first claimed: the **enum is stale relative to the
CHECK and the app**, not the other way around. Converting the column to the enum as originally
written would have been a regression — the first `'cancelled'` write would be rejected.

Fix: either `ALTER TYPE match_pending_status ADD VALUE 'cancelled'` and then convert the
column (gets you a real enum with everything else the CHECK enforces), or leave the column as
`text` + `CHECK` and drop the unused enum type. The CHECK already does the job; converting is
a style preference, not a correctness fix, once the enum is corrected or discarded.

### 20.7 Data-integrity gaps

#### 20.7.1 [FIX] Missing uniqueness on join tables
Nothing in the paste prevents duplicate rows in any junction table. Each of these should
have a composite unique constraint, and today a double-click in the admin UI can create
duplicates:

| Table | Should be unique on |
|---|---|
| `team_rosters` | `(team_id, player_id)` |
| `match_players` | `(match_id, player_id)` |
| `team_captains` | `(team_id, player_id)` |
| `lodging_assignments` | `(lodging_id, player_id)` |
| `event_participants` | `(event_id, player_id)` |
| `reround_signups` | `(reround_id, player_id)` |
| `course_holes` | `(course_id, hole_number)` |
| `hole_scores` | `(round_score_id, hole_number)` |
| `matches` | `(event_id, match_number)` |
| `teams` | `(event_id, name)` |
| `ceremony_award_nominations` | `(event_id, nominator_player_id, award_key)` — one nomination per award per nominator |

`match_results_pending` already does this correctly with a partial unique index
(`match_results_pending_one_active ON (match_id) WHERE status = 'pending'`) — follow that
file's style.

#### 20.7.2 [FIX] Only one event should be active
`events.is_active` drives the home page's pre-trip/on-trip switch
(`src/app/page.tsx:81` does `.eq('is_active', true)` and expects a single row). Two active
events would break the home page. Enforce it:
```sql
CREATE UNIQUE INDEX events_one_active ON public.events (is_active) WHERE is_active;
```

#### 20.7.3 [FIX] Missing CHECK constraints
Cheap, and they encode the domain rules currently living only in the UI:
- `matches`: a match cannot both be halved and have a winner —
  `CHECK (NOT (is_halved AND winner_team_id IS NOT NULL))`
- `events`: `CHECK (end_date >= start_date)`
- `lodging`: `CHECK (check_out_date >= check_in_date)`
- `course_holes`: `CHECK (hole_number BETWEEN 1 AND 18)`, `CHECK (par BETWEEN 3 AND 6)`
- `hole_scores`: `CHECK (strokes > 0)`, `CHECK (penalty_strokes >= 0)`
- `round_scores`: `CHECK (total_score > 0)`
- `players.status`: constrain to the `PlayerStatus` union (`active|inactive|pending`) via
  CHECK or a new enum — it is unconstrained `text` today while `role` is properly an enum
- `event_participants.status` / `payment_status`: same problem, unconstrained `varchar`
- `matches.match_type`: unconstrained `varchar`; `src/lib/matchFormatConfig.ts` already
  defines the valid set — mirror it

#### 20.7.4 [FIX] Two competing models for rerounds
`rerounds` has `player1_id, player2_id, player3_id, player4_id` (a repeating group, capped at
four, unindexed, requiring four-way OR queries) **and** `reround_signups` exists as the
properly normalized junction table — unused. The app uses the four columns
(`src/app/admin/rerounds/page.tsx`).

Recommend: keep the denormalized columns for now (they work, and migrating is real effort),
but **drop `reround_signups`** rather than leave a decoy that a future agent will
"helpfully" start using in parallel. Record the decision so it is deliberate.

#### 20.7.5 [VERIFY] Nullable audit columns and missing `updated_at` triggers
Nearly every `created_at` / `updated_at` is nullable. They should be
`NOT NULL DEFAULT now()`. More importantly, `updated_at` appears on eleven tables and the
paste shows no triggers — if it is maintained by application code, it is certainly stale
somewhere. Add one shared trigger function and attach it to every table with the column.

### 20.8 Performance

#### 20.8.1 [FIX] Foreign-key columns are almost certainly unindexed
PostgreSQL does **not** create an index for a foreign key. Every join and every cascade the
app performs scans. The paste shows no indexes; assume none beyond primary keys and the two
unique constraints (`players.auth_user_id`, `players.email`).

At this data scale (54 players, a few hundred matches) the user-visible impact is small
**today** — but the RLS policies in 20.8.2 turn these into per-row subquery costs, and the
live-scoring feature adds hole-level rows. Index every FK:

```
teams(event_id)                       courses(event_id)
team_captains(team_id), (player_id)   course_holes(course_id)
team_rosters(team_id), (player_id)    matches(event_id), (course_id), (winner_team_id)
match_players(match_id), (player_id), (team_id)
round_scores(player_id), (event_id), (course_id), (tee_time_id)
hole_scores(round_score_id)           travel_info(player_id), (event_id)
lodging(event_id)                     lodging_assignments(lodging_id), (player_id)
event_participants(event_id), (player_id)
rerounds(event_id), (course_id), (player1_id), (player2_id), (player3_id), (player4_id)
reround_signups(reround_id), (player_id)
match_results_pending(match_id), (winner_team_id), (proposed_by_player_id),
                     (confirmed_by_player_id), (rejected_by_player_id),
                     (superseded_by_proposal_id)
ceremony_award_nominations(event_id), (nominator_player_id), (nominated_player_id)
```

Add composite indexes matching actual query shapes rather than duplicating single-column
ones where a composite already covers the leading column — e.g. `match_players(match_id,
player_id)` (which the 20.7.1 unique constraint provides) covers `match_id` lookups.

#### 20.8.2 [FIX] RLS policies re-evaluate `auth.uid()` per row
Several policies inline a correlated subquery, e.g. `round_scores_update_own`:
```sql
player_id IN (SELECT players.id FROM players WHERE players.auth_user_id = auth.uid())
```
Because `auth.uid()` is treated as volatile in this position, Postgres re-evaluates the
subquery **for every candidate row**. The standard Supabase fix is to wrap it so the planner
hoists it into an InitPlan evaluated once:
```sql
player_id IN (SELECT id FROM public.players WHERE auth_user_id = (SELECT auth.uid()))
```
Better still, reuse the existing `current_player_id()` helper (already `STABLE SECURITY
DEFINER`), which collapses the whole clause to `player_id = current_player_id()`.

Affected: `round_scores_insert_own`, `round_scores_update_own`, `travel_info_insert_own`,
`travel_info_update_own`, `hole_scores_insert_own`, `reround_signups_insert_own`,
`reround_signups_delete_own`, `profiles` own-row policies, and the `players` own-row
policies. `hole_scores_insert_own` is the worst — a two-table join per row.

#### 20.8.3 [FIX] Redundant permissive policies multiply cost
Every permissive policy for a matching role+command is evaluated and OR'd together. Current
duplicates:
- `players`: two UPDATE policies (`_own`, `_committee`)
- `round_scores`: two INSERT, two UPDATE
- `travel_info`: two INSERT, two UPDATE
- `hole_scores`: two INSERT
- `events`: two SELECT (`events_select_all` for authenticated + `"Enable Read for Anon"`)
- `matches`: two SELECT, same split

Merge each pair into one policy with an OR'd expression and a single `TO` clause — e.g. one
SELECT policy `TO anon, authenticated` for `events` and `matches` instead of two.

#### 20.8.4 [FIX] Policies targeting `public` instead of a real role
`match_results_pending` and `ceremony_award_nominations` policies are granted to `public`,
which includes `anon`. Their `USING` clauses do guard correctly (both require an
`auth.uid()`-derived player), so this is not currently an exposure — but it makes `anon`
evaluate the subqueries on every request. Scope them `TO authenticated`.

#### 20.8.5 Inconsistent anon read surface
`courses` is readable by `{anon, authenticated}` but `course_holes` is `authenticated`-only;
`matches` and `match_players` allow anon but `round_scores` does not. Once Part II
establishes the "what is public" classification (its task S5), make these consistent — and
note the live-scoring plan will need a deliberate answer for `course_holes` and hole scores.

### 20.9 Conflict with `LIVE_SCORING_PLAN.md` — three scoring tables already exist

`LIVE_SCORING_PLAN.md:83` states "There is no migration creating `public.course_holes`, no
admin UI, and no query against [it]", and its **task P1.1 creates the table**. The first part
is true — there is no *migration* — but the pasted schema shows `course_holes` **already
exists in the live database**, with exactly the columns that plan needs:
`course_id, hole_number, par, yardage, handicap_index`. It was created in the dashboard, like
every other baseline table (Part I section 1.3).

So:
- **Task P1.1 must become "verify and backfill", not "create".** Running it as written
  against production would fail or conflict.
- `round_scores` and `hole_scores` also already exist, unused, and overlap heavily with the
  `match_hole_scores` / `match_scorecards` tables that live scoring plans to add
  (`LIVE_SCORING_PLAN.md:474, 506, 567`). Decide deliberately: adopt the existing pair,
  or drop them so there is one obvious scoring model rather than two.

Do not drop `course_holes` — it is the prerequisite that plan is blocked on. Its emptiness is
the actual gap, not its absence.

---

## 21. Decisions required before writing any migration

### 21.1 Is the 2025 Bandon archive still wanted?
Same decision as Part III task R7. Options:
- **Retire it** — delete `/tee-times` and `/tee-times/2025/[playerSlug]`, `src/lib/repositories/bandon.ts`, `getAllPlayersAndMatches.ts`, `getPlayerRecord.ts`, `getMatchesWithPlayers.ts`; then drop `match_bandon`, `player`, `records_bandon`, `team_bandon`. Removes four tables, the last `.jsx` files, four components (Part III 15.7), and two anon-write holes.
- **Keep it** — then it must be hardened like anything else: drop the anon UPDATE policies (20.5.3), and accept `player`/`match_bandon` in the schema. Recommend also renaming to a `bandon_2025_*` prefix so `player` vs `players` stops being a footgun.

Recommendation: **retire it.** It is a 2025 archive, the redesign does not cover it, and its
data could be preserved as a static JSON snapshot in `src/data/` (which already holds
`matches.json` and `rerounds.json`) if the history matters.

### 21.2 `is_active` or `status` on `players`?
Recommend **`status`**, then drop `is_active` (20.5.1).

### 21.3 Drop or archive the unused tables?
`team_bandon`, `branson_roster`, `branson_captains`, `reround_signups`, plus
`team_captains` if the captains feature is not planned. Recommend dropping in the **test**
project first and only dropping in prod after a `pg_dump` of those tables is stored outside
the database.

### 21.4 Reuse or replace `round_scores` / `hole_scores`?
Needs the live-scoring author's input (20.9). Until decided, **do not drop them** — but do
not build on them either.

### 21.5 How aggressive on `NOT NULL` / CHECK backfills?
Adding `NOT NULL` to a column with existing NULLs requires a backfill and a table rewrite.
At 54 players this is instant; state explicitly that it is acceptable so H2 does not stall.

---

## 22. Phase H — hardening tasks

All migrations go in `supabase/migrations/` (which task 2.2 makes trackable — **hard
prerequisite**). Every one is applied to the **test** project first and to production only at
H9. Name them `<timestamp>_h<N>_<slug>.sql`.

### Task H0 (Agent) Ground-truth the schema — blocks everything else
Run against **production** (read-only) in the SQL editor and paste results into section 24.
This resolves every `[VERIFY]` item.

```sql
-- 1. RLS enabled per table (resolves 20.5.2 — the nine delete calls)
select relname, relrowsecurity, relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by relname;

-- 2. Does tee_times exist? (resolves 20.6.3 — can block Part I task 3.3)
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'tee_times';

-- 3. Every FK, its delete rule, and whether an index leads with its column
select tc.table_name, kcu.column_name, rc.delete_rule,
       exists (select 1 from pg_index i join pg_class ci on ci.oid = i.indexrelid
               join pg_class ct on ct.oid = i.indrelid
               where ct.relname = tc.table_name
                 and (select attname from pg_attribute
                      where attrelid = ct.oid and attnum = i.indkey[0]) = kcu.column_name) as has_leading_index
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu using (constraint_name, table_schema)
join information_schema.referential_constraints rc using (constraint_name, table_schema)
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 4. Existing indexes
select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' order by tablename, indexname;

-- 5. Column defaults and nullability for the audit columns + players
select table_name, column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (column_name in ('created_at','updated_at','is_active','status') or table_name = 'players')
order by table_name, ordinal_position;

-- 6. Triggers (is updated_at maintained?)
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers where trigger_schema = 'public'
order by event_object_table;

-- 7. Capture the RLS helper functions NOT in version control (20.5.5)
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin','is_committee_or_admin','current_player_id');

-- 8. Reconcile is_active vs status before choosing (20.5.1 / 21.2)
select status, is_active, count(*) from public.players group by 1,2 order by 3 desc;

-- 9. Row counts for the drop candidates (21.3)
select 'team_bandon' t, count(*) from public.team_bandon
union all select 'branson_roster', count(*) from public.branson_roster
union all select 'branson_captains', count(*) from public.branson_captains
union all select 'reround_signups', count(*) from public.reround_signups
union all select 'team_captains', count(*) from public.team_captains
union all select 'course_holes', count(*) from public.course_holes
union all select 'round_scores', count(*) from public.round_scores
union all select 'hole_scores', count(*) from public.hole_scores;
```

**Acceptance:** section 24 filled in; query 7's output saved verbatim into the H1 migration;
every `[VERIFY]` item above resolved to a yes/no.

### Task H1 (applied to test 2026-10-03) Put the RLS helper functions in version control
Take `is_admin()` and `is_committee_or_admin()` from H0 query 7 and commit them as a
migration, matching `current_player_id()`'s pattern (`STABLE SECURITY DEFINER`, explicit
`search_path`). No behavior change — this is purely making thirty policies reproducible, and
it is what lets Part I task 3.3 build a working test project.

`supabase/migrations/20261003120000_h1_version_control_rls_helpers.sql` — `CREATE OR REPLACE`
on both functions, bodies captured verbatim from the H0 pg_dump, only the `STABLE`/
`search_path` attributes added. No DB connection available in the agent's environment this
session (no `psql`/`supabase` CLI, no direct Postgres connection string in `.env.local`) —
**user runs Phase H migrations via the Supabase SQL editor**, not the agent, going forward.

**Acceptance:** applying the baseline + H1 to the test project yields working committee
writes. **Applied to test 2026-10-03** by the user via the Supabase SQL editor.

### Task H2 (items 1-2 done via Part II Task S5 2026-10-01; item 3 applied to test 2026-10-03)
Three changes that are small, independent, and currently exploitable:
1. ~~Drop `"Records Update Policy"` on `records_bandon` and `"Match Bandon Update"` on
   `match_bandon` (20.5.3). No app impact.~~ **Done** — Part II Task S5 shipped this exact
   fix (`supabase/migrations/20261001100000_close_bandon_branson_anon_exposure.sql`), applied
   to test and production, verified with real rows on both. Do not redo it here.
2. ~~Drop `branson_roster` (20.5.4), or if 21.3 says archive-first, revoke the anon SELECT now
   and drop later.~~ **Done, the archive-first option** — same migration revoked
   `branson_roster`'s anon `SELECT` policy without dropping the table, since 21.3 (retire the
   2025 Bandon archive?) is still undecided. Revisit dropping the table itself once that
   decision is made.
3. `supabase/migrations/20261003121000_h2_add_missing_delete_policies.sql` — one `DELETE`
   policy per table, role level matching that table's existing INSERT/UPDATE policies rather
   than a blanket `is_committee_or_admin()`: `events`/`players` use `is_admin()` (matching
   their existing insert/update policies, which are admin-only, not committee), the other 7
   (`teams`, `matches`, `courses`, `lodging`, `travel_info`, `rerounds`,
   `event_participants`) use `is_committee_or_admin()`. Confirmed via code read that all 9
   admin delete buttons issue a real client-side `.from(table).delete()` call today — meaning
   they've been silently no-op'ing (RLS denies, Supabase returns no error on 0 rows affected),
   not secretly working around the missing policy some other way.

**Acceptance:** item 1/2 verified on test and production already. **Item 3 migration applied
to test 2026-10-03** by the user. Still worth a manual check when convenient: each of the 9
delete buttons actually removes a row for an admin account, and a player-role account still
gets denied — no automated test covers the committee-vs-admin split specifically, and
`events`/`players` being admin-only (not committee) is new behavior worth confirming with a
committee-role account too, not just admin and player.

### Task H3 (code + migration applied to test 2026-10-03) Fix `players.is_active`/`status` split-brain — standardized on `is_active`
**Direction reversed from this task's original draft** (which said "standardize on
`status`, drop `is_active`") — user decided 2026-10-03 to go the other way, matching what
Part III's admin redesign had already done across 5 pages (`travel`, `lodging`, `teams`,
`matches/setup`, `participants`) without anyone revisiting this plan section at the time.

Code changes (commit `b6ead61`): `types/database.ts`'s `Player.status` →
`Player.is_active: boolean` (and the now-unused `PlayerStatus` type removed);
`lib/playerColumns.ts`'s `PUBLIC_PLAYER_COLUMNS` swaps `'status'` for `'is_active'`; public
pages (`roster`, `players`) and admin pages (`reset-password`, `rerounds`) that filtered on
`status = 'active'` now filter on `is_active = true`; `admin/players` (the actual
status-editing UI) got its 3-value Active/Inactive/Pending `Select` collapsed to a 2-value
Active/Inactive one bound to the boolean — "pending" behaved identically to "inactive"
everywhere that filtered on `status`, so nothing is lost except that one label. 4 test
fixtures + `playerColumns.test.ts` updated to match.

Migration `supabase/migrations/20261003130000_h3_standardize_on_is_active.sql`: reconciles
`is_active` FROM `status` for every existing row first (`status` was the only column anything
ever actually wrote — `is_active` just sat at its insert-time default forever, per the
original 20.5.1 finding), re-grants anon `SELECT` on `is_active` before `status` disappears
under it (anon could read `players.status` for the public roster/players listings), drops
`status`, then adds `NOT NULL DEFAULT true` to `is_active`.

**Acceptance:** migration **applied to test 2026-10-03** by the user via the Supabase SQL
editor. Still worth a manual check when convenient: a newly-admin-deactivated player
disappears from `travel`/`lodging`/`teams`/`matches/setup`/`participants`'s pickers
immediately (the original 20.5.1 regression test), and the public `/roster` and `/players`
pages still load for an anonymous visitor (the anon column grant actually matters here, not
just RLS).

### Task H4 (migration written 2026-10-03, not yet applied) Type corrections
`ghin_number` `int8` → `text` (20.6.1); `players.country` nullability reconciled with
`src/types/database.ts:16` (20.6.2); `match_results_pending.status` `text` → the
`match_pending_status` enum (20.6.4). Update `src/types/database.ts` in the same commit and
re-run `npx tsc --noEmit`.

`src/types/database.ts` already declares the post-fix shape for both `ghin_number`
(`string | null`) and `country` (`string`, non-nullable) — no code change ships with this
migration, only the database catches up to what TypeScript already expects. For 20.6.4: the
enum turned out to be the stale side (missing `'cancelled'`, which the real `CHECK` constraint
and the app's own `MatchResultsPendingStatus` type both already have), and it's unused as any
column's type — `supabase/migrations/20261003140000_h4_type_corrections.sql` drops it outright
rather than converting the column to match it, since the `CHECK` already does the job
correctly and converting would be pure style with real migration risk for no gain. Confirmed
via code read that no numeric/arithmetic handling of `ghin_number` exists anywhere (every
site already treats it as an opaque string — `.localeCompare()`, `String(...)`, `?? ''`), so
the `int8`→`text` column conversion is safe.

**Acceptance:** not yet verified — awaiting the user applying this migration to test via the
Supabase SQL editor, then `npx tsc --noEmit` confirming no new type errors (expected: none,
since the types already matched the target shape).

### Task H5 (Agent) Uniqueness and CHECK constraints
Everything in 20.7.1, 20.7.2, 20.7.3. Use `CREATE UNIQUE INDEX` / `ALTER TABLE … ADD
CONSTRAINT`, each `IF NOT EXISTS`-guarded where syntax allows. Expect some to **fail on
production data** — duplicate `team_rosters` rows are likely. That is a finding, not an
obstacle: dedupe first, in the same migration, and record what was found.

Run this against the **test** project with real seeded data before prod, and write the seed
script (Part I task 6.2) to satisfy these constraints.

### Task H6 (Agent) Indexes
All of 20.8.1, informed by H0 queries 3 and 4 — **skip any FK that already has a leading
index**, and skip single-column indexes made redundant by an H5 composite unique. Use
`CREATE INDEX IF NOT EXISTS`; on production prefer `CREATE INDEX CONCURRENTLY` (which cannot
run inside a transaction, so it needs its own migration file or a manual step).

### Task H7 (Agent) RLS performance rewrite
20.8.2, 20.8.3, 20.8.4: wrap `auth.uid()` as `(SELECT auth.uid())` or replace whole clauses
with `current_player_id()`; merge duplicate permissive policies; re-scope `public`-role
policies to `authenticated`.

This rewrites ~15 policies, so it is the highest-regression task in Phase H. It must land
**after** Part II's policy work (which rewrites `players` policies and adds column grants) to
avoid two authors editing the same policies. **Acceptance:** Part II's RLS test suite
(`npm run test:rls`, its task T-series) passes unchanged — the policies get faster, not
different.

### Task H8 (Agent) Drop unused tables and add audit-column defaults
Per 21.1/21.3 (decided 2026-10-01: retire) and 21.4 ignored here, unrelated: drop
`team_bandon`, `branson_captains`, `branson_roster` (its anon-exposing policy was already
dropped in Part II Task S5; the table itself is still unreferenced and unused — drop it too,
consistent with the standing "if unused, get rid of it" instruction), `reround_signups`, and
`match_bandon`/`player`/`records_bandon` (with the matching code deletions, which land in
Part III Task R0 — do that side first or in the same sitting, since this task only removes
the database tables, not the routes/components still referencing them).
Then 20.7.5: `NOT NULL DEFAULT now()` on audit columns and one shared `set_updated_at()`
trigger attached to every table with `updated_at`.

`pg_dump` each table being dropped to a file stored outside the database first.

### Task H9 (Human + Agent) Promote to production
Only after the full Part I task 7.1 smoke test passes against the hardened test project.
Apply H1–H8 to prod in the same order, one migration at a time, verifying between each.
Take a fresh backup first. Re-run Part II's production curl checks afterward.

---

## 23. Edits to make to Part I

Small, mechanical, so Part I reads correctly on its own:

1. **Task 3.2**, after the dump review bullets, add: *"The dump is also the input to Part IV's
   schema audit — run task H0 now, before applying anything to test, because H0 resolves
   whether `tee_times` exists (Part IV 20.6.3) and whether the RLS helper functions survived
   the dump (20.5.5). Both can break task 3.3."*
2. **Task 3.3**, after `supabase db push`: *"Then apply the Phase H hardening migrations
   (Part IV section 22) to the test project, so everything downstream is verified against the
   hardened schema."*
3. **Task 6.2**, in the seeding requirements: *"Seeds must satisfy the constraints added in
   task H5 — write the seed script after H5, not before."*
4. **Section 10 (Known risks)**, add: *"The schema being cloned has known defects (Part IV
   section 20). Cloning it verbatim and hardening later means doing the migration twice."*

---

## 24. Part IV values to record (from task H0)

Two sources filled this in ahead of schedule, during Part I execution rather than a
dedicated Part IV pass:

1. On 2026-09-28 the user supplied a hand-copied `CREATE TABLE ...` export from the Supabase
   dashboard (table/column/FK/CHECK definitions only) — marked **(export)** below.
2. Also on 2026-09-28, Part I task 3.2 ran a real `pg_dump --schema-only --no-owner --schema=public`
   against production to build the baseline migration
   (`supabase/migrations/00000000000000_baseline_schema.sql`). That dump is authoritative for
   everything it contains — tables, RLS enable state, all 77 policies, all 12 functions
   (bodies included), all indexes, all triggers, both enums — marked **(pg_dump)** below. It
   does not cover the `auth`/`storage` schemas; the one `auth.users` trigger needed was found
   via a direct `pg_trigger` query and is noted separately.

| Item | Value |
|---|---|
| Tables with RLS **disabled** (H0 q1) | **None — all 26 tables have RLS enabled** (pg_dump) |
| Does `tee_times` exist? (H0 q2) | **Confirmed no** (pg_dump) — absent from the 26-table dump. Migration `20260201`'s policies on it were skipped when the baseline was applied to test (nothing to attach them to); no error resulted since that migration file itself was never replayed, only its net effect via the dump |
| Full FK list, including delete rules | Captured (export, cross-verified by pg_dump) |
| `players.is_active` default | `DEFAULT true` (export, pg_dump) — corrected finding 20.5.1; the bug is stale-player-stays-pickable, not new-player-invisible |
| `players.country` default | `DEFAULT 'USA'` (export, pg_dump) — downgraded 20.6.2 to a minor tightening, not a live gap |
| `match_results_pending.status` CHECK values | `pending, confirmed, rejected, superseded, cancelled` (export, pg_dump) — corrected finding 20.6.4; the `match_pending_status` **enum** has only 4 values and is missing `cancelled`, confirmed by pg_dump's `CREATE TYPE` |
| Composite uniqueness on join tables | Confirmed absent (export, pg_dump) — confirms 20.7.1 as written |
| `updated_at` triggers present? (H0 q6) | **Yes, on 10 tables** (pg_dump) — `courses, event_participants, events, lodging, matches, players, rerounds, round_scores, teams, travel_info`, all via one shared `public.update_updated_at()` function. Corrects 20.7.5's assumption of "probably none." `match_results_pending` has `updated_at` but no generic trigger — plausible, since all its writes are gated through `SECURITY DEFINER` RPCs (`propose_match_result` etc.) that very likely set it explicitly; not re-verified line-by-line, low priority to chase |
| `is_admin()` / `is_committee_or_admin()` definitions captured (H0 q7) | **Captured in full** (pg_dump). Both are `LANGUAGE sql SECURITY DEFINER`, matching `current_player_id()`'s security model, but **neither has `STABLE` nor `SET search_path`** — `current_player_id()` (the one tracked migration's function) has both. New finding, folded into task H1: add both when recreating them, same as planned, now with real bodies instead of a guess. Search-path-hijack risk is low regardless, since every reference inside both bodies is already schema-qualified (`public.players`, `auth.uid()`) |
| `status` × `is_active` row distribution (H0 q8) | Lower priority — every row defaults `is_active = true` at insert and nothing ever sets it `false` |
| Row counts for drop candidates (H0 q9) | _TBD_ |
| Extra functions found beyond what any prior source mentioned | `finalize_match_result_from_pending`, `get_current_player_id`, `get_current_role`, `handle_new_user`, `propose_match_result`, `reject_match_result_pending`, `set_official_match_result`, `withdraw_match_result_pending`, `update_updated_at` — all captured verbatim in the baseline migration. `handle_new_user` is wired to `auth.users` via trigger `on_auth_user_created` (not in the `--schema=public` dump; created manually, confirmed matching on both projects) |
| Indexes (H0 q3/q4) | 17 non-PK indexes exist on production already (not "assume none" as originally written) — covers `players` (auth_user_id, email, name, role), `events` (is_active, year), `matches` (date, event_id), `round_scores` (event_id, player_id), `team_rosters` (player_id, team_id), `travel_info` (event_id), `ceremony_award_nominations` (event_id), `match_results_pending` (match_id, status, + the partial unique index). Section 20.8.1's list still stands for what's *missing* — most FK columns on `teams, courses, team_captains, match_players, course_holes, hole_scores, lodging*, event_participants, rerounds, reround_signups, match_results_pending`'s other player-FKs, and `ceremony_award_nominations`'s player-FKs remain unindexed |
| Baseline migration applied to test | **Done 2026-09-28** — `supabase/migrations/00000000000000_baseline_schema.sql` applied via direct `pg_dump`/`psql` (Docker/`supabase db dump` was unavailable; native `pg_dump` from `libpq` used instead, see task 2.1's updated instructions). Verified identical to production: 26 tables (exact name match), 12 functions, 77 policies, 10 triggers, 57 indexes, 2 enums, plus the `auth.users` trigger. One quirk recorded in the migration file itself: 8 trailing `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` statements fail as the `postgres` user (platform-locked role, already correct by default on every fresh project) — commented out in place with an explanation; the 8 equivalent `FOR ROLE postgres` statements did apply |
| 21.1 Retire the 2025 Bandon archive? | **Decided 2026-10-01: yes** (same decision recorded in Part III section 16/19) — `/tee-times`, `/tee-times/2025/[playerSlug]`, and their supporting lib/components folded into Part III Task R0; `match_bandon`/`player`/`records_bandon`/`team_bandon` table drops remain Task H8 below |
| 21.2 `status` chosen over `is_active`? | _TBD_ — separate question, not addressed by the Bandon decision |
| 21.3 Tables approved for dropping | **Decided 2026-10-01**, as part of 21.1: `match_bandon`, `player`, `records_bandon`, `team_bandon`. `branson_roster`/`branson_captains` already addressed separately (branson_roster's anon exposure closed via Part II Task S5; both tables still exist, dropping them is bundled into this same H8 pass since they're equally unreferenced) |
| 21.4 `round_scores`/`hole_scores` — reuse or replace? | _TBD_ — unrelated to the Bandon decision; still needs input from whoever drives [[project-live-scoring]] |
| Duplicate rows found by H5 constraints | _TBD_ |
| H1–H8 applied to test (dates) | _TBD_ |
| H1–H8 applied to prod (dates) | _TBD_ |
