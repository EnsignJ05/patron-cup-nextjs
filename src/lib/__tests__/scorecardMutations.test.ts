import type { SupabaseClient } from '@supabase/supabase-js';
import {
  clearMatchHoleScore,
  resolveMatchScorecardDispute,
  setMatchScorecardFormat,
  setMatchScorecardStatus,
  startMatchScorecard,
  upsertMatchHoleScore,
  upsertMatchHoleScoresBatch,
} from '@/lib/scorecardMutations';

function mockClient(rpcImpl: (name: string, args: Record<string, unknown>) => Promise<{ data?: unknown; error: Error | null }>) {
  return {
    rpc: jest.fn((name: string, args: Record<string, unknown>) => rpcImpl(name, args)),
  } as unknown as SupabaseClient;
}

describe('scorecardMutations', () => {
  it('startMatchScorecard returns the scorecard id on success', async () => {
    const supabase = mockClient(async () => ({ data: 'sc-1', error: null }));
    const result = await startMatchScorecard(supabase, { matchId: 'm1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scorecardId).toBe('sc-1');
    expect(supabase.rpc).toHaveBeenCalledWith('start_match_scorecard', { p_match_id: 'm1' });
  });

  it('startMatchScorecard maps an rpc error', async () => {
    const supabase = mockClient(async () => ({ error: { message: 'Already has a result' } as Error }));
    const result = await startMatchScorecard(supabase, { matchId: 'm1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe('Already has a result');
  });

  it('upsertMatchHoleScore calls upsert_match_hole_score with mapped args', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await upsertMatchHoleScore(supabase, {
      matchId: 'm1',
      holeNumber: 7,
      playerId: 'p1',
      grossStrokes: 4,
      isConceded: false,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_match_hole_score', {
      p_match_id: 'm1',
      p_hole_number: 7,
      p_player_id: 'p1',
      p_gross_strokes: 4,
      p_is_conceded: false,
    });
  });

  it('upsertMatchHoleScoresBatch passes entries through as-is', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    const entries = [{ hole_number: 1, player_id: 'p1', gross_strokes: 4, is_conceded: false }];
    await upsertMatchHoleScoresBatch(supabase, { matchId: 'm1', entries });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_match_hole_scores_batch', {
      p_match_id: 'm1',
      p_entries: entries,
    });
  });

  it('clearMatchHoleScore calls clear_match_hole_score', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await clearMatchHoleScore(supabase, { matchId: 'm1', holeNumber: 7, playerId: 'p1' });
    expect(supabase.rpc).toHaveBeenCalledWith('clear_match_hole_score', {
      p_match_id: 'm1',
      p_hole_number: 7,
      p_player_id: 'p1',
    });
  });

  it('setMatchScorecardStatus calls set_match_scorecard_status', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await setMatchScorecardStatus(supabase, { matchId: 'm1', status: 'abandoned' });
    expect(supabase.rpc).toHaveBeenCalledWith('set_match_scorecard_status', {
      p_match_id: 'm1',
      p_status: 'abandoned',
    });
  });

  it('setMatchScorecardFormat calls set_match_scorecard_format with mapped args', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await setMatchScorecardFormat(supabase, {
      matchId: 'm1',
      formatKey: 'four_ball_net_best_ball',
      handicapAllowance: 0.9,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('set_match_scorecard_format', {
      p_match_id: 'm1',
      p_format_key: 'four_ball_net_best_ball',
      p_handicap_allowance: 0.9,
    });
  });

  it('resolveMatchScorecardDispute calls resolve_match_scorecard_dispute', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await resolveMatchScorecardDispute(supabase, { matchId: 'm1' });
    expect(supabase.rpc).toHaveBeenCalledWith('resolve_match_scorecard_dispute', { p_match_id: 'm1' });
  });
});
