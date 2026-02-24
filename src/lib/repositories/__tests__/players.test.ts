import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPlayerProfileByAuthUserId, fetchPlayerRoleByAuthUserId } from '@/lib/repositories/players';

function buildSupabaseMock(response: { data: any; error: any }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(response),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('players repository', () => {
  it('fetches player role by auth user id', async () => {
    const supabase = buildSupabaseMock({ data: { role: 'player' }, error: null });
    const result = await fetchPlayerRoleByAuthUserId(supabase, 'user-1');

    expect(result.data?.role).toBe('player');
  });

  it('fetches player profile by auth user id', async () => {
    const supabase = buildSupabaseMock({
      data: { id: 'p1', first_name: 'James', last_name: 'Thompson' },
      error: null,
    });
    const result = await fetchPlayerProfileByAuthUserId(supabase, 'user-1');

    expect(result.data?.id).toBe('p1');
  });
});
