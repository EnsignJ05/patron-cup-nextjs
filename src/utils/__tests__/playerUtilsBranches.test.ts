jest.mock('@/data/matches.json', () => ({
  matches: [
    {
      match: 1,
      group: 1,
      course: 'Test Course',
      date: '6/5/25',
      time: '9:00 AM',
      matchType: 'Two-Man BetterBall',
      team_thompson: [
        { name: 'Alice A', handicap: 10 },
        { name: 'Bob B', handicap: 12 },
      ],
      team_burgess: [
        { name: 'Cara C', handicap: 8 },
        { name: 'Dan D', handicap: 6 },
      ],
      winner: 'tie',
    },
    {
      match: 2,
      group: 2,
      course: 'Test Course',
      date: '6/5/25',
      time: '9:10 AM',
      matchType: 'Two-Man BetterBall',
      team_thompson: [
        { name: 'Alice A', handicap: 10 },
        { name: 'Bob B', handicap: 12 },
      ],
      team_burgess: [
        { name: 'Cara C', handicap: 8 },
        { name: 'Dan D', handicap: 6 },
      ],
      winner: 'team_thompson',
    },
    {
      match: 3,
      group: 3,
      course: 'Test Course',
      date: '6/5/25',
      time: '9:20 AM',
      matchType: 'Two-Man BetterBall',
      team_thompson: [
        { name: 'Alice A', handicap: 10 },
        { name: 'Bob B', handicap: 12 },
      ],
      team_burgess: [
        { name: 'Cara C', handicap: 8 },
        { name: 'Dan D', handicap: 6 },
      ],
      winner: 'team_burgess',
    },
  ],
}));

jest.mock('@/data/rerounds.json', () => ({
  rerounds: [],
}));

import { getPlayerHandicap, getPlayerRecord } from '@/utils/playerUtils';

describe('playerUtils branch coverage', () => {
  it('counts wins, losses, and ties', () => {
    const record = getPlayerRecord('Alice A');
    expect(record).toEqual({ wins: 1, losses: 1, ties: 1 });
  });

  it('returns N/A when player not found', () => {
    const handicap = getPlayerHandicap('Unknown Player');
    expect(handicap).toBe('N/A');
  });
});
