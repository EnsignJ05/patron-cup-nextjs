-- Migration: Link players table to auth users and set up RLS
-- Run this in Supabase SQL Editor

-- Ensure profiles table has correct structure (id links to auth.users)
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS player_id,
  DROP COLUMN IF EXISTS role;

-- Add id column if it doesn't exist (should be UUID matching auth.users.id)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id') 
  THEN
    ALTER TABLE public.profiles ADD COLUMN id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure players table has auth_user_id column
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_auth_user_id ON public.players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_players_email ON public.players(email);

-- Enable RLS on players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Players: Everyone can view all players
DROP POLICY IF EXISTS "players_select_all" ON public.players;
CREATE POLICY "players_select_all" ON public.players
  FOR SELECT USING (true);

-- Players: Users can update their own player record
DROP POLICY IF EXISTS "players_update_own" ON public.players;
CREATE POLICY "players_update_own" ON public.players
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Players: Committee and admin can insert new players
DROP POLICY IF EXISTS "players_insert_committee" ON public.players;
CREATE POLICY "players_insert_committee" ON public.players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

-- Players: Committee and admin can update any player
DROP POLICY IF EXISTS "players_update_committee" ON public.players;
CREATE POLICY "players_update_committee" ON public.players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

-- Players: Only admin can delete players
DROP POLICY IF EXISTS "players_delete_admin" ON public.players;
CREATE POLICY "players_delete_admin" ON public.players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for Events table
-- =====================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all" ON public.events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_insert_committee" ON public.events;
CREATE POLICY "events_insert_committee" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "events_update_committee" ON public.events;
CREATE POLICY "events_update_committee" ON public.events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "events_delete_admin" ON public.events;
CREATE POLICY "events_delete_admin" ON public.events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for Teams table
-- =====================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_all" ON public.teams;
CREATE POLICY "teams_select_all" ON public.teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "teams_insert_committee" ON public.teams;
CREATE POLICY "teams_insert_committee" ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "teams_update_committee" ON public.teams;
CREATE POLICY "teams_update_committee" ON public.teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "teams_delete_admin" ON public.teams;
CREATE POLICY "teams_delete_admin" ON public.teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for Courses table
-- =====================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_all" ON public.courses;
CREATE POLICY "courses_select_all" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "courses_insert_committee" ON public.courses;
CREATE POLICY "courses_insert_committee" ON public.courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "courses_update_committee" ON public.courses;
CREATE POLICY "courses_update_committee" ON public.courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "courses_delete_admin" ON public.courses;
CREATE POLICY "courses_delete_admin" ON public.courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for Matches table
-- =====================================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_all" ON public.matches;
CREATE POLICY "matches_select_all" ON public.matches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "matches_insert_committee" ON public.matches;
CREATE POLICY "matches_insert_committee" ON public.matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "matches_update_committee" ON public.matches;
CREATE POLICY "matches_update_committee" ON public.matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "matches_delete_admin" ON public.matches;
CREATE POLICY "matches_delete_admin" ON public.matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for Tee Times table
-- =====================================================
ALTER TABLE public.tee_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tee_times_select_all" ON public.tee_times;
CREATE POLICY "tee_times_select_all" ON public.tee_times
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tee_times_insert_committee" ON public.tee_times;
CREATE POLICY "tee_times_insert_committee" ON public.tee_times
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "tee_times_update_committee" ON public.tee_times;
CREATE POLICY "tee_times_update_committee" ON public.tee_times
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('committee', 'admin')
    )
  );

DROP POLICY IF EXISTS "tee_times_delete_admin" ON public.tee_times;
CREATE POLICY "tee_times_delete_admin" ON public.tee_times
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.players 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- Helper function to check user role
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.players WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
