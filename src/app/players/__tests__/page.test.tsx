import { render, screen } from '@testing-library/react';
import PlayersPage from '@/app/players/page';
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
                    is_active: true,
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

describe('PlayersPage', () => {
  beforeEach(() => {
    select.mockClear();
  });

  it('requests only the public player columns', async () => {
    render(<PlayersPage />);
    expect(await screen.findByText('Fake Golfer')).toBeInTheDocument();
    expect(select).toHaveBeenCalledWith(PUBLIC_PLAYER_SELECT);
    expect(select).not.toHaveBeenCalledWith('*');
  });

  it('links each row to the player profile', async () => {
    render(<PlayersPage />);
    const row = (await screen.findByText('Fake Golfer')).closest('a');
    expect(row).toHaveAttribute('href', '/players/p1');
  });
});
