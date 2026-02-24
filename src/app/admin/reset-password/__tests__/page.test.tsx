import { render, screen } from '@testing-library/react';
import AdminResetPasswordPage from '@/app/admin/reset-password/page';

describe('AdminResetPasswordPage', () => {
  it('renders the form fields and actions', () => {
    render(<AdminResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /temporary password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate temporary password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });
});
