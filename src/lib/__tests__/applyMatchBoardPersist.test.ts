import { applyMatchBoardPersist } from '../applyMatchBoardPersist';
import type { SupabaseClient } from '@supabase/supabase-js';

function createMockSupabase() {
  const updates: { table: string; id: string; payload: Record<string, unknown> }[] = [];
  const mockFrom = jest.fn((table: string) => ({
    update: jest.fn((payload: Record<string, unknown>) => ({
      eq: jest.fn((col: string, id: string) => {
        updates.push({ table, id, payload });
        return Promise.resolve({ error: null });
      }),
    })),
  }));
  return {
    supabase: { from: mockFrom } as unknown as SupabaseClient,
    updates,
  };
}

describe('applyMatchBoardPersist', () => {
  it('updates match_time and group when a match moves slots', async () => {
    const { supabase, updates } = createMockSupabase();
    const matches = [
      {
        id: 'm1',
        match_number: 1,
        match_time: '09:00:00',
        group_number: 1,
      },
      {
        id: 'm2',
        match_number: 2,
        match_time: '09:10:00',
        group_number: 1,
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

    await applyMatchBoardPersist(supabase, matches, start, end);

    const move = updates.find((u) => u.id === 'm1' && u.payload.match_time === '09:10:00');
    expect(move).toBeDefined();
  });
});
