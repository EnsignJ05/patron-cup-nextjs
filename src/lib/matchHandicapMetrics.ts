import { calculateCourseHandicap } from '@/lib/courseHandicap';

export type MatchHandicapPlayer = {
  playerId: string;
  officialEventHandicap: number | null;
};

export type MatchHandicapCourse = {
  slope: number | null;
  rating: number | null;
  par: number | null;
};

export type MatchHandicapMetric = {
  courseHandicap: number | null;
  strokesGiven: number | null;
};

/**
 * `allowance` (decision 2.1/2.2 in LIVE_SCORING_PLAN.md) is applied to each player's
 * course handicap *before* subtracting the lowest in the match -- matching how
 * published allowance tables are written. It defaults to 1.0, which reproduces this
 * function's original (pre-allowance) behavior exactly for every existing caller.
 */
export function calculateMatchHandicapMetrics(
  players: MatchHandicapPlayer[],
  course: MatchHandicapCourse,
  allowance: number = 1.0,
): Map<string, MatchHandicapMetric> {
  const courseHandicapByPlayerId = new Map<string, number | null>();
  const playingHandicapByPlayerId = new Map<string, number | null>();

  players.forEach((player) => {
    const courseHandicap = calculateCourseHandicap({
      handicapIndex: player.officialEventHandicap,
      slope: course.slope,
      rating: course.rating,
      par: course.par,
    });
    courseHandicapByPlayerId.set(player.playerId, courseHandicap);
    playingHandicapByPlayerId.set(player.playerId, courseHandicap == null ? null : Math.round(courseHandicap * allowance));
  });

  const validPlayingHandicaps = Array.from(playingHandicapByPlayerId.values()).filter(
    (value): value is number => value != null,
  );
  const lowestPlayingHandicap = validPlayingHandicaps.length ? Math.min(...validPlayingHandicaps) : null;

  const result = new Map<string, MatchHandicapMetric>();
  players.forEach((player) => {
    const courseHandicap = courseHandicapByPlayerId.get(player.playerId) ?? null;
    const playingHandicap = playingHandicapByPlayerId.get(player.playerId) ?? null;
    const strokesGiven =
      playingHandicap == null || lowestPlayingHandicap == null ? null : playingHandicap - lowestPlayingHandicap;

    result.set(player.playerId, { courseHandicap, strokesGiven });
  });

  return result;
}
