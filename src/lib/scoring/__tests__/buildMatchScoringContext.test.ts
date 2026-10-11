import { buildMatchScoringContext } from '@/lib/scoring/buildMatchScoringContext';
import type { ScoringHole } from '@/lib/scoring/types';

const holes18: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  handicapIndex: i + 1,
}));

describe('buildMatchScoringContext', () => {
  it('computes course handicap, strokes received, and a per-hole allocation for each player', () => {
    const result = buildMatchScoringContext({
      course: { slope: 113, rating: 72, par: 72 },
      holes: holes18,
      allowance: 1.0,
      players: [
        { playerId: 'p1', teamId: 'teamA', officialEventHandicap: 10 },
        { playerId: 'p2', teamId: 'teamB', officialEventHandicap: 15 },
      ],
    });

    const p1 = result.get('p1')!;
    expect(p1.courseHandicap).toBe(10);
    expect(p1.strokesReceived).toBe(0); // lowest in the match
    expect(p1.strokeAllocation.ok).toBe(true);

    const p2 = result.get('p2')!;
    expect(p2.courseHandicap).toBe(15);
    expect(p2.strokesReceived).toBe(5);
    expect(p2.strokeAllocation.ok).toBe(true);
    if (p2.strokeAllocation.ok) {
      expect(p2.strokeAllocation.strokesByHole.get(5)).toBe(1); // handicap_index 5 <= 5
      expect(p2.strokeAllocation.strokesByHole.get(6)).toBe(0);
    }
  });

  it('applies the allowance before computing strokes received', () => {
    const result = buildMatchScoringContext({
      course: { slope: 113, rating: 72, par: 72 },
      holes: holes18,
      allowance: 0.9,
      players: [
        { playerId: 'p1', teamId: 'teamA', officialEventHandicap: 10 },
        { playerId: 'p2', teamId: 'teamB', officialEventHandicap: 20 },
      ],
    });

    // round(10*0.9)=9, round(20*0.9)=18 -> strokesReceived 0 and 9.
    expect(result.get('p1')!.strokesReceived).toBe(0);
    expect(result.get('p2')!.strokesReceived).toBe(9);
  });

  it('flags missing course handicap data distinctly from missing stroke indexes', () => {
    const result = buildMatchScoringContext({
      course: { slope: null, rating: 72, par: 72 },
      holes: holes18,
      allowance: 1.0,
      players: [{ playerId: 'p1', teamId: 'teamA', officialEventHandicap: 10 }],
    });

    const p1 = result.get('p1')!;
    expect(p1.strokesReceived).toBeNull();
    expect(p1.strokeAllocation).toEqual({
      ok: false,
      reason: 'missing_course_handicap',
      missingHoleNumbers: holes18.map((h) => h.holeNumber),
    });
  });

  it('flags missing stroke indexes when course handicap data is present but holes are not', () => {
    const holesNoIndex = holes18.map((h) => ({ ...h, handicapIndex: null }));
    const result = buildMatchScoringContext({
      course: { slope: 113, rating: 72, par: 72 },
      holes: holesNoIndex,
      allowance: 1.0,
      players: [
        { playerId: 'p1', teamId: 'teamA', officialEventHandicap: 10 },
        { playerId: 'p2', teamId: 'teamB', officialEventHandicap: 15 },
      ],
    });

    const p2 = result.get('p2')!;
    expect(p2.strokesReceived).toBe(5);
    expect(p2.strokeAllocation).toEqual({
      ok: false,
      reason: 'missing_handicap_index',
      missingHoleNumbers: holes18.map((h) => h.holeNumber),
    });
  });
});
