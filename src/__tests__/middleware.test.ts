import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';
import { middleware, config } from '@/middleware';
import { getAuthRedirectDecision } from '@/lib/authConfig';

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/repositories/auth', () => ({
  fetchAuthProfileByUserId: jest.fn(),
}));

const mockGetUser = jest.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
};

const mockCreateServerClient = createServerClient as jest.Mock;
const mockFetchAuthProfileByUserId = fetchAuthProfileByUserId as jest.Mock;

const makeRequest = (path: string) => new NextRequest(new URL(`http://localhost${path}`));

describe('middleware access control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient);
  });

  it('redirects unauthenticated users to login with next param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(makeRequest('/admin/dashboard'));

    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fadmin%2Fdashboard');
    expect(mockFetchAuthProfileByUserId).not.toHaveBeenCalled();
  });

  it('redirects non-admin users away from admin routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFetchAuthProfileByUserId.mockResolvedValue({
      data: { role: 'player', mustChangePassword: false },
      error: null,
    });

    const response = await middleware(makeRequest('/admin/players'));

    expect(response.headers.get('location')).toBe('http://localhost/unauthorized');
  });

  it('redirects users who must change passwords', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });
    mockFetchAuthProfileByUserId.mockResolvedValue({
      data: { role: 'player', mustChangePassword: true },
      error: null,
    });

    const response = await middleware(makeRequest('/dashboard'));

    expect(response.headers.get('location')).toBe('http://localhost/change-password');
  });

  it('allows admin users to access admin routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-3' } } });
    mockFetchAuthProfileByUserId.mockResolvedValue({
      data: { role: 'admin', mustChangePassword: false },
      error: null,
    });

    const response = await middleware(makeRequest('/admin/players'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('allows dashboard access for player roles', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-4' } } });
    mockFetchAuthProfileByUserId.mockResolvedValue({
      data: { role: 'player', mustChangePassword: false },
      error: null,
    });

    const response = await middleware(makeRequest('/dashboard'));

    expect(response.headers.get('location')).toBeNull();
  });

  // Task S3 (TEST_ENVIRONMENT_PLAN.md Part II): /players/** renders phone and GHIN number
  // (see src/app/players/[playerId]/page.tsx), so it must require auth like /dashboard and
  // /admin, even though it is not role-restricted beyond "must be logged in".
  it('matches /players/:path* so the middleware actually runs on it', () => {
    expect(config.matcher).toContain('/players/:path*');
  });

  it('redirects unauthenticated users away from a player profile, preserving next', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await middleware(makeRequest('/players/abc'));

    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fplayers%2Fabc');
    expect(mockFetchAuthProfileByUserId).not.toHaveBeenCalled();
  });

  it('allows a logged-in player-role account to view a player profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-5' } } });
    mockFetchAuthProfileByUserId.mockResolvedValue({
      data: { role: 'player', mustChangePassword: false },
      error: null,
    });

    const response = await middleware(makeRequest('/players/abc'));

    expect(response.headers.get('location')).toBeNull();
  });
});

describe('getAuthRedirectDecision for /players paths', () => {
  it('requires login when unauthenticated, preserving the path to return to', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/players/abc',
      isAuthenticated: false,
      role: null,
      mustChangePassword: false,
    });

    expect(decision).toEqual({ type: 'login', path: '/login', nextPath: '/players/abc' });
  });

  it('allows any authenticated role to view a player profile', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/players/abc',
      isAuthenticated: true,
      role: 'player',
      mustChangePassword: false,
    });

    expect(decision).toBeNull();
  });
});
