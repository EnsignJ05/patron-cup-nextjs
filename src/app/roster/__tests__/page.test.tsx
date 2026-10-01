import { render, screen } from '@testing-library/react';
import RosterPage from '@/app/roster/page';
import { PUBLIC_PLAYER_EMBED } from '@/lib/playerColumns';

const teamRosterSelect = jest.fn();

jest.mock('@/lib/supabaseBrowser', () => ({
  createSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === 'events') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'event-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 'team-1', name: 'Thompson', color: '#3498db' },
                    { id: 'team-2', name: 'Berastegui', color: '#e74c3c' },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'team_rosters') {
        return {
          select: (...args: unknown[]) => {
            teamRosterSelect(...args);
            return {
              eq: (_col: string, teamId: string) => ({
                order: () =>
                  Promise.resolve({
                    // No email/phone on the embedded player: mirrors post-S4 DB behavior.
                    data:
                      teamId === 'team-1'
                        ? [
                            {
                              id: 'roster-1',
                              handicap_at_event: 10,
                              player: {
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
                            },
                          ]
                        : [],
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      if (table === 'team_captains') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      throw new Error(`unexpected table in test mock: ${table}`);
    },
  }),
}));

describe('RosterPage', () => {
  beforeEach(() => {
    teamRosterSelect.mockClear();
  });

  it('requests only the public player columns in the team_rosters embed', async () => {
    render(<RosterPage />);
    expect(await screen.findByText('Fake Golfer')).toBeInTheDocument();

    expect(teamRosterSelect).toHaveBeenCalledWith(`id, handicap_at_event, player:players(${PUBLIC_PLAYER_EMBED})`);
    for (const [calledWith] of teamRosterSelect.mock.calls) {
      expect(calledWith).not.toContain('players(*)');
    }
  });

  it('shows team segments and a search field', async () => {
    render(<RosterPage />);
    await screen.findByText('Fake Golfer');

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText('Thompson').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Berastegui').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Search players...')).toBeInTheDocument();
  });
});
