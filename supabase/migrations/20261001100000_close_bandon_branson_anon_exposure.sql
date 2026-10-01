-- Close remaining anon exposures found during the Part IV schema audit (TEST_ENVIRONMENT_PLAN.md
-- section 20.5.3/20.5.4), applied here as Part II Task S5 -- same fix, done once, satisfies
-- Part IV task H2 too.
--
-- match_bandon / records_bandon: anon can UPDATE both (USING (true), no WITH CHECK), with zero
-- application code ever writing to either table -- pure attack surface on the 2025 Bandon
-- archive (/tee-times route). Their anon SELECT policies are left intact: that route actually
-- reads them for anonymous visitors, and 21.1 (retire the 2025 archive?) hasn't been decided.
--
-- branson_roster: unreferenced by any application code, yet grants anon SELECT including an
-- `email` column -- a second PII exposure independent of the one Part II's S1-S4 fixed, missed
-- by the original third-party review because it scoped to `players` only.

drop policy if exists "Match Bandon Update" on public.match_bandon;
drop policy if exists "Records Update Policy" on public.records_bandon;
drop policy if exists "Enable read access for all users" on public.branson_roster;
