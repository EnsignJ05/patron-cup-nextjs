import { allocateStrokes } from '@/lib/scoring/strokeAllocation';
import type { ScoringHole } from '@/lib/scoring/types';

const holesWithIndex = (indexes: number[]): ScoringHole[] =>
  indexes.map((handicapIndex, i) => ({ holeNumber: i + 1, par: 4, handicapIndex }));

describe('allocateStrokes', () => {
  it('gives every hole 0 strokes when strokesReceived is 0', () => {
    const holes = holesWithIndex([1, 2, 3]);
    const result = allocateStrokes(0, holes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.strokesByHole.values())).toEqual([0, 0, 0]);
    }
  });

  it('gives a stroke to every hole with handicap_index <= n for 1 <= n <= 18', () => {
    const holes: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      handicapIndex: i + 1,
    }));
    const result = allocateStrokes(5, holes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const h of holes) {
        expect(result.strokesByHole.get(h.holeNumber)).toBe(h.handicapIndex! <= 5 ? 1 : 0);
      }
    }
  });

  it('wraps for n > 18: base stroke everywhere plus one more on the hardest n%18 holes', () => {
    const holes: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      handicapIndex: i + 1,
    }));
    // A 30-handicap: base = 1, remainder = 12.
    const result = allocateStrokes(30, holes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const h of holes) {
        expect(result.strokesByHole.get(h.holeNumber)).toBe(h.handicapIndex! <= 12 ? 2 : 1);
      }
    }
  });

  it('handles exactly 18 as one stroke per hole with no remainder extra', () => {
    const holes = holesWithIndex([1, 9, 18]);
    const result = allocateStrokes(18, holes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.strokesByHole.values())).toEqual([1, 1, 1]);
    }
  });

  it('subtracts a stroke from the easiest holes inward for a negative (plus-handicap) allowance', () => {
    const holes: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      handicapIndex: i + 1,
    }));
    // -3: subtract from handicap_index >= 16 (the three easiest holes: 16, 17, 18).
    const result = allocateStrokes(-3, holes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const h of holes) {
        expect(result.strokesByHole.get(h.holeNumber)).toBe(h.handicapIndex! >= 16 ? -1 : 0);
      }
    }
  });

  it('returns a typed failure when a handicap_index is missing and strokes are owed', () => {
    const holes: ScoringHole[] = [
      { holeNumber: 1, par: 4, handicapIndex: 1 },
      { holeNumber: 2, par: 4, handicapIndex: null },
      { holeNumber: 3, par: 4, handicapIndex: 3 },
    ];
    const result = allocateStrokes(5, holes);
    expect(result).toEqual({ ok: false, reason: 'missing_handicap_index', missingHoleNumbers: [2] });
  });

  it('does not fail on a missing handicap_index when strokesReceived is 0', () => {
    const holes: ScoringHole[] = [
      { holeNumber: 1, par: 4, handicapIndex: null },
      { holeNumber: 2, par: 4, handicapIndex: null },
    ];
    const result = allocateStrokes(0, holes);
    expect(result.ok).toBe(true);
  });
});
