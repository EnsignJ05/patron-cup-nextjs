import { render, screen } from '@testing-library/react';
import AdminChangeUsernamePage from '@/app/admin/change-username/page';

describe('AdminChangeUsernamePage', () => {
  it('renders the form fields and actions', () => {
    render(<AdminChangeUsernamePage />);

    expect(screen.getByRole('heading', { name: 'Change Username' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /current email/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /new email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Email' })).toBeInTheDocument();
  });
});
