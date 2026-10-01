-- Test-environment fixture data. NEVER run this against production -- it truncates and
-- rebuilds events/courses/players and everything that cascades from them.
--
-- Re-runnable: safe to execute after any schema reset. The three reserved test accounts
-- (test-admin@example.com, test-committee@example.com, test-player@example.com) are
-- re-linked to their existing auth.users rows by email if those already exist (created via
-- Part I task 6.3), so re-seeding does not require redoing that step.
--
-- See TEST_ENVIRONMENT_PLAN.md Part I task 6.2.

begin;

truncate table public.events, public.courses, public.players restart identity cascade;

create temporary table tmp_ids (key text primary key, id uuid) on commit drop;
create temporary table tmp_players (
  seq int,
  id uuid,
  team text, -- 'thompson' | 'burgess'
  pair int    -- pairing index within the team, for 2-man better-ball groupings
) on commit drop;

-- ---------------------------------------------------------------------------
-- Event -- one active event, matching the real 2027 Streamsong trip per
-- src/app/page.tsx's NEXT_TRIP and src/app/faq/page.tsx's FAQ_TRIP constants.
-- ---------------------------------------------------------------------------
with ins as (
  insert into public.events
    (name, year, location_city, location_state, resort_name, start_date, end_date, description, is_active)
  values
    ('19th Annual Patron Cup', 2027, 'Bowling Green', 'FL', 'Streamsong Resort',
     '2027-04-07', '2027-04-11', 'Seeded fixture event for the test environment.', true)
  returning id
)
insert into tmp_ids (key, id)
select 'event', id from ins;

-- ---------------------------------------------------------------------------
-- Courses -- the four real Streamsong courses referenced in the FAQ page.
-- ---------------------------------------------------------------------------
with ins as (
  insert into public.courses (event_id, name, resort_name, par, rating, slope, yardage)
  select id, 'Bone Valley', 'Streamsong Resort', 72, 73.1, 133, 7331 from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'course_bonevalley', id from ins;

with ins as (
  insert into public.courses (event_id, name, resort_name, par, rating, slope, yardage)
  select id, 'The Chain', 'Streamsong Resort', 56, 55.0, 110, 3300 from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'course_thechain', id from ins;

with ins as (
  insert into public.courses (event_id, name, resort_name, par, rating, slope, yardage)
  select id, 'Streamsong Blue', 'Streamsong Resort', 72, 72.0, 131, 7176 from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'course_blue', id from ins;

with ins as (
  insert into public.courses (event_id, name, resort_name, par, rating, slope, yardage)
  select id, 'Streamsong Red', 'Streamsong Resort', 72, 72.5, 134, 7331 from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'course_red', id from ins;

-- course_holes: standard 18-hole par-72 layout (four 5s, ten 4s, four 3s) for the three
-- full-length courses; The Chain is a 14-hole all-par-3 short course.
insert into public.course_holes (course_id, hole_number, par, yardage, handicap_index)
select ids.id, h.hole_number, h.par, h.yardage, h.handicap_index
from tmp_ids ids
cross join (values
  (1,4,395,7), (2,3,175,15), (3,5,540,3), (4,4,410,11), (5,4,385,9),
  (6,3,160,17), (7,5,560,1), (8,4,420,5), (9,4,400,13),
  (10,4,390,8), (11,3,185,16), (12,5,535,2), (13,4,415,10), (14,4,380,12),
  (15,3,170,18), (16,5,550,4), (17,4,405,6), (18,4,395,14)
) as h(hole_number, par, yardage, handicap_index)
where ids.key in ('course_bonevalley', 'course_blue', 'course_red');

insert into public.course_holes (course_id, hole_number, par, yardage, handicap_index)
select ids.id, n, 3, 110 + (n * 6), n
from tmp_ids ids
cross join generate_series(1, 14) as n
where ids.key = 'course_thechain';

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
with ins as (
  insert into public.teams (event_id, name, color)
  select id, 'Team Thompson', '#3498db' from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'team_thompson', id from ins;

with ins as (
  insert into public.teams (event_id, name, color)
  select id, 'Team Burgess', '#e74c3c' from tmp_ids where key = 'event'
  returning id
)
insert into tmp_ids (key, id)
select 'team_burgess', id from ins;

-- ---------------------------------------------------------------------------
-- Players -- 3 reserved accounts for Task 6.3's test logins, plus 21 clearly-fictional
-- fill players (golf-pun names, never real participant names) to round out two 12-player
-- rosters. One player is seeded status='inactive' deliberately, to exercise the
-- is_active/status admin-picker discrepancy noted in TEST_ENVIRONMENT_PLAN.md Part IV.
-- ---------------------------------------------------------------------------
with ins as (
  insert into public.players
    (first_name, last_name, email, phone, city, state, current_handicap, ghin_club, ghin_number, role, status)
  values
    ('Test',    'Admin',      'test-admin@example.com',      '555-0100', 'Austin',     'TX', 8.4,  'Test Golf Club', 2000000, 'admin',     'active'),
    ('Test',    'Committee',  'test-committee@example.com',  '555-0101', 'Dallas',     'TX', 11.2, 'Test Golf Club', 2000001, 'committee', 'active'),
    ('Test',    'Player',     'test-player@example.com',     '555-0102', 'Houston',    'TX', 14.6, 'Test Golf Club', 2000002, 'player',    'active'),
    ('Alex',    'Fairway',    'alex.fairway@example.com',    '555-0200', 'Denver',     'CO', 6.1,  'Test Golf Club', 2000003, 'player',    'active'),
    ('Jordan',  'Birdie',     'jordan.birdie@example.com',   '555-0201', 'Phoenix',    'AZ', 9.3,  'Test Golf Club', 2000004, 'player',    'active'),
    ('Sam',     'Mulligan',   'sam.mulligan@example.com',    '555-0202', 'Portland',   'OR', 12.8, 'Test Golf Club', 2000005, 'player',    'active'),
    ('Taylor',  'Bogey',      'taylor.bogey@example.com',    '555-0203', 'Seattle',    'WA', 16.0, 'Test Golf Club', 2000006, 'player',    'active'),
    ('Morgan',  'Eagle',      'morgan.eagle@example.com',    '555-0204', 'Chicago',    'IL', 4.5,  'Test Golf Club', 2000007, 'player',    'active'),
    ('Casey',   'Slice',      'casey.slice@example.com',     '555-0205', 'Nashville',  'TN', 19.2, 'Test Golf Club', 2000008, 'player',    'active'),
    ('Riley',   'Hook',       'riley.hook@example.com',      '555-0206', 'Atlanta',    'GA', 22.4, 'Test Golf Club', 2000009, 'player',    'active'),
    ('Jamie',   'Putt',       'jamie.putt@example.com',      '555-0207', 'Miami',      'FL', 7.7,  'Test Golf Club', 2000010, 'player',    'active'),
    ('Drew',    'Divot',      'drew.divot@example.com',      '555-0208', 'Charlotte',  'NC', 13.3, 'Test Golf Club', 2000011, 'player',    'active'),
    ('Blake',   'Caddie',     'blake.caddie@example.com',    '555-0209', 'Tampa',      'FL', 10.0, 'Test Golf Club', 2000012, 'player',    'active'),
    ('Avery',   'Wedge',      'avery.wedge@example.com',     '555-0210', 'Boise',      'ID', 17.5, 'Test Golf Club', 2000013, 'player',    'active'),
    ('Quinn',   'Niblick',    'quinn.niblick@example.com',   '555-0211', 'Omaha',      'NE', 20.1, 'Test Golf Club', 2000014, 'player',    'active'),
    ('Skyler',  'Albatross',  'skyler.albatross@example.com','555-0212', 'Tulsa',      'OK', 3.9,  'Test Golf Club', 2000015, 'player',    'active'),
    ('Reese',   'Par',        'reese.par@example.com',       '555-0213', 'Columbus',   'OH', 15.5, 'Test Golf Club', 2000016, 'player',    'active'),
    ('Parker',  'Dogleg',     'parker.dogleg@example.com',   '555-0214', 'Richmond',   'VA', 8.8,  'Test Golf Club', 2000017, 'player',    'active'),
    ('Dakota',  'Greenside',  'dakota.greenside@example.com','555-0215', 'Boulder',    'CO', 24.0, 'Test Golf Club', 2000018, 'player',    'active'),
    ('Rowan',   'Flagstick',  'rowan.flagstick@example.com', '555-0216', 'Raleigh',    'NC', 11.9, 'Test Golf Club', 2000019, 'player',    'active'),
    ('Finley',  'Sandtrap',   'finley.sandtrap@example.com', '555-0217', 'Louisville', 'KY', 6.6,  'Test Golf Club', 2000020, 'player',    'active'),
    ('Hayden',  'Rough',      'hayden.rough@example.com',    '555-0218', 'Memphis',    'TN', 18.3, 'Test Golf Club', 2000021, 'player',    'active'),
    ('Emerson', 'Teebox',     'emerson.teebox@example.com',  '555-0219', 'Wichita',    'KS', 9.9,  'Test Golf Club', 2000022, 'player',    'active'),
    ('Kai',     'Bunker',     'kai.bunker@example.com',      '555-0220', 'Little Rock','AR', 21.0, 'Test Golf Club', 2000023, 'player',    'inactive')
  returning id, email
)
insert into tmp_players (seq, id, team, pair)
select
  v.seq, ins.id, v.team,
  -- pair = this player's 1-based position within their OWN team, every 2 consecutive
  -- teammates (by seq) form one 2-man better-ball pair. Windowed per team, not globally
  -- across both teams' interleaved seq numbers.
  ((row_number() over (partition by v.team order by v.seq) - 1) / 2) + 1 as pair
from ins
join (values
  ('test-admin@example.com', 1, 'thompson'), ('test-committee@example.com', 2, 'burgess'),
  ('test-player@example.com', 3, 'burgess'), ('alex.fairway@example.com', 4, 'thompson'),
  ('jordan.birdie@example.com', 5, 'thompson'), ('sam.mulligan@example.com', 6, 'thompson'),
  ('taylor.bogey@example.com', 7, 'thompson'), ('morgan.eagle@example.com', 8, 'thompson'),
  ('casey.slice@example.com', 9, 'thompson'), ('riley.hook@example.com', 10, 'thompson'),
  ('jamie.putt@example.com', 11, 'thompson'), ('drew.divot@example.com', 12, 'thompson'),
  ('blake.caddie@example.com', 13, 'thompson'), ('avery.wedge@example.com', 14, 'thompson'),
  ('quinn.niblick@example.com', 15, 'burgess'), ('skyler.albatross@example.com', 16, 'burgess'),
  ('reese.par@example.com', 17, 'burgess'), ('parker.dogleg@example.com', 18, 'burgess'),
  ('dakota.greenside@example.com', 19, 'burgess'), ('rowan.flagstick@example.com', 20, 'burgess'),
  ('finley.sandtrap@example.com', 21, 'burgess'), ('hayden.rough@example.com', 22, 'burgess'),
  ('emerson.teebox@example.com', 23, 'burgess'), ('kai.bunker@example.com', 24, 'burgess')
) as v(email, seq, team)
  on v.email = ins.email;

-- Re-link the 3 reserved accounts to their auth.users row if it already exists (Task 6.3).
-- No-op (0 rows updated) until those auth users have been created.
update public.players set auth_user_id = u.id
from auth.users u
where u.email = public.players.email
  and public.players.email in ('test-admin@example.com', 'test-committee@example.com', 'test-player@example.com');

-- profiles row for any player now linked to an auth user (mirrors handle_new_user()'s
-- effect for ones created before this reseed ran; a no-op once the auth user already
-- exists, since the trigger already created it at auth.users insert time).
insert into public.profiles (id, must_change_password)
select auth_user_id, false from public.players
where auth_user_id is not null
on conflict (id) do nothing;

-- Task 6.3 acceptance requires one of the three reserved accounts to still be mid
-- forced-password-change, to exercise that flow -- handle_new_user() always creates new
-- profiles with must_change_password=false, so this must be set explicitly, every reseed.
update public.profiles set must_change_password = true
where id = (select auth_user_id from public.players where email = 'test-player@example.com');

-- ---------------------------------------------------------------------------
-- Team rosters
-- ---------------------------------------------------------------------------
insert into public.team_rosters (team_id, player_id, handicap_at_event)
select
  (select id from tmp_ids where key = 'team_' || tp.team),
  tp.id,
  pl.current_handicap
from tmp_players tp
join public.players pl on pl.id = tp.id;

-- ---------------------------------------------------------------------------
-- Event participants -- everyone seeded is registered; most paid, a couple pending.
-- ---------------------------------------------------------------------------
insert into public.event_participants (event_id, player_id, status, payment_status)
select
  (select id from tmp_ids where key = 'event'),
  tp.id,
  'registered',
  case when tp.seq <= 2 then 'pending' else 'paid' end
from tmp_players tp;

-- ---------------------------------------------------------------------------
-- Lodging -- 4 units, players spread across them.
-- ---------------------------------------------------------------------------
create temporary table tmp_lodging (seq int, id uuid) on commit drop;

with ins as (
  insert into public.lodging (event_id, building_name, room_number, room_type, check_in_date, check_out_date, bedrooms, num_of_people)
  select (select id from tmp_ids where key = 'event'), b.building_name, b.room_number, b.room_type, '2027-04-07', '2027-04-11', b.bedrooms, b.num_of_people
  from (values
    (1, 'Streamsong Lodge', '101', 'Suite', 2, 4),
    (2, 'Streamsong Lodge', '102', 'Suite', 2, 4),
    (3, 'Red Cottages', 'Cottage A', 'House', 3, 6),
    (4, 'Red Cottages', 'Cottage B', 'House', 3, 6)
  ) as b(seq, building_name, room_number, room_type, bedrooms, num_of_people)
  returning id, building_name, room_number
)
insert into tmp_lodging (seq, id)
select v.seq, ins.id
from ins
join (values (1,'Streamsong Lodge','101'), (2,'Streamsong Lodge','102'), (3,'Red Cottages','Cottage A'), (4,'Red Cottages','Cottage B')) as v(seq, building_name, room_number)
  on v.building_name = ins.building_name and v.room_number = ins.room_number;

insert into public.lodging_assignments (lodging_id, player_id, is_primary, confirmation_num)
select
  (select id from tmp_lodging where seq = ((tp.seq - 1) / 6) + 1),
  tp.id,
  (tp.seq - 1) % 6 = 0,
  'CONF-TEST-' || (((tp.seq - 1) / 6) + 1)::text
from tmp_players tp;

-- ---------------------------------------------------------------------------
-- Travel info -- seeded for about a third of players, to simulate partial completion.
-- ---------------------------------------------------------------------------
insert into public.travel_info
  (player_id, event_id, arrival_date, arrival_time, arrival_flight_number, arrival_airline, arrival_airport,
   departure_date, departure_time, departure_flight_number, departure_airline, departure_airport, needs_transportation)
select
  tp.id,
  (select id from tmp_ids where key = 'event'),
  '2027-04-06', '14:30', 'TA' || (100 + tp.seq)::text, 'Test Airlines', 'TPA',
  '2027-04-11', '11:15', 'TA' || (200 + tp.seq)::text, 'Test Airlines', 'TPA',
  tp.seq % 2 = 0
from tmp_players tp
where tp.seq <= 8;

-- ---------------------------------------------------------------------------
-- Matches -- Round 1 (Bone Valley) has official results; Round 2 (The Chain) has
-- match_results_pending rows covering every MatchResultsPendingStatus value. Rounds 3
-- (Blue) and 4 (Red) are deliberately left without matches, to also exercise the
-- "no matches yet for this round" UI state.
-- ---------------------------------------------------------------------------
create temporary table tmp_matches (seq int, id uuid) on commit drop;

-- Round 1: 4 matches, Two-Man BetterBall, pairs 1-4 of each team.
with ins as (
  insert into public.matches (event_id, match_number, group_number, course_id, match_date, match_time, match_type, winner_team_id, is_halved, result_set_by_official)
  select
    (select id from tmp_ids where key = 'event'),
    g.pair,
    g.pair,
    (select id from tmp_ids where key = 'course_bonevalley'),
    '2027-04-07', '09:00:00', 'Two-Man BetterBall',
    case g.pair when 1 then (select id from tmp_ids where key = 'team_thompson')
                when 2 then (select id from tmp_ids where key = 'team_burgess')
                else null end,
    g.pair = 3,
    g.pair in (1,2,3)
  from generate_series(1,4) as g(pair)
  returning id, match_number
)
insert into tmp_matches (seq, id)
select match_number, id from ins;

insert into public.match_players (match_id, player_id, team_id, handicap_used)
select
  (select id from tmp_matches where seq = tp.pair),
  tp.id,
  (select id from tmp_ids where key = 'team_' || tp.team),
  pl.current_handicap
from tmp_players tp
join public.players pl on pl.id = tp.id
where tp.pair <= 4;

-- Round 2: 4 more matches on The Chain, numbered 5-8, unofficial -- these carry the
-- match_results_pending examples instead of a direct result.
with ins as (
  insert into public.matches (event_id, match_number, group_number, course_id, match_date, match_time, match_type)
  select
    (select id from tmp_ids where key = 'event'),
    g.pair + 4,
    g.pair,
    (select id from tmp_ids where key = 'course_thechain'),
    '2027-04-07', '14:00:00', 'Two-Man BetterBall'
  from generate_series(1,4) as g(pair)
  returning id, match_number
)
insert into tmp_matches (seq, id)
select match_number, id from ins;

insert into public.match_players (match_id, player_id, team_id, handicap_used)
select
  (select id from tmp_matches where seq = tp.pair + 4),
  tp.id,
  (select id from tmp_ids where key = 'team_' || tp.team),
  pl.current_handicap
from tmp_players tp
join public.players pl on pl.id = tp.id
where tp.pair <= 4;

-- A 9th match (pair 5 of each team), solely to carry a standalone 'cancelled' proposal that
-- nothing else touches -- match 7 below also visits 'cancelled' but only transiently, on its
-- way to 'superseded', so it doesn't leave a durable example of that status on its own.
with ins as (
  insert into public.matches (event_id, match_number, group_number, course_id, match_date, match_time, match_type)
  select
    (select id from tmp_ids where key = 'event'), 9, 5,
    (select id from tmp_ids where key = 'course_thechain'),
    '2027-04-07', '14:40:00', 'Two-Man BetterBall'
  returning id, match_number
)
insert into tmp_matches (seq, id)
select match_number, id from ins;

insert into public.match_players (match_id, player_id, team_id, handicap_used)
select
  (select id from tmp_matches where seq = 9),
  tp.id,
  (select id from tmp_ids where key = 'team_' || tp.team),
  pl.current_handicap
from tmp_players tp
join public.players pl on pl.id = tp.id
where tp.pair = 5;

insert into public.match_results_pending (match_id, winner_team_id, is_halved, proposed_by_player_id, status, created_at)
values (
  (select id from tmp_matches where seq = 9),
  (select id from tmp_ids where key = 'team_burgess'), false,
  (select id from tmp_players where pair = 5 and team = 'burgess' limit 1),
  'cancelled', now() - interval '4 days'
);

-- match_results_pending: one example of each remaining status, tied to round 2's 4 matches
-- (match 7 carries two historical rows to demonstrate the supersede chain).
insert into public.match_results_pending (match_id, winner_team_id, is_halved, proposed_by_player_id, status, confirmed_by_player_id, confirmed_at, rejected_by_player_id, promoted_at, created_at)
values
  -- match 5: a fresh, unconfirmed proposal
  ((select id from tmp_matches where seq = 5),
   (select id from tmp_ids where key = 'team_thompson'), false,
   (select id from tmp_players where pair = 1 and team = 'thompson' limit 1),
   'pending', null, null, null, null, now()),

  -- match 6: confirmed by the opponent; mirror the result onto the match itself, since this
  -- seed script does not invoke the finalize_match_result_from_pending() RPC.
  ((select id from tmp_matches where seq = 6),
   (select id from tmp_ids where key = 'team_burgess'), false,
   (select id from tmp_players where pair = 2 and team = 'burgess' limit 1),
   'confirmed',
   (select id from tmp_players where pair = 2 and team = 'thompson' limit 1),
   now() - interval '1 day', null, now() - interval '1 day', now() - interval '2 days'),

  -- match 7: an old proposal, superseded by a newer one still pending
  ((select id from tmp_matches where seq = 7),
   (select id from tmp_ids where key = 'team_thompson'), false,
   (select id from tmp_players where pair = 3 and team = 'thompson' limit 1),
   'cancelled', null, null, null, null, now() - interval '3 days'),

  -- match 8: rejected by the opponent
  ((select id from tmp_matches where seq = 8),
   null, true,
   (select id from tmp_players where pair = 4 and team = 'burgess' limit 1),
   'rejected', null, null,
   (select id from tmp_players where pair = 4 and team = 'thompson' limit 1),
   null, now() - interval '1 day');

-- match 7's superseding, currently-pending proposal (kept as a separate statement so it can
-- reference the row above's id for superseded_by_proposal_id).
with old_proposal as (
  select id from public.match_results_pending
  where match_id = (select id from tmp_matches where seq = 7) and status = 'cancelled'
),
new_proposal as (
  insert into public.match_results_pending (match_id, winner_team_id, is_halved, proposed_by_player_id, status, created_at)
  values (
    (select id from tmp_matches where seq = 7),
    (select id from tmp_ids where key = 'team_thompson'), false,
    (select id from tmp_players where pair = 3 and team = 'burgess' limit 1),
    'pending', now()
  )
  returning id
)
update public.match_results_pending
set status = 'superseded', superseded_by_proposal_id = new_proposal.id
from new_proposal, old_proposal
where public.match_results_pending.id = old_proposal.id;

-- Apply match 6's confirmed result directly to the match row (see comment above).
update public.matches
set winner_team_id = (select id from tmp_ids where key = 'team_burgess'),
    is_halved = false,
    result_set_by_official = false
where id = (select id from tmp_matches where seq = 6);

-- ---------------------------------------------------------------------------
-- Ceremony award nominations -- one example per award key.
-- ---------------------------------------------------------------------------
insert into public.ceremony_award_nominations (event_id, nominator_player_id, nominated_player_id, award_key, reason)
values
  ((select id from tmp_ids where key = 'event'),
   (select id from tmp_players where seq = 1),
   (select id from tmp_players where seq = 10),
   'davey_jones_locker',
   'Lost three balls in the water on the same hole. A new record.'),
  ((select id from tmp_ids where key = 'event'),
   (select id from tmp_players where seq = 2),
   (select id from tmp_players where seq = 20),
   'matt_leinart',
   'Told a story about a 400-yard drive that nobody believed.');

commit;
