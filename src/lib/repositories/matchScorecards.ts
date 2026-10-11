import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchScorecardStatus } from '@/types/database';

export type MatchScorecardLite = {
  id: string;
  match_id: string;
  event_id: string | null;
  course_id: string | null;
  format_key: string;
  handicap_allowance: number;
  holes_count: number;
  status: MatchScorecardStatus;
  disputed_at: string | null;
};

export type MatchHoleScoreLite = {
  match_id: string;
  hole_number: number;
  player_id: string;
  gross_strokes: number | null;
  is_conceded: boolean;
  entered_by_player_id: string;
  updated_at: string;
};

const SCORECARD_COLUMNS =
  'id, match_id, event_id, course_id, format_key, handicap_allowance, holes_count, status, disputed_at';
const HOLE_SCORE_COLUMNS = 'match_id, hole_number, player_id, gross_strokes, is_conceded, entered_by_player_id, updated_at';

export async function fetchMatchScorecard(supabase: SupabaseClient, matchId: string) {
  return supabase
    .from('match_scorecards')
    .select(SCORECARD_COLUMNS)
    .eq('match_id', matchId)
    .maybeSingle<MatchScorecardLite>();
}

export async function fetchMatchHoleScores(supabase: SupabaseClient, matchId: string) {
  return supabase
    .from('match_hole_scores')
    .select(HOLE_SCORE_COLUMNS)
    .eq('match_id', matchId)
    .order('hole_number')
    .returns<MatchHoleScoreLite[]>();
}

/** For the live scoreboard (Phase 5): every scorecard + hole score for a round. Signed
 * out visitors get zero rows by RLS policy (Task P3.2), which the caller treats as a
 * normal empty state rather than an error. */
export async function fetchEventMatchScorecards(supabase: SupabaseClient, eventId: string) {
  return supabase
    .from('match_scorecards')
    .select(SCORECARD_COLUMNS)
    .eq('event_id', eventId)
    .returns<MatchScorecardLite[]>();
}

export async function fetchEventMatchHoleScores(supabase: SupabaseClient, matchIds: string[]) {
  if (matchIds.length === 0) return { data: [] as MatchHoleScoreLite[], error: null };
  return supabase
    .from('match_hole_scores')
    .select(HOLE_SCORE_COLUMNS)
    .in('match_id', matchIds)
    .returns<MatchHoleScoreLite[]>();
}
