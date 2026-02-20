import {
  formatPlayerSlug,
  getAllPlayers,
  getPlayerHandicap,
  getPlayerMatches,
  getPlayerRecord,
  getPlayerRerounds,
  getPlayerTeam,
  unformatPlayerSlug,
} from '@/utils/playerUtils';

describe('playerUtils', () => {
  it('finds matches and teams for a player', () => {
    const matches = getPlayerMatches('James Thompson');
    expect(matches.length).toBeGreaterThan(0);

    const team = getPlayerTeam('James Thompson', matches[0]);
    expect(team).toBe('Thompson');
  });

  it('returns rerounds for a player', () => {
    const rerounds = getPlayerRerounds('Nick Kramer');
    expect(rerounds.length).toBeGreaterThan(0);
  });

  it('returns handicap for a known player', () => {
    const handicap = getPlayerHandicap('James Thompson');
    expect(typeof handicap).toBe('number');
    expect(handicap).toBeCloseTo(14.2, 1);
  });

  it('calculates record for a player', () => {
    const record = getPlayerRecord('James Thompson');
    expect(record).toEqual({ wins: 0, losses: 0, ties: 0 });
  });

  it('formats and unformats player slugs', () => {
    const slug = formatPlayerSlug('James Thompson');
    expect(slug).toBe('james-thompson');
    expect(unformatPlayerSlug(slug)).toBe('James Thompson');
  });

  it('returns a sorted player list', () => {
    const players = getAllPlayers();
    expect(players).toContain('James Thompson');
    expect(players).toEqual([...players].sort());
  });
});
