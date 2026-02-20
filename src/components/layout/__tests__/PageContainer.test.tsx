import { render, screen } from '@testing-library/react';
import PageContainer from '@/components/layout/PageContainer';

describe('PageContainer', () => {
  it('renders title, subtitle, and children', () => {
    render(
      <PageContainer title="Main Title" subtitle="Sub">
        <div>Content</div>
      </PageContainer>,
    );

    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders without subtitle', () => {
    render(
      <PageContainer title="Only Title">
        <div>Body</div>
      </PageContainer>,
    );

    expect(screen.getByText('Only Title')).toBeInTheDocument();
    expect(screen.queryByText('Sub')).not.toBeInTheDocument();
  });
});
