jest.mock('@/utils/playerUtils', () => ({
  getPlayerHandicap: () => 'N/A',
  getPlayerMatches: () => [],
  getPlayerRerounds: () => [],
  getPlayerRecord: () => ({ wins: 0, losses: 0, ties: 0 }),
  unformatPlayerSlug: () => 'Test User',
}));

import { getPlayerData } from '@/utils/playerData';

describe('playerData branch coverage', () => {
  it('returns null when handicap is not numeric', () => {
    const data = getPlayerData('test-user');
    expect(data).toBeNull();
  });
});
