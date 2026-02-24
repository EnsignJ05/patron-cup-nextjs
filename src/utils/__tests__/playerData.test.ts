import { getPlayerData } from '@/utils/playerData';

describe('playerData', () => {
  it('returns data for a valid player slug', () => {
    const data = getPlayerData('james-thompson');

    expect(data).not.toBeNull();
    expect(data?.name).toBe('James Thompson');
    expect(typeof data?.handicap).toBe('number');
    expect(data?.matches.length).toBeGreaterThan(0);
  });

  it('returns null for an invalid slug', () => {
    const data = getPlayerData('');
    expect(data).toBeNull();
  });
});
