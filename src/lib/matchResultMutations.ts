import type { SupabaseClient } from '@supabase/supabase-js';

export type MatchResultMutationOk = { ok: true };
export type MatchResultMutationErr = { ok: false; message: string };
export type MatchResultMutationResult = MatchResultMutationOk | MatchResultMutationErr;

function err(message: string): MatchResultMutationErr {
  return { ok: false, message };
}

function fromRpcError(e: { message?: string } | null): string {
  return e?.message || 'Request failed';
}

/**
 * Committee/admin: set the official score for a match (locks player overrides via DB).
 * `value` is a team id, `'halved'`, or empty string to clear.
 */
export async function setOfficialMatchResult(
  supabase: SupabaseClient,
  params: { matchId: string; value: string },
): Promise<MatchResultMutationResult> {
  const { matchId, value } = params;
  let p_winner_team_id: string | null = null;
  let p_is_halved = false;
  if (value === 'halved') {
    p_is_halved = true;
  } else if (value) {
    p_winner_team_id = value;
  }

  const { error } = await supabase.rpc('set_official_match_result', {
    p_match_id: matchId,
    p_winner_team_id,
    p_is_halved,
  });

  if (error) {
    return err(fromRpcError(error));
  }
  return { ok: true };
}

export async function proposeMatchResult(
  supabase: SupabaseClient,
  params: { matchId: string; winnerTeamId: string | null; isHalved: boolean },
): Promise<MatchResultMutationResult> {
  const { matchId, winnerTeamId, isHalved } = params;
  const { error } = await supabase.rpc('propose_match_result', {
    p_match_id: matchId,
    p_winner_team_id: isHalved ? null : winnerTeamId,
    p_is_halved: isHalved,
  });
  if (error) {
    return err(fromRpcError(error));
  }
  return { ok: true };
}

export async function confirmMatchResultFromPending(
  supabase: SupabaseClient,
  params: { pendingId: string },
): Promise<MatchResultMutationResult> {
  const { error } = await supabase.rpc('finalize_match_result_from_pending', {
    p_pending_id: params.pendingId,
  });
  if (error) {
    return err(fromRpcError(error));
  }
  return { ok: true };
}

export async function rejectMatchResultPending(
  supabase: SupabaseClient,
  params: { pendingId: string },
): Promise<MatchResultMutationResult> {
  const { error } = await supabase.rpc('reject_match_result_pending', {
    p_pending_id: params.pendingId,
  });
  if (error) {
    return err(fromRpcError(error));
  }
  return { ok: true };
}

export async function withdrawMatchResultPending(
  supabase: SupabaseClient,
  params: { pendingId: string },
): Promise<MatchResultMutationResult> {
  const { error } = await supabase.rpc('withdraw_match_result_pending', {
    p_pending_id: params.pendingId,
  });
  if (error) {
    return err(fromRpcError(error));
  }
  return { ok: true };
}
