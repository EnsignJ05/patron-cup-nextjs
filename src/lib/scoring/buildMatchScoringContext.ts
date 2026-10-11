import { calculateMatchHandicapMetrics, type MatchHandicapCourse } from '@/lib/matchHandicapMetrics';
import { allocateStrokes } from './strokeAllocation';
import type { ScoringHole } from './types';

export type ScoringContextAllocation =
  | { ok: true; strokesByHole: Map<number, number> }
  | { ok: false; reason: 'missing_handicap_index' | 'missing_course_handicap'; missingHoleNumbers: number[] };

export type PlayerScoringContext = {
  playerId: string;
  teamId: string;
  courseHandicap: number | null;
  strokesReceived: number | null;
  strokeAllocation: ScoringContextAllocation;
};

export type BuildMatchScoringContextInput = {
  course: MatchHandicapCourse;
  holes: ScoringHole[];
  /** Decision 2.1/2.2: per-format or per-scorecard handicap allowance. */
  allowance: number;
  players: { playerId: string; teamId: string; officialEventHandicap: number | null }[];
};

/**
 * Assembles everything a match's scorecard needs from raw rows: each player's course
 * handicap (via the existing calculateCourseHandicap, through calculateMatchHandicapMetrics),
 * their match strokes received after allowance, and their per-hole stroke allocation.
 * One function so no component duplicates this wiring (Task P2.4).
 */
export function buildMatchScoringContext(
  input: BuildMatchScoringContextInput,
): Map<string, PlayerScoringContext> {
  const metrics = calculateMatchHandicapMetrics(
    input.players.map((p) => ({ playerId: p.playerId, officialEventHandicap: p.officialEventHandicap })),
    input.course,
    input.allowance,
  );

  const result = new Map<string, PlayerScoringContext>();
  input.players.forEach((player) => {
    const metric = metrics.get(player.playerId) ?? { courseHandicap: null, strokesGiven: null };
    const strokesReceived = metric.strokesGiven;

    const strokeAllocation: ScoringContextAllocation =
      strokesReceived == null
        ? {
            ok: false,
            reason: 'missing_course_handicap',
            missingHoleNumbers: input.holes.map((h) => h.holeNumber),
          }
        : allocateStrokes(strokesReceived, input.holes);

    result.set(player.playerId, {
      playerId: player.playerId,
      teamId: player.teamId,
      courseHandicap: metric.courseHandicap,
      strokesReceived,
      strokeAllocation,
    });
  });

  return result;
}
