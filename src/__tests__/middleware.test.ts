import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';
import { middleware } from '@/middleware';

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
});
