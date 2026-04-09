import { calculateMatchHandicapMetrics } from '../matchHandicapMetrics';

describe('calculateMatchHandicapMetrics', () => {
  it('calculates course handicaps and strokes given from lowest handicap', () => {
    const metrics = calculateMatchHandicapMetrics(
      [
        { playerId: 'p1', officialEventHandicap: 10 },
        { playerId: 'p2', officialEventHandicap: 5 },
        { playerId: 'p3', officialEventHandicap: 20 },
        { playerId: 'p4', officialEventHandicap: 15 },
      ],
      { slope: 113, rating: 72, par: 72 },
    );

    expect(metrics.get('p1')).toEqual({ courseHandicap: 10, strokesGiven: 5 });
    expect(metrics.get('p2')).toEqual({ courseHandicap: 5, strokesGiven: 0 });
    expect(metrics.get('p3')).toEqual({ courseHandicap: 20, strokesGiven: 15 });
    expect(metrics.get('p4')).toEqual({ courseHandicap: 15, strokesGiven: 10 });
  });

  it('handles negative handicaps when computing strokes given', () => {
    const metrics = calculateMatchHandicapMetrics(
      [
        { playerId: 'p1', officialEventHandicap: -2 },
        { playerId: 'p2', officialEventHandicap: -1 },
        { playerId: 'p3', officialEventHandicap: 5 },
        { playerId: 'p4', officialEventHandicap: 10 },
      ],
      { slope: 113, rating: 72, par: 72 },
    );

    expect(metrics.get('p1')).toEqual({ courseHandicap: -2, strokesGiven: 0 });
    expect(metrics.get('p2')).toEqual({ courseHandicap: -1, strokesGiven: 1 });
    expect(metrics.get('p3')).toEqual({ courseHandicap: 5, strokesGiven: 7 });
    expect(metrics.get('p4')).toEqual({ courseHandicap: 10, strokesGiven: 12 });
  });

  it('returns null metrics when course data is incomplete', () => {
    const metrics = calculateMatchHandicapMetrics(
      [
        { playerId: 'p1', officialEventHandicap: 10 },
        { playerId: 'p2', officialEventHandicap: 12 },
      ],
      { slope: null, rating: 72, par: 72 },
    );

    expect(metrics.get('p1')).toEqual({ courseHandicap: null, strokesGiven: null });
    expect(metrics.get('p2')).toEqual({ courseHandicap: null, strokesGiven: null });
  });
});
