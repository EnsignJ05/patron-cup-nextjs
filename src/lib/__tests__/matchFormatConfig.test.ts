import {
  getFormatConfig,
  getMatchPlayerCount,
  isSlotWithinCapacity,
  matchTimesEqual,
  normalizeMatchTimeForCompare,
} from '../matchFormatConfig';

describe('matchFormatConfig', () => {
  describe('getFormatConfig / getMatchPlayerCount', () => {
    it('counts four players for Two Man Better Ball', () => {
      expect(getFormatConfig('Two Man Better Ball').playersPerTeam).toBe(2);
      expect(getMatchPlayerCount('Two Man Better Ball')).toBe(4);
    });

    it('counts two players per Head to Head match', () => {
      expect(getFormatConfig('Head to Head').playersPerTeam).toBe(1);
      expect(getMatchPlayerCount('Head to Head')).toBe(2);
    });
  });

  describe('isSlotWithinCapacity', () => {
    it('allows one better ball or two H2H matches', () => {
      expect(isSlotWithinCapacity(['Two Man Better Ball'])).toBe(true);
      expect(isSlotWithinCapacity(['Head to Head', 'Head to Head'])).toBe(true);
    });

    it('rejects two better ball matches in one lane', () => {
      expect(isSlotWithinCapacity(['Two Man Better Ball', 'Two Man Better Ball'])).toBe(false);
    });

    it('rejects three H2H matches in one lane', () => {
      expect(isSlotWithinCapacity(['Head to Head', 'Head to Head', 'Head to Head'])).toBe(false);
    });

    it('allows mixed types that stay within four players', () => {
      expect(isSlotWithinCapacity(['Head to Head'])).toBe(true);
    });
  });

  describe('matchTimesEqual / normalizeMatchTimeForCompare', () => {
    it('treats HH:MM and HH:MM:SS as equal', () => {
      expect(matchTimesEqual('09:00', '09:00:00')).toBe(true);
      expect(normalizeMatchTimeForCompare('09:00')).toBe('09:00:00');
    });

    it('treats null as equal to null', () => {
      expect(matchTimesEqual(null, null)).toBe(true);
    });
  });
});
