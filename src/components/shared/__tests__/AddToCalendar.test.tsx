import { render, screen } from '@testing-library/react';
import AddToCalendar from '@/components/shared/AddToCalendar';

describe('AddToCalendar', () => {
  it('renders calendar links with URLs', () => {
    render(
      <AddToCalendar
        title="Test Event"
        description="Details"
        startDate={new Date('2025-06-05T09:00:00Z')}
        endDate={new Date('2025-06-05T10:00:00Z')}
        location="Bandon"
      />,
    );

    const googleLink = screen.getByRole('link', { name: 'Google' });
    const iosLink = screen.getByRole('link', { name: 'iOS' });

    expect(googleLink.getAttribute('href')).toContain('calendar.google.com');
    expect(iosLink.getAttribute('href')).toContain('data:text/calendar');
  });
});
