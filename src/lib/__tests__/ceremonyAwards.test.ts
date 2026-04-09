import {
  AWARD_OPTIONS,
  ceremonyAwardLabel,
  isCeremonyAwardKey,
} from '@/lib/ceremonyAwards';

describe('ceremonyAwards', () => {
  it('defines exactly the two keys allowed by the database CHECK constraint', () => {
    const keys = AWARD_OPTIONS.map((o) => o.key).sort();
    expect(keys).toEqual(['davey_jones_locker', 'matt_leinart']);
  });

  it('isCeremonyAwardKey narrows string to CeremonyAwardKey', () => {
    expect(isCeremonyAwardKey('davey_jones_locker')).toBe(true);
    expect(isCeremonyAwardKey('matt_leinart')).toBe(true);
    expect(isCeremonyAwardKey('other')).toBe(false);
    expect(isCeremonyAwardKey('')).toBe(false);
  });

  it('ceremonyAwardLabel returns a title for each key', () => {
    expect(ceremonyAwardLabel('davey_jones_locker')).toContain('Davey');
    expect(ceremonyAwardLabel('matt_leinart')).toContain('Matt Leinart');
  });
});
