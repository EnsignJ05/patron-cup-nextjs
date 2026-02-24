import { render, screen } from '@testing-library/react';
import AdminLayout from '@/app/admin/layout';
import { getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

jest.mock('@/lib/supabaseServer', () => ({
  getCachedUser: jest.fn(),
  getCachedPlayerProfile: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockGetCachedUser = getCachedUser as jest.Mock;
const mockGetCachedPlayerProfile = getCachedPlayerProfile as jest.Mock;
const mockRedirect = redirect as jest.Mock;

describe('AdminLayout access control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it('redirects to login when no user is present', async () => {
    mockGetCachedUser.mockResolvedValue(null);

    await expect(AdminLayout({ children: <div>Child</div> })).rejects.toThrow('REDIRECT:/login?next=/admin');
  });

  it('redirects non-admin users to unauthorized', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' });
    mockGetCachedPlayerProfile.mockResolvedValue({ data: { role: 'player' } });

    await expect(AdminLayout({ children: <div>Child</div> })).rejects.toThrow('REDIRECT:/unauthorized');
  });

  it('renders children for admin users', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-2' });
    mockGetCachedPlayerProfile.mockResolvedValue({ data: { role: 'admin' } });

    const result = await AdminLayout({ children: <div>Admin Content</div> });
    render(<>{result}</>);

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
