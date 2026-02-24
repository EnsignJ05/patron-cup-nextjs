import { fireEvent, render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';
import { useAuth } from '@/context/AuthContext';

jest.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter', style: { fontFamily: 'Inter' } }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

describe('RootLayout navigation', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      role: 'admin',
      mustChangePassword: false,
      loading: false,
      signOut: jest.fn(),
    });
  });

  it('uses admin dashboard route in mobile drawer', () => {
    render(
      <RootLayout>
        <div>Page</div>
      </RootLayout>,
    );

    fireEvent.click(screen.getByLabelText('menu'));

    const adminLinks = screen.getAllByRole('link', { name: 'Admin' });
    adminLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/admin/dashboard');
    });
  });
});
