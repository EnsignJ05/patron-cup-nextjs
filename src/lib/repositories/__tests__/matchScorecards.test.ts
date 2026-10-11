import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchEventMatchHoleScores,
  fetchEventMatchScorecards,
  fetchMatchHoleScores,
  fetchMatchScorecard,
} from '@/lib/repositories/matchScorecards';

describe('matchScorecards repository', () => {
  it('fetches a single scorecard by match_id with an explicit column list', async () => {
    const maybeSingle = jest.fn(() => Promise.resolve({ data: { id: 'sc1' }, error: null }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const result = await fetchMatchScorecard(supabase, 'm1');

    expect(from).toHaveBeenCalledWith('match_scorecards');
    expect(select).toHaveBeenCalledWith(
      'id, match_id, event_id, course_id, format_key, handicap_allowance, holes_count, status, disputed_at',
    );
    expect(eq).toHaveBeenCalledWith('match_id', 'm1');
    expect(result.data).toEqual({ id: 'sc1' });
  });

  it('fetches hole scores for a match ordered by hole_number', async () => {
    const returns = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const order = jest.fn(() => ({ returns }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    await fetchMatchHoleScores(supabase, 'm1');

    expect(from).toHaveBeenCalledWith('match_hole_scores');
    expect(eq).toHaveBeenCalledWith('match_id', 'm1');
    expect(order).toHaveBeenCalledWith('hole_number');
  });

  it('fetches every scorecard for an event', async () => {
    const returns = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const eq = jest.fn(() => ({ returns }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    await fetchEventMatchScorecards(supabase, 'e1');

    expect(from).toHaveBeenCalledWith('match_scorecards');
    expect(eq).toHaveBeenCalledWith('event_id', 'e1');
  });

  it('short-circuits to an empty array when no match ids are given', async () => {
    const supabase = { from: jest.fn() } as unknown as SupabaseClient;
    const result = await fetchEventMatchHoleScores(supabase, []);
    expect(result).toEqual({ data: [], error: null });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetches hole scores for a set of match ids', async () => {
    const returns = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const inFn = jest.fn(() => ({ returns }));
    const select = jest.fn(() => ({ in: inFn }));
    const from = jest.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    await fetchEventMatchHoleScores(supabase, ['m1', 'm2']);

    expect(from).toHaveBeenCalledWith('match_hole_scores');
    expect(inFn).toHaveBeenCalledWith('match_id', ['m1', 'm2']);
  });
});
