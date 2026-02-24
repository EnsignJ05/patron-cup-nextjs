import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ReroundsPage from '@/app/admin/rerounds/page';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: jest.fn(),
}));

const events = [{ id: 'event-1', name: 'Patron Cup', year: 2026 }];
const courses = [{ id: 'course-1', name: 'Bandon Trails', event_id: 'event-1' }];
const players = [
  { id: 'player-1', auth_user_id: 'auth-1', first_name: 'Pat', last_name: 'One', status: 'active' },
  { id: 'player-2', auth_user_id: 'auth-2', first_name: 'Sam', last_name: 'Two', status: 'active' },
  { id: 'player-3', auth_user_id: 'auth-3', first_name: 'Lee', last_name: 'Three', status: 'active' },
];
const rerounds = [
  {
    id: 'reround-1',
    event_id: 'event-1',
    course_id: 'course-1',
    reround_date: '2026-02-20',
    reround_time: '09:00',
    player1_id: 'player-1',
    player2_id: 'player-2',
    player3_id: null,
    player4_id: 'player-3',
    courses: { name: 'Bandon Trails' },
  },
];

const makeQuery = (data: unknown) => {
  const query: {
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    in: jest.Mock;
    single: jest.Mock;
    then: (resolve: (value: { data: unknown; error: null }) => void) => Promise<void>;
  } = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    in: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve({ data, error: null })),
    then: (resolve) => Promise.resolve(resolve({ data, error: null })),
  };
  return query;
};

describe('Admin re-rounds page', () => {
  beforeEach(() => {
    const queryMap = {
      events: makeQuery(events),
      players: makeQuery(players),
      courses: makeQuery(courses),
      rerounds: makeQuery(rerounds),
    } as const;

    (createSupabaseBrowserClient as jest.Mock).mockReturnValue({
      from: (table: keyof typeof queryMap) => queryMap[table] ?? makeQuery([]),
    });
  });

  it('shows player names for each re-round', async () => {
    render(<ReroundsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bandon Trails')).toBeInTheDocument();
    });

    expect(screen.getByText('Pat One, Sam Two, TBD, Lee Three')).toBeInTheDocument();
  });

  it('offers player dropdowns with player names', async () => {
    render(<ReroundsPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Re-round')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Re-round'));

    const player1Labels = await screen.findAllByText('Player 1');
    const player1Label =
      player1Labels.find((element) => element.tagName.toLowerCase() === 'label') || player1Labels[0];
    const player1Control = player1Label.closest('.MuiFormControl-root');
    expect(player1Control).toBeTruthy();
    const player1Select = within(player1Control as HTMLElement).getByRole('combobox');
    fireEvent.mouseDown(player1Select);

    expect(await screen.findByText('Pat One')).toBeInTheDocument();
    expect(screen.getByText('Sam Two')).toBeInTheDocument();
  });
});
