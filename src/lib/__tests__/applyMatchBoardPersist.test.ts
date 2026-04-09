import { applyMatchBoardPersist } from '../applyMatchBoardPersist';
import type { SupabaseClient } from '@supabase/supabase-js';

function createMockSupabase(options?: { failMatchId?: string }) {
  const updates: { table: string; id: string; payload: Record<string, unknown> }[] = [];
  const mockFrom = jest.fn((table: string) => ({
    update: jest.fn((payload: Record<string, unknown>) => ({
      eq: jest.fn((col: string, id: string) => {
        updates.push({ table, id, payload });
        if (options?.failMatchId && id === options.failMatchId) {
          return Promise.resolve({ error: { message: 'db error' } });
        }
        return Promise.resolve({ error: null });
      }),
    })),
  }));
  return {
    supabase: { from: mockFrom } as unknown as SupabaseClient,
    updates,
  };
}

const betterBall = 'Two Man Better Ball';
const h2h = 'Head to Head';

describe('applyMatchBoardPersist', () => {
  it('throws when end board places a match in a different tee time than its row', async () => {
    const { supabase } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: betterBall,
      },
      {
        id: 'm2',
        match_number: 2,
        match_time: '09:10:00',
        group_number: 1,
        match_type: betterBall,
      },
    ];
    const start: Record<string, string[]> = {
      'slot:09:00:00|1': ['m1'],
      'slot:09:10:00|1': ['m2'],
      'slot:null|null': [],
    };
    const end: Record<string, string[]> = {
      'slot:09:00:00|1': [],
      'slot:09:10:00|1': ['m2', 'm1'],
      'slot:null|null': [],
    };

    await expect(applyMatchBoardPersist(supabase, matches, start, end)).rejects.toThrow(
      /different tee time/i,
    );
  });

  it('updates only group_number when moving between groups at the same tee time', async () => {
    const { supabase, updates } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: h2h,
      },
      {
        id: 'm2',
        match_number: 2,
        match_time: '09:00:00',
        group_number: 2,
        match_type: h2h,
      },
    ];
    const start: Record<string, string[]> = {
      'slot:09:00:00|1': ['m1'],
      'slot:09:00:00|2': ['m2'],
    };
    const end: Record<string, string[]> = {
      'slot:09:00:00|1': [],
      'slot:09:00:00|2': ['m2', 'm1'],
    };

    await applyMatchBoardPersist(supabase, matches, start, end);

    const move = updates.find((u) => u.id === 'm1');
    expect(move?.payload).toEqual({ group_number: 2 });
    expect(move?.payload).not.toHaveProperty('match_time');
  });

  it('throws when a swim lane exceeds four players', async () => {
    const { supabase } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: betterBall,
      },
      {
        id: 'm2',
        match_number: 2,
        match_time: '09:00:00',
        group_number: 1,
        match_type: betterBall,
      },
    ];
    const start: Record<string, string[]> = {
      'slot:09:00:00|1': ['m1'],
      'slot:09:00:00|2': ['m2'],
    };
    const end: Record<string, string[]> = {
      'slot:09:00:00|1': ['m1', 'm2'],
      'slot:09:00:00|2': [],
    };

    await expect(applyMatchBoardPersist(supabase, matches, start, end)).rejects.toThrow(
      /four players/i,
    );
  });

  it('throws when a match move update fails', async () => {
    const { supabase } = createMockSupabase({ failMatchId: 'm1' });
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: h2h,
      },
      {
        id: 'm2',
        match_number: 2,
        match_time: '09:00:00',
        group_number: 2,
        match_type: h2h,
      },
    ];
    const start: Record<string, string[]> = {
      'slot:09:00:00|1': ['m1'],
      'slot:09:00:00|2': ['m2'],
    };
    const end: Record<string, string[]> = {
      'slot:09:00:00|1': [],
      'slot:09:00:00|2': ['m2', 'm1'],
    };

    await expect(applyMatchBoardPersist(supabase, matches, start, end)).rejects.toThrow('db error');
  });

  it('renumbers matches when order changes within the same slot', async () => {
    const { supabase, updates } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 2,
        match_time: '09:00:00',
        group_number: 1,
        match_type: h2h,
      },
      {
        id: 'm2',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: h2h,
      },
    ];
    const slotKey = 'slot:09:00:00|1';
    const start: Record<string, string[]> = { [slotKey]: ['m1', 'm2'] };
    const end: Record<string, string[]> = { [slotKey]: ['m2', 'm1'] };

    await applyMatchBoardPersist(supabase, matches, start, end);

    const numUpdates = updates.filter((u) => 'match_number' in u.payload);
    expect(numUpdates).toHaveLength(2);
    expect(numUpdates.find((u) => u.id === 'm1')?.payload).toEqual({ match_number: 2 });
    expect(numUpdates.find((u) => u.id === 'm2')?.payload).toEqual({ match_number: 1 });
  });

  it('skips renumbering when slot is empty or order unchanged', async () => {
    const { supabase, updates } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
        match_type: betterBall,
      },
    ];
    const slotKey = 'slot:09:00:00|1';
    const same: Record<string, string[]> = { [slotKey]: ['m1'] };

    await applyMatchBoardPersist(supabase, matches, same, same);
    expect(updates.filter((u) => 'match_number' in u.payload)).toHaveLength(0);

    await applyMatchBoardPersist(supabase, matches, same, { [slotKey]: [] });
    expect(updates.filter((u) => 'match_number' in u.payload)).toHaveLength(0);
  });
});
