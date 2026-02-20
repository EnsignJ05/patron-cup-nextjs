import { render, screen } from '@testing-library/react';
import Card from '@/components/shared/Card';

describe('Card', () => {
  it('renders children inside card content', () => {
    render(
      <Card>
        <div>Card body</div>
      </Card>,
    );

    expect(screen.getByText('Card body')).toBeInTheDocument();
  });
});
