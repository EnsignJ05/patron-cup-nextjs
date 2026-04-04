import { getUserRole } from '@/lib/getUserRole';

const createSupabaseServerClientMock = jest.fn();

jest.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: () => createSupabaseServerClientMock(),
}));

describe('getUserRole', () => {
  it('returns role when available', async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
          }),
        }),
      }),
    });

    const role = await getUserRole('user-1');

    expect(role).toBe('admin');
  });

  it('returns null on error', async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('fail') }),
          }),
        }),
      }),
    });

    const role = await getUserRole('user-2');

    expect(role).toBeNull();
  });

  it('returns null when profile row is missing but query succeeds', async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });

    const role = await getUserRole('user-no-row');

    expect(role).toBeNull();
  });
});
