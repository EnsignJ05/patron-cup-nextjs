import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchCourseHoles } from '@/lib/repositories/courseHoles';

function buildSupabaseMock(response: { data: any; error: any }) {
  const order = jest.fn(() => ({ returns: () => Promise.resolve(response) }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq, order };
}

describe('courseHoles repository', () => {
  it('queries course_holes with an explicit column list, filtered and ordered by hole_number', async () => {
    const { client, from, select, eq, order } = buildSupabaseMock({
      data: [{ id: 'h1', hole_number: 1, par: 4, yardage: 412, handicap_index: 5 }],
      error: null,
    });

    const result = await fetchCourseHoles(client, 'course-1');

    expect(from).toHaveBeenCalledWith('course_holes');
    expect(select).toHaveBeenCalledWith('id, hole_number, par, yardage, handicap_index');
    expect(eq).toHaveBeenCalledWith('course_id', 'course-1');
    expect(order).toHaveBeenCalledWith('hole_number');
    expect(result.data).toEqual([{ id: 'h1', hole_number: 1, par: 4, yardage: 412, handicap_index: 5 }]);
  });
});
