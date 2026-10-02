import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminResetPasswordPage from '@/app/admin/reset-password/page';

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

describe('AdminResetPasswordPage', () => {
  it('defaults to a generated password and lets the admin pick a player', async () => {
    render(<AdminResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /player/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /type my own/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('switches to a typed password field in "Type my own" mode', async () => {
    const user = userEvent.setup();
    render(<AdminResetPasswordPage />);

    await user.click(screen.getByRole('button', { name: /type my own/i }));

    expect(screen.getByRole('textbox', { name: /^password$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).not.toBeInTheDocument();
  });
});
