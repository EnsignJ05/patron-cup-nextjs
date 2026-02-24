import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => mockSupabaseClient,
}));

jest.mock('@/lib/repositories/auth', () => ({
  fetchAuthProfileByUserId: jest.fn(),
}));

function AuthProbe() {
  const { user, role, mustChangePassword, loading, signOut } = useAuth();

  return (
    <div>
      <span>user:{user?.id ?? 'none'}</span>
      <span>role:{role ?? 'none'}</span>
      <span>mustChange:{mustChangePassword ? 'yes' : 'no'}</span>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  let authStateHandler: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authStateHandler = null;
    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((_event, callback) => {
      authStateHandler = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  it('loads session and role data', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    (fetchAuthProfileByUserId as jest.Mock).mockResolvedValue({
      data: { role: 'admin', mustChangePassword: true },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('role:admin')).toBeInTheDocument();
    });
    expect(screen.getByText('mustChange:yes')).toBeInTheDocument();
    expect(screen.getByText('loading:no')).toBeInTheDocument();

    await act(async () => {
      authStateHandler?.('SIGNED_IN', { user: { id: 'user-1' } });
    });
    expect(screen.getByText('user:user-1')).toBeInTheDocument();
  });

  it('calls signOut when invoked', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: null } },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('loading:no')).toBeInTheDocument();
    });

    screen.getByText('Sign out').click();
    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
  });

  it('handles missing user session', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('user:none')).toBeInTheDocument();
      expect(screen.getByText('role:none')).toBeInTheDocument();
    });
    expect(screen.getByText('mustChange:no')).toBeInTheDocument();
  });


  it('clears role on auth profile error', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
    });
    (fetchAuthProfileByUserId as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('failed'),
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      authStateHandler?.('SIGNED_IN', { user: { id: 'user-2' } });
    });

    await waitFor(() => {
      expect(fetchAuthProfileByUserId).toHaveBeenCalled();
      expect(screen.getByText('role:none')).toBeInTheDocument();
    });
    expect(screen.getByText('mustChange:no')).toBeInTheDocument();
  });

  it('throws when useAuth is used outside provider', () => {
    function Broken() {
      useAuth();
      return null;
    }

    expect(() => render(<Broken />)).toThrow('useAuth must be used within an AuthProvider');
  });
});
