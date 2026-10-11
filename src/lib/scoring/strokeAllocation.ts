import type { AllocateStrokesResult, ScoringHole } from './types';

/**
 * Allocates a player's match strokes to specific holes by stroke index
 * (handicap_index, 1 = hardest). See LIVE_SCORING_PLAN.md Task P2.1 for the pinned rules:
 *  - 0 strokes: every hole gets 0, even if some holes are missing a stroke index --
 *    there's nothing to allocate, so there's nothing to fail on.
 *  - 1-18: one stroke on each hole with handicap_index <= n.
 *  - >18 (wrap, e.g. a 30-handicap): every hole gets floor(n/18), plus one more on
 *    holes with handicap_index <= n % 18.
 *  - negative (a plus-handicap giving strokes back): subtract one from the easiest
 *    holes inward -- those with handicap_index >= 19 - |n|.
 *  - Missing handicap_index anywhere (and strokesReceived !== 0): return a typed
 *    failure instead of guessing, so the UI can say why net scoring is unavailable.
 */
export function allocateStrokes(strokesReceived: number, holes: ScoringHole[]): AllocateStrokesResult {
  if (strokesReceived === 0) {
    const strokesByHole = new Map<number, number>();
    holes.forEach((h) => strokesByHole.set(h.holeNumber, 0));
    return { ok: true, strokesByHole };
  }

  const missingHoleNumbers = holes.filter((h) => h.handicapIndex == null).map((h) => h.holeNumber);
  if (missingHoleNumbers.length > 0) {
    return { ok: false, reason: 'missing_handicap_index', missingHoleNumbers };
  }

  const strokesByHole = new Map<number, number>();

  if (strokesReceived > 0) {
    const base = Math.floor(strokesReceived / 18);
    const remainder = strokesReceived % 18;
    holes.forEach((h) => {
      const extra = (h.handicapIndex as number) <= remainder ? 1 : 0;
      strokesByHole.set(h.holeNumber, base + extra);
    });
  } else {
    const given = Math.abs(strokesReceived);
    holes.forEach((h) => {
      const givesBackStroke = (h.handicapIndex as number) >= 19 - given;
      strokesByHole.set(h.holeNumber, givesBackStroke ? -1 : 0);
    });
  }

  return { ok: true, strokesByHole };
}
