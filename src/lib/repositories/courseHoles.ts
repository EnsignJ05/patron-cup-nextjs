import type { SupabaseClient } from '@supabase/supabase-js';

/** Explicit column list -- course_holes carries no PII, but every new anon-readable
 * query in this codebase names its columns rather than using `select('*')`. */
export type CourseHoleLite = {
  id: string;
  hole_number: number;
  par: number;
  yardage: number | null;
  handicap_index: number | null;
};

export async function fetchCourseHoles(supabase: SupabaseClient, courseId: string) {
  return supabase
    .from('course_holes')
    .select('id, hole_number, par, yardage, handicap_index')
    .eq('course_id', courseId)
    .order('hole_number')
    .returns<CourseHoleLite[]>();
}
