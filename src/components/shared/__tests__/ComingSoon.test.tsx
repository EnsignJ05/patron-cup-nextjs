import { render, screen } from '@testing-library/react';
import ComingSoon from '@/components/shared/ComingSoon';

describe('ComingSoon', () => {
  it('renders heading and message', () => {
    render(<ComingSoon message="Details soon." />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.getByText('Details soon.')).toBeInTheDocument();
  });
});
