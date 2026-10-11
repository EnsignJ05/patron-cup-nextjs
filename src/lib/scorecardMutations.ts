import type { SupabaseClient } from '@supabase/supabase-js';

export type ScorecardMutationOk = { ok: true };
export type ScorecardMutationErr = { ok: false; message: string };
export type ScorecardMutationResult = ScorecardMutationOk | ScorecardMutationErr;

function err(message: string): ScorecardMutationErr {
  return { ok: false, message };
}

function fromRpcError(e: { message?: string } | null): string {
  return e?.message || 'Request failed';
}

/** Idempotent: safe to call every time the scorecard screen opens. */
export async function startMatchScorecard(
  supabase: SupabaseClient,
  params: { matchId: string },
): Promise<{ ok: true; scorecardId: string } | ScorecardMutationErr> {
  const { data, error } = await supabase.rpc('start_match_scorecard', { p_match_id: params.matchId });
  if (error) return err(fromRpcError(error));
  return { ok: true, scorecardId: data as string };
}

export async function upsertMatchHoleScore(
  supabase: SupabaseClient,
  params: { matchId: string; holeNumber: number; playerId: string; grossStrokes: number | null; isConceded: boolean },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('upsert_match_hole_score', {
    p_match_id: params.matchId,
    p_hole_number: params.holeNumber,
    p_player_id: params.playerId,
    p_gross_strokes: params.grossStrokes,
    p_is_conceded: params.isConceded,
  });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}

export type BatchHoleScoreEntry = {
  hole_number: number;
  player_id: string;
  gross_strokes: number | null;
  is_conceded: boolean;
};

/** One round trip for the offline-queue flush (Task P7.1). */
export async function upsertMatchHoleScoresBatch(
  supabase: SupabaseClient,
  params: { matchId: string; entries: BatchHoleScoreEntry[] },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('upsert_match_hole_scores_batch', {
    p_match_id: params.matchId,
    p_entries: params.entries,
  });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}

export async function clearMatchHoleScore(
  supabase: SupabaseClient,
  params: { matchId: string; holeNumber: number; playerId: string },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('clear_match_hole_score', {
    p_match_id: params.matchId,
    p_hole_number: params.holeNumber,
    p_player_id: params.playerId,
  });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}

/** Committee/admin only -- 'abandoned', or reopening a 'final' card. */
export async function setMatchScorecardStatus(
  supabase: SupabaseClient,
  params: { matchId: string; status: 'in_progress' | 'final' | 'abandoned' },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('set_match_scorecard_status', {
    p_match_id: params.matchId,
    p_status: params.status,
  });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}

/** Committee/admin only (Task P6.3) -- re-snapshots match_players.strokes_received
 * because changing the allowance makes the Phase 3 start-time snapshot stale. */
export async function setMatchScorecardFormat(
  supabase: SupabaseClient,
  params: { matchId: string; formatKey: string; handicapAllowance: number },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('set_match_scorecard_format', {
    p_match_id: params.matchId,
    p_format_key: params.formatKey,
    p_handicap_allowance: params.handicapAllowance,
  });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}

/** Committee/admin only -- clears a scorecard's dispute flag (Task P6.1) without
 * touching the result. */
export async function resolveMatchScorecardDispute(
  supabase: SupabaseClient,
  params: { matchId: string },
): Promise<ScorecardMutationResult> {
  const { error } = await supabase.rpc('resolve_match_scorecard_dispute', { p_match_id: params.matchId });
  if (error) return err(fromRpcError(error));
  return { ok: true };
}
