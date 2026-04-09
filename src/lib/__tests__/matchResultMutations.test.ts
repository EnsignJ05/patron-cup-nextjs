import type { SupabaseClient } from '@supabase/supabase-js';
import {
  confirmMatchResultFromPending,
  proposeMatchResult,
  rejectMatchResultPending,
  setOfficialMatchResult,
  withdrawMatchResultPending,
} from '@/lib/matchResultMutations';

function mockClient(rpcImpl: (name: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>) {
  return {
    rpc: jest.fn((name: string, args: Record<string, unknown>) => rpcImpl(name, args)),
  } as unknown as SupabaseClient;
}

describe('matchResultMutations', () => {
  it('setOfficialMatchResult returns ok when rpc succeeds', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    const result = await setOfficialMatchResult(supabase, { matchId: 'm1', value: 'halved' });
    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('set_official_match_result', {
      p_match_id: 'm1',
      p_winner_team_id: null,
      p_is_halved: true,
    });
  });

  it('setOfficialMatchResult maps clear result', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await setOfficialMatchResult(supabase, { matchId: 'm1', value: '' });
    expect(supabase.rpc).toHaveBeenCalledWith('set_official_match_result', {
      p_match_id: 'm1',
      p_winner_team_id: null,
      p_is_halved: false,
    });
  });

  it('setOfficialMatchResult returns message on rpc error', async () => {
    const supabase = mockClient(async () => ({
      error: { message: 'Forbidden' } as unknown as Error,
    }));
    const result = await setOfficialMatchResult(supabase, { matchId: 'm1', value: 't1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe('Forbidden');
  });

  it('proposeMatchResult calls propose_match_result', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await proposeMatchResult(supabase, { matchId: 'm1', winnerTeamId: 't1', isHalved: false });
    expect(supabase.rpc).toHaveBeenCalledWith('propose_match_result', {
      p_match_id: 'm1',
      p_winner_team_id: 't1',
      p_is_halved: false,
    });
  });

  it('confirmMatchResultFromPending calls finalize_match_result_from_pending', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await confirmMatchResultFromPending(supabase, { pendingId: 'p1' });
    expect(supabase.rpc).toHaveBeenCalledWith('finalize_match_result_from_pending', {
      p_pending_id: 'p1',
    });
  });

  it('rejectMatchResultPending calls reject_match_result_pending', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await rejectMatchResultPending(supabase, { pendingId: 'p1' });
    expect(supabase.rpc).toHaveBeenCalledWith('reject_match_result_pending', { p_pending_id: 'p1' });
  });

  it('withdrawMatchResultPending calls withdraw_match_result_pending', async () => {
    const supabase = mockClient(async () => ({ error: null }));
    await withdrawMatchResultPending(supabase, { pendingId: 'p1' });
    expect(supabase.rpc).toHaveBeenCalledWith('withdraw_match_result_pending', { p_pending_id: 'p1' });
  });
});
