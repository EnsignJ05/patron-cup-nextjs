import { render, screen } from '@testing-library/react';
import MatchCard from '@/components/matches/MatchCard';

const baseTeams = {
  teamA: {
    id: 'team-a',
    name: 'Team A',
    color: '#3498db',
    players: [{ id: 'p1', name: 'Player One', profileImageUrl: null as string | null }],
  },
  teamB: {
    id: 'team-b',
    name: 'Team B',
    color: '#e74c3c',
    players: [{ id: 'p2', name: 'Player Two', profileImageUrl: null as string | null }],
  },
};

describe('MatchCard', () => {
  it('renders matchDateLabel and courseLabel when provided', () => {
    render(
      <MatchCard
        matchNumber={1}
        matchType="Singles"
        teeTime="8:00 AM"
        {...baseTeams}
        winnerTeamId={null}
        isHalved={false}
        matchDateLabel="Monday, April 13, 2026"
        courseLabel="Bandon Dunes"
      />,
    );

    expect(screen.getByText('Monday, April 13, 2026')).toBeInTheDocument();
    expect(screen.getByText('Bandon Dunes')).toBeInTheDocument();
  });

  it('does not render date or course lines when optional labels are omitted', () => {
    render(
      <MatchCard
        matchNumber={2}
        matchType="Four-ball"
        teeTime="9:30 AM"
        {...baseTeams}
        winnerTeamId="team-a"
        isHalved={false}
      />,
    );

    expect(screen.queryByText('Monday, April 13, 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Bandon Dunes')).not.toBeInTheDocument();
  });
});
