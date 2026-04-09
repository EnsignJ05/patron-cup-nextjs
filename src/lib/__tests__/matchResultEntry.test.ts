import {
  getViewerRoleForPendingProposal,
  isPastScheduledStart,
  normalizeMatchTimeForSchedule,
} from '@/lib/matchResultEntry';

describe('normalizeMatchTimeForSchedule', () => {
  it('uses midnight when time is null', () => {
    expect(normalizeMatchTimeForSchedule(null)).toBe('00:00:00');
  });

  it('adds seconds when missing', () => {
    expect(normalizeMatchTimeForSchedule('14:30')).toBe('14:30:00');
  });

  it('preserves seconds when present', () => {
    expect(normalizeMatchTimeForSchedule('14:30:45')).toBe('14:30:45');
  });
});

describe('isPastScheduledStart', () => {
  it('returns false before date when no time', () => {
    const now = new Date('2026-06-01T23:00:00');
    expect(isPastScheduledStart('2026-06-02', null, now)).toBe(false);
  });

  it('returns true on date at midnight local when no time', () => {
    const now = new Date('2026-06-02T00:00:00');
    expect(isPastScheduledStart('2026-06-02', null, now)).toBe(true);
  });

  it('returns false before tee time on match day', () => {
    const now = new Date('2026-06-02T07:59:00');
    expect(isPastScheduledStart('2026-06-02', '08:00', now)).toBe(false);
  });

  it('returns true at tee time', () => {
    const now = new Date('2026-06-02T08:00:00');
    expect(isPastScheduledStart('2026-06-02', '08:00', now)).toBe(true);
  });

  it('returns true after tee time', () => {
    const now = new Date('2026-06-02T09:00:00');
    expect(isPastScheduledStart('2026-06-02', '08:00', now)).toBe(true);
  });

  it('returns false for invalid date string', () => {
    expect(isPastScheduledStart('not-a-date', '08:00', new Date())).toBe(false);
  });
});

describe('getViewerRoleForPendingProposal', () => {
  const p1 = 'player-1';
  const p2 = 'player-2';
  const p3 = 'player-3';

  it('returns viewer when no pending', () => {
    expect(getViewerRoleForPendingProposal(null, p1, [p1, p2])).toBe('viewer');
  });

  it('returns viewer when status is not pending', () => {
    expect(
      getViewerRoleForPendingProposal(
        { proposed_by_player_id: p1, status: 'confirmed' },
        p2,
        [p1, p2],
      ),
    ).toBe('viewer');
  });

  it('returns proposer for author', () => {
    expect(
      getViewerRoleForPendingProposal(
        { proposed_by_player_id: p1, status: 'pending' },
        p1,
        [p1, p2],
      ),
    ).toBe('proposer');
  });

  it('returns confirmer for another participant', () => {
    expect(
      getViewerRoleForPendingProposal(
        { proposed_by_player_id: p1, status: 'pending' },
        p2,
        [p1, p2],
      ),
    ).toBe('confirmer');
  });

  it('returns confirmer for third participant when not proposer', () => {
    expect(
      getViewerRoleForPendingProposal(
        { proposed_by_player_id: p1, status: 'pending' },
        p3,
        [p1, p2, p3],
      ),
    ).toBe('confirmer');
  });

  it('returns viewer for id not in match', () => {
    expect(
      getViewerRoleForPendingProposal(
        { proposed_by_player_id: p1, status: 'pending' },
        'other',
        [p1, p2],
      ),
    ).toBe('viewer');
  });
});
