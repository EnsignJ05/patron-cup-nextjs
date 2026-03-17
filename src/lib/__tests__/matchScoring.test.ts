import { getMatchPointsForTeam, getTeamTotals } from '../matchScoring';

describe('matchScoring helpers', () => {
  it('awards 1 point to the winner and 0 to the loser', () => {
    const match = { winner_team_id: 'team-a', is_halved: false };

    expect(getMatchPointsForTeam(match, 'team-a')).toBe(1);
    expect(getMatchPointsForTeam(match, 'team-b')).toBe(0);
  });

  it('awards 0.5 points to both teams when halved', () => {
    const match = { winner_team_id: null, is_halved: true };

    expect(getMatchPointsForTeam(match, 'team-a')).toBe(0.5);
    expect(getMatchPointsForTeam(match, 'team-b')).toBe(0.5);
  });

  it('returns 0 points when match has no result yet', () => {
    const match = { winner_team_id: null, is_halved: false };

    expect(getMatchPointsForTeam(match, 'team-a')).toBe(0);
  });

  it('sums points across matches for each team', () => {
    const matches = [
      { winner_team_id: 'team-a', is_halved: false },
      { winner_team_id: null, is_halved: true },
      { winner_team_id: 'team-b', is_halved: false },
      { winner_team_id: null, is_halved: false },
    ];

    const totals = getTeamTotals(matches, ['team-a', 'team-b']);

    expect(totals).toEqual({
      'team-a': 1.5,
      'team-b': 1.5,
    });
  });
});
