import { render, screen } from '@testing-library/react';
import RosterPage from '@/app/roster/page';
import { PUBLIC_PLAYER_SELECT } from '@/lib/playerColumns';

const select = jest.fn();

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        select(...args);
        return {
          eq: () => ({
            order: () =>
              Promise.resolve({
                // No email/phone here: mirrors what the DB will actually return post-S4.
                data: [
                  {
                    id: 'p1',
                    first_name: 'Fake',
                    last_name: 'Golfer',
                    current_handicap: 8,
                    ghin_club: 'Test GC',
                    city: 'Austin',
                    state: 'TX',
                    profile_image_url: null,
                    status: 'active',
                  },
                ],
                error: null,
              }),
          }),
        };
      },
    }),
  }),
}));

describe('RosterPage', () => {
  beforeEach(() => {
    select.mockClear();
  });

  it('requests only the public player columns', async () => {
    render(<RosterPage />);
    expect(await screen.findByText('Fake Golfer')).toBeInTheDocument();
    expect(select).toHaveBeenCalledWith(PUBLIC_PLAYER_SELECT);
    expect(select).not.toHaveBeenCalledWith('*');
  });
});
