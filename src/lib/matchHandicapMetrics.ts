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

export function calculateMatchHandicapMetrics(
  players: MatchHandicapPlayer[],
  course: MatchHandicapCourse,
): Map<string, MatchHandicapMetric> {
  const courseHandicapByPlayerId = new Map<string, number | null>();

  players.forEach((player) => {
    courseHandicapByPlayerId.set(
      player.playerId,
      calculateCourseHandicap({
        handicapIndex: player.officialEventHandicap,
        slope: course.slope,
        rating: course.rating,
        par: course.par,
      }),
    );
  });

  const validCourseHandicaps = Array.from(courseHandicapByPlayerId.values()).filter(
    (value): value is number => value != null,
  );
  const lowestCourseHandicap = validCourseHandicaps.length ? Math.min(...validCourseHandicaps) : null;

  const result = new Map<string, MatchHandicapMetric>();
  players.forEach((player) => {
    const courseHandicap = courseHandicapByPlayerId.get(player.playerId) ?? null;
    const strokesGiven =
      courseHandicap == null || lowestCourseHandicap == null ? null : courseHandicap - lowestCourseHandicap;

    result.set(player.playerId, { courseHandicap, strokesGiven });
  });

  return result;
}
