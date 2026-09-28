-- Baseline schema, dumped from production (project ref gqsfaxasmodlykeqvhuu) on 2026-09-28.
-- Generated via: pg_dump --schema-only --no-owner --schema=public
-- This is a faithful CLONE of production as it stood on that date, including known defects
-- documented in TEST_ENVIRONMENT_PLAN.md Part IV (sections 20-24). Do not "fix" anything in
-- this file — hardening is applied as separate migrations afterward (Phase H), against the
-- test project first. See Part I task 3.2/3.3 for why this ordering matters.
--
-- One manual addition below the dump: the trigger wiring public.handle_new_user() to
-- auth.users lives in the auth schema, so a --schema=public dump cannot capture it. Captured
-- separately via: select pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

--
-- PostgreSQL database dump
--

\restrict VkoDgU8cQoeu4BBJSpVFkiGK7cvX8TtyWvLHWMsDVVwLgv2OK4BsDwEqvhvbCBx

-- Dumped from database version 15.8
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;  -- omitted: every Postgres/Supabase database already has this schema


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: match_pending_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_pending_status AS ENUM (
    'pending',
    'confirmed',
    'rejected',
    'superseded'
);


--
-- Name: player_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.player_role AS ENUM (
    'player',
    'committee',
    'admin'
);


--
-- Name: current_player_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_player_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM public.players WHERE auth_user_id = auth.uid() LIMIT 1;
$$;


--
-- Name: finalize_match_result_from_pending(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_match_result_from_pending(p_pending_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id = v_player_id THEN
    RAISE EXCEPTION 'Cannot confirm your own proposal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = v_row.match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = v_row.match_id AND m.result_set_by_official = true
  ) THEN
    RAISE EXCEPTION 'Result was set by committee';
  END IF;

  UPDATE public.matches
  SET
    winner_team_id = v_row.winner_team_id,
    is_halved = v_row.is_halved,
    result_set_by_official = false,
    updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.match_results_pending
  SET
    status = 'confirmed',
    confirmed_by_player_id = v_player_id,
    confirmed_at = now(),
    promoted_at = now(),
    updated_at = now()
  WHERE id = p_pending_id;
END;
$$;


--
-- Name: get_current_player_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_player_id() RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select id from public.players where auth_user_id = auth.uid();
$$;


--
-- Name: get_current_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_role() RETURNS public.player_role
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select role from public.players where auth_user_id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, must_change_password)
    VALUES (new.id, false);
    RETURN new;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.players 
    where auth_user_id = auth.uid() 
    and role = 'admin'
  );
$$;


--
-- Name: is_committee_or_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_committee_or_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.players 
    where auth_user_id = auth.uid() 
    and role in ('committee', 'admin')
  );
$$;


--
-- Name: propose_match_result(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.propose_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_player_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_locked boolean;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = p_match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  SELECT m.result_set_by_official
  INTO v_locked
  FROM public.matches m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_locked THEN
    RAISE EXCEPTION 'Result was set by committee; player entry disabled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id
      AND (m.winner_team_id IS NOT NULL OR m.is_halved)
  ) THEN
    RAISE EXCEPTION 'Match already has a recorded result';
  END IF;

  IF (p_is_halved = true AND p_winner_team_id IS NOT NULL) OR (p_is_halved = false AND p_winner_team_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid winner/halved combination';
  END IF;

  IF p_is_halved = false AND p_winner_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = p_match_id AND mp.team_id = p_winner_team_id
    ) THEN
      RAISE EXCEPTION 'Winner must be one of the match teams';
    END IF;
  END IF;

  -- Supersede existing pending row
  UPDATE public.match_results_pending
  SET status = 'superseded', updated_at = now()
  WHERE match_id = p_match_id AND status = 'pending'
  RETURNING id INTO v_old_id;

  INSERT INTO public.match_results_pending (
    match_id, winner_team_id, is_halved, proposed_by_player_id, status, updated_at
  ) VALUES (
    p_match_id,
    CASE WHEN p_is_halved THEN NULL ELSE p_winner_team_id END,
    p_is_halved,
    v_player_id,
    'pending',
    now()
  )
  RETURNING id INTO v_new_id;

  IF v_old_id IS NOT NULL THEN
    UPDATE public.match_results_pending
    SET superseded_by_proposal_id = v_new_id, updated_at = now()
    WHERE id = v_old_id;
  END IF;

  RETURN v_new_id;
END;
$$;


--
-- Name: reject_match_result_pending(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_match_result_pending(p_pending_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id = v_player_id THEN
    RAISE EXCEPTION 'Use withdraw for your own proposal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = v_row.match_id AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Not a participant in this match';
  END IF;

  UPDATE public.match_results_pending
  SET
    status = 'rejected',
    rejected_by_player_id = v_player_id,
    updated_at = now()
  WHERE id = p_pending_id;
END;
$$;


--
-- Name: set_official_match_result(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_official_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE auth_user_id = auth.uid() AND role IN ('committee', 'admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_is_halved AND p_winner_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid winner/halved combination';
  END IF;

  IF NOT p_is_halved AND p_winner_team_id IS NULL THEN
    -- clear result
    UPDATE public.matches
    SET
      winner_team_id = null,
      is_halved = false,
      result_set_by_official = true,
      updated_at = now()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET
      winner_team_id = CASE WHEN p_is_halved THEN null ELSE p_winner_team_id END,
      is_halved = p_is_halved,
      result_set_by_official = true,
      updated_at = now()
    WHERE id = p_match_id;
  END IF;

  UPDATE public.match_results_pending
  SET status = 'cancelled', updated_at = now()
  WHERE match_id = p_match_id AND status = 'pending';
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: withdraw_match_result_pending(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.withdraw_match_result_pending(p_pending_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_player_id uuid;
  v_row public.match_results_pending%ROWTYPE;
BEGIN
  v_player_id := public.current_player_id();
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.match_results_pending
  WHERE id = p_pending_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposal is not pending';
  END IF;

  IF v_row.proposed_by_player_id <> v_player_id THEN
    RAISE EXCEPTION 'Only the proposer can withdraw';
  END IF;

  UPDATE public.match_results_pending
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_pending_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branson_captains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branson_captains (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    team_num integer,
    captain text
);


--
-- Name: branson_captains_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.branson_captains ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.branson_captains_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: branson_roster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branson_roster (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    f_name text,
    l_name text,
    email text,
    handicap real,
    team integer
);


--
-- Name: branson_roster_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.branson_roster ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.branson_roster_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ceremony_award_nominations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ceremony_award_nominations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    nominator_player_id uuid NOT NULL,
    nominated_player_id uuid NOT NULL,
    award_key text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ceremony_award_nom_no_self CHECK ((nominator_player_id <> nominated_player_id)),
    CONSTRAINT ceremony_award_nominations_award_key_check CHECK ((award_key = ANY (ARRAY['davey_jones_locker'::text, 'matt_leinart'::text]))),
    CONSTRAINT ceremony_award_nominations_reason_check CHECK (((length(TRIM(BOTH FROM reason)) > 0) AND (length(reason) <= 2000)))
);


--
-- Name: course_holes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_holes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    hole_number integer NOT NULL,
    par integer NOT NULL,
    yardage integer,
    handicap_index integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT course_holes_handicap_index_check CHECK (((handicap_index >= 1) AND (handicap_index <= 18))),
    CONSTRAINT course_holes_hole_number_check CHECK (((hole_number >= 1) AND (hole_number <= 18))),
    CONSTRAINT course_holes_par_check CHECK (((par >= 3) AND (par <= 6)))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    name character varying(200) NOT NULL,
    resort_name character varying(200),
    par integer DEFAULT 72,
    rating numeric(4,1),
    slope integer,
    yardage integer,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    player_id uuid NOT NULL,
    registration_date timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'registered'::character varying,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    payment_amount numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    year integer NOT NULL,
    location_city character varying(100) NOT NULL,
    location_state character varying(50) NOT NULL,
    resort_name character varying(200),
    start_date date NOT NULL,
    end_date date NOT NULL,
    description text,
    logo_url text,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: hole_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hole_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_score_id uuid NOT NULL,
    hole_number integer NOT NULL,
    strokes integer NOT NULL,
    putts integer,
    fairway_hit boolean,
    gir boolean,
    sand_save boolean,
    penalty_strokes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hole_scores_hole_number_check CHECK (((hole_number >= 1) AND (hole_number <= 18)))
);


--
-- Name: lodging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lodging (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    room_number character varying(50),
    room_type character varying(100),
    check_in_date date,
    check_out_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bedrooms bigint,
    num_of_people bigint,
    building_name text
);


--
-- Name: lodging_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lodging_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lodging_id uuid NOT NULL,
    player_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    confirmation_num text
);


--
-- Name: match_bandon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_bandon (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    match integer,
    "group" integer,
    date text,
    "time" text,
    match_type text,
    winner text,
    thompson_player1 text,
    thompson_player2 text,
    burgess_player1 text,
    burgess_player2 text,
    course text
);


--
-- Name: match_bandon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.match_bandon ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.match_bandon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: match_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    handicap_used numeric(4,1),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: match_results_pending; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_results_pending (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    winner_team_id uuid,
    is_halved boolean DEFAULT false NOT NULL,
    proposed_by_player_id uuid NOT NULL,
    confirmed_by_player_id uuid,
    rejected_by_player_id uuid,
    superseded_by_proposal_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    promoted_at timestamp with time zone,
    CONSTRAINT match_results_pending_halved_consistency CHECK ((((is_halved = true) AND (winner_team_id IS NULL)) OR ((is_halved = false) AND (winner_team_id IS NOT NULL)))),
    CONSTRAINT match_results_pending_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'superseded'::text, 'cancelled'::text])))
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    match_number integer NOT NULL,
    group_number integer,
    course_id uuid,
    match_date date NOT NULL,
    match_time time without time zone,
    match_type character varying(100) NOT NULL,
    winner_team_id uuid,
    is_halved boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    result_set_by_official boolean DEFAULT false NOT NULL
);


--
-- Name: player; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    f_name text,
    l_name text,
    handicap real
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    address_line1 character varying(255),
    address_line2 character varying(255),
    city character varying(100),
    state character varying(50),
    zip_code character varying(20),
    country character varying(100) DEFAULT 'USA'::character varying,
    current_handicap numeric(4,1),
    shirt_size character varying(10),
    dietary_restrictions text,
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    profile_image_url text,
    bio text,
    role public.player_role DEFAULT 'player'::public.player_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    ghin_number bigint,
    ghin_club text
);


--
-- Name: team_captains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_captains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_rosters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_rosters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    player_id uuid NOT NULL,
    handicap_at_event numeric(4,1),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(50),
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: player_team_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_team_view AS
 SELECT p.id AS player_id,
    p.first_name,
    p.last_name,
    p.current_handicap,
    p.role,
    t.id AS team_id,
    t.name AS team_name,
    t.color AS team_color,
    tr.handicap_at_event,
    e.id AS event_id,
    e.year,
    e.name AS event_name,
    (EXISTS ( SELECT 1
           FROM public.team_captains tc
          WHERE ((tc.team_id = t.id) AND (tc.player_id = p.id)))) AS is_captain
   FROM (((public.players p
     JOIN public.team_rosters tr ON ((tr.player_id = p.id)))
     JOIN public.teams t ON ((t.id = tr.team_id)))
     JOIN public.events e ON ((e.id = t.event_id)));


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles - one per auth.users record. Stores must_change_password flag for invite flow.';


--
-- Name: records_bandon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_bandon (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "playerId" uuid DEFAULT gen_random_uuid(),
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    ties integer DEFAULT 0
);


--
-- Name: records_bandon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.records_bandon ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.records_bandon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reround_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reround_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reround_id uuid NOT NULL,
    player_id uuid NOT NULL,
    signup_date timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'confirmed'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: rerounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rerounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    course_id uuid NOT NULL,
    reround_date date NOT NULL,
    reround_time time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    player1_id uuid,
    player2_id uuid,
    player3_id uuid,
    player4_id uuid
);


--
-- Name: round_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.round_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    event_id uuid NOT NULL,
    course_id uuid NOT NULL,
    tee_time_id uuid,
    round_date date NOT NULL,
    total_score integer,
    front_nine integer,
    back_nine integer,
    handicap_used numeric(4,1),
    net_score numeric(5,1),
    fairways_hit integer,
    greens_in_regulation integer,
    putts integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_bandon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_bandon (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "playerId" uuid,
    team text
);


--
-- Name: travel_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    event_id uuid NOT NULL,
    arrival_date date,
    arrival_time time without time zone,
    arrival_flight_number character varying(50),
    arrival_airline character varying(100),
    arrival_airport character varying(10),
    arrival_notes text,
    departure_date date,
    departure_time time without time zone,
    departure_flight_number character varying(50),
    departure_airline character varying(100),
    departure_airport character varying(10),
    departure_notes text,
    needs_transportation boolean DEFAULT false,
    rental_car_info text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: branson_captains branson_captains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branson_captains
    ADD CONSTRAINT branson_captains_pkey PRIMARY KEY (id);


--
-- Name: branson_roster branson_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branson_roster
    ADD CONSTRAINT branson_roster_pkey PRIMARY KEY (id);


--
-- Name: ceremony_award_nominations ceremony_award_nom_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceremony_award_nominations
    ADD CONSTRAINT ceremony_award_nom_unique UNIQUE (event_id, nominator_player_id, nominated_player_id, award_key);


--
-- Name: ceremony_award_nominations ceremony_award_nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceremony_award_nominations
    ADD CONSTRAINT ceremony_award_nominations_pkey PRIMARY KEY (id);


--
-- Name: course_holes course_holes_course_id_hole_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_holes
    ADD CONSTRAINT course_holes_course_id_hole_number_key UNIQUE (course_id, hole_number);


--
-- Name: course_holes course_holes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_holes
    ADD CONSTRAINT course_holes_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_event_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_player_id_key UNIQUE (event_id, player_id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: hole_scores hole_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hole_scores
    ADD CONSTRAINT hole_scores_pkey PRIMARY KEY (id);


--
-- Name: hole_scores hole_scores_round_score_id_hole_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hole_scores
    ADD CONSTRAINT hole_scores_round_score_id_hole_number_key UNIQUE (round_score_id, hole_number);


--
-- Name: lodging_assignments lodging_assignments_lodging_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging_assignments
    ADD CONSTRAINT lodging_assignments_lodging_id_player_id_key UNIQUE (lodging_id, player_id);


--
-- Name: lodging_assignments lodging_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging_assignments
    ADD CONSTRAINT lodging_assignments_pkey PRIMARY KEY (id);


--
-- Name: lodging lodging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging
    ADD CONSTRAINT lodging_pkey PRIMARY KEY (id);


--
-- Name: match_bandon match_bandon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_bandon
    ADD CONSTRAINT match_bandon_pkey PRIMARY KEY (id);


--
-- Name: match_players match_players_match_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_player_id_key UNIQUE (match_id, player_id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (id);


--
-- Name: match_results_pending match_results_pending_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: player player_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);


--
-- Name: players players_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_auth_user_id_key UNIQUE (auth_user_id);


--
-- Name: players players_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_email_key UNIQUE (email);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: records_bandon records_bandon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_bandon
    ADD CONSTRAINT records_bandon_pkey PRIMARY KEY (id);


--
-- Name: reround_signups reround_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reround_signups
    ADD CONSTRAINT reround_signups_pkey PRIMARY KEY (id);


--
-- Name: reround_signups reround_signups_reround_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reround_signups
    ADD CONSTRAINT reround_signups_reround_id_player_id_key UNIQUE (reround_id, player_id);


--
-- Name: rerounds rerounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rerounds
    ADD CONSTRAINT rerounds_pkey PRIMARY KEY (id);


--
-- Name: round_scores round_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_scores
    ADD CONSTRAINT round_scores_pkey PRIMARY KEY (id);


--
-- Name: round_scores round_scores_player_id_course_id_round_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_scores
    ADD CONSTRAINT round_scores_player_id_course_id_round_date_key UNIQUE (player_id, course_id, round_date);


--
-- Name: team_bandon team_bandon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_bandon
    ADD CONSTRAINT team_bandon_pkey PRIMARY KEY (id);


--
-- Name: team_captains team_captains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_captains
    ADD CONSTRAINT team_captains_pkey PRIMARY KEY (id);


--
-- Name: team_captains team_captains_team_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_captains
    ADD CONSTRAINT team_captains_team_id_player_id_key UNIQUE (team_id, player_id);


--
-- Name: team_rosters team_rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_pkey PRIMARY KEY (id);


--
-- Name: team_rosters team_rosters_team_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_team_id_player_id_key UNIQUE (team_id, player_id);


--
-- Name: teams teams_event_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_event_id_name_key UNIQUE (event_id, name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: travel_info travel_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_info
    ADD CONSTRAINT travel_info_pkey PRIMARY KEY (id);


--
-- Name: travel_info travel_info_player_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_info
    ADD CONSTRAINT travel_info_player_id_event_id_key UNIQUE (player_id, event_id);


--
-- Name: idx_ceremony_award_nominations_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ceremony_award_nominations_event_id ON public.ceremony_award_nominations USING btree (event_id);


--
-- Name: idx_events_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_active ON public.events USING btree (is_active);


--
-- Name: idx_events_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_year ON public.events USING btree (year);


--
-- Name: idx_match_results_pending_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_pending_match_id ON public.match_results_pending USING btree (match_id);


--
-- Name: idx_match_results_pending_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_pending_status ON public.match_results_pending USING btree (status);


--
-- Name: idx_matches_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_date ON public.matches USING btree (match_date);


--
-- Name: idx_matches_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_event ON public.matches USING btree (event_id);


--
-- Name: idx_players_auth_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_auth_user ON public.players USING btree (auth_user_id);


--
-- Name: idx_players_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_email ON public.players USING btree (email);


--
-- Name: idx_players_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_name ON public.players USING btree (last_name, first_name);


--
-- Name: idx_players_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_role ON public.players USING btree (role);


--
-- Name: idx_round_scores_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_scores_event ON public.round_scores USING btree (event_id);


--
-- Name: idx_round_scores_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_round_scores_player ON public.round_scores USING btree (player_id);


--
-- Name: idx_team_rosters_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rosters_player ON public.team_rosters USING btree (player_id);


--
-- Name: idx_team_rosters_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rosters_team ON public.team_rosters USING btree (team_id);


--
-- Name: idx_travel_info_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_info_event ON public.travel_info USING btree (event_id);


--
-- Name: match_results_pending_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX match_results_pending_one_active ON public.match_results_pending USING btree (match_id) WHERE (status = 'pending'::text);


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: event_participants update_event_participants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON public.event_participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: lodging update_lodging_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lodging_updated_at BEFORE UPDATE ON public.lodging FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: matches update_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: players update_players_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: rerounds update_rerounds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rerounds_updated_at BEFORE UPDATE ON public.rerounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: round_scores update_round_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_round_scores_updated_at BEFORE UPDATE ON public.round_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: travel_info update_travel_info_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_travel_info_updated_at BEFORE UPDATE ON public.travel_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ceremony_award_nominations ceremony_award_nominations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceremony_award_nominations
    ADD CONSTRAINT ceremony_award_nominations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: ceremony_award_nominations ceremony_award_nominations_nominated_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceremony_award_nominations
    ADD CONSTRAINT ceremony_award_nominations_nominated_player_id_fkey FOREIGN KEY (nominated_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: ceremony_award_nominations ceremony_award_nominations_nominator_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceremony_award_nominations
    ADD CONSTRAINT ceremony_award_nominations_nominator_player_id_fkey FOREIGN KEY (nominator_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: course_holes course_holes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_holes
    ADD CONSTRAINT course_holes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: courses courses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: hole_scores hole_scores_round_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hole_scores
    ADD CONSTRAINT hole_scores_round_score_id_fkey FOREIGN KEY (round_score_id) REFERENCES public.round_scores(id) ON DELETE CASCADE;


--
-- Name: lodging_assignments lodging_assignments_lodging_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging_assignments
    ADD CONSTRAINT lodging_assignments_lodging_id_fkey FOREIGN KEY (lodging_id) REFERENCES public.lodging(id) ON DELETE CASCADE;


--
-- Name: lodging_assignments lodging_assignments_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging_assignments
    ADD CONSTRAINT lodging_assignments_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: lodging lodging_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lodging
    ADD CONSTRAINT lodging_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: match_results_pending match_results_pending_confirmed_by_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_confirmed_by_player_id_fkey FOREIGN KEY (confirmed_by_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_results_pending match_results_pending_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_results_pending match_results_pending_proposed_by_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_proposed_by_player_id_fkey FOREIGN KEY (proposed_by_player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_results_pending match_results_pending_rejected_by_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_rejected_by_player_id_fkey FOREIGN KEY (rejected_by_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_results_pending match_results_pending_superseded_by_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_superseded_by_proposal_id_fkey FOREIGN KEY (superseded_by_proposal_id) REFERENCES public.match_results_pending(id) ON DELETE SET NULL;


--
-- Name: match_results_pending match_results_pending_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results_pending
    ADD CONSTRAINT match_results_pending_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: matches matches_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: matches matches_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: matches matches_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: players players_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: records_bandon records_bandon_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_bandon
    ADD CONSTRAINT "records_bandon_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.player(id);


--
-- Name: reround_signups reround_signups_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reround_signups
    ADD CONSTRAINT reround_signups_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: reround_signups reround_signups_reround_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reround_signups
    ADD CONSTRAINT reround_signups_reround_id_fkey FOREIGN KEY (reround_id) REFERENCES public.rerounds(id) ON DELETE CASCADE;


--
-- Name: rerounds rerounds_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rerounds
    ADD CONSTRAINT rerounds_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: rerounds rerounds_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rerounds
    ADD CONSTRAINT rerounds_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: round_scores round_scores_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_scores
    ADD CONSTRAINT round_scores_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: round_scores round_scores_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_scores
    ADD CONSTRAINT round_scores_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: round_scores round_scores_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.round_scores
    ADD CONSTRAINT round_scores_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_bandon team_bandon_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_bandon
    ADD CONSTRAINT team_bandon_player_id_fkey FOREIGN KEY ("playerId") REFERENCES public.player(id);


--
-- Name: team_captains team_captains_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_captains
    ADD CONSTRAINT team_captains_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_captains team_captains_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_captains
    ADD CONSTRAINT team_captains_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_rosters team_rosters_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: team_rosters team_rosters_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rosters
    ADD CONSTRAINT team_rosters_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: travel_info travel_info_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_info
    ADD CONSTRAINT travel_info_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: travel_info travel_info_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_info
    ADD CONSTRAINT travel_info_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: records_bandon Bandon records select policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bandon records select policy" ON public.records_bandon FOR SELECT TO anon USING (true);


--
-- Name: events Enable Read for Anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable Read for Anon" ON public.events FOR SELECT TO anon USING (true);


--
-- Name: branson_roster Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.branson_roster FOR SELECT TO authenticated, anon USING (true);


--
-- Name: matches Enable read access for anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for anon" ON public.matches FOR SELECT TO anon USING (true);


--
-- Name: match_bandon Match Bandon Select Policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Match Bandon Select Policy" ON public.match_bandon FOR SELECT TO anon USING (true);


--
-- Name: match_bandon Match Bandon Update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Match Bandon Update" ON public.match_bandon FOR UPDATE TO anon USING (true);


--
-- Name: player Player Select Policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Player Select Policy" ON public.player FOR SELECT TO anon USING (true);


--
-- Name: records_bandon Records Update Policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Records Update Policy" ON public.records_bandon FOR UPDATE TO anon USING (true);


--
-- Name: profiles Service role can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all profiles" ON public.profiles TO service_role USING (true) WITH CHECK (true);


--
-- Name: team_bandon Team Bandon Select Policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Bandon Select Policy" ON public.team_bandon FOR SELECT TO anon USING (true);


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: branson_captains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branson_captains ENABLE ROW LEVEL SECURITY;

--
-- Name: branson_roster; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branson_roster ENABLE ROW LEVEL SECURITY;

--
-- Name: ceremony_award_nominations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ceremony_award_nominations ENABLE ROW LEVEL SECURITY;

--
-- Name: ceremony_award_nominations ceremony_award_nominations_insert_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ceremony_award_nominations_insert_participant ON public.ceremony_award_nominations FOR INSERT WITH CHECK (((nominator_player_id = public.current_player_id()) AND (public.current_player_id() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.team_rosters tr
     JOIN public.teams t ON ((t.id = tr.team_id)))
  WHERE ((t.event_id = ceremony_award_nominations.event_id) AND (tr.player_id = ceremony_award_nominations.nominator_player_id)))) AND (EXISTS ( SELECT 1
   FROM (public.team_rosters tr
     JOIN public.teams t ON ((t.id = tr.team_id)))
  WHERE ((t.event_id = ceremony_award_nominations.event_id) AND (tr.player_id = ceremony_award_nominations.nominated_player_id))))));


--
-- Name: ceremony_award_nominations ceremony_award_nominations_select_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ceremony_award_nominations_select_committee ON public.ceremony_award_nominations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = ANY (ARRAY['committee'::public.player_role, 'admin'::public.player_role]))))));


--
-- Name: course_holes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;

--
-- Name: course_holes course_holes_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_holes_insert_committee ON public.course_holes FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: course_holes course_holes_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_holes_select_all ON public.course_holes FOR SELECT TO authenticated USING (true);


--
-- Name: course_holes course_holes_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_holes_update_committee ON public.course_holes FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: courses courses_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_insert_committee ON public.courses FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: courses courses_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_select_all ON public.courses FOR SELECT TO authenticated, anon USING (true);


--
-- Name: courses courses_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_update_committee ON public.courses FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: event_participants event_participants_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_participants_insert_committee ON public.event_participants FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: event_participants event_participants_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_participants_select_all ON public.event_participants FOR SELECT TO authenticated USING (true);


--
-- Name: event_participants event_participants_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_participants_update_committee ON public.event_participants FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_insert_admin ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: events events_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_select_all ON public.events FOR SELECT TO authenticated USING (true);


--
-- Name: events events_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY events_update_admin ON public.events FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: hole_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hole_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: hole_scores hole_scores_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hole_scores_insert_committee ON public.hole_scores FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: hole_scores hole_scores_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hole_scores_insert_own ON public.hole_scores FOR INSERT TO authenticated WITH CHECK ((round_score_id IN ( SELECT rs.id
   FROM (public.round_scores rs
     JOIN public.players p ON ((p.id = rs.player_id)))
  WHERE (p.auth_user_id = auth.uid()))));


--
-- Name: hole_scores hole_scores_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hole_scores_select_all ON public.hole_scores FOR SELECT TO authenticated USING (true);


--
-- Name: hole_scores hole_scores_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hole_scores_update_committee ON public.hole_scores FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: lodging; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lodging ENABLE ROW LEVEL SECURITY;

--
-- Name: lodging_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lodging_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: lodging_assignments lodging_assignments_delete_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_assignments_delete_committee ON public.lodging_assignments FOR DELETE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: lodging_assignments lodging_assignments_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_assignments_insert_committee ON public.lodging_assignments FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: lodging_assignments lodging_assignments_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_assignments_select_all ON public.lodging_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: lodging lodging_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_insert_committee ON public.lodging FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: lodging lodging_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_select_all ON public.lodging FOR SELECT TO authenticated USING (true);


--
-- Name: lodging lodging_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lodging_update_committee ON public.lodging FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: match_bandon; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_bandon ENABLE ROW LEVEL SECURITY;

--
-- Name: match_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

--
-- Name: match_players match_players_delete_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_players_delete_committee ON public.match_players FOR DELETE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: match_players match_players_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_players_insert_committee ON public.match_players FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: match_players match_players_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_players_select_all ON public.match_players FOR SELECT TO authenticated, anon USING (true);


--
-- Name: match_players match_players_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_players_update_committee ON public.match_players FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: match_results_pending; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_results_pending ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results_pending match_results_pending_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_pending_no_delete ON public.match_results_pending FOR DELETE USING (false);


--
-- Name: match_results_pending match_results_pending_no_direct_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_pending_no_direct_write ON public.match_results_pending FOR INSERT WITH CHECK (false);


--
-- Name: match_results_pending match_results_pending_no_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_pending_no_update ON public.match_results_pending FOR UPDATE USING (false);


--
-- Name: match_results_pending match_results_pending_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_pending_select ON public.match_results_pending FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = ANY (ARRAY['committee'::public.player_role, 'admin'::public.player_role]))))) OR (EXISTS ( SELECT 1
   FROM public.match_players mp
  WHERE ((mp.match_id = match_results_pending.match_id) AND (mp.player_id = public.current_player_id()))))));


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches matches_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_insert_committee ON public.matches FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: matches matches_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_select_all ON public.matches FOR SELECT TO authenticated USING (true);


--
-- Name: matches matches_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_update_committee ON public.matches FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: player; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: players players_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_insert_admin ON public.players FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: players players_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_select_all ON public.players FOR SELECT TO authenticated, anon USING (true);


--
-- Name: players players_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_update_committee ON public.players FOR UPDATE TO authenticated USING (public.is_committee_or_admin()) WITH CHECK (public.is_committee_or_admin());


--
-- Name: players players_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_update_own ON public.players FOR UPDATE TO authenticated USING ((auth_user_id = auth.uid())) WITH CHECK ((auth_user_id = auth.uid()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: records_bandon; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.records_bandon ENABLE ROW LEVEL SECURITY;

--
-- Name: reround_signups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reround_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: reround_signups reround_signups_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reround_signups_delete_own ON public.reround_signups FOR DELETE TO authenticated USING ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: reround_signups reround_signups_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reround_signups_insert_own ON public.reround_signups FOR INSERT TO authenticated WITH CHECK ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: reround_signups reround_signups_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reround_signups_select_all ON public.reround_signups FOR SELECT TO authenticated USING (true);


--
-- Name: rerounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rerounds ENABLE ROW LEVEL SECURITY;

--
-- Name: rerounds rerounds_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rerounds_insert_committee ON public.rerounds FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: rerounds rerounds_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rerounds_select_all ON public.rerounds FOR SELECT TO authenticated USING (true);


--
-- Name: rerounds rerounds_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rerounds_update_committee ON public.rerounds FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: round_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.round_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: round_scores round_scores_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY round_scores_insert_committee ON public.round_scores FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: round_scores round_scores_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY round_scores_insert_own ON public.round_scores FOR INSERT TO authenticated WITH CHECK ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: round_scores round_scores_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY round_scores_select_all ON public.round_scores FOR SELECT TO authenticated USING (true);


--
-- Name: round_scores round_scores_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY round_scores_update_committee ON public.round_scores FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: round_scores round_scores_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY round_scores_update_own ON public.round_scores FOR UPDATE TO authenticated USING ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: team_bandon; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_bandon ENABLE ROW LEVEL SECURITY;

--
-- Name: team_captains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_captains ENABLE ROW LEVEL SECURITY;

--
-- Name: team_captains team_captains_delete_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_captains_delete_committee ON public.team_captains FOR DELETE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: team_captains team_captains_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_captains_insert_committee ON public.team_captains FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: team_captains team_captains_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_captains_select_all ON public.team_captains FOR SELECT TO authenticated USING (true);


--
-- Name: team_rosters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_rosters ENABLE ROW LEVEL SECURITY;

--
-- Name: team_rosters team_rosters_delete_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_rosters_delete_committee ON public.team_rosters FOR DELETE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: team_rosters team_rosters_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_rosters_insert_committee ON public.team_rosters FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: team_rosters team_rosters_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_rosters_select_all ON public.team_rosters FOR SELECT TO authenticated, anon USING (true);


--
-- Name: team_rosters team_rosters_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_rosters_update_committee ON public.team_rosters FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_insert_committee ON public.teams FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: teams teams_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_select_all ON public.teams FOR SELECT TO authenticated, anon USING (true);


--
-- Name: teams teams_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_update_committee ON public.teams FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: travel_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_info ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_info travel_info_insert_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_info_insert_committee ON public.travel_info FOR INSERT TO authenticated WITH CHECK (public.is_committee_or_admin());


--
-- Name: travel_info travel_info_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_info_insert_own ON public.travel_info FOR INSERT TO authenticated WITH CHECK ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: travel_info travel_info_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_info_select_all ON public.travel_info FOR SELECT TO authenticated USING (true);


--
-- Name: travel_info travel_info_update_committee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_info_update_committee ON public.travel_info FOR UPDATE TO authenticated USING (public.is_committee_or_admin());


--
-- Name: travel_info travel_info_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_info_update_own ON public.travel_info FOR UPDATE TO authenticated USING ((player_id IN ( SELECT players.id
   FROM public.players
  WHERE (players.auth_user_id = auth.uid()))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION current_player_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.current_player_id() TO anon;
GRANT ALL ON FUNCTION public.current_player_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_player_id() TO service_role;


--
-- Name: FUNCTION finalize_match_result_from_pending(p_pending_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.finalize_match_result_from_pending(p_pending_id uuid) TO anon;
GRANT ALL ON FUNCTION public.finalize_match_result_from_pending(p_pending_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.finalize_match_result_from_pending(p_pending_id uuid) TO service_role;


--
-- Name: FUNCTION get_current_player_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_current_player_id() TO anon;
GRANT ALL ON FUNCTION public.get_current_player_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_player_id() TO service_role;


--
-- Name: FUNCTION get_current_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_current_role() TO anon;
GRANT ALL ON FUNCTION public.get_current_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_role() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_committee_or_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_committee_or_admin() TO anon;
GRANT ALL ON FUNCTION public.is_committee_or_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_committee_or_admin() TO service_role;


--
-- Name: FUNCTION propose_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.propose_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO anon;
GRANT ALL ON FUNCTION public.propose_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO authenticated;
GRANT ALL ON FUNCTION public.propose_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO service_role;


--
-- Name: FUNCTION reject_match_result_pending(p_pending_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reject_match_result_pending(p_pending_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reject_match_result_pending(p_pending_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reject_match_result_pending(p_pending_id uuid) TO service_role;


--
-- Name: FUNCTION set_official_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_official_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO anon;
GRANT ALL ON FUNCTION public.set_official_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_official_match_result(p_match_id uuid, p_winner_team_id uuid, p_is_halved boolean) TO service_role;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at() TO service_role;


--
-- Name: FUNCTION withdraw_match_result_pending(p_pending_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.withdraw_match_result_pending(p_pending_id uuid) TO anon;
GRANT ALL ON FUNCTION public.withdraw_match_result_pending(p_pending_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.withdraw_match_result_pending(p_pending_id uuid) TO service_role;


--
-- Name: TABLE branson_captains; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_captains TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_captains TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_captains TO service_role;


--
-- Name: SEQUENCE branson_captains_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.branson_captains_id_seq TO anon;
GRANT ALL ON SEQUENCE public.branson_captains_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.branson_captains_id_seq TO service_role;


--
-- Name: TABLE branson_roster; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_roster TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_roster TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.branson_roster TO service_role;


--
-- Name: SEQUENCE branson_roster_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.branson_roster_id_seq TO anon;
GRANT ALL ON SEQUENCE public.branson_roster_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.branson_roster_id_seq TO service_role;


--
-- Name: TABLE ceremony_award_nominations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ceremony_award_nominations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ceremony_award_nominations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ceremony_award_nominations TO service_role;


--
-- Name: TABLE course_holes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.course_holes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.course_holes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.course_holes TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO service_role;


--
-- Name: TABLE event_participants; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO service_role;


--
-- Name: TABLE hole_scores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hole_scores TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hole_scores TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hole_scores TO service_role;


--
-- Name: TABLE lodging; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging TO service_role;


--
-- Name: TABLE lodging_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging_assignments TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging_assignments TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lodging_assignments TO service_role;


--
-- Name: TABLE match_bandon; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_bandon TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_bandon TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_bandon TO service_role;


--
-- Name: SEQUENCE match_bandon_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.match_bandon_id_seq TO anon;
GRANT ALL ON SEQUENCE public.match_bandon_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.match_bandon_id_seq TO service_role;


--
-- Name: TABLE match_players; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_players TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_players TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_players TO service_role;


--
-- Name: TABLE match_results_pending; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_results_pending TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_results_pending TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.match_results_pending TO service_role;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.matches TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.matches TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.matches TO service_role;


--
-- Name: TABLE player; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player TO service_role;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.players TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.players TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.players TO service_role;


--
-- Name: TABLE team_captains; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_captains TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_captains TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_captains TO service_role;


--
-- Name: TABLE team_rosters; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_rosters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_rosters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_rosters TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.teams TO service_role;


--
-- Name: TABLE player_team_view; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player_team_view TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player_team_view TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.player_team_view TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.profiles TO service_role;


--
-- Name: TABLE records_bandon; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.records_bandon TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.records_bandon TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.records_bandon TO service_role;


--
-- Name: SEQUENCE records_bandon_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.records_bandon_id_seq TO anon;
GRANT ALL ON SEQUENCE public.records_bandon_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.records_bandon_id_seq TO service_role;


--
-- Name: TABLE reround_signups; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reround_signups TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reround_signups TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.reround_signups TO service_role;


--
-- Name: TABLE rerounds; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rerounds TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rerounds TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rerounds TO service_role;


--
-- Name: TABLE round_scores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.round_scores TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.round_scores TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.round_scores TO service_role;


--
-- Name: TABLE team_bandon; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_bandon TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_bandon TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.team_bandon TO service_role;


--
-- Name: TABLE travel_info; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.travel_info TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.travel_info TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.travel_info TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- The 4 statements below (FOR ROLE supabase_admin) fail with "permission denied to change
-- default privileges" when applied as the postgres user: supabase_admin is a Supabase
-- platform-internal role, and every fresh project already ships with correct default
-- privileges for it. Confirmed on 2026-09-28 applying this file to the test project
-- (uffvcocmlqoxakawnbaq): everything above this line succeeded; these need to be skipped;
-- everything below ran successfully as a separate follow-up statement batch.
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- (supabase_admin defaults — same reasoning as above, skipped)
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

-- (supabase_admin defaults — same reasoning as above, skipped)
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict VkoDgU8cQoeu4BBJSpVFkiGK7cvX8TtyWvLHWMsDVVwLgv2OK4BsDwEqvhvbCBx



-- ---------------------------------------------------------------------------
-- Manually appended: trigger on auth.users (outside the public schema, not captured by the
-- pg_dump above). Confirmed present on production via direct pg_trigger query 2026-09-28.
-- ---------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
