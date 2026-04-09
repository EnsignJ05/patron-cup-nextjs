export type CourseHandicapInput = {
  handicapIndex: number | null;
  slope: number | null;
  rating: number | null;
  par: number | null;
};

export function calculateCourseHandicap(input: CourseHandicapInput): number | null {
  const { handicapIndex, slope, rating, par } = input;
  if (handicapIndex == null || slope == null || rating == null || par == null) {
    return null;
  }

  const rawCourseHandicap = handicapIndex * (slope / 113) + (rating - par);
  return Math.round(rawCourseHandicap);
}
