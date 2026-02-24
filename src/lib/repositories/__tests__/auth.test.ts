import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerRole } from '@/types/database';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';

function buildSupabaseMock(options: {
  role?: PlayerRole | null;
  mustChangePassword?: boolean;
  playerError?: Error | null;
  profileError?: Error | null;
}) {
  const { role, mustChangePassword, playerError, profileError } = options;

  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => {
            if (table === 'players') {
              return Promise.resolve({
                data: role ? { role } : null,
                error: playerError ?? null,
              });
            }

            if (table === 'profiles') {
              return Promise.resolve({
                data: typeof mustChangePassword === 'boolean' ? { must_change_password: mustChangePassword } : null,
                error: profileError ?? null,
              });
            }

            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('fetchAuthProfileByUserId', () => {
  it('returns role and password flag from profile sources', async () => {
    const supabase = buildSupabaseMock({
      role: 'admin',
      mustChangePassword: true,
    });

    const result = await fetchAuthProfileByUserId(supabase, 'user-123');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ role: 'admin', mustChangePassword: true });
  });

  it('surfaces errors when queries fail', async () => {
    const supabase = buildSupabaseMock({
      role: null,
      mustChangePassword: false,
      playerError: new Error('players failed'),
    });

    const result = await fetchAuthProfileByUserId(supabase, 'user-456');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.data).toEqual({ role: null, mustChangePassword: false });
  });
});
