/* eslint-disable @next/next/no-img-element */
import { render, screen } from '@testing-library/react';
import { NavigationContent } from '@/app/layout';
import { useAuth } from '@/context/AuthContext';

jest.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

jest.mock('next/font/google', () => {
  const f = () => ({ className: 'mock-font', style: { fontFamily: 'mock' }, variable: '--mock-font' });
  return { Inter: f, Newsreader: f, JetBrains_Mono: f, IBM_Plex_Sans: f };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => (
    (void _fill, void _priority, <img {...props} alt={props.alt ?? ''} />)
  ),
}));

describe('NavigationContent (mobile app bar)', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      role: null,
      mustChangePassword: false,
      loading: false,
      signOut: jest.fn(),
    });
  });

  it('renders the logo link', () => {
    render(<NavigationContent />);
    const logo = screen.getByRole('link');
    expect(logo).toHaveAttribute('href', '/');
  });

  it('renders the theme toggle button', () => {
    render(<NavigationContent />);
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });
});
